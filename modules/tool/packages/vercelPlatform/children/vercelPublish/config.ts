import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': 'Vercel 发布',
    en: 'Vercel publish'
  },
  description: {
    'zh-CN':
      '从 files_json（path+text|base64）上传并创建部署，或传入 git_json（官方 gitSource 对象）从已连接仓库部署，或仅填写 redeploy_deployment_id 触发同名项目上的重新部署。支持等待就绪。嵌入场景请用 base64/内联，勿依赖本机下载。',
    en: 'Deploy from files_json, git_json (gitSource), or redeploy by deployment id. Optional wait for ready. Prefer inline base64 in embedded contexts.'
  },
  toolDescription:
    '三选一：files_json 源码数组 | git_json 字符串 | redeploy_deployment_id。project_override 可空则用插件默认项目。create_project_if_missing + new_project_name 用于首次创建项目。',
  versionList: [
    {
      value: '1.0.0',
      description: '首版',
      inputs: [
        {
          key: 'source_kind',
          label: '来源类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: 'files_json',
          toolDescription: 'files_json | git_json | redeploy_only'
        },
        {
          key: 'project_override',
          label: '项目 ID 或名称（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '覆盖插件默认项目'
        },
        {
          key: 'files_json',
          label: 'files_json（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '[{"path":"a.txt","text":"hi"}] 或 base64'
        },
        {
          key: 'git_json',
          label: 'git_json（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '官方 gitSource JSON 字符串'
        },
        {
          key: 'redeploy_deployment_id',
          label: '重新部署的 deployment id（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '与 files_json 二选一或与 git 组合按 Vercel 规则'
        },
        {
          key: 'create_project_if_missing',
          label: '若项目不存在则创建',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          defaultValue: false,
          toolDescription: '默认关'
        },
        {
          key: 'new_project_name',
          label: '新建项目名称（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          required: false,
          toolDescription: '开启自动创建且主项目名为空时使用'
        },
        {
          key: 'target',
          label: '目标环境',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          defaultValue: 'preview',
          toolDescription: 'preview | production'
        },
        {
          key: 'wait_for_ready',
          label: '等待部署就绪',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch, FlowNodeInputTypeEnum.reference],
          defaultValue: true,
          toolDescription: '轮询直到 READY/ERROR/CANCELED 或超时'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'deployment_id', label: 'Deployment ID' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'url', label: '预览/部署 URL' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'ready_state', label: '就绪状态' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'poll_log', label: '轮询日志' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'detail_json', label: '详情 JSON' },
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
