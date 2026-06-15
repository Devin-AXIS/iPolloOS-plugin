import type { ChartPaletteEnum, ChartTypeEnum, DeckState } from './types';
import { escapeHtml } from './escape';
import { resolveDeckTheme } from './themes';

type ChartType = (typeof ChartTypeEnum)['_output'];
type ChartPalette = (typeof ChartPaletteEnum)['_output'];

type ChartPoint = {
  name: string;
  value: number;
  value2?: number;
};

type Palette = {
  label: string;
  accent: string;
  secondary: string;
  tertiary: string;
  surface: string;
  text: string;
  muted: string;
  series: string[];
};

const PALETTES: Record<Exclude<ChartPalette, 'theme'>, Palette> = {
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
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function rgba(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${clamp(opacity, 0, 1)})`;
}

function paletteFor(_id: ChartPalette | undefined, state: DeckState): Palette {
  const c = resolveDeckTheme(state.meta.theme_id).colors;
  return {
    label: 'Deck Theme',
    accent: c.brand_primary,
    secondary: c.brand_secondary,
    tertiary: c.brand_tertiary,
    surface: c.page_background,
    text: c.text_color,
    muted: c.muted,
    series: [...c.chart]
  };
}

export function parseChartData(raw: string | undefined): ChartPoint[] {
  const text = raw?.trim();
  if (!text) {
    return [
      { name: '2024', value: 32, value2: 18 },
      { name: '2025', value: 55, value2: 28 },
      { name: '2026', value: 75, value2: 44 },
      { name: '2027', value: 88, value2: 58 },
      { name: '2028', value: 97, value2: 72 }
    ];
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, index): ChartPoint | undefined => {
          if (typeof item === 'number') return { name: `Item ${index + 1}`, value: item };
          if (Array.isArray(item)) {
            return {
              name: String(item[0] ?? `Item ${index + 1}`),
              value: Number(item[1] ?? 0),
              value2: item[2] == null ? undefined : Number(item[2])
            };
          }
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            return {
              name: String(obj.name ?? obj.label ?? obj.x ?? `Item ${index + 1}`),
              value: Number(obj.value ?? obj.y ?? 0),
              value2: obj.value2 == null ? undefined : Number(obj.value2)
            };
          }
          return undefined;
        })
        .filter((item): item is ChartPoint => !!item && Number.isFinite(item.value));
    }
  } catch {
    // Plain text data is the common path.
  }
  return text
    .split(/\r?\n/)
    .map((line, index): ChartPoint | undefined => {
      const parts = line
        .split(/[,，|\t]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (!parts.length) return undefined;
      return {
        name: parts[0] || `Item ${index + 1}`,
        value: Number(parts[1] ?? 0),
        value2: parts[2] == null ? undefined : Number(parts[2])
      };
    })
    .filter((item): item is ChartPoint => !!item && Number.isFinite(item.value));
}

function chartOption(args: {
  state: DeckState;
  chartType: ChartType;
  chartData?: string;
  palette?: ChartPalette;
}): Record<string, unknown> {
  const points = parseChartData(args.chartData);
  const p = paletteFor(args.palette, args.state);
  const names = points.map((d) => d.name);
  const values = points.map((d) => d.value);
  const values2 = points.map((d) => d.value2 ?? Math.round(d.value * 0.72));
  const seriesColors = p.series;
  const coloredData = (vals: number[]) =>
    vals.map((value, index) => ({
      value,
      itemStyle: { color: seriesColors[index % seriesColors.length] }
    }));
  const base = {
    color: seriesColors,
    animationDuration: 700,
    textStyle: {
      fontFamily: 'Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif',
      color: p.text
    },
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      backgroundColor: rgba('#ffffff', 0.9),
      textStyle: { color: p.text },
      extraCssText: 'border-radius:14px;box-shadow:0 18px 60px rgba(15,15,15,.13);'
    },
    grid: { top: 24, right: 24, bottom: 34, left: 46, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontSize: 12 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontSize: 12 },
      splitLine: { lineStyle: { color: rgba(p.secondary, 0.12), type: 'dashed' } }
    }
  };
  const barCommon = { barWidth: 26, itemStyle: { borderRadius: [14, 14, 14, 14] } };
  const area = {
    color: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: rgba(p.accent, 0.2) },
        { offset: 1, color: rgba(p.accent, 0.02) }
      ]
    }
  };

  switch (args.chartType) {
    case 'area':
      return {
        ...base,
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 8,
            lineStyle: { width: 4, color: p.accent },
            areaStyle: area
          }
        ]
      };
    case 'bar':
      return { ...base, series: [{ type: 'bar', data: coloredData(values), ...barCommon }] };
    case 'horizontal_bar':
    case 'ranking':
      return {
        ...base,
        grid: { top: 22, right: 26, bottom: 22, left: 100, containLabel: true },
        xAxis: { ...(base.yAxis as object), type: 'value' },
        yAxis: { ...(base.xAxis as object), type: 'category', data: [...names].reverse() },
        series: [
          {
            type: 'bar',
            data: coloredData([...values].reverse()),
            barWidth: 22,
            itemStyle: { borderRadius: [0, 14, 14, 0] }
          }
        ]
      };
    case 'stacked_bar':
      return {
        ...base,
        series: [
          {
            name: 'A',
            type: 'bar',
            stack: 'total',
            data: values,
            barWidth: 26,
            itemStyle: { color: seriesColors[0], borderRadius: [0, 0, 10, 10] }
          },
          {
            name: 'B',
            type: 'bar',
            stack: 'total',
            data: values2,
            barWidth: 26,
            itemStyle: { color: seriesColors[2], borderRadius: [10, 10, 0, 0] }
          }
        ]
      };
    case 'combo':
      return {
        ...base,
        series: [
          {
            type: 'bar',
            data: values2,
            ...barCommon,
            itemStyle: { color: rgba(seriesColors[2], 0.58), borderRadius: [14, 14, 0, 0] }
          },
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 7,
            lineStyle: { width: 4, color: p.accent }
          }
        ]
      };
    case 'pie':
    case 'donut':
      return {
        ...base,
        tooltip: { ...(base.tooltip as object), trigger: 'item' },
        legend: {
          orient: 'vertical',
          left: 8,
          top: 'middle',
          textStyle: { color: p.muted, fontSize: 13 },
          itemWidth: 10,
          itemHeight: 10
        },
        series: [
          {
            type: 'pie',
            radius: args.chartType === 'donut' ? ['48%', '72%'] : ['0%', '70%'],
            center: ['62%', '52%'],
            data: points.map((d, index) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: seriesColors[index % seriesColors.length] }
            })),
            label: { show: false },
            itemStyle: { borderRadius: 10, borderColor: rgba('#ffffff', 0.72), borderWidth: 4 }
          }
        ]
      };
    case 'gauge':
    case 'progress': {
      const value = clamp(values[0] ?? 0, 0, 100);
      return {
        ...base,
        series: [
          {
            type: 'gauge',
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            progress: { show: true, roundCap: true, width: 18, itemStyle: { color: p.accent } },
            axisLine: {
              roundCap: true,
              lineStyle: { width: 18, color: [[1, rgba(seriesColors[2], 0.34)]] }
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            pointer: { show: false },
            detail: {
              valueAnimation: true,
              formatter: '{value}%',
              fontSize: 34,
              color: p.text,
              offsetCenter: [0, '18%']
            },
            data: [{ value }]
          }
        ]
      };
    }
    case 'radar':
      return {
        ...base,
        radar: {
          indicator: points.map((d) => ({ name: d.name, max: Math.max(...values) * 1.2 || 100 })),
          splitLine: { lineStyle: { color: rgba(p.secondary, 0.12) } },
          axisName: { color: p.muted },
          splitArea: { areaStyle: { color: ['transparent', rgba(p.accent, 0.04)] } }
        },
        series: [
          { type: 'radar', data: [{ value: values }], areaStyle: area, lineStyle: { width: 3 } }
        ]
      };
    case 'scatter':
    case 'bubble':
      return {
        ...base,
        xAxis: { ...(base.yAxis as object), type: 'value' },
        yAxis: { ...(base.yAxis as object), type: 'value' },
        series: [
          {
            type: 'scatter',
            symbolSize: args.chartType === 'bubble' ? 28 : 16,
            data: points.map((d, i) => ({
              value: [i + 1, d.value, d.value2 ?? d.value / 2],
              itemStyle: {
                color: rgba(seriesColors[i % seriesColors.length], 0.82),
                borderColor: rgba('#ffffff', 0.8),
                borderWidth: 2
              }
            }))
          }
        ]
      };
    case 'heatmap':
      return {
        ...base,
        visualMap: {
          show: false,
          min: 0,
          max: Math.max(...values),
          inRange: { color: [rgba(seriesColors[2], 0.18), seriesColors[0], seriesColors[1]] }
        },
        xAxis: { ...(base.xAxis as object), data: names.slice(0, 7) },
        yAxis: { ...(base.xAxis as object), data: ['A', 'B', 'C', 'D'] },
        series: [
          {
            type: 'heatmap',
            data: values.map((v, i) => [i % 7, Math.floor(i / 7) % 4, v]),
            itemStyle: { borderRadius: 8, borderWidth: 4, borderColor: 'transparent' }
          }
        ]
      };
    case 'funnel':
      return {
        ...base,
        series: [
          {
            type: 'funnel',
            left: '12%',
            top: 20,
            bottom: 20,
            width: '76%',
            gap: 8,
            label: { color: p.text },
            itemStyle: { borderRadius: 12, borderColor: rgba('#ffffff', 0.6), borderWidth: 2 },
            data: points.map((d, index) => ({
              name: d.name,
              value: d.value,
              itemStyle: { color: seriesColors[index % seriesColors.length] }
            }))
          }
        ]
      };
    case 'timeline':
      return {
        ...base,
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 10,
            lineStyle: { width: 4, color: p.accent },
            areaStyle: area,
            markPoint: { symbolSize: 36, data: [{ type: 'max', name: 'Peak' }] }
          }
        ]
      };
    case 'line':
    default:
      return {
        ...base,
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 8,
            lineStyle: { width: 4, color: p.accent }
          }
        ]
      };
  }
}

export function buildInlineChart(args: {
  state: DeckState;
  chartType?: ChartType;
  chartData?: string;
  palette?: ChartPalette;
  slot: string;
}): string {
  const id = `hs-inline-chart-${args.slot.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const option = chartOption({
    state: args.state,
    chartType: args.chartType ?? 'area',
    chartData: args.chartData,
    palette: args.palette ?? 'theme'
  });
  return `<div class="hs-inline-chart" id="${escapeHtml(id)}" data-chart-option="${escapeHtml(JSON.stringify(option))}"></div>`;
}
