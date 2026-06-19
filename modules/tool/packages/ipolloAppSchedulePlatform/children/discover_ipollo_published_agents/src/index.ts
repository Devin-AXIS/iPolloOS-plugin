import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import { getPublishedAgents, type PublishedAgent } from '@/invoke/publishedAgents';
import { stringifyJson } from '../../../lib/schema';

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

function formatAgentsMarkdown(agents: PublishedAgent[]): string {
  if (agents.length === 0) return '暂无可分配的已发布智能体。';
  return agents
    .map((agent, index) => {
      const intro = agent.intro ? `：${agent.intro}` : '';
      const score = agent.score > 0 ? ` · 匹配 ${agent.score}` : '';
      return `${index + 1}. ${agent.name}${intro}${score}`;
    })
    .join('\n');
}

function buildAssigneesJson(agent?: PublishedAgent): string {
  if (!agent) return '[]';
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

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  try {
    const input = InputType.parse(props);
    if (!runtime?.systemVar) {
      throw new Error('缺少插件运行时系统变量，无法读取已发布智能体。');
    }
    const currentFastGPTAppId = input.exclude_current_agent
      ? getCurrentFastGPTAppId(runtime?.systemVar)
      : '';
    const result = await getPublishedAgents(
      {
        taskText: input.task_text,
        limit: input.limit,
        excludeFastGPTAppId: currentFastGPTAppId
      },
      runtime.systemVar
    );
    const recommended = result.agents[0];

    return {
      ok: true,
      agents_json: stringifyJson(result.agents),
      agents_markdown: formatAgentsMarkdown(result.agents),
      recommended_agent_id: recommended?.appBotId ?? '',
      recommended_agent_name: recommended?.name ?? '',
      recommended_assignees_json: buildAssigneesJson(recommended),
      count: result.count
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
