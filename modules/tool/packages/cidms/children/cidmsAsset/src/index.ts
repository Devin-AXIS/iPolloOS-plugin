import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { cidmsJsonRequest, safeJson } from '../../../lib/client';
import { CidmsAuthFields } from '../../../lib/schemas';
import { assetModelForType } from '../../../lib/video';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const ActionEnum = z.enum(['create_group', 'upload_asset']);
const AssetTypeEnum = z.enum(['Image', 'Video', 'Audio']);

export const InputType = CidmsAuthFields.and(
  z.object({
    action: ActionEnum.default('upload_asset'),
    group_name: z.string().min(1).max(512).default('cidms-asset-group'),
    group_id: z.preprocess(empty, z.string().max(512).optional()).default(''),
    asset_name: z.string().min(1).max(512).default('character-reference'),
    asset_type: AssetTypeEnum.default('Image'),
    asset_url: z.preprocess(empty, z.string().url().max(4096).optional()).default('')
  })
);

export const OutputType = z.object({
  group_id: z.string(),
  asset_id: z.string(),
  asset_ref: z.string(),
  response_json: z.string(),
  system_error: z.string().optional()
});

type Out = z.infer<typeof OutputType>;

function errOut(system_error: string): Out {
  return {
    group_id: '',
    asset_id: '',
    asset_ref: '',
    response_json: '{}',
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);

    if (input.action === 'create_group') {
      const data = await cidmsJsonRequest<Record<string, unknown>>({
        auth: input,
        method: 'POST',
        path: '/volc/asset/CreateAssetGroup',
        body: {
          model: 'volc-asset',
          Name: input.group_name
        }
      });
      return {
        group_id: readString(data, 'Id'),
        asset_id: '',
        asset_ref: '',
        response_json: safeJson(data)
      };
    }

    if (!input.group_id) {
      return errOut('上传素材需要填写素材组 ID');
    }
    if (!input.asset_url) {
      return errOut('上传素材需要填写素材 URL');
    }

    const data = await cidmsJsonRequest<Record<string, unknown>>({
      auth: input,
      method: 'POST',
      path: '/volc/asset/CreateAsset',
      body: {
        model: assetModelForType(input.asset_type),
        GroupId: input.group_id,
        Name: input.asset_name,
        AssetType: input.asset_type,
        URL: input.asset_url
      }
    });

    const assetId = readString(data, 'Id');
    return {
      group_id: input.group_id,
      asset_id: assetId,
      asset_ref: assetId ? `asset://${assetId}` : '',
      response_json: safeJson(data)
    };
  } catch (e: unknown) {
    return errOut(getErrText(e));
  }
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}
