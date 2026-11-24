import { runModel } from "./run.js";
import { AgentError } from "./types.js";
const [provider, ...words] = process.argv.slice(2);
try {
  if (!provider || !words.length) throw new AgentError('사용법: npm.cmd run chat -- openai "오늘 할 일을 정리해줘" (gemini, claude도 가능)');
  const result = await runModel(provider, words.join(" "));
  console.log(`[${result.provider} / ${result.model}]\n${result.text}`);
} catch (error) {
  console.error(error instanceof AgentError ? error.message : "실행 중 내부 오류가 발생했습니다.");
  process.exitCode = 1;
}
