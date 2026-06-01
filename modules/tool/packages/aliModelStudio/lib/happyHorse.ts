import { z } from 'zod';
import { delay } from '@tool/utils/delay';
import { getErrText } from '@tool/utils/err';

export const RegionEnum = z.enum(['beijing', 'singapore', 'us']);
export const ResolutionEnum = z.enum(['720P', '1080P']);
export const RatioEnum = z.enum([
  '16:9',
  '9:16',
  '1:1',
  '4:3',
  '3:4',
  '4:5',
  '5:4',
  '9:21',
  '21:9'
]);

export type HappyHorseRegion = z.infer<typeof RegionEnum>;
export type HappyHorseResolution = z.infer<typeof ResolutionEnum>;
export type HappyHorseRatio = z.infer<typeof RatioEnum>;

export type HappyHorseOutput = {
  video_url: string;
  task_id: string;
  task_status: string;
  request_id?: string;
  usage?: Record<string, unknown>;
  raw_response_json: string;
};

type CreateTaskResponse = {
  request_id?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    code?: string;
    message?: string;
  };
  code?: string;
  message?: string;
};

type QueryTaskResponse = {
  request_id?: string;
  output?: {
    task_id?: string;
    task_status?: string;
    video_url?: string;
    code?: string;
    message?: string;
  };
  usage?: Record<string, unknown>;
  code?: string;
  message?: string;
};

const taskStatus = {
  pending: 'PENDING',
  running: 'RUNNING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  canceled: 'CANCELED',
  unknown: 'UNKNOWN'
} as const;

export const getDashScopeBaseUrl = (region: HappyHorseRegion) => {
  switch (region) {
    case 'singapore':
      return 'https://dashscope-intl.aliyuncs.com';
    case 'us':
      return 'https://dashscope-us.aliyuncs.com';
    case 'beijing':
    default:
      return 'https://dashscope.aliyuncs.com';
  }
};

const readJson = async <T>(response: Response): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`DashScope returned a non-JSON response, HTTP ${response.status}`);
  }
};

const getDashScopeError = (data: CreateTaskResponse | QueryTaskResponse, fallback: string) => {
  const code = data.output?.code || data.code;
  const message = data.output?.message || data.message;
  return [fallback, code, message].filter(Boolean).join(': ');
};

export async function runHappyHorseVideoTask({
  apiKey,
  region,
  model,
  input,
  parameters,
  pollIntervalSeconds = 15,
  maxPollAttempts = 40
}: {
  apiKey: string;
  region: HappyHorseRegion;
  model: 'happyhorse-1.0-t2v' | 'happyhorse-1.0-i2v' | 'happyhorse-1.0-video-edit';
  input: Record<string, unknown>;
  parameters: Record<string, unknown>;
  pollIntervalSeconds?: number;
  maxPollAttempts?: number;
}): Promise<HappyHorseOutput> {
  try {
    const baseUrl = getDashScopeBaseUrl(region);
    const createResponse = await fetch(
      `${baseUrl}/api/v1/services/aigc/video-generation/video-synthesis`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify({
          model,
          input,
          parameters
        })
      }
    );
    const createData = await readJson<CreateTaskResponse>(createResponse);

    if (!createResponse.ok) {
      throw new Error(
        getDashScopeError(createData, `Create task failed, HTTP ${createResponse.status}`)
      );
    }

    const taskId = createData.output?.task_id;
    if (!taskId) {
      throw new Error(getDashScopeError(createData, 'Create task failed, task_id not returned'));
    }

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      if (pollIntervalSeconds > 0) {
        await delay(pollIntervalSeconds * 1000);
      }

      const queryResponse = await fetch(`${baseUrl}/api/v1/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });
      const queryData = await readJson<QueryTaskResponse>(queryResponse);

      if (!queryResponse.ok) {
        throw new Error(
          getDashScopeError(queryData, `Query task failed, HTTP ${queryResponse.status}`)
        );
      }

      const status = queryData.output?.task_status;
      if (status === taskStatus.succeeded) {
        const videoUrl = queryData.output?.video_url;
        if (!videoUrl) {
          throw new Error('Task succeeded but video_url was not returned');
        }
        return {
          video_url: videoUrl,
          task_id: taskId,
          task_status: status,
          request_id: queryData.request_id || createData.request_id,
          usage: queryData.usage,
          raw_response_json: JSON.stringify(queryData)
        };
      }

      if (
        status === taskStatus.failed ||
        status === taskStatus.canceled ||
        status === taskStatus.unknown
      ) {
        throw new Error(getDashScopeError(queryData, `Video task ended with status ${status}`));
      }
    }

    throw new Error(`Video generation timeout, task_id=${taskId}`);
  } catch (error) {
    return Promise.reject({
      system_error: getErrText(error, 'HappyHorse video generation failed')
    });
  }
}
