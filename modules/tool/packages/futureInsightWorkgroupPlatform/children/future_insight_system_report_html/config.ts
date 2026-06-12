import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '未来洞察系统 · 每日报告',
    en: 'Future Insight System · daily report'
  },
  description: {
    'zh-CN':
      '把上游 AI/Agent 检索和分析后的结构化内容，渲染成稳定但可自然伸缩的未来洞察单页 HTML 报告。',
    en: 'Render structured daily intelligence into a stable, fluid single-file HTML report.'
  },
  toolDescription:
    '未来洞察工作组里的第一个系统。上游 AI 负责检索新闻、政策、资本、技术、竞品和行动建议，并填写 report_json；本工具只做确定性排版：封面、今日结论、新闻墙、关键信号、趋势雷达、视觉线索、影响判断、7 天行动清单、来源。封面必须尽量有内容相关图片：上游应先调用生图插件生成 16:10 或 4:3 图片，并把图片 URL 写入 report_json.cover.visual.imageUrl；本工具会把图片作为封面底部隐约背景。趋势雷达可用 report_json.radar.visual.imageUrl 展示生成图；如内容需要额外图片，可把 1 到 2 张图片写入 report_json.visuals 或 report_json.imagePanels。不要让上游直接调用 HTML Anything 生成自由页面；这里的价值是稳定结构 + 流式自适应布局。',
  versionList: [
    {
      value: '0.6.2',
      description:
        'Future insight daily report renderer with refined editorial cover composition and optional generated image panels',
      inputs: [
        {
          key: 'industry',
          label: '行业/主题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '报告关注的行业、主题或长期监控方向。'
        },
        {
          key: 'prepared_for',
          label: '报告对象',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '选填；用于封面上的“给谁的每日简报”。为空时自动使用行业或默认文案。'
        },
        {
          key: 'competitors',
          label: '重点竞品',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '可以是逗号分隔字符串，也可以是 JSON 数组；用于竞争信号和行动建议。'
        },
        {
          key: 'regions',
          label: '重点地区',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          toolDescription: '例如全球、中国、北美、欧洲、东南亚。'
        },
        {
          key: 'report_json',
          label: '结构化报告 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue: '',
          required: true,
          toolDescription:
            '必填。上游 AI 按固定 sections 写入 cover、verdict、newsWall、signals、radar、visuals、impacts、actions、sources；缺失字段会由插件补齐。封面图 URL 放入 cover.visual.imageUrl；趋势雷达图 URL 放入 radar.visual.imageUrl；额外 1 到 2 张内容图可放入 visuals 或 imagePanels。内容风格固定为杂志式未来洞察报告。'
        },
        {
          key: 'report_date',
          label: '报告日期',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '可选；为空时按服务端当前日期生成中文日期。'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription:
            '一般保持 auto_publish；平台会上传 page_html 并写回 page_url。resource_center 需要服务端配置 PAGE_RESOURCE_CENTER_PUBLISH_URL。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件 HTML。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_cover',
          label: '页面卡片',
          description: 'JSON 字符串。聊天端可用它渲染未来洞察报告卡片。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'summary',
          label: '摘要'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
