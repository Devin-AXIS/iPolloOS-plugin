import { cidmsJsonRequest, safeJson } from './client';
import type { CidmsAuth } from './schemas';
import { assetModelForType, clean } from './video';

export type ReferenceAssetPurpose =
  | 'character_reference'
  | 'background_reference'
  | 'continuation_video';

export type ReferenceAssetInput = CidmsAuth & {
  asset_purpose: ReferenceAssetPurpose;
  asset_url: string;
  asset_name?: string;
};

export type ReferenceAssetOut = {
  group_id: string;
  asset_id: string;
  asset_ref: string;
  asset_type: 'Image' | 'Video';
  usage_hint: string;
  response_json: string;
  system_error?: string;
};

export type CidmsRequest = {
  auth: CidmsAuth;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
};

export type CidmsRequester = <T = Record<string, unknown>>(req: CidmsRequest) => Promise<T>;

export async function runReferenceAssetUpload(
  input: ReferenceAssetInput,
  request: CidmsRequester = cidmsJsonRequest
): Promise<ReferenceAssetOut> {
  const assetType = assetTypeForPurpose(input.asset_purpose);
  const group = await request<Record<string, unknown>>({
    auth: input,
    method: 'POST',
    path: '/volc/asset/CreateAssetGroup',
    body: {
      model: 'volc-asset',
      Name: 'cidms-reference-assets'
    }
  });
  const groupId = readString(group, 'Id');
  if (!groupId) throw new Error('CIDMS asset group response missing Id');

  const asset = await request<Record<string, unknown>>({
    auth: input,
    method: 'POST',
    path: '/volc/asset/CreateAsset',
    body: {
      model: assetModelForType(assetType),
      GroupId: groupId,
      Name: clean(input.asset_name) || defaultAssetName(input.asset_purpose),
      AssetType: assetType,
      URL: input.asset_url
    }
  });
  const assetId = readString(asset, 'Id');
  if (!assetId) throw new Error('CIDMS asset response missing Id');

  return {
    group_id: groupId,
    asset_id: assetId,
    asset_ref: `asset://${assetId}`,
    asset_type: assetType,
    usage_hint: usageHintForPurpose(input.asset_purpose),
    response_json: safeJson({ group, asset })
  };
}

export function assetTypeForPurpose(purpose: ReferenceAssetPurpose): 'Image' | 'Video' {
  return purpose === 'continuation_video' ? 'Video' : 'Image';
}

export function usageHintForPurpose(purpose: ReferenceAssetPurpose): string {
  if (purpose === 'background_reference') {
    return '可填入脱口秀视频生成的背景参考图片字段。';
  }
  if (purpose === 'continuation_video') {
    return '可作为续写参考视频，用于生成后续 15s 视频。';
  }
  return '可填入脱口秀视频生成的人物参考图片字段。';
}

function defaultAssetName(purpose: ReferenceAssetPurpose): string {
  if (purpose === 'background_reference') return 'background-reference';
  if (purpose === 'continuation_video') return 'continuation-video-reference';
  return 'character-reference';
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}
