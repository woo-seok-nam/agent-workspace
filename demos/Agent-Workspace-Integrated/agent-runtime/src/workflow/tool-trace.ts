import { z } from 'zod';
const Count = z.number().int().nonnegative();
const Identity = { id: z.string().min(1), name: z.string().min(1) };
export const ToolTraceSchema = z.object({
  modelTurns: Count.max(10),
  tools: z.array(z.discriminatedUnion('ok', [
    z.object({ ...Identity, name: z.literal('text_stats'), ok: z.literal(true), data: z.object({ characters: Count, words: Count, lines: Count }).strict() }).strict(),
    z.object({ ...Identity, ok: z.literal(false), code: z.enum(['TOOL_NOT_ALLOWED', 'INVALID_TOOL_INPUT']) }).strict(),
  ])).max(20),
}).strict();
export type ToolTrace = z.infer<typeof ToolTraceSchema>;
