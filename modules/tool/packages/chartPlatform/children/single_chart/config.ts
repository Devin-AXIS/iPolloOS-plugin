import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '图表 · 单图生成',
    en: 'Chart · single chart'
  },
  description: {
    'zh-CN':
      '生成可嵌入页面/幻灯片的高级感静态 HTML 图表。默认只输出透明图表本体：无容器、无标题/KPI、无独立页面感；需要独立展示时再手动开启标题或容器。',
    en: 'Generate a premium single-chart HTML using ECharts plus curated palettes, containers and opacity controls.'
  },
  toolDescription:
    '用户要生成图表、把图表嵌入 HTML/幻灯片时调用。默认 container=none 且 show_header=false；只取 embed_html 当页面元素，不要把 page_html 当独立页面嵌入。只有用户明确要卡片/毛玻璃时才设置 container。',
  versionList: [
    {
      value: '1.1.0',
      description: 'Default embeddable chart element: no container, no internal header/KPI',
      inputs: [
        {
          key: 'chart_type',
          label: '图表类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'area',
          list: [
            { label: '折线图', value: 'line' },
            { label: '面积折线图', value: 'area' },
            { label: '柱状图', value: 'bar' },
            { label: '横向柱状图', value: 'horizontal_bar' },
            { label: '堆叠柱状图', value: 'stacked_bar' },
            { label: '双轴柱线图', value: 'combo' },
            { label: '饼图', value: 'pie' },
            { label: '环形图', value: 'donut' },
            { label: '半圆仪表盘', value: 'gauge' },
            { label: '进度仪表', value: 'progress' },
            { label: 'KPI 数字卡', value: 'kpi' },
            { label: 'KPI 趋势卡', value: 'trend_kpi' },
            { label: '排名条形图', value: 'ranking' },
            { label: '雷达图', value: 'radar' },
            { label: '散点图', value: 'scatter' },
            { label: '气泡图', value: 'bubble' },
            { label: '热力图', value: 'heatmap' },
            { label: '漏斗图', value: 'funnel' },
            { label: '时间线图', value: 'timeline' },
            { label: '小型组合仪表盘', value: 'mini_dashboard' }
          ],
          toolDescription: '20 个常用类型之一。幻灯片里常用 area/bar/donut/gauge/kpi/ranking。'
        },
        {
          key: 'title',
          label: '标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '图表标题'
        },
        {
          key: 'subtitle',
          label: '副标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可选说明'
        },
        {
          key: 'data',
          label: '数据',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          placeholder: 'Jan,42,28\nFeb,58,33\nMar,47,40',
          toolDescription:
            '可留空使用示例数据。支持 JSON 数组 [{"name":"Jan","value":42,"value2":28}]，也支持每行 name,value,value2。'
        },
        {
          key: 'unit',
          label: '单位',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '例如 %, 万, k, 元'
        },
        {
          key: 'palette',
          label: '颜色组',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'amber_charcoal',
          list: [
            { label: '暖橙黑灰', value: 'amber_charcoal' },
            { label: '蓝色冷灰', value: 'blue_slate' },
            { label: '薄荷墨黑', value: 'mint_ink' },
            { label: '玫瑰石墨', value: 'rose_graphite' },
            { label: '紫罗兰钢灰', value: 'violet_steel' },
            { label: '金色奶油', value: 'gold_cream' }
          ],
          toolDescription: '固定 6 组高级配色，不要让智能体临时乱配色。'
        },
        {
          key: 'container',
          label: '容器样式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'none',
          list: [
            { label: '无容器/透明背景', value: 'none' },
            { label: '毛玻璃', value: 'glass' },
            { label: '软卡片', value: 'soft_card' },
            { label: '暗色卡片', value: 'dark_card' },
            { label: '纸面', value: 'paper' }
          ],
          toolDescription:
            '默认 none：只输出图表本体，融入页面/幻灯片。只有页面需要独立卡片时才选择 glass/soft_card/dark_card/paper。'
        },
        {
          key: 'show_header',
          label: '显示图表标题/KPI',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '默认关闭，只保留纯图表画布。只有单独生成图表页面时才打开。'
        },
        {
          key: 'opacity',
          label: '容器透明度 0-100',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 72,
          toolDescription: '容器透明度百分比；none 时基本无效。'
        },
        {
          key: 'fill_opacity',
          label: '图形填充透明度 0-100',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 18,
          toolDescription: '面积图/背景填充透明度。'
        },
        {
          key: 'grid_opacity',
          label: '网格透明度 0-100',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 10,
          toolDescription: '坐标网格线透明度；建议 6-14。'
        },
        {
          key: 'shadow',
          label: '阴影强度',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          defaultValue: 'medium',
          list: [
            { label: '无', value: 'none' },
            { label: '弱', value: 'soft' },
            { label: '中', value: 'medium' },
            { label: '强', value: 'strong' }
          ],
          toolDescription: '容器阴影强度。'
        },
        {
          key: 'width',
          label: '宽度',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 960,
          toolDescription: '输出 HTML 图表组件宽度，默认 960。'
        },
        {
          key: 'height',
          label: '高度',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 540,
          toolDescription: '输出 HTML 图表组件高度，默认 540。'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '一般保持自动发布，平台会根据 page_html 生成链接。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面公开链接' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'html_document', label: '完整 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'embed_html', label: '可嵌入 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
