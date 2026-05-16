import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': 'Vercel 部署与发布',
    en: 'Vercel deploy & release'
  },
  description: {
    'zh-CN':
      '面向工作流的 Vercel 能力：发布（源码文件或 Git 元数据）、版本晋级/回滚/别名、日志与事件、以及原始 REST 兜底。凭证与默认项目放在插件资源配置；节点尽量少填，适合嵌入/iframe 场景（优先 base64/内联文件，避免依赖浏览器下载）。',
    en: 'Vercel for workflows: publish from files or Git, promote/rollback/aliases, logs/events, raw REST escape hatch. Credentials in plugin config; minimal per-node inputs; iframe-friendly (prefer inline base64 over browser downloads).'
  },
  toolDescription:
    '资源配置：Vercel Token、可选 Team ID、默认项目。节点：发布、版本、观测、vercel_api 原始调用。全能力可通过 vercel_api 覆盖官方 REST。',
  courseUrl: 'https://vercel.com/docs/rest-api',
  secretInputConfig: [
    {
      key: 'vercelToken',
      label: 'Vercel Token',
      description: 'Vercel Account Settings → Tokens；需含部署与读项目权限。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'vercelTeamId',
      label: 'Team ID（可选）',
      description: '团队 scope 时填写；个人账号可留空。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'defaultProjectIdOrName',
      label: '默认项目 ID 或名称（可选）',
      description: '节点未填 project_override 时使用。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'defaultRootDomain',
      label: '根域名备忘（可选）',
      description: '仅作文案展示/给 AI 的上下文，不参与 API；真实域名绑定仍在 Vercel 控制台完成。',
      required: false,
      inputType: 'input'
    }
  ]
});
