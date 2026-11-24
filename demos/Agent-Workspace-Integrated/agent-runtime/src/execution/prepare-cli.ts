import {parseArgs} from 'node:util';
import {readFile,stat,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {prepareInputs,inputGuide,PrepareInputError} from './prepare.js';
import {redactSecrets} from './report.js';
async function main(){
 const {values:v}=parseArgs({options:{record:{type:'string'},help:{type:'boolean'}},strict:true});
 if(v.help){console.log('npm.cmd run prepare:execution -- --record .local/generations/ID/record.json\nAPI 호출 없이 새 입력 양식 폴더를 만듭니다. 필수 TXT 자료와 files.json, 입력 안내, 생성 기록 사본을 저장합니다.');return;}
 if(!v.record)throw new PrepareInputError('--record에 생성 record.json 경로를 지정하세요.');
 if((await stat(v.record)).size>2000000)throw new PrepareInputError('생성 기록은 2MB 이하여야 합니다.');
 const prepared=prepareInputs(JSON.parse(await readFile(v.record,'utf8')));
 const parent=resolve('.local/inputs');await mkdir(parent,{recursive:true});
 const dir=await mkdtemp(join(parent,'prepared-'));
 const encode=(value:unknown)=>redactSecrets(JSON.stringify(value,null,2),process.env);
 try{
  await mkdir(join(dir,'materials'));
  for(const p of prepared.ports)if(p.file)await writeFile(join(dir,p.file),'',{flag:'wx',mode:0o600});
  await writeFile(join(dir,'files.json'),encode(prepared.files),{flag:'wx',mode:0o600});
  await writeFile(join(dir,'record.json'),encode(prepared.generation),{flag:'wx',mode:0o600});
  await writeFile(join(dir,'readiness.json'),encode(prepared.readiness),{flag:'wx',mode:0o600});
  await writeFile(join(dir,'README.md'),redactSecrets(inputGuide(prepared,relative(process.cwd(),dir).split('\\').join('/')),process.env),{flag:'wx',mode:0o600});
 }catch(e){await rm(dir,{recursive:true,force:true});throw e;}
 console.log(`[PREPARE] API 호출 없음\n입력 안내: ${join(dir,'README.md')}\n자료 폴더: ${join(dir,'materials')}\n파일 목록: ${join(dir,'files.json')}\n빈 자료를 채운 뒤 안내 문서의 준비 검사 명령을 실행하세요.`);
}
main().catch(e=>{console.error(e instanceof PrepareInputError?e.message:'입력 기록·파일 경로·저장 권한을 확인하세요. npm.cmd run prepare:execution -- --help');process.exitCode=1;});
