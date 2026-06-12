import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.multimodal, ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '公共音视频处理',
    en: 'Media Processing'
  },
  description: {
    'zh-CN':
      '面向其他视频、音频插件的通用合成服务：视频拼接、音画合成、替换音轨、混音、字幕烧录、分屏和画中画。底层复用 HyperFrames 相同的阿里云国际函数计算资源。',
    en: 'Shared media processing service for other video/audio plugins: video concatenation, audio-video merge, audio replacement, mixing, subtitle burn-in, split screen, and picture-in-picture. It reuses the same Alibaba Cloud International Function Compute resource as HyperFrames.'
  },
  toolDescription:
    '公共音视频后处理工具集。它不生成 HyperFrames composition，不做视频创意判断，也不启动函数计算资源；只把结构化音视频合成任务提交给与 HyperFrames 相同的阿里云国际函数计算入口。普通节点只填写视频、音频、字幕、时间线和输出要求，函数计算入口和 Token 由系统密钥配置。',
  courseUrl: 'https://www.alibabacloud.com/help/en/functioncompute/',
  secretInputConfig: [
    {
      key: 'renderEndpointUrl',
      label: '阿里云国际函数计算入口 URL',
      description:
        '与 HyperFrames 使用同一套阿里云国际函数计算 HTTP 触发器或 API 网关地址。插件会向该地址 POST 媒体处理任务。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'renderApiToken',
      label: '函数计算服务 Token',
      description: '与 HyperFrames 使用同一套调用密钥。默认写入 X-Render-Token 请求头。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'renderAuthHeaderName',
      label: '鉴权 Header 名称',
      description: '默认 X-Render-Token；如果函数使用 Authorization，可填 Authorization。',
      required: false,
      inputType: 'input',
      defaultValue: 'X-Render-Token'
    }
  ]
});
