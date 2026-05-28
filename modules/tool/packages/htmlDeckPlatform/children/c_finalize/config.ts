import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '高级 · 幻灯片导出网页',
    en: 'Advanced · finalize deck HTML'
  },
  description: {
    'zh-CN':
      '高级收尾工具：把当前 `deck_state` 合并为完整单文件 HTML。普通生成请优先使用「幻灯片 · 生成整套」。',
    en: 'Merges deck_state into one HTML file inside the plugin runtime. By default auto-publishes to the platform object store (same contract as html-kit) and fills page_url.'
  },
  toolDescription:
    '【收尾·仅一次】传入「添加一页」后的 deck_state，输出完整 HTML（deck-stage 翻页）。默认 auto_publish 得 page_url。全册已锁定 theme_id，勿换色。有 mermaid 页时 embed_mermaid=true。',
  versionList: [
    {
      value: '2.1.0',
      description: '页面输出约定：page_html + page_output_mode，自动发布到平台 OSS',
      inputs: [
        {
          key: 'deck_state',
          label: 'deck_state',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '最后一步 add_slide 返回的完整 deck_state JSON 字符串'
        },
        {
          key: 'embed_mermaid',
          label: '嵌入 Mermaid（有流程图页时建议开启）',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          required: true,
          defaultValue: true,
          toolDescription: '含 mermaid_focus 页时填 true；否则可 false 以减小体积'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '自动发布：上传平台对象存储并输出 page_url；资源中心：POST 到 PAGE_RESOURCE_CENTER_PUBLISH_URL；raw_html：仅返回 HTML。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '与 html-kit 一致；一般保持自动发布，幻灯片 HTML 走同一套公共存储。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件 HTML；自动发布模式下会参与生成 page_url。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'html_document',
          label: '完整 HTML（兼容字段）',
          description: '与 page_html 相同，保留给旧工作流引用。'
        },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'slide_count', label: '总页数' },
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
