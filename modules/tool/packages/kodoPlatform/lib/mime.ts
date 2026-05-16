const MAP: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  cjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  webmanifest: 'application/manifest+json',
  xml: 'application/xml; charset=utf-8',
  wasm: 'application/wasm'
};

export function guessContentType(filename: string): string {
  const base = filename.replace(/^.*\//, '');
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return 'application/octet-stream';
  const ext = base.slice(dot + 1).toLowerCase();
  return MAP[ext] ?? 'application/octet-stream';
}
