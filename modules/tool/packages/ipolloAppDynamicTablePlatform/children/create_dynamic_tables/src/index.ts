import { getErrText } from '@tool/utils/err';
import type { RunToolSecondParamsType } from '@tool/type/req';
import { z } from 'zod';
import {
  buildDynamicTablesManifest,
  importDynamicTablesModule,
  listDynamicTableDirectories
} from '../../../lib/api';
import { resolveDynamicTableRuntimeContext } from '../../../lib/runtime';
import { getTableKey, normalizeDynamicTablesPlan, stringifyJson } from '../../../lib/schema';

export const InputType = z.object({
  table_plan: z.string().min(1)
});

export const OutputType = z.object({
  ok: z.boolean(),
  created_tables_json: z.string(),
  skipped_tables_json: z.string(),
  manifest_json: z.string(),
  action_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

function getDirectoryTableKey(directory: {
  name?: string;
  slug?: string;
  config?: Record<string, unknown>;
}) {
  return String(
    directory.config?.agentDataTableKey || directory.slug || directory.name || ''
  ).trim();
}

function getDirectoryAgentId(directory: { config?: Record<string, unknown> }) {
  return String(
    directory.config?.agentId || directory.config?.appBotId || directory.config?.fastgptAppId || ''
  ).trim();
}

function isDirectoryForAgent(directory: { config?: Record<string, unknown> }, agentId?: string) {
  if (!agentId) return true;
  return getDirectoryAgentId(directory) === agentId;
}

export async function tool(props: In, runtime?: RunToolSecondParamsType): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const context = resolveDynamicTableRuntimeContext({}, runtime?.systemVar);
    const plan = normalizeDynamicTablesPlan(input.table_plan);
    const existingDirectories = await listDynamicTableDirectories(context);
    const existingKeys = new Set(
      existingDirectories
        .filter((directory) => isDirectoryForAgent(directory, context.agentId))
        .map((directory) => getDirectoryTableKey(directory))
        .filter(Boolean)
    );
    const createdTables = plan.tables.filter((table) => !existingKeys.has(getTableKey(table)));
    const skippedTables = plan.tables.filter((table) => existingKeys.has(getTableKey(table)));
    const manifest = buildDynamicTablesManifest({
      plan,
      tables: plan.tables,
      applicationId: context.applicationId,
      agentId: context.agentId
    });

    const apiResult = await importDynamicTablesModule(context, manifest);
    const action = {
      action: 'create_dynamic_tables',
      applicationId: context.applicationId,
      agentId: context.agentId,
      identitySource: context.identitySource,
      createdTableKeys: createdTables.map(getTableKey),
      skippedTableKeys: skippedTables.map(getTableKey),
      apiResult
    };

    return {
      ok: true,
      created_tables_json: stringifyJson(createdTables),
      skipped_tables_json: stringifyJson(skippedTables),
      manifest_json: stringifyJson(manifest),
      action_json: stringifyJson(action)
    };
  } catch (error: unknown) {
    return {
      ok: false,
      created_tables_json: '[]',
      skipped_tables_json: '[]',
      manifest_json: '',
      action_json: '',
      system_error: getErrText(error)
    };
  }
}
