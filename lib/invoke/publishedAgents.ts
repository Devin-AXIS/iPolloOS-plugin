import { z } from 'zod';
import type { SystemVarType } from '@tool/type/req';
import { getAccessToken } from './accessToken';
import { iPolloOSBaseURL } from './const';

export const PublishedAgentSchema = z.object({
  appBotId: z.string(),
  botUserId: z.string().optional(),
  fastgptAppId: z.string(),
  shareId: z.string(),
  name: z.string(),
  intro: z.string(),
  channelName: z.string(),
  category: z.string().optional(),
  score: z.number(),
  capabilities: z.array(z.string()).default([])
});

export const PublishedAgentsResponseSchema = z.object({
  agents: z.array(PublishedAgentSchema),
  count: z.number()
});

export type PublishedAgent = z.infer<typeof PublishedAgentSchema>;

export async function getPublishedAgents(
  params: {
    taskText?: string;
    limit?: number;
    excludeFastGPTAppId?: string;
  },
  systemVar: SystemVarType
) {
  const accessToken = await getAccessToken({}, systemVar);
  const url = new URL('/api/invoke/publishedAgents', iPolloOSBaseURL);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      taskText: params.taskText ?? '',
      limit: params.limit ?? 10,
      excludeFastGPTAppId: params.excludeFastGPTAppId ?? ''
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get published agents: ${response.statusText || response.status}`);
  }

  const result = (await response.json()) as { data: unknown };
  return PublishedAgentsResponseSchema.parse(result.data);
}
