import { z } from 'zod';
import { I18nStringSchema } from './i18n';

// iPolloOS Enums
export enum FlowNodeInputTypeEnum {
  reference = 'reference',
  input = 'input',
  textarea = 'textarea',
  numberInput = 'numberInput',
  switch = 'switch',
  select = 'select',
  multipleSelect = 'multipleSelect',
  JSONEditor = 'JSONEditor',
  addInputParam = 'addInputParam',
  selectApp = 'selectApp',
  customVariable = 'customVariable',
  selectLLMModel = 'selectLLMModel',
  settingLLMModel = 'settingLLMModel',
  selectDataset = 'selectDataset',
  selectDatasetParamsModal = 'selectDatasetParamsModal',
  settingDatasetQuotePrompt = 'settingDatasetQuotePrompt',
  hidden = 'hidden',
  custom = 'custom',
  fileSelect = 'fileSelect'
}

export enum WorkflowIOValueTypeEnum {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  object = 'object',
  arrayString = 'arrayString',
  arrayNumber = 'arrayNumber',
  arrayBoolean = 'arrayBoolean',
  arrayObject = 'arrayObject',
  arrayAny = 'arrayAny',
  any = 'any',
  chatHistory = 'chatHistory',
  datasetQuote = 'datasetQuote',
  dynamic = 'dynamic',
  selectDataset = 'selectDataset',
  selectApp = 'selectApp'
}

export enum LLMModelTypeEnum {
  all = 'all',
  classify = 'classify',
  extractFields = 'extractFields',
  toolCall = 'toolCall'
}

export enum FlowNodeOutputTypeEnum {
  hidden = 'hidden',
  source = 'source',
  static = 'static',
  dynamic = 'dynamic',
  error = 'error'
}

// InputConfig
export const InputConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  inputType: z.enum(['input', 'numberInput', 'secret', 'switch', 'select']),
  defaultValue: z.any().optional(),
  list: z
    .array(
      z.object({
        label: z.string(),
        value: z.string()
      })
    )
    .optional()
});
export type InputConfigType = z.infer<typeof InputConfigSchema>;

// Input
export const InputSchema = z.object({
  key: z.string(),
  label: z.string(),
  referencePlaceholder: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  selectedTypeIndex: z.number().optional(),
  renderTypeList: z.array(z.nativeEnum(FlowNodeInputTypeEnum)),
  valueType: z.nativeEnum(WorkflowIOValueTypeEnum),
  valueDesc: z.string().optional(),
  value: z.unknown().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  toolDescription: z.string().optional(),
  canEdit: z.boolean().optional(),
  isPro: z.boolean().optional(),
  maxLength: z.number().optional(),
  canSelectFile: z.boolean().optional(),
  canSelectImg: z.boolean().optional(),
  maxFiles: z.number().optional(),
  inputList: z.array(InputConfigSchema).optional(),
  llmModelType: z.nativeEnum(LLMModelTypeEnum).optional(),
  list: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        icon: z.string().optional(),
        description: z.string().optional(),
        alias: z.string().optional(),
        category: z.string().optional(),
        scenario: z.string().optional(),
        tags: z.array(z.string()).optional()
      })
    )
    .optional(),
  selectorConfig: z
    .object({
      variant: z.enum(['gallery']).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      searchPlaceholder: z.string().optional(),
      groupBy: z.enum(['category', 'scenario']).optional(),
      allowAuto: z.boolean().optional(),
      autoValue: z.string().optional(),
      autoLabel: z.string().optional()
    })
    .optional(),
  markList: z
    .array(
      z.object({
        label: z.string(),
        value: z.number()
      })
    )
    .optional(),
  step: z.number().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  precision: z.number().optional()
});
export type InputType = z.infer<typeof InputSchema>;

// Output
export const OutputSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(FlowNodeOutputTypeEnum).optional(),
  key: z.string(),
  valueType: z.nativeEnum(WorkflowIOValueTypeEnum),
  valueDesc: z.string().optional(),
  value: z.unknown().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().optional()
});
export type OutputType = z.infer<typeof OutputSchema>;

// Tool Tags
export const ToolTagEnum = z.enum([
  'tools',
  'search',
  'multimodal',
  'communication',
  'finance',
  'design',
  'productivity',
  'news',
  'entertainment',
  'social',
  'scientific',
  'other'
]);

// Runtime capability metadata. This is optional and intentionally does not affect
// the existing one-shot tool execution path.
export const ToolRuntimeKindEnum = z.enum(['execute', 'trigger']);
export const ToolExecuteRiskLevelEnum = z.enum(['read', 'write', 'destructive']);
export const ToolTriggerTypeEnum = z.enum(['polling', 'webhook']);

