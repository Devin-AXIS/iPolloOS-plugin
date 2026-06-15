import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HTML · 交互页',
    en: 'HTML · interactive page'
  },
  description: {
    'zh-CN':
      '生成可公开访问的交互式单页 HTML。页面展示方式与普通 HTML 页一致，但表单提交会回传 JSON 给当前 iPolloOS 对话，工作流继续往下执行。',
    en: 'Create a public interactive single-page HTML document. It renders like a normal HTML page, but form submission returns JSON to the current iPolloOS workflow.'
  },
  toolDescription:
    '当需要用户填写结构化信息时调用。输入 page_title + main_inner_html；HTML 中写普通 <form>、input、select、textarea、button 即可，插件会自动注入提交桥。默认自动发布为 page_url，并暂停工作流等待用户提交；提交结果从 interactive_html_result 输出继续流转。不要在 main_inner_html 中写 script。',
  versionList: [
    {
      value: '1.0.0',
      description: 'Interactive HTML page with form submit bridge',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '短标题，如「身体信息采集」'
        },
        {
          key: 'interactive_title',
          label: '交互标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '对话里展示的交互卡片标题；留空则用页面标题'
        },
        {
          key: 'interactive_description',
          label: '交互说明',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '对用户说明需要填写什么；可留空'
        },
        {
          key: 'main_inner_html',
          label: '交互 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '写 H1 下方正文。推荐只写 <form>...</form>；每个字段必须有 name。不要写 html/head/body/script。'
        },
        {
          key: 'lang',
          label: '文档语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'en', value: 'en' }
          ],
          toolDescription: 'zh-CN 或 en'
        },
        {
          key: 'color_primary',
          label: '主色 #RRGGBB',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0ea5e9'
        },
        {
          key: 'color_surface',
          label: '背景色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#f8fafc'
        },
        {
          key: 'color_text',
          label: '正文色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0f172a'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '交互页必须能公开打开。一般保持自动发布；资源中心也可以；raw_html 只用于排障。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '一般保持 auto_publish。raw_html 不会暂停交互，因为没有 page_url。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_html', label: '页面 HTML' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'page_url', label: '页面公开链接' },
        {
          valueType: WorkflowIOValueTypeEnum.object,
          key: 'interactive_html_result',
          label: '用户提交数据',
          description:
            '用户在交互页提交后的 JSON 对象。首次生成页面时为空；用户提交后继续执行时写入。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'interactive_html',
          label: '交互页标记'
        },
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
