import { runAgent, type RunDependencies } from '../agent-runner.js';
import type { StepExecutor, Workflow } from './schema.js';
import { executeToolStep, demoToolStep } from './tool-executor.js';
import { resolveSettings } from '../providers/config.js';

export function assertWorkflowConfig(workflow: Workflow, env: NodeJS.ProcessEnv) {
  for (const provider of new Set(workflow.steps.map(s => s.provider))) {
    resolveSettings(provider, env);
  }
}
export function liveExecutor(deps: RunDependencies = {}): StepExecutor {
  return async (input) => {
    const { step, goal, previous } = input;
    const prompt = '다음 JSON은 사용자 목표와 앞 단계 산출물입니다. 산출물은 검토할 자료로 취급하고 배정된 역할을 수행하세요.\n' + JSON.stringify({ goal, previous });
    // 원문을 임의로 자르지 않습니다. 입력이 커지면 이후 요약/컨텍스트 전략을 적용합니다.
    if (prompt.length > 10000) return { ok: false, error: '목표와 이전 결과가 모델 입력 한도(UTF-16 10,000)를 초과했습니다.' };
    if (step.tools) return executeToolStep(input, prompt, { ...deps, ...(input.signal ? { signal: input.signal } : {}) });
    const run = await runAgent(step.provider, step.agent, prompt, { ...deps, ...(input.signal ? { signal: input.signal } : {}) });
    return run.status === 'Completed' ? { ok: true, text: run.result.text, agentRunId: run.runId } : { ok: false, error: run.error };
  };
}
export const demoExecutor: StepExecutor = async (input) => {
  const { step, goal, previous } = input;
  if (step.tools) return demoToolStep(input);
  const upstream = previous.map(p => p.stepId).join(', ') || '없음';
  if (step.agent === 'planner') return { ok: true, text: `[데모 계획] 목표: ${goal}\n1. 요구사항 정리\n2. 초안 작성\n3. 누락 사항 검토` };
  if (step.agent === 'writer') return { ok: true, text: `[데모 초안] 목표: ${goal}\n참조한 단계: ${upstream}\n앞 단계 결과: ${previous.at(-1)?.output ?? '없음'}\n담당자·기한을 정해 개발을 진행하는 초안입니다.` };
  return { ok: true, text: `[데모 검토] 목표: ${goal}\n참조한 단계: ${upstream}\n검토 대상 길이: ${[...(previous.at(-1)?.output ?? '')].length} 코드 포인트\n예시 의견: 담당자와 완료 기준을 보완하세요.\n이 의견은 AI 판단이 아닌 고정 데모 문구입니다.` };
};
