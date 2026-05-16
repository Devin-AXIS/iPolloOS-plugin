import type { IsolationScope } from './keys';

/** 交付策略：站点内「像页面一样打开」的资产 vs 更像附件的资产 */
export type DeliveryMode = 'auto' | 'browse' | 'download';

/** Next 导出 / Vite / 典型静态站的浏览器直开资源（不含 zip/pdf 等大附件语义） */
const WEBLIKE_WEB_ASSET =
  /\.(html?|css|js|mjs|cjs|json|map|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|wasm|txt|xml|xsl|xslt|tsx?|ts)$/i;

const STRONG_DOWNLOAD_EXT =
  /\.(zip|7z|rar|tar|gz|tgz|bz2|xz|pdf|docx?|xlsx?|pptx?|csv|dmg|exe|apk)$/i;

/**
 * OSS 存入对象时是否加 Content-Disposition: attachment。
 * - files：默认可下载（附件）
 * - sites：默认可在网页里打开；明显是压缩包/办公文档时仍用附件，避免整页行为怪异
 */
export function useAttachmentOnObject(
  scope: IsolationScope,
  relativeKey: string,
  mode: DeliveryMode | undefined
): boolean {
  const m = mode ?? 'auto';
  if (m === 'browse') return false;
  if (m === 'download') return true;

  /* auto */
  if (scope === 'files') return true;
  const k = relativeKey.toLowerCase();
  if (STRONG_DOWNLOAD_EXT.test(k)) return true;
  return !WEBLIKE_WEB_ASSET.test(k);
}

/** 临时 GET 签名：站点默认 inline 预览，文件默认附件下载语义 */
export function useAttachmentOnTemporaryLink(
  scope: IsolationScope,
  relativeKey: string,
  mode: DeliveryMode | undefined
): boolean {
  const m = mode ?? 'auto';
  if (m === 'browse') return false;
  if (m === 'download') return true;
  return scope === 'files' ? true : useAttachmentOnObject(scope, relativeKey, 'auto');
}

export function nextStaticExportNoteZH(): string {
  return '阿里云 OSS 只托管静态文件；需要 Node 的 Next.js SSR/ISR 不能只靠 OSS；Next 需使用静态导出（如 next.config 中 output: "export"）生成 out 目录再整站上传。';
}
