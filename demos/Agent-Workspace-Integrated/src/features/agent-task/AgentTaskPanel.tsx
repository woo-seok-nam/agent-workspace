import { useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Reply = {
  taskId?: string; mode?: 'demo' | 'live'; status: string; markdown?: string;
  inputs?: { name: string; description: string; required: boolean }[];
  draft?: string | null; review?: string | null; error?: string | null; message?: string;
  issues?: { detail: string }[]; recordPath?: string;
};
const statusLabel: Record<string, string> = {
  draft: '계획 준비 완료 — 내용을 확인하고 실행하세요', completed: '답변 완료',
  needs_clarification: '추가 설명 필요 — 아래 질문을 반영해 요청을 다시 작성하세요',
  needs_review: '검토 필요 — 초안과 검토 의견을 확인하세요', failed: '작업 실패', blocked: '실행 준비 필요',
};
function Markdown({ text }: { text: string }) {
  return <div className="agent-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown></div>;
}
export default function AgentTaskPanel({ hidden = false }: { hidden?: boolean }) {
  const [request, setRequest] = useState('AI 에이전트와 워크플로우의 차이를 예시와 함께 설명해줘. 웹 검색 없이 답변해줘.');
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [plan, setPlan] = useState<Reply | null>(null);
  const [result, setResult] = useState<Reply | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const active = useRef(false);
  async function call(action: 'plan' | 'run') {
    if (active.current) return;
    if (!isTauri()) { setError('입력·AI 실행은 데스크톱 앱에서 사용할 수 있습니다. CMD에서 pnpm tauri dev로 실행하세요.'); return; }
    active.current = true; setError(''); setBusy(action === 'plan' ? '계획 생성 중…' : '계획 실행 및 최종 검토 중…');
    if (action === 'plan') { setPlan(null); setInputs({}); }
    setResult(null);
    try {
      const payload = action === 'plan' ? { action, request, mode } : { action, taskId: plan?.taskId, inputs };
      const reply = await invoke<Reply>('agent_task', { payload });
      if (action === 'plan') setPlan(reply); else setResult(reply);
    } catch (e) { setError(typeof e === 'string' ? e : '앱과 Runtime 연결을 확인하세요.'); }
    finally { active.current = false; setBusy(''); }
  }
  function invalidate() { setPlan(null); setResult(null); setInputs({}); setError(''); }
  const missing = plan?.inputs?.some(p => p.required && !inputs[p.name]?.trim());
  return <section className="agent-task-panel" hidden={hidden} aria-label="AI 계획 및 실행">
    <h1>계획을 확인하고 AI로 실행하기</h1>
    <p>텍스트 작업을 순서대로 실행합니다. 웹 검색·외부 도구·PDF 출력은 아직 지원하지 않습니다.</p>
    <label>실행 모드 <select value={mode} disabled={!!busy} onChange={e => { setMode(e.target.value as 'demo' | 'live'); invalidate(); }}>
      <option value="demo">데모 — API 키 없이 고정 응답</option>
      <option value="live">실제 AI — .env의 API 설정 사용</option>
    </select></label>
    <p>{mode === 'demo' ? '데모의 계획과 답변은 고정된 예시이며, 입력에 맞춘 실제 AI 응답이 아닙니다.' : '계획 생성과 실행은 각각 API를 호출합니다. 설정은 agent-runtime/.env에서 관리합니다.'}</p>
    <label htmlFor="agent-request">요청</label>
    <textarea id="agent-request" rows={5} maxLength={20000} value={request} disabled={!!busy}
      onChange={e => { setRequest(e.target.value); invalidate(); }} />
    <div><button className="primary" disabled={!!busy || !request.trim()} onClick={() => void call('plan')}>계획 생성</button></div>
    {busy && <p role="status">{busy} 최대 약 5분이 걸릴 수 있습니다. 앱을 열어 두세요.</p>}
    {error && <p role="alert">{error}</p>}
    {plan && <article>
      <h2>계획</h2><p role="status">{statusLabel[plan.status] ?? plan.status}</p>
      {plan.error && <p role="alert">{plan.error} {plan.message}</p>}
      {plan.markdown && <Markdown text={plan.markdown} />}
      {plan.status === 'draft' && <>
        {(plan.inputs ?? []).map(p => <label className="agent-input" key={p.name}>{p.description || p.name} {p.required ? '(필수)' : '(선택)'}
          <textarea rows={4} value={inputs[p.name] ?? ''} maxLength={20000} disabled={!!busy}
            onChange={e => { const text = e.target.value; setInputs(prev => ({ ...prev, [p.name]: text })); setResult(null); }} />
        </label>)}
        <button className="primary" disabled={!!busy || !!missing} onClick={() => void call('run')}>이 계획으로 실행</button>
        {missing && <p>필수 자료를 입력하면 실행할 수 있습니다.</p>}
      </>}
      {plan.recordPath && <p className="agent-record">계획 저장 위치: {plan.recordPath}</p>}
    </article>}
    {result && <article>
      <h2>{result.status === 'completed' ? '답변' : '실행 결과'}</h2>
      <p role="status">{statusLabel[result.status] ?? result.status}</p>
      {result.error && <p role="alert">{result.error} {result.message}</p>}
      {result.issues?.map((issue, i) => <p key={i}>{issue.detail}</p>)}
      {result.markdown && <Markdown text={result.markdown} />}
      {result.draft && <Markdown text={result.draft} />}
      {result.review && <Markdown text={result.review} />}
      {result.recordPath && <p className="agent-record">실행 저장 위치: {result.recordPath}</p>}
    </article>}
  </section>;
}
