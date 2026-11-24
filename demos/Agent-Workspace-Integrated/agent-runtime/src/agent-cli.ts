import { runAgent } from "./agent-runner.js";
const [provider, agentId, ...words] = process.argv.slice(2);
if (!provider || !agentId || words.length === 0) {
  console.error('사용법: npm.cmd run agent -- openai planner "캡스톤 개발 계획을 작성해줘"');
  console.error("공급자: openai | gemini | claude / Agent: planner | writer | reviewer");
  process.exitCode = 2;
} else {
  console.error("[Running] 요청을 처리하고 있습니다.");
  const run = await runAgent(provider, agentId, words.join(" "));
  console.error(`[${run.status}] 실행 ID: ${run.runId} / ${run.durationMs}ms`);
  if (run.status === "Completed") console.log(run.result.text);
  else { console.error(run.error); process.exitCode = 1; }
}
