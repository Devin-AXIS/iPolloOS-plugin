import { defineTool } from '@tool/type';
import { commonOutputs, numInput, qInput } from '../../lib/configIo';

export default defineTool({
  name: {
    'zh-CN': '百度搜索',
    en: 'Baidu Search'
  },
  description: {
    'zh-CN': '调用百度搜索。',
    en: 'Call Baidu search.'
  },
  toolDescription: '百度网页搜索。用户只需要填搜索关键词和返回数量。',
  versionList: [
    {
      value: '0.2.0',
      description: '百度搜索',
      inputs: [qInput, numInput],
      outputs: commonOutputs
    }
  ]
});
