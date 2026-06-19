import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import { getPublishedAgents, type PublishedAgent } from '@/invoke/publishedAgents';
import { stringifyJson } from '../../../lib/schema';
import { queryAppPublishedAgents } from '../../../lib/api';

export const InputType = z.object({
  task_text: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  exclude_current_agent: z.boolean().default(true)
});

export const OutputType = z.object({
  ok: z.boolean(),
  agents_json: z.string(),
  agents_markdown: z.string(),
  recommended_agent_id: z.string(),
  recommended_agent_name: z.string(),
  recommended_assignees_json: z.string(),
  count: z.number(),
  system_error: z.string().optional()
});

type In = z.input<typeof InputType>;
type Out = z.output<typeof OutputType>;

type AgentCandidate = PublishedAgent;

function formatAgentsMarkdown(agents: AgentCandidate[]): string {
  if (agents.length === 0) return '暂无可分配的已发布智能体。';
  return agents
    .map((agent, index) => {
      const intro = agent.intro ? `：${agent.intro}` : '';
      const score = agent.score > 0 ? ` · 匹配 ${agent.score}` : '';
      const reasons = agent.matchReasons?.length
        ? ` · ${agent.matchReasons.slice(0, 2).join('；')}`
        : '';
      return `${index + 1}. ${agent.name}${intro}${score}${reasons}`;
    })
    .join('\n');
}

function buildAssigneesJson(agent?: AgentCandidate): string {
  if (!agent || agent.score <= 0) return '[]';
  return stringifyJson([
    {
      assigneeType: 'agent',
      assigneeId: agent.appBotId,
      assigneeName: agent.name,
      role: 'executor'
    }
  ]);
}

function getCurrentFastGPTAppId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const app = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    upstreamAppId?: string;
  };
  return String(app?.upstreamAppId || app?.id || '').trim();
}

function getCurrentIPolloApplicationId(systemVar?: RunToolSecondParamsType['systemVar']): string {
  const app = systemVar?.app as RunToolSecondParamsType['systemVar']['app'] & {
    applicationId?: string;
    iPolloApplicationId?: string;
  };
  const user = systemVar?.user as RunToolSecondParamsType['systemVar']['user'] & {
    iPolloApplicationId?: string;
  };
  return String(
    app?.iPolloApplicationId || app?.applicationId || user?.iPolloApplicationId || ''
  ).trim();
}

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  try {
    const input = InputType.parse(props);
    if (!runtime?.systemVar) {
      throw new Error('缺少插件运行时系统变量，无法读取已发布智能体。');
    }
    const currentFastGPTAppId = input.exclude_current_agent
      ? getCurrentFastGPTAppId(runtime?.systemVar)
      : '';
    const iPolloApplicationId = getCurrentIPolloApplicationId(runtime.systemVar);
    let agents: AgentCandidate[] = [];
    let count = 0;
    let invokeError = '';
    let appAgentsError = '';

    try {
      const result = await getPublishedAgents(
        {
          taskText: input.task_text,
          limit: input.limit,
          excludeFastGPTAppId: currentFastGPTAppId,
          iPolloApplicationId
        },
        runtime.systemVar
      );
      agents = result.agents;
      count = result.count;
    } catch (error: unknown) {
      invokeError = getErrText(error);
    }

    let recommended = agents.find((agent) => agent.score > 0);
    if (!recommended && iPolloApplicationId) {
      try {
        const appAgents = await queryAppPublishedAgents({
          applicationId: iPolloApplicationId,
          userId: String(
            (runtime.systemVar.user as { appUserId?: string; id?: string } | undefined)
              ?.appUserId ||
              (runtime.systemVar.user as { id?: string } | undefined)?.id ||
              ''
          ),
          taskText: input.task_text,
          limit: input.limit,
          excludeFastGPTAppId: currentFastGPTAppId
        });
        agents = appAgents.agents as AgentCandidate[];
        count = appAgents.agents.length;
        recommended = agents.find((agent) => agent.score > 0);
      } catch (error: unknown) {
        appAgentsError = getErrText(error);
      }
    }

    if (invokeError && agents.length === 0) {
      throw new Error(appAgentsError ? `${invokeError}; ${appAgentsError}` : invokeError);
    }

    return {
      ok: true,
      agents_json: stringifyJson(agents),
      agents_markdown: formatAgentsMarkdown(agents),
      recommended_agent_id: recommended?.appBotId ?? '',
      recommended_agent_name: recommended?.name ?? '',
      recommended_assignees_json: buildAssigneesJson(recommended),
      count,
      ...(appAgentsError && agents.length === 0 ? { system_error: appAgentsError } : {})
    };
  } catch (error: unknown) {
    return {
      ok: false,
      agents_json: '[]',
      agents_markdown: '',
      recommended_agent_id: '',
      recommended_agent_name: '',
      recommended_assignees_json: '[]',
      count: 0,
      system_error: getErrText(error)
    };
  }
}
