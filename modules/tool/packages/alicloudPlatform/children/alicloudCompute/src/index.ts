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

const Action = z.enum([
  'ecs_run_instances',
  'ecs_start_instance',
  'ecs_stop_instance',
  'ecs_reboot_instance',
  'ecs_delete_instance',
  'ecs_describe_instance_attribute',
  'swas_create_instances',
  'swas_start_instance',
  'swas_stop_instance',
  'swas_reboot_instance'
]);

export const InputType = SecretsOptional.and(
  z.object({
    regionId: z.string().optional(),
    action: Action,
    /** ECS实例 ID / 轻量实例 ID（按动作必填） */
    instanceId: z.string().optional(),
    ecsZoneId: z.string().optional(),
    ecsImageId: z.string().optional(),
    ecsInstanceType: z.string().optional(),
    ecsSecurityGroupId: z.string().optional(),
    ecsVSwitchId: z.string().optional(),
    ecsInstanceName: z.string().optional(),
    ecsPassword: z.string().optional(),
    ecsKeyPairName: z.string().optional(),
    ecsInternetMaxBandwidthOut: z.coerce.number().int().min(0).max(100).optional(),
    ecsSystemDiskSizeGb: z.coerce.number().int().min(20).max(500).optional(),
    /** shell 明文，将由工具 Base64 后写入 UserData */
    ecsUserDataShell: z.string().optional(),
    ecsAmount: z.coerce.number().int().min(1).max(10).optional(),
    /**合并进 RunInstances 的 JSON（高级参数）*/
    ecsRunExtraJson: z.string().optional(),
    ecsDeleteForce: z.coerce.boolean().optional(),
    ecsDeleteForceStop: z.coerce.boolean().optional(),
    swasImageId: z.string().optional(),
    swasPlanId: z.string().optional(),
    swasPeriodMonths: z.coerce.number().int().min(1).max(36).optional(),
    swasAmount: z.coerce.number().int().min(1).max(5).optional(),
    swasDataDiskSizeGb: z.coerce.number().int().min(0).optional(),
    /** 轻量变配 JSON merge */
    swasCreateExtraJson: z.string().optional()
  })
).superRefine((v, ctx) => {
  const ecsIds = [
    'ecs_start_instance',
    'ecs_stop_instance',
    'ecs_reboot_instance',
    'ecs_delete_instance',
    'ecs_describe_instance_attribute'
  ];
  if (ecsIds.includes(v.action) && !v.instanceId?.trim())
    ctx.addIssue({ code: 'custom', message: '该动作需要 instanceId（ECS）。' });

  const swasIds = ['swas_start_instance', 'swas_stop_instance', 'swas_reboot_instance'];
  if (swasIds.includes(v.action) && !v.instanceId?.trim()) {
    ctx.addIssue({ code: 'custom', message: '该动作需要 instanceId（轻量）。' });
  }

  if (v.action === 'ecs_run_instances') {
    const miss: string[] = [];
    if (!v.ecsImageId?.trim()) miss.push('ecsImageId');
    if (!v.ecsInstanceType?.trim()) miss.push('ecsInstanceType');
    if (!v.ecsSecurityGroupId?.trim()) miss.push('ecsSecurityGroupId');
    if (!v.ecsVSwitchId?.trim()) miss.push('ecsVSwitchId');
    if (!v.ecsPassword?.trim() && !v.ecsKeyPairName?.trim())
      miss.push('ecsPassword 或 ecsKeyPairName');
    if (miss.length)
      ctx.addIssue({ code: 'custom', message: `ecs_run_instances 缺少: ${miss.join(', ')}` });
  }

  if (v.action === 'swas_create_instances') {
    if (!v.swasImageId?.trim()) ctx.addIssue({ code: 'custom', message: '需要 swasImageId' });
    if (!v.swasPlanId?.trim()) ctx.addIssue({ code: 'custom', message: '需要 swasPlanId' });
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

function mergeExtraJson(base: Record<string, unknown>, raw?: string): Record<string, unknown> {
  if (!raw?.trim()) return base;
  try {
    const extra = JSON.parse(raw) as Record<string, unknown>;
    return { ...base, ...extra };
  } catch {
    throw new Error('ecsRunExtraJson / swasCreateExtraJson 不是合法 JSON');
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
    let payload: unknown;

    if (props.action === 'ecs_run_instances') {
      const ecs = ecsClient(auth, region);
      let userData: string | undefined;
      if ((props.ecsUserDataShell ?? '').trim()) {
        userData = Buffer.from(props.ecsUserDataShell ?? '', 'utf8').toString('base64');
      }
      const base: Record<string, unknown> = {
        regionId: region,
        zoneId: props.ecsZoneId?.trim() || undefined,
        imageId: props.ecsImageId!.trim(),
        instanceType: props.ecsInstanceType!.trim(),
        securityGroupId: props.ecsSecurityGroupId!.trim(),
        vSwitchId: props.ecsVSwitchId!.trim(),
        instanceName: props.ecsInstanceName?.trim() || undefined,
        password: props.ecsPassword?.trim() || undefined,
        keyPairName: props.ecsKeyPairName?.trim() || undefined,
        amount: props.ecsAmount ?? 1,
        internetMaxBandwidthOut: props.ecsInternetMaxBandwidthOut ?? 5,
        userData,
        ...(props.ecsSystemDiskSizeGb
          ? {
              systemDisk: {
                size: `${props.ecsSystemDiskSizeGb}`,
                category: 'cloud_efficiency'
              }
            }
          : {})
      };
      const merged = mergeExtraJson(base, props.ecsRunExtraJson);
      const res = await ecs.runInstances(merged as never);
      payload = res.body;
    } else if (props.action.startsWith('ecs_')) {
      const ecs = ecsClient(auth, region);
      const id = props.instanceId!.trim();
      switch (props.action) {
        case 'ecs_start_instance':
          payload = (await ecs.startInstance({ instanceId: id })).body;
          break;
        case 'ecs_stop_instance':
          payload = (
            await ecs.stopInstance({
              instanceId: id
            })
          ).body;
          break;
        case 'ecs_reboot_instance':
          payload = (await ecs.rebootInstance({ instanceId: id })).body;
          break;
        case 'ecs_delete_instance':
          payload = (
            await ecs.deleteInstance({
              instanceId: id,
              force: props.ecsDeleteForce === true,
              forceStop: props.ecsDeleteForceStop === true
            })
          ).body;
          break;
        case 'ecs_describe_instance_attribute':
          payload = (await ecs.describeInstanceAttribute({ instanceId: id })).body;
          break;
      }
    } else if (props.action === 'swas_create_instances') {
      const swas = swasClient(auth, region);
      const base: Record<string, unknown> = {
        regionId: region,
        imageId: props.swasImageId!.trim(),
        planId: props.swasPlanId!.trim(),
        period: props.swasPeriodMonths ?? 1,
        amount: props.swasAmount ?? 1,
        dataDiskSize: props.swasDataDiskSizeGb ?? 0
      };
      const merged = mergeExtraJson(base, props.swasCreateExtraJson);
      payload = (await swas.createInstances(merged as never)).body;
    } else {
      const swas = swasClient(auth, region);
      const id = props.instanceId!.trim();
      switch (props.action) {
        case 'swas_start_instance':
          payload = (await swas.startInstance({ regionId: region, instanceId: id })).body;
          break;
        case 'swas_stop_instance':
          payload = (await swas.stopInstance({ regionId: region, instanceId: id })).body;
          break;
        case 'swas_reboot_instance':
          payload = (await swas.rebootInstance({ regionId: region, instanceId: id })).body;
          break;
      }
    }

    const dj = safeDetailJson(payload ?? {}, 96_000);
    return {
      summary: `计算 ${props.action} 已提交（${region}）。`,
      reply_hint: dj.length > 8000 ? `${dj.slice(0, 4000)}\n…` : dj,
      detail_json: dj,
      system_error: undefined
    };
  } catch (e: unknown) {
    return empty(e instanceof Error ? e.message : String(e));
  }
}