export const ToolExecuteRuntimeSchema = z.object({
  riskLevel: ToolExecuteRiskLevelEnum.optional(),
  requireUserConfirmDefault: z.boolean().optional(),
  idempotencyKeyInput: z.string().optional()
});

export const ToolTriggerRuntimeSchema = z.object({
  type: ToolTriggerTypeEnum,
  minIntervalSeconds: z.number().int().positive().optional(),
  defaultIntervalSeconds: z.number().int().positive().optional(),
  schedule: z
    .object({
      minIntervalSeconds: z.number().int().positive().optional(),
      defaultIntervalSeconds: z.number().int().positive().optional(),
      maxIntervalSeconds: z.number().int().positive().optional(),
      timeoutSeconds: z.number().int().positive().optional(),
      jitterSeconds: z.number().int().nonnegative().optional()
    })
    .optional(),
  state: z
    .object({
      inputKey: z.string().optional(),
      outputKey: z.string().optional(),
      schemaVersion: z.string().optional(),
      cursorKey: z.string().optional(),
      resettable: z.boolean().optional()
    })
    .optional(),
  event: z
    .object({
      outputKey: z.string().optional(),
      schemaVersion: z.string().optional(),
      dedupeKey: z.string().optional(),
      occurredAtKey: z.string().optional(),
      maxBatchEvents: z.number().int().positive().optional()
    })
    .optional(),
  delivery: z
    .object({
      retryMaxAttempts: z.number().int().nonnegative().optional(),
      retryBackoff: z.enum(['fixed', 'linear', 'exponential']).optional(),
      failurePolicy: z.enum(['keep_state', 'advance_state', 'disable']).optional(),
      concurrencyKeyInput: z.string().optional(),
      lockTtlSeconds: z.number().int().positive().optional()
    })
    .optional(),
  permissions: z
    .object({
      allowManualRun: z.boolean().optional(),
      allowAutoRun: z.boolean().optional()
    })
    .optional(),
  maxBatchEvents: z.number().int().positive().optional(),
  stateSchemaVersion: z.string().optional(),
  eventSchemaVersion: z.string().optional(),
  allowManualRun: z.boolean().optional(),
  allowAutoRun: z.boolean().optional(),
  outputEventKey: z.string().optional(),
  outputStateKey: z.string().optional()
});

export const ToolRuntimeSchema = z
  .object({
    kind: ToolRuntimeKindEnum.optional(),
    execute: ToolExecuteRuntimeSchema.optional(),
    trigger: ToolTriggerRuntimeSchema.optional()
  })
  .superRefine((runtime, ctx) => {
    if (runtime.kind === 'trigger' && !runtime.trigger) {
      ctx.addIssue({
        code: 'custom',
        path: ['trigger'],
        message: 'trigger runtime config is required when runtime.kind is trigger'
      });
    }
  });

// Version Item
export const VersionListItemSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
  inputs: z.array(InputSchema),
  outputs: z.array(OutputSchema)
});

// Tool Config (Base)
export const ToolConfigSchema = z.object({
  isWorkerRun: z.boolean().default(false).optional(),
  toolId: z.string().optional(),
  name: I18nStringSchema,
  description: I18nStringSchema,
  toolDescription: z.string().optional(),
  versionList: z.array(VersionListItemSchema).min(1),
  tags: z.array(ToolTagEnum).optional(),
  icon: z.string().optional(),
  avatar: z.string().optional(),
  author: z.string().optional(),
  courseUrl: z.string().optional(),
  runtime: ToolRuntimeSchema.optional(),
  secretInputConfig: z.array(InputConfigSchema).optional()
});

// Tool (with ID and Icon)
export const ToolSchema = ToolConfigSchema.extend({
  toolId: z.string(),
  tags: z.array(ToolTagEnum).optional(),
  icon: z.string(),
  parentId: z.string().optional(),
  toolFilename: z.string().optional(),
  version: z.string().optional(),
  versionLabel: z.string().optional()
});

// Tool Detail (for API response)
export const ToolDetailSchema = ToolSchema.omit({
  isWorkerRun: true,
  toolFilename: true,
  versionList: true
}).extend({
  versionList: z.array(VersionListItemSchema).optional()
});

// Tool Simple (for lists)
export const ToolSimpleSchema = ToolDetailSchema.omit({
  secretInputConfig: true,
  toolDescription: true,
  versionList: true
});

export type ToolDetailType = z.infer<typeof ToolDetailSchema>;
export type ToolSimpleType = z.infer<typeof ToolSimpleSchema>;
export type ToolType = z.infer<typeof ToolSchema>;
