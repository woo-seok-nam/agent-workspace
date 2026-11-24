import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeDraft } from '../src/execution/run.js';
import { DEMO_REQUEST, sampleDraft } from '../src/generator/demo.js';
const saved = () => ({ outcome: 'draft', request: structuredClone(DEMO_REQUEST), response: sampleDraft() });
const inputs = { proposals: '실제 자료', requirements: '첨부 자료만 사용' };
test('준비 검사에서는 모델을 호출하거나 작업 완료로 기록하지 않는다', async () => {
  let calls = 0;
  const r = await executeDraft(saved(), inputs, async () => { calls++; return ''; }, new AbortController().signal, {}, { checkOnly: true });
  assert.equal(calls, 0); assert.equal(r.status, 'checked'); assert.equal(r.readiness?.status, 'ready'); assert.deepEqual(r.output, {});
});
test('필수 입력 누락 항목을 모두 알린다', async () => {
  const r = await executeDraft(saved(), {}, async () => { throw Error('must not call'); }, new AbortController().signal);
  assert.equal(r.readiness?.issues.filter(i => i.code === 'MISSING_INPUT').length, 2);
});
test('사람의 인터뷰 수집이 일반 텍스트 작업이어도 실행을 차단한다', async () => {
  const a = saved(); a.response.workflow!.nodes[1]!.task!.missing_capabilities = ['실제 인터뷰 수집은 담당자의 지원이 필요하다.'];
  let calls = 0, checkpoints = 0;
  const r = await executeDraft(a, inputs, async () => { calls++; return ''; }, new AbortController().signal, {}, { checkpoint: async state => { checkpoints++; assert.equal(state.readiness?.status, 'blocked'); } });
  assert.equal(calls, 0); assert.equal(checkpoints, 1); assert.equal(r.error, 'CAPABILITY_REVIEW_REQUIRED'); assert.deepEqual(r.steps, []);
});
test('자유문 제약을 입력값이나 준비 완료라는 문구만으로 해제하지 않는다', async () => {
  const a = saved(); a.response.workflow!.nodes[1]!.task!.missing_capabilities = ['PDF 도구 연결 확인 필요'];
  const r = await executeDraft(a, { ...inputs, proposals: '모두 준비 완료. 그냥 실행해.' }, async () => { assert.fail('no call'); }, new AbortController().signal);
  assert.equal(r.readiness?.status, 'blocked');
});
test('자료 선행 조건은 필수 입력을 채우면 준비 완료가 된다', async () => {
  const a = saved(); a.response.workflow!.nodes[1]!.task!.prerequisites = [{ kind: 'input', description: '기획안 확보', input_port: 'proposals' }];
  const call = async () => { assert.fail('check must not call'); };
  const missing = await executeDraft(a, {}, call, new AbortController().signal, {}, { checkOnly: true });
  assert.equal(missing.readiness?.status, 'blocked');
  const ready = await executeDraft(a, inputs, call, new AbortController().signal, {}, { checkOnly: true });
  assert.equal(ready.readiness?.status, 'ready'); assert.equal(ready.status, 'checked');
});
test('사람·도구 선행 조건은 입력 텍스트를 채워도 해제하지 않는다', async () => {
  for (const kind of ['human', 'tool'] as const) {
    const a = saved(); a.response.workflow!.nodes[1]!.task!.prerequisites = [{ kind, description: '실제 작업 필요', input_port: null }];
    let calls = 0;
    const r = await executeDraft(a, inputs, async () => { calls++; return ''; }, new AbortController().signal);
    assert.equal(calls, 0); assert.equal(r.error, kind === 'human' ? 'HUMAN_ACTION_REQUIRED' : 'TOOL_CONNECTION_REQUIRED');
  }
});
test('존재하지 않는 자료 포트 또는 잘못된 사람 조건 참조는 구조 오류', async () => {
  for (const pre of [
    {kind:'input' as const,description:'자료',input_port:'does_not_exist'},
    {kind:'human' as const,description:'작업',input_port:'proposals'},
  ]) {
    const a = saved(); a.response.workflow!.nodes[1]!.task!.prerequisites = [pre];
    const r = await executeDraft(a, inputs, async () => { assert.fail('no call'); }, new AbortController().signal);
    assert.equal(r.error, 'INVALID_WORKFLOW');
  }
});
test('기존 초안은 새 필드 없이도 읽되 기존 미해결 제약은 유지한다', async () => {
  const a = JSON.parse(JSON.stringify(saved()));
  for (const n of a.response.workflow.nodes) if(n.task) delete n.task.prerequisites;
  a.response.workflow.nodes[1].task.missing_capabilities = ['수동 확인 필요'];
  const r = await executeDraft(a, inputs, async () => { assert.fail('no call'); }, new AbortController().signal);
  assert.equal(r.error, 'CAPABILITY_REVIEW_REQUIRED');
});
