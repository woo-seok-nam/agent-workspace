import type { ExecutionRecord } from './run.js';
export function reportMarkdown(result: ExecutionRecord): string | null {
  if (result.status !== 'completed') return null;
  const entries = Object.entries(result.output);
  if (entries.length === 1) return entries[0]![1] + '\n';
  return entries.map(([port, text]) => `## ${port}\n\n${text}`).join('\n\n') + '\n';
}
export function redactSecrets(text: string, env: NodeJS.ProcessEnv): string {
  for (const key of ['FACTCHAT_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLAUDE_API_KEY']) {
    const value = env[key]; if (value && value.length > 4) text = text.split(value).join('[REDACTED]');
  }
  return text;
}

export function pendingArtifacts(result: ExecutionRecord): { draft: string | null; review: string | null } {
  if (result.status === 'completed' || result.status === 'running') return { draft: null, review: null };
  const work = [...result.steps].reverse().find(s => s.verdict === null);
  const review = [...result.steps].reverse().find(s => s.verdict !== null);
  return {
    draft: work ? '# 미완료 작업 결과 — 최종 승인되지 않음\n\n' + Object.values(work.outputs).join('\n\n') + '\n' : null,
    review: review ? '# 검토 기록 — 최종 보고서 아님\n\n' + Object.values(review.outputs).join('\n\n') + '\n\n## 미해결 사항\n\n' + review.issues.map(i => '- ' + i).join('\n') + '\n' : null,
  };
}
