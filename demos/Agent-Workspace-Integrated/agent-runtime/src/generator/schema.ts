import { z } from 'zod';
const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const strings = z.array(text).max(40);
const field = z.object({ name: id, type: z.enum(['text', 'number', 'boolean']), required: z.boolean() }).strict();
const port = z.object({
  name: id, type: z.enum(['text', 'table', 'object', 'file_ref']), description: text,
  required: z.boolean(), fields: z.array(field).max(30),
}).strict();
const rationale = z.object({
  kind: z.enum(['reference_applied', 'reference_adapted', 'model_proposal']),
  reference_id: text.nullable(), location: text.nullable(), reason: text,
}).strict();
const task = z.object({
  kind: z.enum(['work', 'final_review']), purpose: text, instructions: text,
  completion_criteria: strings.min(1), rationale,
  prerequisites: z.array(z.object({
    kind: z.enum(['input', 'human', 'tool']),
    description: text,
    input_port: id.nullable(),
  }).strict()).max(40).default([]),
  required_tools: z.array(id).max(20), missing_capabilities: strings,
  requirement_refs: strings,
}).strict();
export const DraftResponseSchema = z.object({
  schema_version: z.literal('0.1'), status: z.enum(['needs_clarification', 'draft']),
  intent: z.object({ goal: z.string().max(4000), requirements: strings, assumptions: strings, deliverable: z.string().max(4000) }).strict(),
  questions: z.array(text).max(3),
  workflow: z.object({
    name: text,
    nodes: z.array(z.object({
      id, type: z.enum(['input', 'work_step', 'output']), name: text,
      input_ports: z.array(port).max(30), output_ports: z.array(port).max(30), task: task.nullable(),
    }).strict()).min(4).max(30),
    edges: z.array(z.object({ source_node: id, source_port: id, target_node: id, target_port: id }).strict()).max(200),
  }).strict().nullable(),
}).strict();
export type DraftResponse = z.infer<typeof DraftResponseSchema>;
export type WorkflowNode = NonNullable<DraftResponse['workflow']>['nodes'][number];
export const GeneratorRequestSchema = z.object({
  request: z.string().trim().min(1).max(12000),
  execution_input_mode: z.enum(['manual', 'request']).optional(),
  draft_revision: z.object({
    feedback: z.string().trim().min(1).max(2000),
    source_run_id: z.string().uuid().nullable(),
    previous_draft: DraftResponseSchema,
  }).strict().optional(),
  confirmed_requirements: strings.default([]),
  materials: z.array(z.object({ id, name: text, availability: z.enum(['provided', 'not_provided']), description: text }).strict()).max(30).default([]),
  tools: z.array(z.object({ id, description: text, capabilities: z.array(z.enum(['web_search', 'file_read', 'file_write', 'other'])).min(1) }).strict()).max(30).default([]),
  guidance: z.array(z.object({ id: text, location: text, content: text }).strict()).max(20).default([]),
  policies: z.object({ allow_external_search: z.boolean().default(true) }).strict().default({ allow_external_search: true }),
  clarifications: z.array(z.object({ questions: z.array(text).min(1).max(3), answer: text }).strict()).max(10).default([]),
}).strict().superRefine((r, ctx) => {
  for (const key of ['tools', 'materials'] as const) {
    if (new Set(r[key].map(x => x.id)).size !== r[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'ID가 중복되었습니다.' });
  }
  if (new Set(r.guidance.map(x => `${x.id}\0${x.location}`)).size !== r.guidance.length)
    ctx.addIssue({ code: 'custom', path: ['guidance'], message: 'Reference ID와 위치가 중복되었습니다.' });
});
export type GeneratorRequest = z.infer<typeof GeneratorRequestSchema>;
export function responseJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(DraftResponseSchema) as Record<string, unknown>;
  delete schema.$schema;
  // Legacy records may omit prerequisites; wire responses must explicitly include it.
  function stripDefaults(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value)) delete (value as Record<string, unknown>).default;
    for (const child of Object.values(value)) stripDefaults(child);
  }
  stripDefaults(schema);
  return schema;
}
