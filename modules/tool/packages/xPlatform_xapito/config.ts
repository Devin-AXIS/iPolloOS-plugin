import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';
import accountXOverview from './children/accountXOverview';
import checkAccountUpdates from './children/checkAccountUpdates';
import getXTrends from './children/getXTrends';
import manageXFollow from './children/manageXFollow';
import manageXPost from './children/manageXPost';
import publishXPost from './children/publishXPost';
import queryXContent from './children/queryXContent';
import replyXPost from './children/replyXPost';
import searchXPosts from './children/searchXPosts';

export default defineToolSet({
  toolId: 'xPlatform_xapito',
  tags: [ToolTagEnum.enum.social, ToolTagEnum.enum.search, ToolTagEnum.enum.news],
  children: [
    accountXOverview,
    checkAccountUpdates,
    getXTrends,
    manageXFollow,
    manageXPost,
    publishXPost,
    queryXContent,
    replyXPost,
    searchXPosts
  ],
  name: {
    'zh-CN': 'X 平台 xapi.to 版',
    en: 'X Platform xapi.to'
  },
  description: {
    'zh-CN':
      '通过第三方 xapi.to 读取 X 内容，用于账号查询、内容搜索、低频轮询账号变化。X 读取令牌填写 xapi.to 的 sk API Key，X API Base URL 填 https://x.p.xapi.to。',
    en: 'Read X content through third-party xapi.to for account lookup, content search, and low-frequency polling of account changes. Use the xapi.to sk API Key as the read token and set X API Base URL to https://x.p.xapi.to.'
  },
  toolDescription:
    'Use this xapi.to-backed toolset for X account lookup, user timeline reads, content search, and polling-based account monitoring. The package performs one check per invocation and does not include webhook, stream, monitor table, runner, or timer logic.',
  courseUrl: 'https://xapi.to',
  secretInputConfig: [
    {
      key: 'bearerToken',
      label: 'xapi.to 读取令牌',
      description: '填写 xapi.to 的 sk 开头 API Key，用于账号查询、内容搜索和低频轮询检查。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'baseUrl',
      label: 'X API Base URL',
      description: 'xapi.to 版读取接口请填写 https://x.p.xapi.to。',
      required: true,
      inputType: 'input',
      defaultValue: 'https://x.p.xapi.to'
    }
  ]
});
