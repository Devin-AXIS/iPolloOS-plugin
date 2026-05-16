import { z } from 'zod';
import { OssAuthFields } from './client';

const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v == null ? '' : String(v).trim()));

/** appId / userId / chatId 可留空：路径段规范为 _（与七牛 Kodo 工具一致） */
export const IsolationFields = z.object({
  appId: optionalId,
  userId: optionalId,
  chatId: optionalId,
  scope: z.enum(['sites', 'files'])
});

export const OssToolBaseSchema = OssAuthFields.and(IsolationFields);
