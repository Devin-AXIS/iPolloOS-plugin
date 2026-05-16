import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'HTML · 合并多段',
    en: 'HTML · merge fragments'
  },
  description: {
    'zh-CN':
      '将多块 **HTML 片段**按顺序拼进 **body**（或仅一段且已是整页时 **原样返回**）。适合「先写一块再确认、再写一块」；与小应用多轮编辑搭配。每段勿含 `<script>`。',
    en: 'Concatenate HTML fragments into one document body, or pass through a single complete HTML file. No script tags in fragments.'
  },
  toolDescription:
    '【备选】多段拼接或整页直通：fragment_1…4；单段完整 HTML（<!DOCTYPE/<html）可直通且 page_title 可空。正文能塞进 fast_html_page 的 main_inner_html 就不要用本工具。禁止 <script>。默认自动发布：生成后上传平台存储并在对话中给出 page_url。',
  versionList: [
    {
      value: '1.2.0',
      description: 'page_html + 默认自动发布；与 fast_html_page 对齐',
      inputs: [
        {
          key: 'page_title',
          label: '包装模式下的文档标题',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          toolDescription: '仅「多段拼进 body」或单段非整页时必填；单段完整 HTML 直通时可省略'
        },
        {
          key: 'lang',
          label: 'html lang',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'zh-CN',
          list: [
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'en', value: 'en' }
          ],
          toolDescription: '外壳 <html lang>'
        },
        {
          key: 'fragment_1',
          label: '片段 1',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '第一段 HTML（可整块 section）'
        },
        {
          key: 'fragment_2',
          label: '片段 2',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选'
        },
        {
          key: 'fragment_3',
          label: '片段 3',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选'
        },
        {
          key: 'fragment_4',
          label: '片段 4',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription: '可选'
        },
        {
          key: 'between_separator',
          label: '片段之间插入的 HTML（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: '',
          toolDescription: '例如 <hr /> 分隔；勿含 script'
        },
        {
          key: 'page_output_mode',
          label: '页面输出模式',
          description:
            '默认自动发布：上传平台对象存储并在对话中返回可访问链接；选 raw_html 则仅返回 HTML 字符串。',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'auto_publish',
          list: [
            { label: '自动发布到 iPolloOS', value: 'auto_publish' },
            { label: '发布到资源中心（HTTP）', value: 'resource_center' },
            { label: '返回 HTML 字符串', value: 'raw_html' }
          ],
          toolDescription: '保持默认即可在生成后自动上传并得到链接。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '与 full_html 相同；供平台自动发布使用。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布或资源中心模式下由平台写入；raw_html 时为空。'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'full_html', label: '完整 HTML' },
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
