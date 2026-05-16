import { clamp, escapeHtml } from './escape';
import { type ChartPoint } from './data';
import { getPalette, type ChartType } from './theme';

export type ContainerStyle = 'none' | 'glass' | 'soft_card' | 'dark_card' | 'paper';
export type ShadowStrength = 'none' | 'soft' | 'medium' | 'strong';

export type BuildChartInput = {
  chartType: ChartType;
  title: string;
  subtitle?: string;
  unit?: string;
  points: ChartPoint[];
  paletteId?: string;
  container: ContainerStyle;
  opacity: number;
  fillOpacity: number;
  gridOpacity: number;
  shadow: ShadowStrength;
  width: number;
  height: number;
  showHeader: boolean;
  chartId?: string;
};

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

function baseOption(inp: BuildChartInput) {
  const p = getPalette(inp.paletteId);
  return {
    color: p.series,
    animationDuration: 700,
    textStyle: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
      color: p.text
    },
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      backgroundColor: rgba('#ffffff', 0.88),
      textStyle: { color: p.text },
      extraCssText:
        'backdrop-filter: blur(14px); border-radius: 14px; box-shadow: 0 18px 60px rgba(15,15,15,.13);'
    },
    grid: { top: 36, right: 24, bottom: 34, left: 46, containLabel: true },
    xAxis: {
      type: 'category',
      data: inp.points.map((d) => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontSize: 11 },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: rgba(p.secondary, inp.gridOpacity), type: 'dashed' } }
    }
  };
}

