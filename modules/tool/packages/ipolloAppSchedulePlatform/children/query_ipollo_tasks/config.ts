import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '查询 iPollo 任务', en: 'Query iPollo tasks' },
  description: {
    'zh-CN': '查询当前用户在 iPollo App 中的任务/日程。',
    en: 'Query iPollo App tasks for the current user.'
  },
  toolDescription:
    '当用户问今天/明天/某 Agent/某人有哪些任务，或 Agent 执行前需要读取任务列表时调用。默认不要展示与当前用户无关的任务：如果用户没有点名其他人或 Agent，工具会只返回当前可信 App 用户作为执行人/参与人/子任务执行人的任务。用户明确点名某人或某 Agent 时，把名字写入 assignee_name，只查询该对象相关任务；同时可把任务标题/对象写入 keyword。用户问“明天一天/今天有哪些”时传全天范围，APP 卡片会是列表；用户问“明天早上 8 点有没有任务/8 点的任务”这类具体时间时，必须传该具体时间的精确小窗口（建议 8:00:00 到 8:00:59，最多不超过 5 分钟；只有用户明确说 8 点到 9 点/这一小时才用小时范围），若只查到一条，APP 卡片会是单个日程卡。用户用自然语言点名任务时，例如“单独给我人工智能主题演讲”“拿一个 BBS 会议任务”，必须把核心标题/对象写入 keyword，通常 limit=1；不要只靠时间窗猜。工具会自动使用当前 iPollo App 和当前可信 App 用户。',
  versionList: [
    {
      value: '1.4.7',
      description: '查询 iPollo App 任务，默认按当前用户参与过滤并支持按执行人名称查询',
      inputs: [
        {
          key: 'from',
          label: '开始时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '查询开始时间，使用 ISO 字符串；例如今天 00:00 对应 2026-06-07T00:00:00+08:00。用户问具体几点有没有任务时，从该具体时间开始。'
        },
        {
          key: 'to',
          label: '结束时间',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '查询结束时间，使用 ISO 字符串；例如今天结束对应 2026-06-07T23:59:59+08:00。用户问具体几点有没有任务时，结束时间用该分钟末尾或最多 5 分钟的小窗口；不要用全天范围，也不要默认扩成整小时。'
        },
        {
          key: 'keyword',
          label: '关键词',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可空。用户按自然语言点名某个任务、会议、对象、标题或只要“单独一个任务”时填写核心关键词/标题，例如“人工智能主题演讲”“美国 BBS 公司开会”“起床看书”；如果无法稳定提取，也可以填写用户原句。插件会按标题、备注、子任务和执行人做自然语言匹配；如只需要一个结果，limit 设为 1。'
        },
        {
          key: 'assignee_name',
          label: '执行人名称',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription:
            '可空。用户明确点名某个 Agent 或人的任务时填写，例如“未来洞察”“美股智能体”“张三”。填写后查询该执行人/参与人/子任务执行人相关任务；未填写时默认只返回当前用户参与的任务。'
        },
        {
          key: 'status',
          label: '状态',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: '可空；需要过滤状态时填写 pending、running、completed 或 cancelled。'
        },
        {
          key: 'include_completed',
          label: '包含已完成',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false,
          toolDescription: '用户明确要求查看已完成任务时设为 true，否则设为 false。'
        },
        {
          key: 'limit',
          label: '数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 20,
          toolDescription: '最多返回多少条，默认 20。'
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.boolean, key: 'ok', label: '是否成功' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'tasks_json', label: '任务 JSON' },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'tasks_markdown',
          label: '任务 Markdown'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'app_card',
          label: 'APP 日程卡片 JSON'
        },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'action_json', label: '动作 JSON' },
        { valueType: WorkflowIOValueTypeEnum.number, key: 'count', label: '数量' },
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
