import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '移动 AI 服务 · HTML 应用',
    en: 'Mobile AI service · HTML app'
  },
  description: {
    'zh-CN':
      '发布上游 AI 大脑生成的移动端优先 AI 服务 HTML，可用于短片/视频、测算、小游戏、互动表单等非纯对话应用。',
    en: 'Publish an upstream-AI-generated mobile-first AI service HTML app, suitable for short-video/video tools, divination, mini games, interactive forms, and non-chat-only experiences.'
  },
  toolDescription:
    '当用户想做一个移动端 AI 应用/服务时，上游 AI 大脑应先完成需求理解、页面设计、交互逻辑和完整单文件 HTML 生成，再调用本工具。插件本身不调用 AI、不需要 ai_app_key；generated_html 必须是真实完整 HTML，不能传原始需求或 Markdown。',
  versionList: [
    {
      value: '1.0.4',
      description: '上游 AI 大脑生成版：插件不调用模型，只校验完整 HTML 并返回页面内容',
      inputs: [
        {
          key: 'user_requirement',
          label: '用户需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '用户原始需求摘要，用于页面标题、封面和追踪；真正的完整 HTML 必须由上游 AI 大脑放入 generated_html'
        },
        {
          key: 'generated_html',
          label: '完整移动端 HTML',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '上游 AI 大脑已经生成完成的完整单文件 HTML。必须包含 <!DOCTYPE html> 或 <html>、移动端 viewport meta、<body> 和 </html>。不要传原始需求、Markdown 或“请生成页面”的说明文字。'
        },
        {
          key: 'service_language',
          label: '服务语言',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          required: true,
          defaultValue: 'zh-CN',
          list: [
            { label: '中文', value: 'zh-CN' },
            { label: 'English', value: 'en' },
            { label: '日本語', value: 'ja' },
            { label: '中英双语', value: 'zh-en' },
            { label: '跟随用户', value: 'auto' }
          ],
          toolDescription: '生成应用界面和文案的语言'
        },
        {
          key: 'background',
          label: '背景设定',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription: '业务背景、角色设定、品牌/场景上下文；这是生成应用体验的重要约束'
        },
        {
          key: 'visual_prompt',
          label: '视觉提示词（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          defaultValue:
            '移动端优先；可参考朦胧、磨砂、弥散渐变、轻微景深等质感；最终风格由上游 AI 大脑根据应用目标自行取舍。',
          toolDescription:
            '兼容字段。用于记录上游 AI 大脑生成 HTML 时采用的整体风格倾向；工具不会据此再调用 AI。'
        },
        {
          key: 'interaction_mode',
          label: '交互模式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.select],
          defaultValue: 'auto',
          list: [
            { label: 'AI 自行判断', value: 'auto' },
            { label: '生成/创作工具', value: 'creator' },
            { label: '测算/评估', value: 'assessment' },
            { label: '小游戏/挑战', value: 'game' },
            { label: '视频/短片', value: 'video' },
            { label: '表单/收集', value: 'form' }
          ],
          toolDescription: '不确定时选 auto，让上游 AI 大脑按需求自行决定'
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
          toolDescription: '一般保持 auto_publish；平台会根据 page_html 生成 page_url'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_html',
          label: '页面 HTML',
          description: '完整单文件 HTML 页面。自动发布模式下会由平台生成 page_url。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_url',
          label: '页面公开链接',
          description: '自动发布后由平台写入；raw_html 时为空。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'page_cover',
          label: '页面卡片封面',
          description: 'JSON 字符串，用于聊天端展示移动 AI 服务卡片。'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'full_html',
          label: '完整 HTML 文档（兼容旧字段）'
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
