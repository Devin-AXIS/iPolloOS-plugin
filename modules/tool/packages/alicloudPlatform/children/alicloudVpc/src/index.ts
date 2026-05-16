import { z } from 'zod';

import { SecretsOptional, requireSecrets } from '../../../lib/baseSchema';
import { vpcClient } from '../../../lib/clients';
import { safeDetailJson } from '../../../lib/format';

function apiRegion(auth: { defaultRegionId?: string }, regionId?: string): string {
  return (
    ((regionId ?? '').trim() || auth.defaultRegionId?.trim() || 'cn-hangzhou').trim() ||
    'cn-hangzhou'
  );
}

const Action = z.enum(['create_vpc', 'create_vswitch']);

export const InputType = SecretsOptional.and(
  z.object({
    regionId: z.string().optional(),
    action: Action,
    vpcName: z.string().optional(),
    vpcCidrBlock: z.string().optional(),
    vswitchZoneId: z.string().optional(),
    vswitchCidrBlock: z.string().optional(),
    vpcId: z.string().optional(),
    vswitchName: z.string().optional()
  })
).superRefine((v, ctx) => {
  if (v.action === 'create_vpc') {
    if (!v.vpcCidrBlock?.trim())
      ctx.addIssue({ code: 'custom', message: 'create_vpc 需要 vpcCidrBlock，如 172.16.0.0/16' });
  }
  if (v.action === 'create_vswitch') {
    if (!v.vpcId?.trim()) ctx.addIssue({ code: 'custom', message: 'create_vswitch 需要 vpcId' });
    if (!v.vswitchZoneId?.trim())
      ctx.addIssue({ code: 'custom', message: 'create_vswitch 需要 vswitchZoneId' });
    if (!v.vswitchCidrBlock?.trim())
      ctx.addIssue({ code: 'custom', message: 'create_vswitch 需要 vswitchCidrBlock' });
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
    const vpc = vpcClient(auth, region);
    let body: unknown;
    if (props.action === 'create_vpc') {
      const res = await vpc.createVpc({
        regionId: region,
        cidrBlock: props.vpcCidrBlock!.trim(),
        ...(props.vpcName?.trim() ? { vpcName: props.vpcName.trim() } : {})
      });
      body = res.body;
    } else {
      const res = await vpc.createVSwitch({
        regionId: region,
        vpcId: props.vpcId!.trim(),
        zoneId: props.vswitchZoneId!.trim(),
        cidrBlock: props.vswitchCidrBlock!.trim(),
        ...(props.vswitchName?.trim() ? { vSwitchName: props.vswitchName.trim() } : {})
      });
      body = res.body;
    }
    const dj = safeDetailJson(body ?? {}, 48_000);
    return {
      summary: `VPC ${props.action} 已提交（${region}）。`,
      reply_hint: dj,
      detail_json: dj,
      system_error: undefined
    };
  } catch (e: unknown) {
    return empty(e instanceof Error ? e.message : String(e));
  }
}
