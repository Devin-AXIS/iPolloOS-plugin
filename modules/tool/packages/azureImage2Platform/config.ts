import { defineToolSet } from '@tool/type';
import { ToolTagEnum } from '@tool/type/tags';

export default defineToolSet({
  tags: [ToolTagEnum.enum.design],
  name: {
    'zh-CN': '微软 Azure 文生图（GPT-Image-2）',
    en: 'Microsoft Azure image generation (GPT-Image-2)'
  },
  description: {
    'zh-CN':
      '**GPT-Image-2**（Azure / Foundry）：**文生图** + **图生图/改图**（参考图与可选遮罩）。资源配置只保留三项普通输入：终结点、部署名、API Key；无需再填 api-version / Bearer。',
    en: '**GPT-Image-2** on Azure / Foundry: **text-to-image** plus **image edit / img2img** (reference images + optional mask). Three plain resource fields only: endpoint, deployment name, API key.'
  },
  courseUrl: 'https://ai.azure.com/catalog/models/gpt-image-2',
  secretInputConfig: [
    {
      key: 'azureOpenAiEndpoint',
      label: '终结点',
      description:
        '例如 https://xxx.openai.azure.com 或 https://xxx.services.ai.azure.com ，不要带 /openai/ 路径。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'azureOpenAiDeployment',
      label: '部署名称',
      description: 'Foundry / Azure 里该模型的部署名（如同事给的 MAI-Image-2e）。',
      required: true,
      inputType: 'input'
    },
    {
      key: 'azureOpenAiApiKey',
      label: 'API Key',
      description: '同事提供的密钥，整段粘贴即可。',
      required: true,
      inputType: 'input'
    }
  ]
});
