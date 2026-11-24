import { parseArgs } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { compareReports, comparisonMarkdown, ComparisonError } from './compare.js';
import { atomicWrite } from '../execution/store.js';
import { redactSecrets } from '../execution/report.js';
async function read(path:string){if((await stat(path)).size>2000000)throw new Error('FILE_LIMIT');return JSON.parse(await readFile(path,'utf8'));}
async function main(){
 const {values:v}=parseArgs({options:{before:{type:'string'},after:{type:'string'},help:{type:'boolean'}},strict:true});
 if(v.help){console.log('npm.cmd run compare:generation -- --before 이전/report.json --after 이후/report.json\nAPI를 호출하지 않습니다. v0.27.0 이후의 동일 기준·완료된 평가만 비교합니다.');return;}
 if(!v.before||!v.after)throw new Error('ARGS');
 const [before,after]=await Promise.all([read(v.before),read(v.after)]);
 const result=compareReports(before,after);
 const dir=resolve('.local/comparisons',randomUUID());
 await atomicWrite(resolve(dir,'comparison.json'),redactSecrets(JSON.stringify(result,null,2),process.env));
 await atomicWrite(resolve(dir,'comparison.md'),redactSecrets(comparisonMarkdown(result),process.env));
 console.log(`개선 ${result.improved}건 / 악화 ${result.regressed}건 / 자동 통과율 변화 ${result.delta_percentage_points.toFixed(1)}%p\n결과: ${resolve(dir,'comparison.md')}`);
 if(result.regressed)process.exitCode=1;
}
main().catch(e=>{console.error(e instanceof ComparisonError?e.message:'비교 옵션·입력 파일·저장 권한을 확인하세요. npm.cmd run compare:generation -- --help');process.exitCode=1;});
