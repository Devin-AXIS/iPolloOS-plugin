import { z } from 'zod';
import { decompressArchiveBuffer } from '../../../lib/decompressArchive';
import { resolveArchiveToBuffer } from '../../../lib/resolveArchiveSource';

const DEFAULT_MAX_UNCOMPRESSED_MB = 12;
const DEFAULT_MAX_FILES = 60;
const MAX_RESPONSE_JSON_CHARS = 1_800_000;

const optInt = (max: number) =>
  z.preprocess(
    (x) => (x === '' || x === null || x === undefined ? undefined : x),
    z.coerce.number().int().positive().max(max).optional()
  );

export const InputType = z.object({
  archive_url: z.string().optional(),
  archive_base64: z.string().optional(),
  /** 工作流「文件」连线：URL 字符串、存储 key（由主应用换签）、或 JSON 数组 / [{url|key}] */
  archive_files: z.any().optional(),
  max_uncompressed_mb: optInt(500),
  max_files: optInt(5000)
});

export const OutputType = z.object({
  summary: z.string(),
  files_json: z.string(),
  file_count: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  const inp = InputType.safeParse(props);
  if (!inp.success) {
    return {
      summary: '',
      files_json: '[]',
      file_count: '0',
      system_error: inp.error.message
    };
  }

  const maxUnc = (inp.data.max_uncompressed_mb ?? DEFAULT_MAX_UNCOMPRESSED_MB) * 1024 * 1024;
  const maxFiles = inp.data.max_files ?? DEFAULT_MAX_FILES;

  const resolved = await resolveArchiveToBuffer({
    archive_url: inp.data.archive_url,
    archive_base64: inp.data.archive_base64,
    archive_files: inp.data.archive_files
  });
  if (!resolved.ok) {
    return { summary: '', files_json: '[]', file_count: '0', system_error: resolved.system_error };
  }

  const out = await decompressArchiveBuffer(resolved.buf, {
    maxUncompressedBytes: maxUnc,
    maxFiles,
    maxResponseJsonChars: MAX_RESPONSE_JSON_CHARS
  });

  if (!out.ok) {
    return { summary: '', files_json: '[]', file_count: '0', system_error: out.system_error };
  }

  return out;
}