function optionFor(inp: BuildChartInput): Record<string, unknown> {
  const p = getPalette(inp.paletteId);
  const seriesColors = p.series;
  const names = inp.points.map((d) => d.name);
  const values = inp.points.map((d) => d.value);
  const values2 = inp.points.map((d) => d.value2 ?? Math.round(d.value * 0.72));
  const base = baseOption(inp);
  const coloredData = (vals: number[]) =>
    vals.map((value, index) => ({
      value,
      itemStyle: { color: seriesColors[index % seriesColors.length] }
    }));
  const barCommon = { barWidth: 22, itemStyle: { borderRadius: [12, 12, 12, 12] } };
  const area = {
    color: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: rgba(p.accent, inp.fillOpacity) },
        { offset: 1, color: rgba(p.accent, 0.02) }
      ]
    }
  };

  switch (inp.chartType) {
    case 'area':
      return {
        ...base,
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 8,
            lineStyle: { width: 4 },
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
        grid: { top: 22, right: 26, bottom: 22, left: 72, containLabel: true },
        xAxis: { ...base.yAxis, type: 'value' },
        yAxis: { ...base.xAxis, type: 'category', data: [...names].reverse() },
        series: [
          {
            type: 'bar',
            data: coloredData([...values].reverse()),
            barWidth: 18,
            itemStyle: { borderRadius: [0, 12, 12, 0] }
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
            barWidth: 22,
            itemStyle: { borderRadius: [0, 0, 10, 10], color: seriesColors[0] }
          },
          {
            name: 'B',
            type: 'bar',
            stack: 'total',
            data: values2,
            barWidth: 22,
            itemStyle: { borderRadius: [10, 10, 0, 0], color: seriesColors[2] }
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
            itemStyle: { borderRadius: [12, 12, 0, 0], color: rgba(seriesColors[2], 0.56) }
          },
          {
            type: 'line',
            data: values,
            smooth: true,
            symbolSize: 7,
            lineStyle: { width: 4, color: seriesColors[0] }
          }
        ]
      };
    case 'pie':
    case 'donut':
      return {
        ...base,
        tooltip: { ...base.tooltip, trigger: 'item' },
        legend: {
          orient: 'vertical',
          left: 8,
          top: 'middle',
          textStyle: { color: p.muted, fontSize: 12 },
          itemWidth: 10,
          itemHeight: 10
        },
        series: [
          {
            type: 'pie',
            radius: inp.chartType === 'donut' ? ['50%', '72%'] : ['0%', '70%'],
            center: ['62%', '52%'],
            data: inp.points.map((d, index) => ({
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
            progress: {
              show: true,
              roundCap: true,
              width: 18,
              itemStyle: { color: seriesColors[0] }
            },
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
              formatter: `{value}${inp.unit || '%'}`,
              fontSize: 34,
              color: p.text,
              offsetCenter: [0, '18%']
            },
            data: [{ value }]
          }
        ]
      };
    }
    case 'kpi':
    case 'trend_kpi':
      return {
        ...base,
        series: [
          {
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 4 },
            areaStyle: area
          }
        ]
      };
    case 'radar':
      return {
        ...base,
        radar: {
          indicator: inp.points.map((d) => ({
            name: d.name,
            max: Math.max(...values) * 1.2 || 100
          })),
          splitLine: { lineStyle: { color: rgba(p.secondary, inp.gridOpacity) } },
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
        xAxis: { ...base.yAxis, type: 'value' },
        yAxis: { ...base.yAxis, type: 'value' },
        series: [
          {
            type: 'scatter',
            symbolSize: inp.chartType === 'bubble' ? 28 : 16,
            data: inp.points.map((d, i) => ({
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
        xAxis: { ...base.xAxis, data: names.slice(0, 7) },
        yAxis: { ...base.xAxis, data: ['A', 'B', 'C', 'D'] },
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
            data: inp.points.map((d, index) => ({
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
            lineStyle: { width: 4 },
            areaStyle: area,
            markPoint: { symbolSize: 36, data: [{ type: 'max', name: 'Peak' }] }
          }
        ]
      };
    case 'mini_dashboard':
      return {
        ...base,
        series: [
          { type: 'bar', data: coloredData(values2), ...barCommon, xAxisIndex: 0, yAxisIndex: 0 },
          {
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 4 },
            areaStyle: area
          }
        ]
      };
    case 'line':
    default:
      return {
        ...base,
        series: [
          { type: 'line', data: values, smooth: true, symbolSize: 8, lineStyle: { width: 4 } }
        ]
      };
  }
}

function shadowCss(strength: ShadowStrength): string {
  if (strength === 'none') return 'none';
  if (strength === 'soft') return '0 18px 50px rgba(18, 20, 24, .10)';
  if (strength === 'strong') return '0 38px 90px rgba(18, 20, 24, .24)';
  return '0 28px 72px rgba(18, 20, 24, .16)';
}

export function buildChartEmbedHtml(inp: BuildChartInput): string {
  const p = getPalette(inp.paletteId);
  const option = optionFor(inp);
  const containerOpacity = clamp(inp.opacity, 0, 1);
  const isNone = inp.container === 'none';
  const isDark = inp.container === 'dark_card';
  const chartId = (inp.chartId || `fg-chart-${Math.random().toString(36).slice(2, 10)}`).replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  );
  const cardBg =
    inp.container === 'glass'
      ? rgba('#ffffff', containerOpacity)
      : inp.container === 'paper'
        ? rgba('#FBFAF7', containerOpacity)
        : isDark
          ? rgba('#111111', Math.max(containerOpacity, 0.72))
          : rgba('#ffffff', containerOpacity);
  const pageBg = isNone ? 'transparent' : p.surface;
  const textColor = isDark ? '#F8FAFC' : p.text;
  const mutedColor = isDark ? 'rgba(248,250,252,.62)' : p.muted;
  const kpi = inp.points[0]?.value ?? 0;
  const headerHtml = inp.showHeader
    ? `<header class="fg-chart-head">
    <div>
      <h3 class="fg-chart-title">${escapeHtml(inp.title || 'Chart')}</h3>
      ${inp.subtitle ? `<p class="fg-chart-sub">${escapeHtml(inp.subtitle)}</p>` : ''}
    </div>
    <div class="fg-chart-stat">
      <div class="fg-chart-kpi">${escapeHtml(kpi)}${inp.unit ? `<small>${escapeHtml(inp.unit)}</small>` : ''}</div>
      <div class="fg-chart-pill">${escapeHtml(getPalette(inp.paletteId).label)}</div>
    </div>
  </header>`
    : '';
  const chartTop = inp.showHeader ? (isNone ? '72px' : '96px') : isNone ? '0' : '24px';
  const chartLeft = isNone ? '0' : '28px';
  const chartRight = isNone ? '0' : '28px';
  const chartBottom = isNone ? '0' : '24px';

  return `<div class="fg-chart-root fg-chart-container-${inp.container}" data-chart-id="${chartId}">
<style>
.fg-chart-root[data-chart-id="${chartId}"]{
  --accent:${p.accent};
  --ink:${textColor};
  --muted:${mutedColor};
  --surface:${pageBg};
  --card-bg:${cardBg};
  --card-border:${isDark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.72)'};
  --shadow:${shadowCss(inp.shadow)};
  width:100%;
  max-width:${inp.width}px;
  height:${inp.height}px;
  position:relative;
  color:var(--ink);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;
  box-sizing:border-box;
  ${isNone ? 'background:transparent;' : `background:var(--card-bg);border:1px solid var(--card-border);border-radius:34px;box-shadow:var(--shadow);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);padding:24px 28px;`}
}
.fg-chart-root[data-chart-id="${chartId}"] *{box-sizing:border-box}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-head{height:72px;display:flex;justify-content:space-between;gap:24px;align-items:flex-start;${isNone ? 'padding:0 4px;' : ''}}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-title{margin:0;font-size:24px;line-height:1.2;font-weight:750;letter-spacing:0;color:var(--ink)}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-sub{margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--muted)}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-stat{text-align:right}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-kpi{font-size:38px;font-weight:760;letter-spacing:0;line-height:1;color:var(--ink);white-space:nowrap}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-kpi small{font-size:15px;font-weight:520;color:var(--muted);margin-left:6px}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-pill{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;background:${isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.64)'};color:var(--muted);font-size:12px;box-shadow:inset 0 0 0 1px ${isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.04)'}}
.fg-chart-root[data-chart-id="${chartId}"] .fg-chart-canvas{position:absolute;left:${chartLeft};right:${chartRight};top:${chartTop};bottom:${chartBottom};min-height:120px;}
</style>
${headerHtml}
<div class="fg-chart-canvas" id="${chartId}"></div>
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<script>
(function(){
  const mount = document.getElementById(${JSON.stringify(chartId)});
  const option = ${JSON.stringify(option)};
  function render(){
    if (!mount || !window.echarts) return;
    const chart = echarts.init(mount, null, { renderer: 'svg' });
    chart.setOption(option);
    window.addEventListener('resize', function(){ chart.resize(); });
  }
  if (window.echarts) render();
  else window.addEventListener('load', render, { once: true });
})();
</script>
</div>`;
}

export function buildChartHtml(inp: BuildChartInput): string {
  const p = getPalette(inp.paletteId);
  const isNone = inp.container === 'none';
  const embed = buildChartEmbedHtml(inp);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(inp.title || 'Chart')}</title>
<style>
html,body{margin:0;min-height:100%;background:${isNone ? 'transparent' : p.surface};}
body{${isNone ? 'padding:0;' : 'display:grid;place-items:center;padding:42px;'}}
</style>
</head>
<body>
${embed}
</body>
</html>`;
}
