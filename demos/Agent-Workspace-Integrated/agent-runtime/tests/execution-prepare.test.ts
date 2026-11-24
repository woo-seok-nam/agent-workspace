import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepareInputs,inputGuide} from '../src/execution/prepare.js';
import {loadInputFiles} from '../src/execution/files.js';
import {executeDraft} from '../src/execution/run.js';
import {sampleDraft,DEMO_REQUEST} from '../src/generator/demo.js';
const saved=()=>({outcome:'draft',request:DEMO_REQUEST,response:sampleDraft()});
test('필수 텍스트 포트 이름과 파일 매핑, 생성 기록 보존',()=>{
 const original=saved(),before=JSON.stringify(original),p=prepareInputs(original);
 assert.deepEqual(Object.keys(p.files),['proposals','requirements']);
 assert.ok(Object.values(p.files).every(paths=>/^materials\/input-\d+\.txt$/.test(paths[0]!)));
 assert.equal(JSON.stringify(original),before);assert.equal(p.readiness.status,'blocked');
 assert.match(inputGuide(p,'.local/inputs/example'),/--check/);
});
test('response 단독·질문 응답·손상된 그래프를 준비하지 않는다',()=>{
 assert.throws(()=>prepareInputs(saved().response));
 assert.throws(()=>prepareInputs({...saved(),outcome:'needs_clarification'}));
 const broken=saved();broken.response.workflow!.edges=[];assert.throws(()=>prepareInputs(broken));
});
test('사람 작업 제약은 양식 생성으로 해제하지 않는다',()=>{
 const a=saved();a.response.workflow!.nodes[1]!.task!.prerequisites=[{kind:'human',description:'인터뷰 진행',input_port:null}];
 assert.ok(prepareInputs(a).readiness.issues.some(i=>i.code==='HUMAN_ACTION_REQUIRED'));
});
test('CLI 빈 자료 거부, 자료 입력 후 ready, 재생성 시 이전 파일 보존',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'capdi-input-'));
 try{
  const source=join(dir,'record.json');await writeFile(source,JSON.stringify(saved()));
  const cli=resolve('src/execution/prepare-cli.ts');
  const run=()=>execFileSync(process.execPath,['--import',import.meta.resolve('tsx'),cli,'--record',source],{cwd:dir,encoding:'utf8'});
  assert.match(run(),/API 호출 없음/);
  const parent=join(dir,'.local/inputs'),names=await readdir(parent),prepared=join(parent,names[0]!);
  const mapPath=join(prepared,'files.json');await assert.rejects(loadInputFiles(mapPath),/빈 자료/);
  const mapping=JSON.parse(await readFile(mapPath,'utf8')) as Record<string,string[]>;
  for(const paths of Object.values(mapping))await writeFile(join(prepared,paths[0]!),'실제 제공한 테스트 자료');
  const loaded=await loadInputFiles(mapPath);
  const record=JSON.parse(await readFile(join(prepared,'record.json'),'utf8'));
  const checked=await executeDraft(record,loaded.inputs,async()=>{assert.fail('no API');},new AbortController().signal,{}, {checkOnly:true});
  assert.equal(checked.readiness?.status,'ready');
  run();assert.equal((await readdir(parent)).length,2);
  assert.equal(await readFile(join(prepared,Object.values(mapping)[0]![0]!),'utf8'),'실제 제공한 테스트 자료');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('비텍스트 그래프는 가짜 TXT 입력을 만들지 않고 미지원 상태를 표시',()=>{
 const a=saved();for(const n of a.response.workflow!.nodes)for(const p of [...n.input_ports,...n.output_ports])p.type='file_ref';
 const p=prepareInputs(a);assert.deepEqual(p.files,{});assert.ok(p.readiness.issues.some(i=>i.code==='TEXT_PORTS_ONLY'));
 assert.match(inputGuide(p,'.local/inputs/example'),/실행 명령을 생성하지 않았습니다/);
});
