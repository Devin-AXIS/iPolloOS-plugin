const sensitivePatterns: Array<[RegExp, string]> = [
  [/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^\s)"'<>]+/gi, '[社交平台链接]'],
  [/\b(?:www\.)?(?:x|twitter)\.com\/[^\s)"'<>]+/gi, '[社交平台链接]'],
  [/\bX\/Twitter\b/gi, '社交平台'],
  [/\bTwitter\b/gi, '社交平台'],
  [/推特/g, '社交平台']
];

export function shouldMaskSensitiveInfo(input: { mask_sensitive_info?: unknown }): boolean {
  if (typeof input.mask_sensitive_info === 'string') {
    return input.mask_sensitive_info.toLowerCase() !== 'false';
  }
  return input.mask_sensitive_info !== false;
}

export function sanitizeText(value: string, enabled = true): string {
  if (!enabled) return value;
  return sensitivePatterns.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  );
}

export function sanitizeObject<T>(value: T, enabled = true): T {
  if (!enabled) return value;
  if (typeof value === 'string') return sanitizeText(value, enabled) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeObject(item, enabled)) as T;
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      sanitizeObject(child, enabled)
    ])
  ) as T;
}

export function sanitizeOutput<T>(input: { mask_sensitive_info?: unknown }, output: T): T {
  return sanitizeObject(output, shouldMaskSensitiveInfo(input));
}
