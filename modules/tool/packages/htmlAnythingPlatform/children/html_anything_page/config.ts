import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';
import { listTemplateOptions } from '../../lib/templates';

export default defineTool({
  name: {
    'zh-CN': 'HTML Anything · 生成发布页',
    en: 'HTML Anything · generate page'
  },
  description: {
    'zh-CN':
      '选择 html-anything 内置模板，将文本/Markdown/CSV/JSON/SQL 生成完整单文件 HTML，并默认发布到 OSS 公网域名。',
    en: 'Choose an html-anything template and generate a complete single-file HTML page for OSS publishing.'
  },
  toolDescription:
    '通过 template_id 选择 html-anything 的 75 个内置模板。必填 content。默认 page_output_mode=auto_publish，插件框架会按现有 HTML 页面上传方式发布到 OSS 公网域名并写回 page_url；除非调试，不要改 raw_html。',
  versionList: [
    {
      value: '1.2.0',
      description:
        'Generate single-file HTML with auto template routing or gallery template selection',
      inputs: [
        {
          key: 'template_id',
          label: '模板选择',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: 'auto',
          list: listTemplateOptions(),
          selectorConfig: {
            variant: 'gallery',
            title: '选择 HTML Anything 模板',
            description: '可让 AI 自动选择，也可以按类型、场景、标签搜索并手动指定模板。',
            searchPlaceholder: '搜索模板名称、ID、类型、场景或标签',
            groupBy: 'category',
            allowAuto: true,
            autoValue: 'auto',
            autoLabel: 'AI 自动选择'
          },
          toolDescription:
            '模板 ID。填 auto 时由 AI 根据 content、format 和 extra_requirements 自动选择；也可以手动选择 html-anything 内置模板。常用：saas-landing、prototype-web、dashboard、data-report、deck-swiss-international、card-xiaohongshu、poster-hero、video-hyperframes。'
        },
        {
          key: 'content',
          label: '用户内容',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '要转换成 HTML 的原始内容。可以是自然语言、Markdown、CSV、JSON、SQL、会议纪要、产品说明、数据表等。'
        },
        {
          key: 'format',
          label: '输入格式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'text',
          list: [
            { label: 'text', value: 'text' },
            { label: 'markdown', value: 'markdown' },
            { label: 'csv', value: 'csv' },
            { label: 'json', value: 'json' },
            { label: 'sql', value: 'sql' },
            { label: 'html', value: 'html' }
          ],
          toolDescription: '给 AI 的格式提示；不确定时用 text。'
        },
        {
          key: 'language',
          label: '输出语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: '中文', value: 'zh-CN' },
            { label: 'English', value: 'en' },
            { label: '日本語', value: 'ja' },
            { label: '跟随内容', value: 'auto' }
          ],
          toolDescription: '生成页面的主要语言。'
        },
        {
          key: 'extra_requirements',
          label: '额外要求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '可补充品牌色、受众、尺寸、语气、禁用外链、移动端优先等要求。不要在这里填写密钥。'
        },
        {
          key: 'edit_from_html',
          label: '已有 HTML（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '用于最小差异编辑。填写时必须同时填写 edit_from_content；留空则从 0 生成。'
        },
        {
          key: 'edit_from_content',
          label: '旧内容（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '已有 HTML 对应的旧内容。填写时必须同时填写 edit_from_html；留空则从 0 生成。'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '自动发布：按现有 HTML 页面上传方式发布到 OSS 公网域名；raw_html：仅返回 HTML。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 OSS', value: 'auto_publish' },
            { label: '仅返回 HTML', value: 'raw_html' }
          ],
          toolDescription:
            '一般保持 auto_publish；平台会上传 page_html 并写回 page_url。只有调试或下游自行托管时才选 raw_html。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件 HTML。auto_publish 时会上传到 OSS 并生成 page_url。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: 'auto_publish 后由平台写入。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档（兼容字段）'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'template_id',
          label: '模板 ID'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'template_name',
          label: '模板名称'
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
          label: '错误信息'
        }
      ]
    }
  ]
});
