import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import type { Workflow, StepExecutor, StepResult, WorkflowEvent } from './schema.js';
import { executeStep } from './step-execution.js';

const State = Annotation.Root({
  goal: Annotation<string>(),
  steps: Annotation<StepResult[]>(),
  failed: Annotation<boolean>(),
  attention: Annotation<boolean>(),
  cancelled: Annotation<boolean>(),
});
// 순차 실행만 지원합니다. 정의한 각 단계를 그래프의 노드로 변환합니다.
export function compileWorkflow(snapshot: Workflow, execute: StepExecutor, emit: (event: WorkflowEvent) => void,
  checkpoint: (steps: StepResult[], failed: boolean, attention?: boolean, cancelled?: boolean) => void = () => {}, approvedSteps: string[] = [], signal?: AbortSignal) {
  const nodeIds = snapshot.steps.map(s => `step_${s.id}`);
  const graph = new StateGraph(State, { nodes: nodeIds });
  snapshot.steps.forEach((step, index) => {
    const nodeId = nodeIds[index]!;
    graph.addNode(nodeId, async (state: typeof State.State) => {
      if (state.steps[index]!.status === 'Completed') return {};
      const steps = state.steps.map(s => ({ ...s }));
      const cancel = () => {
        steps[index] = { ...steps[index]!, status: 'Cancelled', error: '사용자가 실행을 취소했습니다.' };
        for (let i = index + 1; i < steps.length; i++) steps[i] = { ...steps[i]!, status: 'Skipped' };
        checkpoint(steps, false, false, true);
        emit({ stepId: step.id, status: 'Cancelled' });
        for (let i = index + 1; i < steps.length; i++) emit({ stepId: steps[i]!.id, status: 'Skipped' });
        return { steps, failed: false, attention: false, cancelled: true };
      };
      if (signal?.aborted) return cancel();
      if (step.reviewBefore && !approvedSteps.includes(step.id)) {
        steps[index] = { ...steps[index]!, status: 'Attention' };
        checkpoint(steps, false, true); emit({ stepId: step.id, status: 'Attention' });
        return { steps, failed: false, attention: true };
      }
      steps[index] = { ...steps[index]!, status: 'Running' };
      checkpoint(steps, false);
      emit({ stepId: step.id, status: 'Running' });
      if (signal?.aborted) return cancel();
      const previous = state.steps.slice(0, index).filter(s => s.status === 'Completed').map(s => ({ stepId: s.id, output: s.output! }));
      const outcome = await executeStep({ step: { ...step }, goal: state.goal, previous, ...(signal ? { signal } : {}) }, execute);
      let result = outcome.result;
      if (result.ok && !result.text.trim()) result = { ...result, ok: false, error: '단계 결과가 비어 있습니다.' };
      if (result.toolTrace) steps[index] = { ...steps[index]!, toolTrace: result.toolTrace };
      if (outcome.termination === 'cancelled' || (!outcome.termination && signal?.aborted)) return cancel();
      if (result.ok) {
        steps[index] = { ...steps[index]!, status: 'Completed', output: result.text,
          ...(result.agentRunId ? { agentRunId: result.agentRunId } : {}) };
        checkpoint(steps, false);
        emit({ stepId: step.id, status: 'Completed' });
        return { steps, failed: false };
      }
      steps[index] = { ...steps[index]!, status: 'Failed', error: result.error,
        ...(outcome.termination === 'timeout' ? { errorCode: 'STEP_TIMEOUT' as const } : {}) };
      for (let i = index + 1; i < steps.length; i++) {
        steps[i] = { ...steps[i]!, status: 'Skipped' };
      }
      checkpoint(steps, true);
      emit({ stepId: step.id, status: 'Failed' });
      for (let i = index + 1; i < steps.length; i++) emit({ stepId: steps[i]!.id, status: 'Skipped' });
      return { steps, failed: true };
    });
  });
  graph.addEdge(START, nodeIds[0]!);
  nodeIds.forEach((id, i) => {
    const next = nodeIds[i + 1] ?? END;
    graph.addConditionalEdges(id, state => state.failed || state.attention || state.cancelled ? END : next, next === END ? [END] : [END, next]);
  });
  return graph.compile();
}
