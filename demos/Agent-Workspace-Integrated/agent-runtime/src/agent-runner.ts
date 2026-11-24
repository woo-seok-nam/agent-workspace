import { randomUUID } from "node:crypto";
import { agents, type AgentId } from "./agents.js";
import { AgentError, type ModelResult } from "./types.js";
import { runModel } from "./run.js";
import type { Transport } from "./providers/http.js";

interface RunBase { runId: string; agentId: string; startedAt: string; durationMs: number }
export type AgentRun =
  | (RunBase & { status: "Completed"; result: ModelResult })
  | (RunBase & { status: "Failed"; error: string });
export interface RunDependencies { env?: NodeJS.ProcessEnv; transport?: Transport; signal?: AbortSignal }

// 이 Runner는 모델 호출 1회입니다. 도구 반복은 별도 tool-loop.ts에서 담당합니다.
export async function runAgent(provider: string, agentId: string, task: string, deps: RunDependencies = {}): Promise<AgentRun> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const base = () => ({ runId, agentId, startedAt, durationMs: Math.round(performance.now() - start) });
  try {
    if (!Object.hasOwn(agents, agentId)) throw new AgentError("Agent는 planner, writer, reviewer 중 하나를 선택하세요.");
    const definition = agents[agentId as AgentId];
    const result = await runModel(provider, task, deps.env ?? process.env, deps.transport ?? fetch,
      { system: definition.instructions, ...(deps.signal ? { signal: deps.signal } : {}) });
    return { ...base(), status: "Completed", result };
  } catch (error) {
    return { ...base(), status: "Failed", error: error instanceof AgentError ? error.message : "Agent 실행 중 내부 오류가 발생했습니다." };
  }
}
