import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.productivity],
  name: {
    'zh-CN': '阿里云（ECS·轻量·VPC·RDS）',
    en: 'Aliyun compute, VPC, RDS'
  },
  description: {
    'zh-CN':
      '统一管理 **ECS、轻量应用服务器、VPC/交换机、RDS** 的常用能力：查地域/镜像/规格/实例、创建与启停 ECS 与轻量、安全组与轻量防火墙、VPC 网络、RDS 创建/白名单/账号。文件上传请用 **OSS 插件** + UserData/云助手拉取。',
    en: 'ECS, Simple Application Server, VPC, RDS catalogs and lifecycle; security group / firewall. Use OSS plugin for artifacts.'
  },
  toolDescription:
    'Bind RAM AccessKey; set default region optional. Subtools: 资源目录、计算实例、访问控制、VPC 网络、RDS.',
  courseUrl: 'https://help.aliyun.com/',
  secretInputConfig: [
    {
      key: 'aliyunAccessKeyId',
      label: 'AccessKey ID',
      description: 'RAM 子账号，需具备 ecs、swas-open、vpc、rds 相关产品只读/变配所需权限。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'aliyunAccessKeySecret',
      label: 'AccessKey Secret',
      description: '与上成对。',
      required: true,
      inputType: 'secret'
    },
    {
      key: 'defaultRegionId',
      label: '默认地域（可选）',
      description: '如 cn-hangzhou。子工具传 regionId 时可覆盖。',
      required: false,
      inputType: 'input',
      defaultValue: 'cn-hangzhou'
    }
  ]
});
