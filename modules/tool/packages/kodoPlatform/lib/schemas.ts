import { z } from 'zod';
import { KodoAuthFields } from './client';

const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v == null ? '' : String(v).trim()));

/** appId / userId / chatId 可留空：路径段会规范为 _，优先在工作流里绑定系统变量 */
export const IsolationFields = z.object({
  appId: optionalId,
  userId: optionalId,
  chatId: optionalId,
  scope: z.enum(['auto', 'sites', 'files'])
});

export const KodoToolBaseSchema = KodoAuthFields.and(IsolationFields);
