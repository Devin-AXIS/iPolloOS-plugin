import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity, ToolTagEnum.enum.tools],
  name: {
    'zh-CN': 'iPollo App 动态表',
    en: 'iPollo App dynamic tables'
  },
  description: {
    'zh-CN':
      '为当前 iPollo App / Agent 建立、查询和管理 Studio 可见的动态数据表。不要求用户填写密钥、应用 ID、用户 ID 或 Agent ID。',
    en: 'Create, query, and manage Studio-visible dynamic data tables for the current iPollo App / Agent, without user-entered secrets or ownership identifiers.'
  },
  toolDescription:
    '当 Agent v2 或工作流需要为当前 App 建立业务数据表，或查询、新增、更新、删除已有动态表记录时调用。当前 App/Agent/用户归属由运行时自动解析，参数里不要出现密钥或归属 ID。'
});
