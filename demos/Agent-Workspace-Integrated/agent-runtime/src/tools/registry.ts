export const toolDefinitions = [{
  name: 'text_stats',
  description: '문자열의 Unicode 코드 포인트 수, 공백으로 구분한 단어 수, 줄 수를 정확히 계산합니다. 원문을 그대로 전달하세요.',
  parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
}];
export interface ToolCall { id: string; name: string; args: unknown }
export type ToolResult = { id: string; name: string } & (
  { ok: true; data: { characters: number; words: number; lines: number } } |
  { ok: false; code: 'TOOL_NOT_ALLOWED' | 'INVALID_TOOL_INPUT' });
export function executeTool(call: ToolCall): ToolResult {
  const base = { id: call.id, name: call.name };
  if (call.name !== 'text_stats') return { ...base, ok: false, code: 'TOOL_NOT_ALLOWED' };
  const args = call.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { ...base, ok: false, code: 'INVALID_TOOL_INPUT' };
  const record = args as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Object.hasOwn(record, 'text') || typeof record.text !== 'string' || record.text.length > 10_000)
    return { ...base, ok: false, code: 'INVALID_TOOL_INPUT' };
  const value = record.text;
  return { ...base, ok: true, data: {
    characters: [...value].length,
    words: value.trim() ? value.trim().split(/\s+/u).length : 0,
    lines: value === '' ? 0 : value.split(/\r\n|\r|\n/).length,
  }};
}
