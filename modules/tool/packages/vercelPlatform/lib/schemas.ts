import { z } from 'zod';

/** 与插件资源配置中的 secretInputConfig.key 一致，运行时会合并进 tool 入参 */
export const VercelAuthFields = z.object({
  vercelToken: z.string().min(1),
  vercelTeamId: z.string().optional(),
  defaultProjectIdOrName: z.string().optional(),
  defaultRootDomain: z.string().optional()
});

export type VercelAuthFieldsIn = z.infer<typeof VercelAuthFields>;
