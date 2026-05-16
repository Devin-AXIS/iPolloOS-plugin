import { z } from 'zod';
import { mixHex } from './colors';
import type { DeckState } from './types';

export const DECK_THEME_IDS = [
  'huashu_editorial',
  'guizang_ink',
  'guizang_indigo',
  'guizang_swiss_blue',
  'guizang_forest'
] as const;

export const ThemeIdEnum = z.enum(DECK_THEME_IDS);
export type DeckThemeId = z.infer<typeof ThemeIdEnum>;

/** Full fixed color group per theme — charts & icons read from here only. */
export type ThemeColorGroup = {
  brand_primary: string;
  brand_secondary: string;
  brand_tertiary: string;
  page_background: string;
  text_color: string;
  muted: string;
  /** Five icon tints (bullets / decorations cycle). */
  icon: [string, string, string, string, string];
  /** ECharts series (same family as theme). */
  chart: [string, string, string, string, string];
};

export type DeckThemePack = {
  id: DeckThemeId;
  label: string;
  labelEn: string;
  source: string;
  hint: string;
  colors: ThemeColorGroup;
};

function group(
  primary: string,
  secondary: string,
  tertiary: string,
  paper: string,
  ink: string
): ThemeColorGroup {
  const muted = mixHex(ink, paper, 0.55);
  const icon: ThemeColorGroup['icon'] = [primary, secondary, tertiary, muted, primary];
  const chart: ThemeColorGroup['chart'] = [
    primary,
    secondary,
    tertiary,
    mixHex(primary, paper, 0.45),
    muted
  ];
  return {
    brand_primary: primary,
    brand_secondary: secondary,
    brand_tertiary: tertiary,
    page_background: paper,
    text_color: ink,
    muted,
    icon,
    chart
  };
}

export const DECK_THEMES: Record<DeckThemeId, DeckThemePack> = {
  huashu_editorial: {
    id: 'huashu_editorial',
    label: '花叔刊物',
    labelEn: 'Huashu editorial',
    source: 'huashu-design',
    hint: 'B2B / 产品发布；不确定首选',
    colors: group('#b42318', '#111827', '#d0a85c', '#f7f1e8', '#171717')
  },
  guizang_ink: {
    id: 'guizang_ink',
    label: '归藏·墨水',
    labelEn: 'Guizang ink',
    source: 'guizang-ppt-skill',
    hint: '通用商业 / Monocle 纸墨',
    colors: group('#0a0a0b', '#18181a', '#e8e5de', '#f1efea', '#0a0a0b')
  },
  guizang_indigo: {
    id: 'guizang_indigo',
    label: '归藏·靛蓝',
    labelEn: 'Guizang indigo',
    source: 'guizang-ppt-skill',
    hint: '技术 / 数据 / 研究',
    colors: group('#0a1f3d', '#152a4a', '#e4e8ec', '#f1f3f5', '#0a1f3d')
  },
  guizang_swiss_blue: {
    id: 'guizang_swiss_blue',
    label: '归藏·克莱因蓝',
    labelEn: 'Guizang Swiss IKB',
    source: 'guizang-ppt-skill',
    hint: '瑞士极简 / 设计发布',
    colors: group('#002fa7', '#0a0a0a', '#d4d4d2', '#fafaf8', '#0a0a0a')
  },
  guizang_forest: {
    id: 'guizang_forest',
    label: '归藏·森林',
    labelEn: 'Guizang forest',
    source: 'guizang-ppt-skill',
    hint: '人文 / 可持续',
    colors: group('#1a2e1f', '#253d2c', '#ece7da', '#f5f1e8', '#1a2e1f')
  }
};

export function resolveDeckTheme(id: string | undefined): DeckThemePack {
  const key = (id?.trim() as DeckThemeId) || 'huashu_editorial';
  return DECK_THEMES[key] ?? DECK_THEMES.huashu_editorial;
}

export function themeToDeckStateTheme(pack: DeckThemePack): DeckState['theme'] {
  const c = pack.colors;
  return {
    brand_primary: c.brand_primary,
    brand_secondary: c.brand_secondary,
    brand_tertiary: c.brand_tertiary,
    page_background: c.page_background,
    text_color: c.text_color
  };
}

export function themeCssVars(pack: DeckThemePack): string {
  const c = pack.colors;
  const iconVars = c.icon.map((hex, i) => `  --hs-icon-${i}: ${hex};`).join('\n');
  const chartVars = c.chart.map((hex, i) => `  --hs-chart-${i}: ${hex};`).join('\n');
  return `--hs-primary: ${c.brand_primary};
  --hs-secondary: ${c.brand_secondary};
  --hs-tertiary: ${c.brand_tertiary};
  --hs-page-bg: ${c.page_background};
  --hs-text: ${c.text_color};
  --hs-muted: ${c.muted};
${iconVars}
${chartVars}`;
}

export function themeSelectList() {
  return DECK_THEME_IDS.map((id) => ({
    label: DECK_THEMES[id].label,
    value: id
  }));
}

export function themeGuideForAgent(): string {
  return DECK_THEME_IDS.map((id) => `${id}: ${DECK_THEMES[id].hint}`).join(' | ');
}
