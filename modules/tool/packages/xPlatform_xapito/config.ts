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
      required: false,
      inputType: 'secret'
    },
    {
      key: 'userAccessToken',
      label: 'X 用户操作令牌',
      description: '保留兼容旧配置。xapi.to 低频读取和监控检查通常不需要填写用户操作令牌。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'userAccessTokenSecret',
      label: 'X 用户操作令牌 Secret',
      description: '保留兼容旧配置。xapi.to 低频读取和监控检查通常不需要填写。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'consumerKey',
      label: 'X Consumer Key',
      description: '保留兼容旧配置。xapi.to 低频读取和监控检查通常不需要填写。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'consumerSecret',
      label: 'X Consumer Secret',
      description: '保留兼容旧配置。xapi.to 低频读取和监控检查通常不需要填写。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'baseUrl',
      label: 'X API Base URL',
      description:
        'xapi.to 版读取接口请填写 https://x.p.xapi.to。默认值保留为官方地址以兼容旧配置。',
      required: false,
      inputType: 'input',
      defaultValue: 'https://api.x.com'
    },
    {
      key: 'proxyUrl',
      label: 'X API 代理地址',
      description:
        '服务器不能直连接口时填写 HTTP/HTTPS 代理，例如 http://host:port。留空时读取 X_API_PROXY_URL、HTTPS_PROXY、HTTP_PROXY 或 ALL_PROXY。',
      required: false,
      inputType: 'input'
    }
  ]
});
