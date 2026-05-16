import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HTML · 一键整页（推荐）',
    en: 'HTML · one-shot page (recommended)'
  },
  description: {
    'zh-CN':
      '**默认应使用本工具**：一次调用得到可保存的完整单文件 HTML。默认移动端优先自适应，并支持中文 / English 切换。',
    en: 'Preferred default: one tool call returns a complete mobile-first responsive HTML page with optional Chinese / English switching.'
  },
  toolDescription:
    '【优先调用本函数 fast_html_page】一次调用拿 page_html/full_html。默认必须按移动端优先设计：先保证 360-430px 手机宽度可读、按钮可点、内容不横向溢出，再兼容平板和桌面。必填：page_title、main_inner_html。默认同时提供英文版：填写 page_title_en、heading_h1_en、main_inner_html_en，插件会生成中文 / EN 切换；除非用户明确只要单语言。page_html 是页面输出约定字段；默认自动发布为 page_url，也可切到 raw_html 后由下游 OSS 节点处理。full_html 为兼容旧工作流保留。main_inner_html=H1 下方全部正文（section/div/列表等），勿包整页外壳；禁 <script>。可选 heading_h1、lang、三色、favicon。勿拆成 page_init→merge 除非正文超长。',
  versionList: [
    {
      value: '1.0.0',
      description: 'One-shot themed page; function name sorts before other html-kit tools',
      inputs: [
        {
          key: 'page_title',
          label: '页面标题（<title>）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          toolDescription: '短字符串即可，如「产品说明」'
        },
        {
          key: 'heading_h1',
          label: '主标题 H1（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '留空则与 page_title 相同'
        },
        {
          key: 'page_title_en',
          label: '英文页面标题（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '默认请填写英文标题，用于页面语言切换；用户明确只要中文时可留空'
        },
        {
          key: 'heading_h1_en',
          label: '英文主标题 H1（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '默认请填写英文 H1；留空则使用 page_title_en'
        },
        {
          key: 'main_inner_html',
          label: '正文 HTML（H1 下方整块）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '把中文正文都写在这里；可多级标题从 h2 写起；勿含 script；不要写外层 html/head/body。默认移动端优先：使用流式布局、可换行文字、响应式图片/网格，不要固定桌面宽度'
        },
        {
          key: 'main_inner_html_en',
          label: '英文正文 HTML（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '默认请填写英文正文翻译，用于中文 / EN 切换；结构应与中文正文一致；勿含 script；不要写外层 html/head/body'
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
          defaultValue: '#0ea5e9',
          toolDescription: '可不填，用默认蓝'
        },
        {
          key: 'color_surface',
          label: '背景色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#f8fafc',
          toolDescription: '可不填'
        },
        {
          key: 'color_text',
          label: '正文色',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '#0f172a',
          toolDescription: '可不填'
        },
        {
          key: 'favicon_mode',
          label: 'Favicon',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'none',
          list: [
            { label: 'none', value: 'none' },
            { label: 'https URL', value: 'url' },
            { label: 'emoji', value: 'emoji' }
          ],
          toolDescription: '一般选 none 即可；要图标再选 url 或 emoji'
        },
        {
          key: 'favicon_url',
          label: 'Favicon 图片 URL',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '仅 favicon_mode=url，须 https://'
        },
        {
          key: 'favicon_emoji',
          label: 'Favicon Emoji',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '仅 favicon_mode=emoji，填一个 emoji'
        },
        {
          key: 'include_lucide_cdn_hint',
          label: '附带 Lucide 注释',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '多数情况 false'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '自动发布：上传平台对象存储；资源中心：POST 到 PAGE_RESOURCE_CENTER_PUBLISH_URL；raw_html：仅返回 HTML，由下游自行托管。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription:
            '一般保持 auto_publish；统一走你们提供的资源中心时选 resource_center（需服务端环境变量）；自有 OSS 选 raw_html'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件 HTML 页面。自动发布模式下会由 iPolloOS 生成 page_url。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档（兼容旧字段）'
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
