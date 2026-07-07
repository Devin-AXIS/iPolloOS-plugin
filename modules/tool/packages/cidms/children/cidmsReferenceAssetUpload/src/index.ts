import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { CidmsAuthFields } from '../../../lib/schemas';
import {
  runReferenceAssetUpload,
  type ReferenceAssetPurpose
} from '../../../lib/referenceAsset';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);
const AssetPurposeEnum = z.enum(['character_reference', 'background_reference', 'continuation_video']);

export const InputType = CidmsAuthFields.and(
  z.object({
    asset_purpose: AssetPurposeEnum.default('character_reference'),
    asset_url: z.string().url().max(4096),
    asset_name: z.preprocess(empty, z.string().max(512).optional()).default('')
  })
);

export const OutputType = z.object({
  group_id: z.string(),
  asset_id: z.string(),
  asset_ref: z.string(),
  asset_type: z.enum(['Image', 'Video']),
  usage_hint: z.string(),
  response_json: z.string(),
  system_error: z.string().optional()
});

type Out = z.infer<typeof OutputType>;

function errOut(system_error: string): Out {
  return {
    group_id: '',
    asset_id: '',
    asset_ref: '',
    asset_type: 'Image',
    usage_hint: '',
    response_json: '{}',
    system_error
  };
}

export async function tool(raw: z.infer<typeof InputType>): Promise<Out> {
  try {
    const input = InputType.parse(raw);
    return await runReferenceAssetUpload({
      ...input,
      asset_purpose: input.asset_purpose as ReferenceAssetPurpose
    });
  } catch (e: unknown) {
    return errOut(getErrText(e));
  }
}
