import { Config } from '@alicloud/openapi-core/dist/utils';
import ECSClient from '@alicloud/ecs20140526';
import SWASClient from '@alicloud/swas-open20200601';
import VPCClient from '@alicloud/vpc20160428';
import RDSClient from '@alicloud/rds20140815';

import type { ResolvedAuth } from './baseSchema';

export type CloudAuth = ResolvedAuth;

function mkConfig(auth: CloudAuth, region: string, subdomain: string) {
  return new Config({
    accessKeyId: auth.aliyunAccessKeyId,
    accessKeySecret: auth.aliyunAccessKeySecret,
    regionId: region,
    endpoint: `${subdomain}.${region}.aliyuncs.com`
  });
}

export function ecsClient(auth: CloudAuth, region: string) {
  return new ECSClient(mkConfig(auth, region, 'ecs'));
}

export function swasClient(auth: CloudAuth, region: string) {
  return new SWASClient(mkConfig(auth, region, 'swas'));
}

export function vpcClient(auth: CloudAuth, region: string) {
  return new VPCClient(mkConfig(auth, region, 'vpc'));
}

export function rdsClient(auth: CloudAuth, region: string) {
  return new RDSClient(mkConfig(auth, region, 'rds'));
}
