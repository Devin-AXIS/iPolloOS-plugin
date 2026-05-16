import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '阿里云 · 访问控制（安全组 / 轻量防火墙）', en: 'Aliyun SG / FW' },
  description: {
    'zh-CN': 'ECS 安全组入方向授权/撤销（单规则）；或为轻量实例批量下发防火墙端口规则（JSON）。',
    en: 'Authorize/revoke security group rules or SWAS firewall rules.'
  },
  toolDescription: 'family=ecs_* needs SG+port+CIDR. swas needs instanceId+fJSON array.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'family',
          label: '类型',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: 'ECS 授权入方向', value: 'ecs_authorize_security_group' },
            { label: 'ECS 撤销入方向', value: 'ecs_revoke_security_group' },
            { label: '轻量防火墙（JSON 规则数组）', value: 'swas_firewall_rules' }
          ]
        },
        {
          key: 'regionId',
          label: '地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'securityGroupId',
          label: '安全组 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ipProtocol',
          label: '协议 tcp/icmp',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'tcp'
        },
        {
          key: 'portRange',
          label: '端口 如 22/22',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '22/22'
        },
        {
          key: 'sourceCidrIp',
          label: '源 CIDR',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '0.0.0.0/0'
        },
        {
          key: 'priority',
          label: '优先级字符串',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '可选 ECS'
        },
        {
          key: 'swasInstanceId',
          label: '轻量实例 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'swasFirewallRulesJson',
          label: '轻量规则 JSON',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea],
          toolDescription:
            '[{"port":"443","ruleProtocol":"TCP","sourceCidrIp":"0.0.0.0/0","remark":"https"}]'
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
