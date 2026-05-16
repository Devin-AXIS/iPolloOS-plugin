import JSZip from 'jszip';
import { z } from 'zod';
import { normalizeArchivePath, shouldSkipArchivePath } from '../../../lib/archiveCore';

const MAX_INPUT_FILES = 200;
const MAX_TOTAL_INPUT_BYTES = 16 * 1024 * 1024;
const MAX_ZIP_BASE64_CHARS = 24_000_000;

const FileEntrySchema = z.union([
  z.object({
    path: z.string().min(1).max(500),
    text: z.string()
  }),
  z.object({
    path: z.string().min(1).max(500),
    base64: z.string().min(1)
  })
]);

export const InputType = z.object({
  /** JSON 数组：[{ "path":"a/b.txt", "mode":"text", "text":"..." }] 或 mode base64 */
  files_json: z.string().min(2).max(50_000_000)
});

export const OutputType = z.object({
  summary: z.string(),
  zip_base64: z.string(),
  entry_count: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(props.files_json.trim());
  } catch {
    return {
      summary: '',
      zip_base64: '',
      entry_count: '0',
      system_error: 'files_json 不是合法 JSON'
    };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return {
      summary: '',
      zip_base64: '',
      entry_count: '0',
      system_error: 'files_json 必须为非空数组'
    };
  }
  if (parsed.length > MAX_INPUT_FILES) {
    return {
      summary: '',
      zip_base64: '',
      entry_count: '0',
      system_error: `文件数超过 ${MAX_INPUT_FILES}`
    };
  }

  const zip = new JSZip();
  let totalIn = 0;
  let count = 0;

  for (const raw of parsed) {
    const r = FileEntrySchema.safeParse(raw);
    if (!r.success) {
      return {
        summary: '',
        zip_base64: '',
        entry_count: '0',
        system_error: `条目校验失败：${r.error.message}`
      };
    }
    const item = r.data;
    const norm = normalizeArchivePath(item.path);
    if (!norm || shouldSkipArchivePath(norm)) {
      return {
        summary: '',
        zip_base64: '',
        entry_count: '0',
        system_error: `非法路径：${item.path}`
      };
    }

    if ('text' in item) {
      const buf = Buffer.from(item.text, 'utf8');
      totalIn += buf.length;
      if (totalIn > MAX_TOTAL_INPUT_BYTES) {
        return {
          summary: '',
          zip_base64: '',
          entry_count: '0',
          system_error: `明文总体积超过 ${MAX_TOTAL_INPUT_BYTES / 1024 / 1024}MB`
        };
      }
      zip.file(norm, buf);
    } else {
      let buf: Buffer;
      try {
        buf = Buffer.from(item.base64, 'base64');
      } catch {
        return {
          summary: '',
          zip_base64: '',
          entry_count: '0',
          system_error: `base64 解码失败：${item.path}`
        };
      }
      totalIn += buf.length;
      if (totalIn > MAX_TOTAL_INPUT_BYTES) {
        return {
          summary: '',
          zip_base64: '',
          entry_count: '0',
          system_error: `解码后总体积超过 ${MAX_TOTAL_INPUT_BYTES / 1024 / 1024}MB`
        };
      }
      zip.file(norm, buf);
    }
    count++;
  }

  let outBuf: Buffer;
  try {
    outBuf = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  } catch (e: unknown) {
    return {
      summary: '',
      zip_base64: '',
      entry_count: '0',
      system_error: e instanceof Error ? e.message : String(e)
    };
  }

  const zip_base64 = outBuf.toString('base64');
  if (zip_base64.length > MAX_ZIP_BASE64_CHARS) {
    return {
      summary: '',
      zip_base64: '',
      entry_count: '0',
      system_error: '生成的 ZIP（base64）超过输出上限，请减少文件或体积'
    };
  }

  return {
    summary: `已生成 ZIP，含 ${count} 个文件；zip_base64 为整包 base64，可落盘或再传存储。`,
    zip_base64,
    entry_count: String(count)
  };
}
