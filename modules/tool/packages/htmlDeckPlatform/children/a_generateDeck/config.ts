import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { themeGuideForAgent, themeSelectList } from '../../lib/themes';

export default defineTool({
  name: {
    'zh-CN': '幻灯片 · 生成整套',
    en: 'Deck · generate complete deck'
  },
  description: {
    'zh-CN':
      '主入口：选择主题，输入提纲/资料，一次生成完整 HTML 幻灯片。主题内置字体、色系、图标、图表配色和排版规则。',
    en: 'Main entry: choose a theme and outline, then generate a complete HTML deck.'
  },
  toolDescription: `【首选主工具】只调用一次。输入 deck_title、theme_id（五选一，不填则由你判断：${themeGuideForAgent()}）和 deck_outline。插件会自动创建 deck、拆页、选择版式、统一主题图标/图表颜色，并输出最终 page_html/page_url。只有需要精修单页时才改用高级工具。`,
  versionList: [
    {
      value: '1.0.0',
      description: 'One-call themed deck generation',
      inputs: [
        {
          key: 'deck_title',
          label: '演示标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '整套幻灯片标题'
        },
        {
          key: 'theme_id',
          label: '主题（五选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          list: themeSelectList(),
          toolDescription: '整套主题包；包含字体、色系、图标、图表配色与排版规则'
        },
        {
          key: 'deck_outline',
          label: '内容提纲 / 资料',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          placeholder: '# 背景\n- 要点一\n- 要点二\n\n---\n\n# 架构\n- 模块\n- 链路',
          toolDescription:
            'Markdown 或普通文本。用标题/空行/--- 分段；插件会按段落生成页面。无需传颜色、图标或 HTML。'
        },
        {
          key: 'slide_count',
          label: '目标页数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 8,
          toolDescription: '建议 6-12 页；插件会包含封面与收尾页'
        },
        {
          key: 'audience',
          label: '受众 / 场景',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '例如：开发者、客户、内部评审；用于摘要和页脚语义'
        },
        {
          key: 'embed_mermaid',
          label: '嵌入 Mermaid',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: true,
          toolDescription: '提纲包含 mermaid 代码块时保持 true'
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
          toolDescription: '一般保持自动发布'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面公开链接' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'html_document',
          label: '完整 HTML（兼容字段）'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'full_html', label: '完整 HTML' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'deck_state',
          label: 'deck_state（高级精修用）'
        },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'slide_count', label: '总页数' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_id', label: '主题 id' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'theme_label', label: '主题名' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'image_requests_json',
          label: '待生成配图请求'
        },
        {
          valueType: WorkflowIOValueTypeEnum.number,
          key: 'pending_image_count',
          label: '待生成配图数'
        },
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
