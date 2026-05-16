export const PALETTES = {
  amber_charcoal: {
    label: '暖橙黑灰',
    accent: '#F0A12A',
    secondary: '#111111',
    tertiary: '#D8D5CE',
    surface: '#F1F2F4',
    text: '#08090A',
    muted: '#737278',
    series: ['#F0A12A', '#111111', '#D8D5CE', '#F6C46B', '#7E7C76']
  },
  blue_slate: {
    label: '蓝色冷灰',
    accent: '#3B82F6',
    secondary: '#1F2937',
    tertiary: '#C7D2FE',
    surface: '#EEF3F8',
    text: '#0F172A',
    muted: '#64748B',
    series: ['#3B82F6', '#1F2937', '#93C5FD', '#C7D2FE', '#64748B']
  },
  mint_ink: {
    label: '薄荷墨黑',
    accent: '#20C997',
    secondary: '#111827',
    tertiary: '#BFEBDD',
    surface: '#EEF5F2',
    text: '#111827',
    muted: '#687772',
    series: ['#20C997', '#111827', '#84E0C4', '#BFEBDD', '#687772']
  },
  rose_graphite: {
    label: '玫瑰石墨',
    accent: '#F05A7E',
    secondary: '#25262B',
    tertiary: '#F3C7D2',
    surface: '#F5F0F2',
    text: '#161618',
    muted: '#7A7178',
    series: ['#F05A7E', '#25262B', '#F3A5B8', '#F3C7D2', '#7A7178']
  },
  violet_steel: {
    label: '紫罗兰钢灰',
    accent: '#8B5CF6',
    secondary: '#273142',
    tertiary: '#D8C8FF',
    surface: '#F3F2F7',
    text: '#171923',
    muted: '#717384',
    series: ['#8B5CF6', '#273142', '#B9A3FF', '#D8C8FF', '#717384']
  },
  gold_cream: {
    label: '金色奶油',
    accent: '#C99728',
    secondary: '#121212',
    tertiary: '#E7D7A8',
    surface: '#F7F2E7',
    text: '#17130B',
    muted: '#786F61',
    series: ['#C99728', '#121212', '#E7D7A8', '#DDB85C', '#786F61']
  }
} as const;

export type PaletteId = keyof typeof PALETTES;

export function getPalette(id?: string) {
  return PALETTES[(id as PaletteId) || 'amber_charcoal'] ?? PALETTES.amber_charcoal;
}

export const CHART_TYPES = [
  'line',
  'area',
  'bar',
  'horizontal_bar',
  'stacked_bar',
  'combo',
  'pie',
  'donut',
  'gauge',
  'progress',
  'kpi',
  'trend_kpi',
  'ranking',
  'radar',
  'scatter',
  'bubble',
  'heatmap',
  'funnel',
  'timeline',
  'mini_dashboard'
] as const;

export type ChartType = (typeof CHART_TYPES)[number];
