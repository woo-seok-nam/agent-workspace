import { revisionReport } from './revision-report.js';
import { previewGeneration } from './preview.js';
import { redactSecrets } from '../execution/report.js';
import { atomicWrite } from '../execution/store.js';
import { draftRevisionRequest } from './revise.js';
import { backend } from '../providers/config.js';
import { parseArgs } from 'node:util';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { GeneratorRequestSchema } from './schema.js';
import { generateWorkflow, type Limits } from './generate.js';
import { createGenerationProvider, GenerationError } from './provider.js';
import { DEMO_REQUEST, DEMO_SCENARIOS, demoProvider } from './demo.js';
import { validateDraft } from './validate.js';
async function jsonFile(path: string): Promise<unknown> {
  if ((await stat(path)).size > 2_000_000) throw new GenerationError('FILE_TOO_LARGE', '입력 JSON은 2MB 이하여야 합니다.');
  return JSON.parse(await readFile(path, 'utf8'));
}
function redact(value: unknown): string {
  let serialized = JSON.stringify(value, null, 2);
  for (const key of ['FACTCHAT_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'CLAUDE_API_KEY']) {
    const secret = process.env[key];
    if (secret && secret.length > 4) serialized = serialized.split(secret).join('[REDACTED]');
  }
  return serialized;
}
async function main() {
  const { values: v } = parseArgs({ options: {
    revise: { type: 'string' }, feedback: { type: 'string' }, request: { type: 'string' }, input: { type: 'string' }, resume: { type: 'string' }, answer: { type: 'string' },
    demo: { type: 'boolean' }, scenario: { type: 'string' }, validate: { type: 'string' },
    'no-search': { type: 'boolean' }, 'max-repairs': { type: 'string' }, 'max-api-retries': { type: 'string' },
    'timeout-ms': { type: 'string' }, 'max-output-tokens': { type: 'string' }, help: { type: 'boolean' },
  }, strict: true, allowPositionals: false });
  if (v.help) {
    console.log(`Workflow 초안 생성기 v0.1\n\nnpm run generate:demo -- --scenario repair\nnpm run generate -- --request "요청" --no-search\nnpm run generate -- --input examples/generator/request.json\nnpm run generate -- --resume .local/generations/ID/record.json --answer "질문 답변"\nnpm run generate -- --validate 결과.json --input examples/generator/request.json\n\n초안 수정: npm run generate -- --revise 이전/record.json --feedback "비교와 보고서 작성을 나눠줘"\n\n실제 작업은 실행하지 않습니다. --demo는 고정 fixture 검사이며 실제 자연어 생성이 아닙니다.`); return;
  }
  const sources = [v.request, v.input, v.resume, v.revise].filter(x => x !== undefined).length;
  if (v.demo && (sources || v.answer || v.validate || v['no-search'])) throw new GenerationError('CLI_USAGE', '--demo는 고정 입력만 사용합니다. 다른 입력 옵션과 함께 사용하지 마세요.');
  if (!v.demo && sources !== 1) throw new GenerationError('CLI_USAGE', '--request, --input, --resume, --revise 중 하나를 지정하세요. --help로 사용법을 확인할 수 있습니다.');
  if (v.feedback !== undefined && !v.revise) throw new GenerationError('CLI_USAGE', '--feedback은 --revise와 함께 사용하세요.');
  if (v.revise && (v.validate || v.answer || v['no-search'])) throw new GenerationError('CLI_USAGE', '초안 수정은 기존 정책을 유지합니다. --validate, --answer, --no-search를 함께 사용할 수 없습니다.');
  if (v.answer !== undefined && !v.resume) throw new GenerationError('CLI_USAGE', '--answer는 --resume과 함께 사용하세요.');
  if (v.scenario && !v.demo) throw new GenerationError('CLI_USAGE', '--scenario는 --demo에서만 사용합니다.');
  if (v.validate && (v.resume || v.answer)) throw new GenerationError('CLI_USAGE', '--validate에는 --input 또는 --request를 사용하세요.');
  const scenario = z.enum(DEMO_SCENARIOS).parse(v.scenario ?? 'valid');
  let raw: unknown;
  if (v.demo) raw = scenario === 'clarification' ? { request: '캡디 관련해서 뭐 좀 만들어줘.' } : DEMO_REQUEST;
  else if (v.revise) raw = draftRevisionRequest(await jsonFile(v.revise), v.feedback);
  else if (v.input) raw = await jsonFile(v.input);
  else if (v.resume) {
    if (!v.answer?.trim()) throw new GenerationError('CLI_USAGE', '--resume에는 --answer로 확인 질문의 답변을 입력하세요.');
    const old = z.object({ request: GeneratorRequestSchema, outcome: z.literal('needs_clarification'), response: z.object({ questions: z.array(z.string().min(1)).min(1).max(3) }) }).parse(await jsonFile(v.resume));
    raw = { ...old.request, clarifications: [...old.request.clarifications, { questions: old.response.questions, answer: v.answer }] };
  } else raw = { request: v.request };
  const request = GeneratorRequestSchema.parse(raw);
  if (v['no-search']) request.policies.allow_external_search = false;
  if (v.validate) {
    const data = await jsonFile(v.validate);
    const candidate = data && typeof data === 'object' && 'response' in data ? data.response : data;
    const checked = validateDraft(candidate, request);
    console.log(redact(checked.validation)); if (!checked.validation.passed) process.exitCode = 1; return;
  }
  const options: Partial<Limits> = {};
  for (const [arg, key] of [['max-repairs', 'maxRepairs'], ['max-api-retries', 'maxApiRetries'], ['timeout-ms', 'totalTimeoutMs'], ['max-output-tokens', 'maxOutputTokens']] as const)
    if (v[arg] !== undefined) options[key] = Number(v[arg]);
  if (!v.demo && backend(process.env) === 'factchat' && options.maxOutputTokens === undefined) options.maxOutputTokens = 16384;
  const provider = v.demo ? demoProvider(scenario) : createGenerationProvider(process.env);
  const cancellation = new AbortController(); const onInterrupt = () => cancellation.abort();
  process.once('SIGINT', onInterrupt);
  try {
    console.log(v.demo ? '[DEMO] 고정 예시 응답으로 생성 파이프라인을 검사합니다. LLM 호출 없음.' : `[LIVE] Workflow 초안을 생성합니다. 실제 작업은 실행하지 않습니다.`);
    const result = await generateWorkflow(request, provider, options, cancellation.signal);
    const directory = resolve('.local', 'generations', result.run_id);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'record.json'), redact(result), { mode: 0o600 });
    if (result.response) await writeFile(resolve(directory, 'response.json'), redact(result.response), { mode: 0o600 });
    if (result.validation) await writeFile(resolve(directory, 'validation.json'), redact(result.validation), { mode: 0o600 });
    if (result.outcome !== 'failed' && request.draft_revision) {
      const review = revisionReport(result);
      await atomicWrite(resolve(directory, 'changes.json'), redact({counts:review.counts,changes:review.changes}));
      await atomicWrite(resolve(directory, 'changes.md'), redactSecrets(review.markdown, process.env));
      await atomicWrite(resolve(directory, 'preview.md'), redactSecrets(previewGeneration(result).markdown, process.env));
      console.log(`변경 비교: ${resolve(directory, 'changes.md')}\n미리보기: ${resolve(directory, 'preview.md')}`);
    }
    console.log(`결과: ${result.outcome}\n모델 호출: ${result.stats.model_calls} | API 재시도: ${result.stats.api_retries} | 구조 보정: ${result.stats.repairs}`);
    if (request.draft_revision) console.log(`초안 수정 저장 완료 / 변경 경로 ${result.revision_changes?.length ?? 0}개 (최대 100개). 실제 반영 여부는 미리보기로 검토하세요.`);
    if (result.response?.status === 'needs_clarification') for (const [i, q] of result.response.questions.entries()) console.log(`${i + 1}. ${q}`);
    if (result.response?.workflow && result.outcome === 'draft') {
      console.log(`\n${result.response.workflow.name}`);
      for (const n of result.response.workflow.nodes) console.log(`- ${n.id} [${n.type}] ${n.name}`);
      console.log('구조·명시 정책 검사 통과. 절차와 조건 추출의 적절성은 사용자 검토가 필요합니다.');
    }
    if (result.error) { console.error(`${result.error.code}: ${result.error.message}`); process.exitCode = result.error.code === 'CANCELLED' ? 130 : 1; }
    for (const e of result.validation?.errors ?? []) console.error(`  ${e.code}: ${e.message}`);
    console.log(`\n기록: ${directory}\nJSON: ${resolve(directory, 'response.json')}${result.response ? '' : ' (생성되지 않음)'}`);
  } finally { process.removeListener('SIGINT', onInterrupt); }
}
main().catch(e => {
  if (e instanceof z.ZodError) console.error('입력/설정 형식 오류:', e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
  else if (e instanceof GenerationError) console.error(`${e.code}: ${e.message}`);
  else console.error('입력 파일·JSON·명령 옵션을 확인하세요. --help로 사용법을 볼 수 있습니다.');
  process.exitCode = 1;
});
