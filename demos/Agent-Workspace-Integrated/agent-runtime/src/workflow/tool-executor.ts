import { randomUUID } from 'node:crypto';
import { agents } from '../agents.js';
import { createToolSession } from '../providers/tool-session.js';
import { runToolLoop, type ToolSession } from '../tool-loop.js';
import { ToolTraceSchema } from './tool-trace.js';
import type { StepInput, StepOutput } from './schema.js';
import type { RunDependencies } from '../agent-runner.js';

export async function executeToolStep(input: StepInput, prompt: string, deps: RunDependencies): Promise<StepOutput> {
  const session = createToolSession(input.step.provider, prompt, agents[input.step.agent].instructions +
    '\n글자·단어·줄 수 확인이 필요하면 text_stats를 사용하세요. 도구 실패를 성공이라고 말하지 마세요.', deps.env, deps.transport, input.signal);
  return finishToolStep(input, session);
}
export async function finishToolStep(input: StepInput, session: ToolSession): Promise<StepOutput> {
  const result = await runToolLoop(session, input.step.tools, input.signal);
  // 원시 모델 응답, reasoning, 인증 정보, 도구 입력 원문은 trace에 저장하지 않습니다.
  const toolTrace = ToolTraceSchema.parse({ modelTurns: result.modelTurns, tools: result.tools });
  return result.status === 'Completed'
    ? { ok: true, text: result.text, agentRunId: randomUUID(), toolTrace }
    : { ok: false, error: result.error, toolTrace };
}
export function demoToolStep(input: StepInput): Promise<StepOutput> {
  let turn = 0;
  const target = input.previous.at(-1)?.output ?? input.goal;
  return finishToolStep(input, { async next(results) {
    if (++turn === 1) return { text: '', calls: [{ id: 'demo-stats-1', name: 'text_stats', args: { text: target } }] };
    const result = results[0];
    if (!result?.ok) return { text: `[데모 도구 실패] ${result && !result.ok ? result.code : '결과 없음'}. 통계는 확인하지 못했습니다.`, calls: [] };
    return { text: `[데모 도구 검토] 대상: ${input.previous.at(-1)?.stepId ?? '사용자 목표'}\n실제 text_stats 결과: 글자 ${result.data.characters}개, 공백 기준 단어 ${result.data.words}개, 줄 ${result.data.lines}개\n예시 의견: 담당자와 완료 기준을 보완하세요.\n모델의 선택과 의견은 고정 시나리오이며 통계 도구만 실제 계산했습니다.`, calls: [] };
  } });
}
