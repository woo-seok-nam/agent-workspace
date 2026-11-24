import { parseArgs } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { SuiteSchema, evaluateSuite, fixtureProvider, summaryMarkdown } from './generator.js';
import { createGenerationProvider } from '../generator/provider.js';
import { backend } from '../providers/config.js';
import { atomicWrite } from '../execution/store.js';
import { redactSecrets } from '../execution/report.js';
async function main(){
 const {values:v}=parseArgs({options:{demo:{type:'boolean'},live:{type:'boolean'},cases:{type:'string'},case:{type:'string'},repeat:{type:'string'},help:{type:'boolean'}},strict:true});
 if(v.help){console.log('npm.cmd run evaluate:generation -- --demo\nnpm.cmd run evaluate:generation -- --live [--case clear] [--repeat 1~5] [--cases 사례.json]\n--live는 실제 학교 AI API를 사용합니다.');return;}
 if(!!v.demo===!!v.live)throw new Error('--demo 또는 --live 중 하나만 지정하세요.');
 const path=v.cases??'examples/generator/evaluation-cases.json';if((await stat(path)).size>2000000)throw new Error('사례 파일은 2MB 이하여야 합니다.');
 let cases=SuiteSchema.parse(JSON.parse(await readFile(path,'utf8')));if(v.case){cases=cases.filter(c=>c.id===v.case);if(!cases.length)throw new Error('해당 사례 ID가 없습니다.');}
 const repeat=v.repeat===undefined?1:Number(v.repeat);if(!Number.isInteger(repeat)||repeat<1||repeat>5)throw new Error('--repeat은 1~5 정수입니다.');
 const live=v.live?createGenerationProvider(process.env):null;
 const directory=resolve('.local/evaluations',randomUUID());
 const encode=(value:unknown)=>redactSecrets(JSON.stringify(value,null,2),process.env);
 const abort=new AbortController(),cancel=()=>abort.abort();process.once('SIGINT',cancel);
 try{
  console.log(v.demo?'[DEMO] 고정 응답으로 평가 도구를 검사합니다. 모델 품질 점수가 아닙니다.':`[LIVE] ${cases.length*repeat}건 평가. 사례당 최대 4회 모델 요청(보정·재시도 포함)이 발생할 수 있습니다.`);
  console.log(`평가 폴더: ${directory}`);
  // Save reproducible cases before any API call. Never silently truncate inputs.
  await atomicWrite(resolve(directory,'cases.json'),encode(cases));
  const report=await evaluateSuite(cases,{mode:v.demo?'demo':'live',repeat,limits:live&&backend(process.env)==='factchat'?{maxOutputTokens:16384}:{}},c=>live??fixtureProvider(c),abort.signal,async(row,record,summary)=>{
    const dir=resolve(directory,`${row.case_id}-${row.repetition}`);
    await atomicWrite(resolve(dir,'record.json'),encode(record));
    if(record.response)await atomicWrite(resolve(dir,'response.json'),encode(record.response));
    await atomicWrite(resolve(directory,'report.json'),encode(summary));
    await atomicWrite(resolve(directory,'summary.md'),redactSecrets(summaryMarkdown(summary),process.env));
    console.log(`${row.case_id} #${row.repetition}: ${row.outcome} / 자동 기준 ${row.automatic_passed?'통과':'미통과'}`);
    for (const check of row.prerequisite_checks.filter(c => !c.passed)) console.log(`  선행 조건 미통과: ${check.rule}`);
  });
  await atomicWrite(resolve(directory,'report.json'),encode(report));
  await atomicWrite(resolve(directory,'summary.md'),redactSecrets(summaryMarkdown(report),process.env));
  console.log(`결과: ${resolve(directory,'summary.md')}`);
  if(report.cancelled)process.exitCode=130;else if(report.rows.some(r=>!r.automatic_passed))process.exitCode=1;
 }finally{process.removeListener('SIGINT',cancel);}
}
main().catch(()=>{console.error('평가 설정·입력 파일·저장 권한을 확인하세요. npm.cmd run evaluate:generation -- --help');process.exitCode=1;});
