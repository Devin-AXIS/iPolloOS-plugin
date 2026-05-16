import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/ipolloos';

export default defineTool({
  name: {
    'zh-CN': '上传到七牛 Kodo 并获取链接',
    en: 'Kodo upload and get links'
  },
  description: {
    'zh-CN':
      '从可访问的 HTTP(S) 地址拉取并写入七牛，或直接写入文本/HTML。用途默认「自动」：按保存路径、Content-Type、源 URL 与响应头推断网页资源或普通文件（模型调用时可不传具体用途）；也可手动指定网页/文件。大文件从网址拉取时走流式上传。',
    en: 'Upload from URL (streaming) or text/HTML. Default scope is auto (inferred); optional manual sites/files.'
  },
  toolDescription:
    'appId/userId/chatId 可留空（路径段为 _），推荐工作流绑定系统变量。有 textContent 时忽略 sourceUrl。失败时看 system_error 与 minimal_json（含 step）。勿用 *.qiniucs.com 作访问域名。',
  versionList: [
    {
      value: '2.2.4',
      description:
        '拉取源文件失败区分 timeout/network/http 并写入 minimal_json（error_kind）；listTools 隐藏工具包父占位（须插件宿主新版）',
      inputs: [
        {
          key: 'appId',
          label: '应用 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐引用系统变量 appId；留空时路径段为 _'
        },
        {
          key: 'userId',
          label: '用户 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐引用系统变量 userId；留空时路径段为 _'
        },
        {
          key: 'chatId',
          label: '会话 ID',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: false,
          defaultValue: '',
          toolDescription: '推荐引用系统变量 chatId；留空时路径段为 _'
        },
        {
          key: 'scope',
          label: '用途',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          required: true,
          defaultValue: 'auto',
          list: [
            { label: '自动（推荐：按路径与类型推断）', value: 'auto' },
            { label: '网页 / 静态站（预览）', value: 'sites' },
            { label: '普通文件（下载）', value: 'files' }
          ],
          toolDescription:
            'auto：工具根据保存路径扩展名、文本 Content-Type、文件网址路径及下载响应头推断；输出 resolved_scope。不确定时模型可固定传 sites 或 files。'
        },
        {
          key: 'relativeKey',
          label: '保存路径（含文件名）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          required: true,
          placeholder: '例如 index.html 或 docs/readme.pdf',
          toolDescription:
            '相对路径；Key 为 ipolloos/{app段}/{user段}/{chat段}/{用途}/你的路径，空 ID 对应段为 _。禁止 ..'
        },
        {
          key: 'sourceUrl',
          label: '文件网址（与文本二选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          toolDescription: 'HTTP(S) 可下载地址。与文本同时填时忽略本字段。'
        },
        {
          key: 'textContent',
          label: '文本内容（与网址二选一）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.textarea],
          toolDescription:
            'HTML/JSON/Markdown 等；需填写 Content-Type。与网址同时存在时优先本字段。'
        },
        {
          key: 'contentType',
          label: 'Content-Type（写文本时必填）',
          valueType: WorkflowIOValueTypeEnum.string,
          renderTypeList: [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input],
          defaultValue: 'text/html; charset=utf-8',
          toolDescription: '写网址时可留空，将按扩展名或响应头猜测。'
        },
        {
          key: 'temporaryLinkExpiresSeconds',
          label: '临时访问链接（秒，0 表示不生成）',
          valueType: WorkflowIOValueTypeEnum.number,
          renderTypeList: [FlowNodeInputTypeEnum.numberInput, FlowNodeInputTypeEnum.reference],
          defaultValue: 86400,
          toolDescription: '私有空间必读：设为大于 0 生成带签名 URL；全公开读可填 0。'
        }
      ],
      outputs: [
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'final_public_url',
          label: '对外链接（绑定域名）',
          description: '指定回复里引用本字段即可；勿手写 URL'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'stable_reply_line',
          label: '整段可复制回复',
          description: '含公开链；私有桶时含临时链第二行'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'minimal_json',
          label: '极简 JSON（含 object_key 等排障）',
          description: '程序解析或排障用'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'public_link_host_ok',
          label: '主机名校验（ok|mismatch）',
          description: 'final_public_url 主机名是否与资源配置一致'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'configured_public_host',
          label: '配置的公开域名',
          description: '来自插件资源配置'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'static_site_preview_url',
          label: '静态页预览（仅 sites）',
          description: '用途为网页时与对外链接同域；否则为空'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'temporary_access_url',
          label: '临时访问链',
          description: '秒数>0 时有值；私有桶用'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'resolved_scope',
          label: '用途 sites|files'
        },
        {
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'scope_resolution_note',
          label: '用途判定说明'
        },
        {
          type: FlowNodeOutputTypeEnum.error,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'system_error',
          label: '错误信息'
        }
      ]
    }
  ]
});
