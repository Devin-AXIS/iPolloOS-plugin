import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '阿里云 · RDS', en: 'Aliyun RDS' },
  description: {
    'zh-CN': 'RDS 创建（常用字段 + JSON 扩展）、白名单修改、数据库账号创建、实例列表。',
    en: 'RDS create, whitelist, account, describe.'
  },
  toolDescription: 'Create needs zone/engine/class/storage; VPC mode needs vpc+vswitch IDs.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'action',
          label: '动作',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: '创建实例', value: 'create_instance' },
            { label: '修改 IP 白名单', value: 'modify_whitelist' },
            { label: '创建数据库账号', value: 'create_account' },
            { label: '实例列表', value: 'describe_instances' }
          ]
        },
        {
          key: 'regionId',
          label: '地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'DBInstanceId',
          label: '实例 Id',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '白名单/账号'
        },
        {
          key: 'pageSize',
          label: '分页',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 30
        },
        {
          key: 'zoneId',
          label: '可用区',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '创建必填'
        },
        {
          key: 'engine',
          label: '引擎',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'MySQL'
        },
        {
          key: 'engineVersion',
          label: '版本',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '8.0'
        },
        {
          key: 'DBInstanceClass',
          label: '规格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '参考「资源目录→RDS 可售规格」返回值'
        },
        {
          key: 'DBInstanceStorage',
          label: '存储 GB',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 20
        },
        {
          key: 'DBInstanceNetType',
          label: '网络类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'VPC',
          list: [
            { label: 'VPC', value: 'VPC' },
            { label: '经典外网 Internet', value: 'Internet' }
          ]
        },
        {
          key: 'VPCId',
          label: 'VPCId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: 'VPC 模式'
        },
        {
          key: 'vSwitchId',
          label: '交换机 Id',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'payType',
          label: '计费',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'Postpaid',
          list: [
            { label: '按量 Postpaid', value: 'Postpaid' },
            { label: '包年包月 Prepaid', value: 'Prepaid' }
          ]
        },
        {
          key: 'DBInstanceDescription',
          label: '实例描述',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'createOptionsJson',
          label: 'CreateDBInstance JSON 合并',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'securityIps',
          label: '白名单 IP/CIDR（逗号）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'modifyMode',
          label: '白名单写入方式',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'Cover',
          list: [
            { label: '覆盖 Cover', value: 'Cover' },
            { label: '追加 Append', value: 'Append' },
            { label: '删除 Delete', value: 'Delete' }
          ]
        },
        {
          key: 'DBInstanceIPArrayName',
          label: '白名单分组名（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'Default'
        },
        {
          key: 'accountName',
          label: '账号名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'accountPassword',
          label: '账号密码',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'accountType',
          label: '账号类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          defaultValue: 'Normal',
          list: [
            { label: 'Normal', value: 'Normal' },
            { label: 'Super', value: 'Super' }
          ]
        },
        {
          key: 'defaultRegionId',
          label: '覆盖默认地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'aliyunAccessKeyId',
          label: 'AK 覆盖',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'aliyunAccessKeySecret',
          label: 'SK 覆盖',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        }
      ],
      outputs: [
        { valueType: WorkflowIOValueTypeEnum.string, key: 'summary', label: '摘要' },
        { valueType: WorkflowIOValueTypeEnum.string, key: 'reply_hint', label: '短结果' },
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
