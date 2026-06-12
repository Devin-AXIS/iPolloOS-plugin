import { z } from 'zod';
import {
  emptyCompetitiveIntelligenceOutput,
  runCompetitiveIntelligenceTool
} from '../../../lib/competitive-intelligence';

const emptyToDefault = (value: unknown, fallback = '') => {
  if (value == null) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return value;
};

const JsonLikeSchema = z.union([
  z.string().min(1).max(900_000),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown())
]);
const OptionalJsonLikeSchema = z
  .union([z.string().max(900_000), z.array(z.unknown()), z.record(z.string(), z.unknown())])
  .optional()
  .default('');

export const InputType = z
  .object({
    relation_subject: z
      .preprocess((value) => emptyToDefault(value), z.string().max(180))
      .optional()
      .default(''),
    subject_name: z
      .preprocess((value) => emptyToDefault(value), z.string().max(180))
      .optional()
      .default(''),
    industry: z
      .preprocess((value) => emptyToDefault(value), z.string().max(120))
      .optional()
      .default(''),
    research_focus: z
      .preprocess((value) => emptyToDefault(value), z.string().max(220))
      .optional()
      .default(''),
    relationship_context: z
      .preprocess((value) => emptyToDefault(value), z.string().max(260))
      .optional()
      .default(''),
    visual_image_url: z
      .preprocess((value) => emptyToDefault(value), z.string().max(700))
      .optional()
      .default(''),
    logo_url: z
      .preprocess((value) => emptyToDefault(value), z.string().max(700))
      .optional()
      .default(''),
    portrait_image_url: z
      .preprocess((value) => emptyToDefault(value), z.string().max(700))
      .optional()
      .default(''),
    image_search_query: z
      .preprocess((value) => emptyToDefault(value), z.string().max(240))
      .optional()
      .default(''),
    dossier_json: JsonLikeSchema,
    evidence_json: OptionalJsonLikeSchema,
    entities_json: OptionalJsonLikeSchema,
    report_date: z
      .preprocess((value) => emptyToDefault(value), z.string().max(80))
      .optional()
      .default(''),
    page_output_mode: z
      .enum(['auto_publish', 'resource_center', 'raw_html'])
      .optional()
      .default('auto_publish')
  })
  .superRefine((value, ctx) => {
    if (!value.relation_subject && !value.subject_name) {
      ctx.addIssue({
        code: 'custom',
        path: ['relation_subject'],
        message: 'relation_subject 或 subject_name 至少填写一个'
      });
    }
  });

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  full_html: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    return runCompetitiveIntelligenceTool('relation', input);
  } catch (error: unknown) {
    return emptyCompetitiveIntelligenceOutput(
      error instanceof Error ? error.message : String(error)
    );
  }
}
