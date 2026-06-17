import { afterEach, describe, expect, it, vi } from 'vitest';
import dynamicTableConfig from '../config';
import createTablesConfig from '../children/create_dynamic_tables/config';
import manageRecordsConfig from '../children/manage_dynamic_table_records/config';
import { tool as createDynamicTablesTool } from '../children/create_dynamic_tables/src';
import { tool as manageDynamicTableRecordsTool } from '../children/manage_dynamic_table_records/src';
import {
  buildDynamicTablesManifest,
  resolveDynamicTableApiBaseUrls,
  resolveDynamicTableDirectory
} from '../lib/api';
import { resolveDynamicTableRuntimeContext } from '../lib/runtime';
import { normalizeDynamicTablesPlan } from '../lib/schema';

const hiddenRuntimeKeys = [
  'application_id',
  'applicationId',
  'agent_id',
  'agentId',
  'user_id',
  'userId',
  'api_key',
  'apiKey',
  'token',
  'secret',
  'authToken',
  'appAuthToken'
];

function inputKeys(config: { versionList: Array<{ inputs: Array<{ key: string }> }> }) {
  return config.versionList.flatMap((version) => version.inputs.map((input) => input.key));
}

const jsonResponse = (body: unknown, init?: { ok?: boolean; status?: number }) =>
  ({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(body))
  }) as unknown as Response;

