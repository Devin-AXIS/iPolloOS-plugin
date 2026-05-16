import { z } from 'zod';

import { SecretsOptional, requireSecrets } from '../../../lib/baseSchema';
import { rdsClient } from '../../../lib/clients';
import { safeDetailJson } from '../../../lib/format';

function apiRegion(auth: { defaultRegionId?: string }, regionId?: string): string {
  return (
    ((regionId ?? '').trim() || auth.defaultRegionId?.trim() || 'cn-hangzhou').trim() ||
    'cn-hangzhou'
  );
}

const Action = z.enum([
  'create_instance',
  'modify_whitelist',
  'create_account',
  'describe_instances'
]);

export const InputType = SecretsOptional.and(
  z.object({
    regionId: z.string().optional(),
    action: Action,
    DBInstanceId: z.string().optional(),
    pageSize: z.coerce.number().int().min(5).max(100).optional(),
    /** create_instance */
    zoneId: z.string().optional(),
    engine: z.string().optional(),
    engineVersion: z.string().optional(),
    DBInstanceClass: z.string().optional(),
    DBInstanceStorage: z.coerce.number().int().min(5).optional(),
    DBInstanceNetType: z.enum(['Internet', 'VPC']).optional(),
    VPCId: z.string().optional(),
    vSwitchId: z.string().optional(),
    payType: z.enum(['Postpaid', 'Prepaid']).optional(),
    DBInstanceDescription: z.string().optional(),
    createOptionsJson: z.string().optional(),
    /** whitelist */
    securityIps: z.string().optional(),
    modifyMode: z.enum(['Cover', 'Append', 'Delete']).optional(),
    DBInstanceIPArrayName: z.string().optional(),
    /** account */
    accountName: z.string().optional(),
    accountPassword: z.string().optional(),
    accountType: z.enum(['Super', 'Normal']).optional()
  })
).superRefine((v, ctx) => {
  if (v.action === 'create_instance') {
    const m: string[] = [];
    if (!v.zoneId?.trim()) m.push('zoneId');
    if (!v.engine?.trim()) m.push('engine');
    if (!v.engineVersion?.trim()) m.push('engineVersion');
    if (!v.DBInstanceClass?.trim()) m.push('DBInstanceClass');
    if (v.DBInstanceStorage === undefined) m.push('DBInstanceStorage');
    if (m.length)
      ctx.addIssue({ code: 'custom', message: `create_instance 缺少: ${m.join(', ')}` });
    const nt = v.DBInstanceNetType ?? 'VPC';
    if (nt === 'VPC' && (!v.VPCId?.trim() || !v.vSwitchId?.trim())) {
      ctx.addIssue({ code: 'custom', message: 'VPC 模式需要 VPCId 与 vSwitchId' });
    }
  }
  if (v.action === 'modify_whitelist' || v.action === 'create_account') {
    if (!v.DBInstanceId?.trim()) ctx.addIssue({ code: 'custom', message: '需要 DBInstanceId' });
  }
  if (v.action === 'modify_whitelist' && !v.securityIps?.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: 'modify_whitelist 需要 securityIps（逗号分隔 IP/CIDR）'
    });
  }
  if (v.action === 'create_account') {
    if (!v.accountName?.trim()) ctx.addIssue({ code: 'custom', message: '需要 accountName' });
    if (!v.accountPassword?.trim())
      ctx.addIssue({ code: 'custom', message: '需要 accountPassword' });
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

function mergeCreate(req: Record<string, unknown>, raw?: string): Record<string, unknown> {
  if (!raw?.trim()) return req;
  try {
    const extra = JSON.parse(raw) as Record<string, unknown>;
    return { ...req, ...extra };
  } catch {
    throw new Error('createOptionsJson 必须为合法 JSON 对象');
  }
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
    const rds = rdsClient(auth, region);
    let body: unknown;

    if (props.action === 'describe_instances') {
      const res = await rds.describeDBInstances({
        regionId: region,
        pageSize: props.pageSize ?? 30
      });
      body = res.body;
    } else if (props.action === 'create_instance') {
      const net = props.DBInstanceNetType ?? 'VPC';
      const base: Record<string, unknown> = {
        regionId: region,
        zoneId: props.zoneId!.trim(),
        engine: props.engine!.trim(),
        engineVersion: props.engineVersion!.trim(),
        DBInstanceClass: props.DBInstanceClass!.trim(),
        DBInstanceStorage: props.DBInstanceStorage!,
        DBInstanceNetType: net,
        payType: props.payType ?? 'Postpaid',
        ...(props.DBInstanceDescription?.trim()
          ? { DBInstanceDescription: props.DBInstanceDescription.trim() }
          : {}),
        ...(net === 'VPC' ? { VPCId: props.VPCId!.trim(), vSwitchId: props.vSwitchId!.trim() } : {})
      };
      const merged = mergeCreate(base, props.createOptionsJson);
      const res = await rds.createDBInstance(merged as never);
      body = res.body;
    } else if (props.action === 'modify_whitelist') {
      const res = await rds.modifySecurityIps({
        DBInstanceId: props.DBInstanceId!.trim(),
        securityIps: props.securityIps!.trim(),
        modifyMode: props.modifyMode ?? 'Cover',
        ...(props.DBInstanceIPArrayName?.trim()
          ? { DBInstanceIPArrayName: props.DBInstanceIPArrayName.trim() }
          : {})
      });
      body = res.body;
    } else {
      const res = await rds.createAccount({
        DBInstanceId: props.DBInstanceId!.trim(),
        accountName: props.accountName!.trim(),
        accountPassword: props.accountPassword!.trim(),
        accountType: props.accountType ?? 'Normal'
      });
      body = res.body;
    }

    const dj = safeDetailJson(body ?? {}, 96_000);
    return {
      summary: `RDS ${props.action} 已执行（${region}）。账单与敏感操作请在控制台二次确认。`,
      reply_hint: dj.length > 6000 ? `${dj.slice(0, 4000)}\n…` : dj,
      detail_json: dj,
      system_error: undefined
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return empty(msg.includes('JSON') ? 'createOptionsJson 必须为合法 JSON 对象' : msg);
  }
}
