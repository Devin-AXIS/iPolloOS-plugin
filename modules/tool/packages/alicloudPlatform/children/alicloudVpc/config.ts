import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '阿里云 · VPC / 交换机', en: 'Aliyun VPC' },
  description: {
    'zh-CN': '创建 VPC 或 交换机（查询用「资源目录」）。',
    en: 'Create VPC or VSwitch.'
  },
  toolDescription: 'create_vswitch requires vpcId+zone+CIDR subset of VPC.',
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
            { label: '创建 VPC', value: 'create_vpc' },
            { label: '创建 交换机', value: 'create_vswitch' }
          ]
        },
        {
          key: 'regionId',
          label: '地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'vpcName',
          label: 'VPC 名称（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'vpcCidrBlock',
          label: 'VPC CIDR',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '172.16.0.0/16'
        },
        {
          key: 'vpcId',
          label: '已有 VPC Id',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: 'create_vswitch 必填'
        },
        {
          key: 'vswitchZoneId',
          label: '交换机可用区',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'vswitchCidrBlock',
          label: '交换机 CIDR',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '172.16.0.0/24'
        },
        {
          key: 'vswitchName',
          label: '交换机名（可选）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
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
