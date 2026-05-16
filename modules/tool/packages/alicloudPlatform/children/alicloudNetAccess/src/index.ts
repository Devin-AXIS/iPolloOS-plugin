import { z } from 'zod';

import { SecretsOptional, requireSecrets } from '../../../lib/baseSchema';
import { ecsClient, swasClient } from '../../../lib/clients';
import { safeDetailJson } from '../../../lib/format';

function apiRegion(auth: { defaultRegionId?: string }, regionId?: string): string {
  return (
    ((regionId ?? '').trim() || auth.defaultRegionId?.trim() || 'cn-hangzhou').trim() ||
    'cn-hangzhou'
  );
}

const Fam = z.enum([
  'ecs_authorize_security_group',
  'ecs_revoke_security_group',
  'swas_firewall_rules'
]);

export const InputType = SecretsOptional.and(
  z.object({
    regionId: z.string().optional(),
    family: Fam,
    securityGroupId: z.string().optional(),
    ipProtocol: z.string().optional(),
    portRange: z.string().optional(),
    sourceCidrIp: z.string().optional(),
    priority: z.string().optional(),
    swasInstanceId: z.string().optional(),
    /** 轻量多规则 JSON：[{port,ruleProtocol,sourceCidrIp,remark?}] */
    swasFirewallRulesJson: z.string().optional()
  })
).superRefine((v, ctx) => {
  if (v.family.startsWith('ecs_')) {
    if (!v.securityGroupId?.trim())
      ctx.addIssue({ code: 'custom', message: '需要 securityGroupId' });
    if (!v.portRange?.trim())
      ctx.addIssue({ code: 'custom', message: '需要 portRange，如 80/80 或 22/22' });
    if (!v.sourceCidrIp?.trim()) ctx.addIssue({ code: 'custom', message: '需要 sourceCidrIp' });
  }
  if (v.family === 'swas_firewall_rules') {
    if (!v.swasInstanceId?.trim()) ctx.addIssue({ code: 'custom', message: '需要 swasInstanceId' });
    if (!v.swasFirewallRulesJson?.trim())
      ctx.addIssue({ code: 'custom', message: '需要 swasFirewallRulesJson' });
  }
});

export const OutputType = z.object({
  summary: z.string(),
  reply_hint: z.string(),
  detail_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function empty(err: string): Out {
  return { summary: '', reply_hint: '', detail_json: 'null', system_error: err };
}

export async function tool(props: In): Promise<Out> {
  let auth: ReturnType<typeof requireSecrets>;
  try {
    auth = requireSecrets(props);
  } catch (e: unknown) {
    return empty(e instanceof Error ? e.message : String(e));
  }
  const region = apiRegion(auth, props.regionId);
  try {
    let body: unknown;
    const proto = (props.ipProtocol ?? 'tcp').trim() || 'tcp';
    const perm = {
      ipProtocol: proto.toUpperCase(),
      portRange: props.portRange!.trim(),
      sourceCidrIp: props.sourceCidrIp!.trim(),
      policy: 'accept',
      ...(props.priority?.trim() ? { priority: props.priority.trim() } : {})
    };

    if (props.family === 'ecs_authorize_security_group') {
      const ecs = ecsClient(auth, region);
      const res = await ecs.authorizeSecurityGroup({
        regionId: region,
        securityGroupId: props.securityGroupId!.trim(),
        permissions: [perm as never]
      });
      body = res.body;
    } else if (props.family === 'ecs_revoke_security_group') {
      const ecs = ecsClient(auth, region);
      const res = await ecs.revokeSecurityGroup({
        regionId: region,
        securityGroupId: props.securityGroupId!.trim(),
        permissions: [perm as never]
      });
      body = res.body;
    } else {
      let rules: Array<{
        port?: string;
        ruleProtocol?: string;
        sourceCidrIp?: string;
        remark?: string;
      }>;
      try {
        rules = JSON.parse(props.swasFirewallRulesJson ?? '[]') as typeof rules;
      } catch {
        return empty('swasFirewallRulesJson 解析失败');
      }
      if (!Array.isArray(rules) || rules.length === 0) return empty('防火墙规则数组不能为空');
      const swas = swasClient(auth, region);
      const res = await swas.createFirewallRules({
        regionId: region,
        instanceId: props.swasInstanceId!.trim(),
        firewallRules: rules as never[]
      });
      body = res.body;
    }

    const dj = safeDetailJson(body ?? {}, 48_000);
    return {
      summary: `访问控制 ${props.family} 已执行（${region}）。`,
      reply_hint: dj,
      detail_json: dj,
      system_error: undefined
    };
  } catch (e: unknown) {
    return empty(e instanceof Error ? e.message : String(e));
  }
}
