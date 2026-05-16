import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  name: {
    'zh-CN': 'iPolloOS 信息获取 ',
    en: 'iPolloOS Information Retrieval'
  },
  tags: [ToolTagEnum.enum.tools],
  description: {
    'zh-CN': '获取 iPolloOS 中的信息',
    en: 'Retrieve information from iPolloOS'
  }
});
