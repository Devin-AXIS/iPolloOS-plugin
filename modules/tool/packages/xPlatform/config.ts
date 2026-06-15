import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.social, ToolTagEnum.enum.search, ToolTagEnum.enum.news],
  name: {
    'zh-CN': 'X 平台',
    en: 'X Platform'
  },
  description: {
    'zh-CN':
      'X 官方 API 工具集。支持账号查询、内容搜索、账号变化监控、发帖、评论、删除、点赞、转发、关注和取关。',
    en: 'Official X API toolset for account lookup, content search, account monitoring, posting, replies, deletion, likes, reposts, follows, and unfollows.'
  },
  toolDescription:
    'Use this toolset for X account lookup, recent post search, user timeline reads, polling-based account monitoring, and user-context actions such as posting, replying, deleting, liking, reposting, following, and unfollowing.',
  courseUrl: 'https://docs.x.com/x-api',
  secretInputConfig: [
    {
      key: 'bearerToken',
      label: 'X 读取令牌',
      description: '用于查询、搜索和监控的 X API Bearer Token。也可使用带读取权限的用户令牌。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'userAccessToken',
      label: 'X 用户操作令牌',
      description:
        '用于发帖、评论、删除、点赞、转发、关注和取关的 OAuth 2.0 User Context Token。需要按动作授予 tweet.write、like.write、follows.write、users.read 等权限。',
      required: false,
      inputType: 'secret'
    },
    {
      key: 'baseUrl',
      label: 'X API Base URL',
      description: '默认 https://api.x.com。仅在使用自建 X API 反向代理时修改。',
      required: false,
      inputType: 'input',
      defaultValue: 'https://api.x.com'
    },
    {
      key: 'proxyUrl',
      label: 'X API 代理地址',
      description:
        '服务器不能直连 X 时填写 HTTP/HTTPS 代理，例如 http://host:port。留空时读取 X_API_PROXY_URL、HTTPS_PROXY、HTTP_PROXY 或 ALL_PROXY。',
      required: false,
      inputType: 'input'
    }
  ]
});
