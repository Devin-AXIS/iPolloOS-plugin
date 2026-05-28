import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'HyperFrames 视频',
    en: 'HyperFrames Video'
  },
  description: {
    'zh-CN':
      'HyperFrames 视频工程生成与渲染工具集：AI 生成 composition/manifest，阿里云函数计算按需渲染 MP4。',
    en: 'HyperFrames video authoring and rendering toolset: generate compositions/manifests and render MP4 on demand.'
  },
  toolDescription:
    '包含两个子工具：生成视频工程负责让 AI 编排剪辑、字幕、配音、转场、H5 叠加并输出 HyperFrames composition/manifest；视频渲染负责把工程提交到阿里云函数计算导出 MP4。',
  courseUrl: 'https://help.aliyun.com/zh/functioncompute/',
  secretInputConfig: [
    {
      key: 'renderEndpointUrl',
      label: '函数计算渲染入口 URL',
      description: '阿里云函数计算 HTTP 触发器或 API 网关地址。插件会向该地址 POST JSON 任务。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'renderApiToken',
      label: '渲染服务 Token',
      description: '用于调用函数计算渲染服务的密钥。默认写入 X-Render-Token 请求头。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'renderAuthHeaderName',
      label: '鉴权 Header 名称',
      description: '默认 X-Render-Token；如果你的函数使用 Authorization，可填 Authorization。',
      required: false,
      inputType: 'input',
      defaultValue: 'X-Render-Token'
    }
  ]
});
