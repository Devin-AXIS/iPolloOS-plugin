import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '查找相似/替代 GitHub 项目',
    en: 'Find similar GitHub projects'
  },
  description: {
    'zh-CN': '根据一个 GitHub 项目或需求，在 GitHub 中查找相似项目和替代项目，并给出简要对比。',
    en: 'Find similar and alternative GitHub projects by source project or requirement, with concise comparison.'
  },
  toolDescription:
    '输入一个项目和可选需求。若给项目，会读取 topics/描述生成查询；若给需求，则直接按需求搜索。输出可作为对比候选清单。',
  versionList: [
    {
      value: '1.4.0',
      description: '相似项目发现与简要对比',
      inputs: [
        {
          key: 'project',
          label: '参考项目（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          placeholder: 'microsoft/autogen'
        },
        {
          key: 'requirement',
          label: '需求/对比方向（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          placeholder: '例如 multi-agent framework / browser agent'
        },
        {
          key: 'maxResults',
          label: '返回项目数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 8
        },
        {
          key: 'minStars',
          label: '最低 stars',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 20
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'similar_projects_markdown',
          label: '相似项目 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'similar_projects_json',
          label: '相似项目 JSON'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'github_query',
          label: 'GitHub 查询语句'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'source_links', label: '仓库链接' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '返回数量' },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误'
        }
      ]
    }
  ]
});
