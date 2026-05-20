import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '移动 AI 服务 · HTML 应用 V4',
    en: 'Mobile AI service · HTML app V4'
  },
  description: {
    'zh-CN':
      '根据用户描述生成移动端优先的 AI 服务 HTML，可用于短片/视频、测算、小游戏、互动表单等非纯对话应用。',
    en: 'Generate a mobile-first AI service HTML app from user intent, suitable for short-video/video tools, divination, mini games, interactive forms, and non-chat-only experiences.'
  },
  toolDescription:
    '当用户想做一个移动端 AI 应用/服务时优先调用。必填 user_requirement、service_language、background。默认只给移动端和风格倾向，具体交互形态、页面结构和服务流程由 AI 根据应用目标自行判断。输出完整单文件 HTML，返回 page_html 后平台会自动发布 page_url。',
  versionList: [
    {
      value: '4.0.0',
      description:
        'iPolloOS Runtime 版：页面内 AI、搜索、语音、图像、视频和数据库动作走真实运行时调用',
      inputs: [
        {
          key: 'user_requirement',
          label: '用户需求',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          required: true,
          toolDescription:
            '用户想做的 AI 服务/应用，例如短片生成器、视频脚本工具、测算应用、小游戏等'
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
            '移动端优先；可参考朦胧、磨砂、弥散渐变、轻微景深等质感；最终风格由 AI 根据应用目标自行取舍。',
          toolDescription: '整体风格倾向，不是硬限制；可留默认，也可写品牌色、风格、材质、动效等'
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
          toolDescription: '不确定时选 auto，让 AI 按需求自行决定'
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
          valueType: WorkflowIOValueTypeEnum.boolean,
          key: 'interactive_html',
          label: '运行时交互页标记'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'interactive_title',
          label: '运行时交互标题'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'interactive_description',
          label: '运行时交互说明'
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