describe('iPollo App dynamic table plugin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not expose secret or ownership fields in plugin settings or tool inputs', () => {
    expect(
      (dynamicTableConfig as { secretInputConfig?: unknown[] }).secretInputConfig ?? []
    ).toHaveLength(0);

    const keys = [...inputKeys(createTablesConfig), ...inputKeys(manageRecordsConfig)];

    for (const key of hiddenRuntimeKeys) {
      expect(keys).not.toContain(key);
    }

    const childToolNames = [createTablesConfig.name['zh-CN'], manageRecordsConfig.name['zh-CN']];
    expect(childToolNames).toEqual(['建立动态表', '查询和管理动态表']);
  });

  it('normalizes a simple table plan and preserves app field type metadata', () => {
    const plan = normalizeDynamicTablesPlan(
      JSON.stringify({
        tables: [
          {
            name: '健身档案',
            key: 'fitness_profile',
            fields: [
              { key: 'goal', label: '目标', type: 'text', required: true },
              { key: 'city', label: '城市', type: 'city_select' },
              { key: 'schedule', label: '训练时间', type: 'schedule_rule' }
            ]
          }
        ]
      })
    );

    const manifest = buildDynamicTablesManifest({
      plan,
      tables: plan.tables,
      applicationId: 'aino-app-1',
      agentId: 'agent-1'
    });

    expect(manifest.directories[0].config.agentDataTableKey).toBe('fitness_profile');
    expect(manifest.directories[0].fields[1].type).toBe('json');
    expect(manifest.directories[0].fields[1].config.appFieldType).toBe('city_select');
    expect(manifest.directories[0].fields[2].type).toBe('json');
    expect(manifest.directories[0].fields[2].config.appFieldType).toBe('schedule_rule');
  });

  it('uses runtime iPollo application context without tool arguments', () => {
    const context = resolveDynamicTableRuntimeContext(
      {},
      {
        user: {
          id: 'os-user-1',
          username: '',
          contact: '',
          membername: '',
          teamName: '',
          teamId: '',
          name: '',
          appUserId: 'app-user-1',
          appAuthToken: 'token-1',
          iPolloApplicationId: 'aino-app-1'
        },
        app: {
          id: 'fastgpt-agent-1',
          name: '健身助手',
          applicationId: 'aino-app-1',
          agentId: 'fastgpt-agent-1'
        },
        tool: { id: 'create_dynamic_tables', version: '1.0.0' },
        time: '2026-06-14 12:00:00'
      }
    );

    expect(context.applicationId).toBe('aino-app-1');
    expect(context.userId).toBe('app-user-1');
    expect(context.agentId).toBe('fastgpt-agent-1');
    expect(context.authToken).toBe('token-1');
  });

  it('uses applicationId from register URL before falling back to FastGPT app id', () => {
    vi.stubEnv(
      'IPOLLO_APP_REGISTER_URL',
      'https://register.test/api/app-publish-callback?applicationId=aino-app-from-url'
    );

    const context = resolveDynamicTableRuntimeContext(
      {},
      {
        user: {
          id: 'fastgpt-user-1',
          username: '',
          contact: '',
          membername: '',
          teamName: '',
          teamId: '',
          name: ''
        },
        app: {
          id: 'fastgpt-agent-1',
          name: '健身助手'
        },
        tool: { id: 'create_dynamic_tables', version: '1.0.0' },
        time: '2026-06-14 12:00:00'
      }
    );

    expect(context.applicationId).toBe('aino-app-from-url');
    expect(context.agentId).toBe('fastgpt-agent-1');
  });

  it('derives dynamic table API base from APP callback URLs', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IPOLLO_APP_DATA_CONTEXT_URL', 'http://172.17.0.1:3017/api/app/app-data/context');

    expect(resolveDynamicTableApiBaseUrls()).toEqual(['http://172.17.0.1:3017']);
  });

  it('resolves same-key runtime tables only for the current Agent', async () => {
    vi.stubEnv('IPOLLO_APP_DYNAMIC_TABLE_API_BASE_URL', 'https://aino.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            data: {
              directories: [
                {
                  id: 'other-directory',
                  slug: 'fitness_profile',
                  config: {
                    agentId: 'other-agent',
                    agentDataTableKey: 'fitness_profile'
                  }
                },
                {
                  id: 'current-directory',
                  slug: 'fitness_profile',
                  config: {
                    agentId: 'agent-1',
                    agentDataTableKey: 'fitness_profile'
                  }
                }
              ]
            }
          })
        )
      })
    );

    await expect(
      resolveDynamicTableDirectory(
        {
          applicationId: 'aino-app-1',
          agentId: 'agent-1'
        },
        'fitness_profile'
      )
    ).resolves.toMatchObject({
      id: 'current-directory'
    });
  });

  it('runs create and query tools against the derived APP API context', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('IPOLLO_APP_DATA_CONTEXT_URL', 'http://172.17.0.1:3017/api/app/app-data/context');
    vi.stubEnv('IPOLLO_APP_DATA_CONTEXT_SECRET', 'dynamic-secret');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { directories: [] } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { moduleId: 'module-1' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            directories: [
              {
                id: 'fitness-directory',
                slug: 'fitness_profile',
                config: {
                  agentId: 'fastgpt-agent-1',
                  agentDataTableKey: 'fitness_profile'
                }
              }
            ]
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            records: [
              {
                id: 'record-1',
                props: {
                  goal: '减脂'
                }
              }
            ]
          }
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const runtime = {
      systemVar: {
        user: {
          id: 'fastgpt-user-1',
          username: '',
          contact: '',
          membername: '',
          teamName: '',
          teamId: '',
          name: '',
          appUserId: 'app-user-1',
          iPolloApplicationId: 'aino-app-1'
        },
        app: {
          id: 'fastgpt-agent-1',
          name: '健身助手',
          iPolloApplicationId: 'aino-app-1',
          agentId: 'fastgpt-agent-1'
        },
        tool: { id: 'ipolloAppDynamicTablePlatform/create_dynamic_tables', version: '1.0.0' },
        time: '2026-06-14 12:00:00'
      },
      streamResponse: vi.fn()
    };

    const createResult = await createDynamicTablesTool(
      {
        table_plan: JSON.stringify({
          tables: [
            {
              key: 'fitness_profile',
              name: '健身档案',
              fields: [{ key: 'goal', label: '目标', type: 'text' }]
            }
          ]
        })
      },
      runtime
    );
    const queryResult = await manageDynamicTableRecordsTool(
      {
        action: 'query',
        table: 'fitness_profile',
        limit: 10
      },
      runtime
    );

    expect(createResult.ok).toBe(true);
    expect(JSON.parse(createResult.action_json)).toEqual(
      expect.objectContaining({
        applicationId: 'aino-app-1',
        agentId: 'fastgpt-agent-1',
        createdTableKeys: ['fitness_profile']
      })
    );
    expect(queryResult).toEqual(
      expect.objectContaining({
        ok: true,
        operation: 'query',
        count: 1
      })
    );
    expect(JSON.parse(queryResult.records_json)).toEqual([
      { id: 'record-1', props: { goal: '减脂' } }
    ]);

    const urls = fetchMock.mock.calls.map((call) => new URL(call[0] as string));
    expect(urls.map((url) => `${url.origin}${url.pathname}`)).toEqual([
      'http://172.17.0.1:3017/api/directories',
      'http://172.17.0.1:3017/api/module-import',
      'http://172.17.0.1:3017/api/directories',
      'http://172.17.0.1:3017/api/records/fitness-directory'
    ]);
    expect(urls.every((url) => url.searchParams.get('applicationId') === 'aino-app-1')).toBe(true);
    expect(urls.every((url) => url.searchParams.get('noAuth') === null)).toBe(true);
    expect(
      fetchMock.mock.calls.every(
        (call) => call[1]?.headers?.Authorization === 'Bearer dynamic-secret'
      )
    ).toBe(true);
  });
});
