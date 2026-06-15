import { afterEach, describe, expect, it, vi } from 'vitest';
import dynamicTableConfig from '../config';
import createTablesConfig from '../children/create_dynamic_tables/config';
import manageRecordsConfig from '../children/manage_dynamic_table_records/config';
import { buildDynamicTablesManifest, resolveDynamicTableDirectory } from '../lib/api';
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
});
