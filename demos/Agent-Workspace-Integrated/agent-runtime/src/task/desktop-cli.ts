import {desktopTask} from './desktop.js';
// One request per child process. stdout is reserved for one JSON response.
const watchdog=setTimeout(()=>{process.stdout.write(JSON.stringify({status:'failed',error:'RUNTIME_TIMEOUT'}));process.exit(1);},330000);
try {
 let input='';
 for await(const chunk of process.stdin){input+=chunk.toString();if(Buffer.byteLength(input)>1_000_000)throw Error('REQUEST_LIMIT');}
 const result=await desktopTask(JSON.parse(input));
 process.stdout.write(JSON.stringify(result));
}catch{
 process.stdout.write(JSON.stringify({status:'failed',error:'RUNTIME_ERROR',message:'API 설정·모델 ID·입력 자료를 확인하세요. agent-runtime에서 npm run doctor로 설정을 검사할 수 있습니다.'}));
 process.exitCode=1;
}finally{clearTimeout(watchdog);}
