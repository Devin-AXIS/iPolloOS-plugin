import decompress from 'decompress';
import {
  bufferToPayload,
  guessMimeFromPath,
  normalizeArchivePath,
  shouldSkipArchivePath
} from './archiveCore';

export type DecompressArchiveOptions = {
  maxUncompressedBytes: number;
  maxFiles: number;
  maxResponseJsonChars: number;
};

export type DecompressOk = {
  ok: true;
  summary: string;
  files_json: string;
  file_count: string;
};

export type DecompressErr = { ok: false; system_error: string };

type FileEntry = {
  path: string;
  size: number;
  mime: string;
  mode: 'text' | 'base64';
  text?: string;
  base64?: string;
};

/** Strip data URL prefix if present */
export function stripDataUrlBase64(s: string): string {
  const t = s.trim();
  const m = /^data:[^;]+;base64,(.+)$/i.exec(t);
  return m ? m[1]!.replace(/\s/g, '') : t.replace(/\s/g, '');
}

export async function decompressArchiveBuffer(
  buf: Buffer,
  opt: DecompressArchiveOptions
): Promise<DecompressOk | DecompressErr> {
  if (buf.length < 2) {
    return { ok: false, system_error: '压缩包内容为空' };
  }

  const extracted: { path: string; data: Buffer }[] = [];
  try {
    const files = await decompress(buf);
    let total = 0;
    for (const f of files) {
      if (f.type === 'directory') continue;
      const p = normalizeArchivePath(f.path);
      if (!p || shouldSkipArchivePath(p)) continue;
      if (f.data === undefined || f.data === null) continue;
      const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data as Uint8Array);
      total += data.length;
      if (total > opt.maxUncompressedBytes) {
        return {
          ok: false,
          system_error: `解压后总大小超过上限（${Math.round(opt.maxUncompressedBytes / 1024 / 1024)}MB）`
        };
      }
      extracted.push({ path: p, data });
    }
  } catch (e: unknown) {
    return {
      ok: false,
      system_error: `解压失败（支持 zip / tar / tar.gz 等）：${e instanceof Error ? e.message : String(e)}`
    };
  }

  if (extracted.length === 0) {
    return { ok: false, system_error: '包内无可用文件（或仅目录 / 已过滤 macOS 元数据）' };
  }
  if (extracted.length > opt.maxFiles) {
    return {
      ok: false,
      system_error: `文件数 ${extracted.length} 超过上限 ${opt.maxFiles}`
    };
  }

  const entries: FileEntry[] = [];
  for (const { path, data } of extracted) {
    const mime = guessMimeFromPath(path);
    const payload = bufferToPayload(data);
    entries.push({
      path,
      size: data.length,
      mime,
      mode: payload.mode === 'text' ? 'text' : 'base64',
      ...(payload.mode === 'text' ? { text: payload.text } : { base64: payload.base64 })
    });
  }

  const files_json = JSON.stringify(entries);
  if (files_json.length > opt.maxResponseJsonChars) {
    return {
      ok: false,
      system_error: '展开后 JSON 体积过大。请缩小压缩包、减少文件数，或只解压小文本文件。'
    };
  }

  return {
    ok: true,
    summary: `已解压 ${entries.length} 个文件；详情见 files_json（text 为小文本，base64 为二进制）。`,
    files_json,
    file_count: String(entries.length)
  };
}
