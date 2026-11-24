import { AgentError } from './types.js';
import { executeTool, type ToolCall, type ToolResult } from './tools/registry.js';
export interface ToolTurn { text: string; calls: ToolCall[] }
export interface ToolSession { next(results: ToolResult[]): Promise<ToolTurn> }
export interface LoopEvent { kind: 'ModelTurn' | 'ToolCompleted'; step: number; ok?: boolean }
export type LoopResult = { modelTurns: number; tools: ToolResult[]; events: LoopEvent[] } & (
  { status: 'Completed'; text: string } | { status: 'Failed'; error: string });
export async function runToolLoop(session: ToolSession, limits = { maxModelCalls: 4, maxToolCalls: 8 }, signal?: AbortSignal): Promise<LoopResult> {
  let modelTurns = 0;
  const tools: ToolResult[] = [], events: LoopEvent[] = [];
  const base = () => ({ modelTurns, tools, events });
  try {
    if (!Number.isInteger(limits.maxModelCalls) || limits.maxModelCalls < 1 || limits.maxModelCalls > 10 ||
        !Number.isInteger(limits.maxToolCalls) || limits.maxToolCalls < 0 || limits.maxToolCalls > 20)
      throw new AgentError('실행 한도 설정이 잘못되었습니다.');
    let results: ToolResult[] = [];
    while (modelTurns < limits.maxModelCalls) {
      if (signal?.aborted) throw new AgentError("사용자가 실행을 취소했습니다.");
      modelTurns++;
      events.push({ kind: 'ModelTurn', step: modelTurns });
      const turn = await session.next(results);
      if (signal?.aborted) throw new AgentError("사용자가 실행을 취소했습니다.");
      if (!turn.calls.length) {
        if (!turn.text.trim()) throw new AgentError('최종 답변이 비어 있습니다.');
        return { ...base(), status: 'Completed', text: turn.text };
      }
      // 마지막 호출에서 도구를 실행하면 그 결과를 모델에 돌려줄 수 없으므로 실행 전에 중단합니다.
      if (modelTurns >= limits.maxModelCalls) throw new AgentError('모델 호출 한도에 도달했습니다.');
      if (tools.length + turn.calls.length > limits.maxToolCalls) throw new AgentError('도구 호출 한도에 도달했습니다.');
      if (turn.calls.some(c => !c.id || !c.name) || new Set(turn.calls.map(c => c.id)).size !== turn.calls.length)
        throw new AgentError('도구 호출 식별자가 잘못되었습니다.');
      results = turn.calls.map(call => executeTool(call));
      tools.push(...results);
      for (const r of results) events.push({ kind: 'ToolCompleted', step: modelTurns, ok: r.ok });
    }
    throw new AgentError('모델 호출 한도에 도달했습니다.');
  } catch (e) {
    return { ...base(), status: 'Failed', error: e instanceof AgentError ? e.message : '도구 실행 과정에서 내부 오류가 발생했습니다.' };
  }
}
