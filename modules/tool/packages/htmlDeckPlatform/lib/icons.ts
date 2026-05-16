import { escapeHtml } from './escape';

const stroke = (d: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

/** Monochrome SVG sprites — color via wrapper `color` / currentColor. */
export const DECK_ICONS: Record<string, string> = {
  check: stroke('<path d="M20 6 9 17l-5-5"/>'),
  'arrow-right': stroke('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  'chart-bar': stroke(
    '<path d="M12 16V3"/><path d="M18 16v-3"/><path d="M6 16v-1"/><path d="M3 20h18"/>'
  ),
  sparkles: stroke(
    '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>'
  ),
  star: stroke(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  ),
  globe: stroke(
    '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
  ),
  target: stroke(
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
  ),
  layers: stroke(
    '<path d="m12.83 2.18 8.49 4.92a1 1 0 0 1 0 1.74L12.83 13.82a2 2 0 0 1-1.66 0L2.68 8.84a1 1 0 0 1 0-1.74L11.17 2.18a2 2 0 0 1 1.66 0z"/><path d="m2.68 12.84 8.49 4.92a1 1 0 0 0 1 0 1.74l-8.49 4.92a2 2 0 0 1-1.66 0L2.68 19.5a1 1 0 0 1 0-1.74l8.49-4.92a1 1 0 0 0 0-1.74L2.68 6.18a1 1 0 0 1 0-1.74l8.49-4.92a2 2 0 0 1 1.66 0z"/>'
  )
};

export const BULLET_ICON_IDS = ['check', 'arrow-right', 'chart-bar', 'sparkles', 'star'] as const;

export function iconHtml(name: string, color: string, sizePx = 22): string {
  const svg = DECK_ICONS[name] ?? DECK_ICONS.check;
  return `<span class="hs-ico" style="color:${escapeHtml(color)};width:${sizePx}px;height:${sizePx}px" role="presentation">${svg}</span>`;
}
