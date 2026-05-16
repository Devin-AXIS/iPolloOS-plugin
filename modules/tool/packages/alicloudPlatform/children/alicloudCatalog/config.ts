import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '阿里云 · 资源目录', en: 'Aliyun catalog' },
  description: {
    'zh-CN':
      '统一查询地域/可用区、ECS 与轻量的镜像与套餐、VPC/交换机、RDS 引擎与实例等，为后续创建动作选参。',
    en: 'Unified describe APIs for ECS, SWAS, VPC, RDS.'
  },
  toolDescription:
    'Bindings: toolset secrets. Fill catalog; some catalogs need zoneId or rdsEngine.',
  versionList: [
    {
      value: '1.0.0',
      description: 'Initial',
      inputs: [
        {
          key: 'catalog',
          label: '目录',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select],
          required: true,
          list: [
            { label: 'ECS 地域列表', value: 'ecs_regions' },
            { label: 'ECS 可用区', value: 'ecs_zones' },
            { label: 'ECS 镜像（可配 imageOwnerAlias）', value: 'ecs_images' },
            { label: 'ECS 某可用区可售规格', value: 'ecs_available_instance_types' },
            { label: 'ECS 实例列表', value: 'ecs_instances' },
            { label: 'ECS 安全组', value: 'ecs_security_groups' },
            { label: '轻量 地域', value: 'swas_regions' },
            { label: '轻量 镜像', value: 'swas_images' },
            { label: '轻量 套餐', value: 'swas_plans' },
            { label: '轻量 实例列表', value: 'swas_instances' },
            { label: 'VPC 列表', value: 'vpc_list' },
            { label: '交换机列表', value: 'vswitch_list' },
            { label: 'RDS 地域', value: 'rds_regions' },
            { label: 'RDS 可用区（需引擎）', value: 'rds_available_zones' },
            { label: 'RDS 可售规格（需引擎+版本）', value: 'rds_available_classes' },
            { label: 'RDS 实例列表', value: 'rds_instances' }
          ]
        },
        {
          key: 'regionId',
          label: '地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '可空则使用工具集默认地域'
        },
        {
          key: 'zoneId',
          label: '可用区 zoneId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: 'ecs_available_instance_types 必填'
        },
        {
          key: 'vpcId',
          label: 'VPC ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: 'vswitch_list / ecs_security_groups 可选过滤'
        },
        {
          key: 'imageOwnerAlias',
          label: 'ECS 镜像所有者',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'system',
          toolDescription: 'system / self / others / marketplace'
        },
        {
          key: 'pageSize',
          label: '分页大小',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 40
        },
        {
          key: 'rdsEngine',
          label: 'RDS 引擎',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'MySQL',
          toolDescription: '可用区/规格目录用'
        },
        {
          key: 'rdsEngineVersion',
          label: 'RDS 引擎版本',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: '8.0',
          toolDescription: 'rds_available_classes 必填'
        },
        {
          key: 'commodityCode',
          label: 'RDS commodityCode',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          defaultValue: 'bards'
        },
        {
          key: 'instanceTypeFamily',
          label: 'ECS 规格族过滤',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '可选，用于镜像查询'
        },
        {
          key: 'defaultRegionId',
          label: '覆盖默认地域（高级）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '一般不填，用工具集密钥里的默认地域'
        },
        {
          key: 'aliyunAccessKeyId',
          label: 'AK 覆盖',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '留空用工具集密钥'
        },
        {
          key: 'aliyunAccessKeySecret',
          label: 'SK 覆盖',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          toolDescription: '留空用工具集密钥'
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
