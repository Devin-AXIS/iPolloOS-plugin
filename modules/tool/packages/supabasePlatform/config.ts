import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.other],
  name: {
    'zh-CN': 'Supabase 管理',
    en: 'Supabase Management'
  },
  description: {
    'zh-CN':
      'Supabase Management API 聚合：**Supabase 数据库**（只读/可写 SQL）+ **Supabase 管理**（组织/项目/Secrets/API Keys/Functions/配置/域名/Vanity/分支 + raw 逃生）。不含 PostgREST 表 CRUD；不含 pgvector。',
    en: 'Two tools: Database SQL (read/write) + unified Management router (full API + raw). No PostgREST data plane; no pgvector.'
  },
  toolDescription:
    'PAT 见插件密钥。可在下方配置默认 projectRef / organizationSlug，子工具节点可留空以继承。SQL 高危；管理操作按官方 scope。详见 INSTALL.txt。',
  courseUrl: 'https://supabase.com/docs/reference/api/introduction',
  secretInputConfig: [
    {
      key: 'supabaseAccessToken',
      label: 'Supabase Access Token (PAT)',
      description:
        'Account → Access Tokens；需包含 Management API 所需细粒度权限（见各官方端点说明）。勿把 PAT 写进前端 OSS。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'managementBaseUrl',
      label: 'Management Base URL（可选）',
      description: '默认 https://api.supabase.com',
      required: false,
      inputType: 'input'
    },
    {
      key: 'defaultProjectRef',
      label: '默认项目 ref（可选）',
      description: '子工具未填 projectRef 时使用；建议在集成里绑定后再跑 SQL/管理操作。',
      required: false,
      inputType: 'input'
    },
    {
      key: 'defaultOrganizationSlug',
      label: '默认组织 slug（可选）',
      description: '列组织下项目等操作未填 organizationSlug 时使用。',
      required: false,
      inputType: 'input'
    }
  ]
});
