import { z } from 'zod';

import { SecretsOptional, requireSecrets } from '../../../lib/baseSchema';
import { ecsClient, rdsClient, swasClient, vpcClient } from '../../../lib/clients';
import { safeDetailJson } from '../../../lib/format';

function apiRegion(auth: { defaultRegionId?: string }, regionId?: string): string {
  return (
    ((regionId ?? '').trim() || auth.defaultRegionId?.trim() || 'cn-hangzhou').trim() ||
    'cn-hangzhou'
  );
}

const Catalog = z.enum([
  'ecs_regions',
  'ecs_zones',
  'ecs_images',
  'ecs_available_instance_types',
  'ecs_instances',
  'ecs_security_groups',
  'swas_regions',
  'swas_images',
  'swas_plans',
  'swas_instances',
  'vpc_list',
  'vswitch_list',
  'rds_regions',
  'rds_available_zones',
  'rds_available_classes',
  'rds_instances'
]);

export const InputType = SecretsOptional.and(
  z.object({
    regionId: z.string().optional(),
    catalog: Catalog,
    zoneId: z.string().optional(),
    vpcId: z.string().optional(),
    /** ecs_images：system | self | others | marketplace */
    imageOwnerAlias: z.string().optional(),
    pageSize: z.coerce.number().int().min(5).max(100).optional(),
    /** rds_available_zones / rds_available_classes */
    rdsEngine: z.string().optional(),
    rdsEngineVersion: z.string().optional(),
    /** rds_available_classes：可用规格（引擎+版本必填） */
    commodityCode: z.string().optional(),
    /** 实例规格族过滤 ecs_images（可选） */
    instanceTypeFamily: z.string().optional()
  })
).superRefine((v, ctx) => {
  const needZone = v.catalog === 'ecs_available_instance_types';
  if (needZone && !(v.zoneId ?? '').trim()) {
    ctx.addIssue({
      code: 'custom',
      message: '目录 ecs_available_instance_types 必须填写 zoneId（可用区）。'
    });
  }
  const needRdsEngine =
    v.catalog === 'rds_available_zones' || v.catalog === 'rds_available_classes';
  if (needRdsEngine && !(v.rdsEngine ?? '').trim()) {
    ctx.addIssue({
      code: 'custom',
      message: `${v.catalog} 必须填写 rdsEngine（如 MySQL）。`
    });
  }
  if (v.catalog === 'rds_available_classes') {
    const ver = (v.rdsEngineVersion ?? '').trim();
    if (!ver) {
      ctx.addIssue({
        code: 'custom',
        message: 'rds_available_classes 必须填写 rdsEngineVersion。'
      });
    }
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
    const ps = props.pageSize ?? 40;

    switch (props.catalog) {
      case 'ecs_regions': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeRegions({});
        body = res.body;
        break;
      }
      case 'ecs_zones': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeZones({ regionId: region });
        body = res.body;
        break;
      }
      case 'ecs_images': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeImages({
          regionId: region,
          imageOwnerAlias: (props.imageOwnerAlias ?? 'system').trim() || 'system',
          status: 'Available',
          pageSize: ps,
          ...(props.instanceTypeFamily?.trim()
            ? { instanceTypeFamily: props.instanceTypeFamily.trim() }
            : {})
        });
        body = res.body;
        break;
      }
      case 'ecs_available_instance_types': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeAvailableResource({
          regionId: region,
          zoneId: props.zoneId!.trim(),
          destinationResource: 'InstanceType',
          resourceType: 'instance'
        });
        body = res.body;
        break;
      }
      case 'ecs_instances': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeInstances({ regionId: region, pageSize: ps });
        body = res.body;
        break;
      }
      case 'ecs_security_groups': {
        const ecs = ecsClient(auth, region);
        const res = await ecs.describeSecurityGroups({
          regionId: region,
          ...(props.vpcId?.trim() ? { vpcId: props.vpcId.trim() } : {}),
          pageSize: ps
        });
        body = res.body;
        break;
      }
      case 'swas_regions': {
        const swas = swasClient(auth, region);
        const res = await swas.listRegions({});
        body = res.body;
        break;
      }
      case 'swas_images': {
        const swas = swasClient(auth, region);
        const res = await swas.listImages({ regionId: region });
        body = res.body;
        break;
      }
      case 'swas_plans': {
        const swas = swasClient(auth, region);
        const res = await swas.listPlans({ regionId: region });
        body = res.body;
        break;
      }
      case 'swas_instances': {
        const swas = swasClient(auth, region);
        const res = await swas.listInstances({ regionId: region });
        body = res.body;
        break;
      }
      case 'vpc_list': {
        const vpc = vpcClient(auth, region);
        const res = await vpc.describeVpcs({ regionId: region, pageSize: ps });
        body = res.body;
        break;
      }
      case 'vswitch_list': {
        const vpc = vpcClient(auth, region);
        const res = await vpc.describeVSwitches({
          regionId: region,
          ...(props.vpcId?.trim() ? { vpcId: props.vpcId.trim() } : {}),
          pageSize: ps
        });
        body = res.body;
        break;
      }
      case 'rds_regions': {
        const rds = rdsClient(auth, region);
        const res = await rds.describeRegions({});
        body = res.body;
        break;
      }
      case 'rds_available_zones': {
        const rds = rdsClient(auth, region);
        const res = await rds.describeAvailableZones({
          regionId: region,
          engine: props.rdsEngine!.trim()
        });
        body = res.body;
        break;
      }
      case 'rds_available_classes': {
        const rds = rdsClient(auth, region);
        const req: Record<string, unknown> = {
          regionId: region,
          engine: props.rdsEngine!.trim(),
          engineVersion: props.rdsEngineVersion!.trim(),
          commodityCode: props.commodityCode ?? 'bards',
          DBInstanceStorageType: 'cloud_ssd',
          category: 'HighAvailability'
        };
        const res = await rds.describeAvailableClasses(req as never);
        body = res.body;
        break;
      }
      case 'rds_instances': {
        const rds = rdsClient(auth, region);
        const res = await rds.describeDBInstances({
          regionId: region,
          pageSize: ps
        });
        body = res.body;
        break;
      }
      default:
        return empty('未知 catalog');
    }

    const dj = safeDetailJson(body ?? {}, 96_000);
    return {
      summary: `目录查询 ${props.catalog}（地域 ${region}）。详情见 JSON。`,
      reply_hint: dj.length > 6000 ? `${dj.slice(0, 4000)}\n…截断，见 detail_json 节点` : dj,
      detail_json: dj,
      system_error: undefined
    };
  } catch (e: unknown) {
    return empty(e instanceof Error ? e.message : String(e));
  }
}
