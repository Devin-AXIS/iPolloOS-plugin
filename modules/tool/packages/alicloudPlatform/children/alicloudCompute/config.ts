import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: { 'zh-CN': '阿里云 · 计算实例（ECS / 轻量）', en: 'Aliyun compute' },
  description: {
    'zh-CN': 'ECS 创建/启停/释放/详情；轻量创建/启停/重启。删实例需自行确认 force 参数。',
    en: 'ECS/SWAS lifecycle and create.'
  },
  toolDescription:
    'Fill action. ecs_run_instances needs image/instanceType/SG/VSwitch/password or keyPair.',
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
            { label: 'ECS 创建', value: 'ecs_run_instances' },
            { label: 'ECS 启动', value: 'ecs_start_instance' },
            { label: 'ECS 停止', value: 'ecs_stop_instance' },
            { label: 'ECS 重启', value: 'ecs_reboot_instance' },
            { label: 'ECS 释放', value: 'ecs_delete_instance' },
            { label: 'ECS 实例详情', value: 'ecs_describe_instance_attribute' },
            { label: '轻量 创建（订阅套餐）', value: 'swas_create_instances' },
            { label: '轻量 启动', value: 'swas_start_instance' },
            { label: '轻量 停止', value: 'swas_stop_instance' },
            { label: '轻量 重启', value: 'swas_reboot_instance' }
          ]
        },
        {
          key: 'regionId',
          label: '地域',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'instanceId',
          label: '实例 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '生命周期动作必填'
        },
        {
          key: 'ecsZoneId',
          label: 'ECS 可用区',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input],
          toolDescription: '创建 ECS 可选'
        },
        {
          key: 'ecsImageId',
          label: 'ECS ImageId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsInstanceType',
          label: 'ECS 规格',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsSecurityGroupId',
          label: 'ECS SecurityGroupId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsVSwitchId',
          label: 'ECS VSwitchId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsInstanceName',
          label: 'ECS 主机名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsPassword',
          label: 'ECS root 密码',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsKeyPairName',
          label: 'ECS 密钥对名',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'ecsInternetMaxBandwidthOut',
          label: '公网出带宽 Mbps',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 5
        },
        {
          key: 'ecsSystemDiskSizeGb',
          label: '系统盘 GB',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput]
        },
        {
          key: 'ecsUserDataShell',
          label: 'UserData(shell 明文)',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea],
          toolDescription: '将 Base64；可 wget OSS 脚本'
        },
        {
          key: 'ecsAmount',
          label: 'ECS 创建数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 1
        },
        {
          key: 'ecsRunExtraJson',
          label: 'RunInstances JSON 扩展',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea]
        },
        {
          key: 'ecsDeleteForce',
          label: 'ECS 释放 force',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false
        },
        {
          key: 'ecsDeleteForceStop',
          label: 'ECS 释放先强制停机',
          valueType: WorkflowIOValueTypeEnum.boolean,
          renderTypeList: [FlowNodeInputTypeEnum.switch],
          defaultValue: false
        },
        {
          key: 'swasImageId',
          label: '轻量 ImageId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'swasPlanId',
          label: '轻量 PlanId',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.input]
        },
        {
          key: 'swasPeriodMonths',
          label: '轻量订阅月数',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 1
        },
        {
          key: 'swasAmount',
          label: '轻量创建数量',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 1
        },
        {
          key: 'swasDataDiskSizeGb',
          label: '轻量数据盘 GB（0无）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput],
          defaultValue: 0
        },
        {
          key: 'swasCreateExtraJson',
          label: '轻量 Create JSON 扩展',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.textarea]
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
