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
      'HyperFrames 视频工程校验与渲染工具集：上游 AI 大脑生成 composition/manifest，插件校验后由阿里云函数计算按需渲染 MP4。',
    en: 'HyperFrames video validation and rendering toolset: the upstream AI brain authors compositions/manifests, then this plugin validates and renders MP4 on demand.'
  },
  toolDescription:
    '包含两个子工具：视频工程节点接收上游 AI 大脑已经生成好的 composition_html / manifest_json，只做校验和规范化；视频渲染负责把工程提交到阿里云函数计算导出 MP4。插件本身不另调 AI。',
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
