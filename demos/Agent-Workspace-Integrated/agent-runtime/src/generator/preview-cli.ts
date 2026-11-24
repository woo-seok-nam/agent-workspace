import { revisionReport } from './revision-report.js';
import {parseArgs} from 'node:util';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {previewGeneration,PreviewError} from './preview.js';
import {atomicWrite} from '../execution/store.js';
import {redactSecrets} from '../execution/report.js';
async function main(){
 const {values:v}=parseArgs({options:{record:{type:'string'},help:{type:'boolean'}},strict:true});
 if(v.help){console.log('npm.cmd run preview:generation -- --record .local/generations/ID/record.json\nAPI 호출 없이 계획 미리보기를 만듭니다. draft와 needs_clarification 기록을 지원합니다.');return;}
 if(!v.record)throw new PreviewError('--record에 생성 record.json 경로를 지정하세요.');
 if((await stat(v.record)).size>2000000)throw new PreviewError('생성 기록은 2MB 이하여야 합니다.');
 const saved=JSON.parse(await readFile(v.record,'utf8'));
 const result=previewGeneration(saved);
 const file=resolve('.local/previews',randomUUID(),'preview.md');
 await atomicWrite(file,redactSecrets(result.markdown,process.env));
 if(saved.request?.draft_revision){
   const review=revisionReport(saved);
   const comparison=resolve(file,'..','changes.md');
   await atomicWrite(comparison,redactSecrets(review.markdown,process.env));
   console.log(`변경 비교: ${comparison}`);
 }
 console.log(`[PREVIEW] API 호출 없음 / 상태: ${result.status}\n미리보기: ${file}`);
}
main().catch(e=>{console.error(e instanceof PreviewError?e.message:'입력 기록·경로·저장 권한을 확인하세요. npm.cmd run preview:generation -- --help');process.exitCode=1;});
