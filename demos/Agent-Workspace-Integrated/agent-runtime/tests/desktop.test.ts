import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {desktopTask,desktopDemoProvider} from '../src/task/desktop.js';

test('desktop demo persists plan, waits for explicit run, then saves final answer',async()=>{
 const root=await mkdtemp(join(tmpdir(),'desktop-task-'));
 try{
  const plan=await desktopTask({action:'plan',request:'개념을 설명해줘',mode:'demo'},{root,env:{}});
  assert.equal(plan.status,'draft');assert.equal(plan.mode,'demo');assert.ok(plan.markdown);assert.deepEqual(plan.inputs,[]);
  await assert.rejects(readFile(join(root,plan.taskId,'answer.md')));
  const result=await desktopTask({action:'run',taskId:plan.taskId,inputs:{}},{root,env:{}});
  assert.equal(result.status,'completed');assert.match(result.markdown,/고정 응답/);
  assert.equal(JSON.parse(await readFile(result.recordPath,'utf8')).status,'completed');
  await assert.rejects(desktopTask({action:'run',taskId:plan.taskId,inputs:{user_request:'덮어쓰기'}},{root,env:{}}));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('desktop rejects arbitrary paths and never executes a clarification response',async()=>{
 const root=await mkdtemp(join(tmpdir(),'desktop-task-'));
 try{
  await assert.rejects(desktopTask({action:'run',taskId:'../../.env',inputs:{}},{root,env:{}}));
  const provider=desktopDemoProvider();
  const plan=await desktopTask({action:'plan',request:'요청',mode:'demo'},{root,env:{},provider:{...provider,async generate(){
   return {value:{schema_version:'0.1',status:'needs_clarification',intent:{goal:'',requirements:[],assumptions:[],deliverable:''},questions:['어떤 결과물이 필요한가요?'],workflow:null},usage:null,response_id:null};
  }}});
  assert.equal(plan.status,'needs_clarification');
  await assert.rejects(desktopTask({action:'run',taskId:plan.taskId,inputs:{}},{root,env:{}}));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('missing required material returns readiness failure before model execution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'desktop-task-'));
 try{
  const fixture=desktopDemoProvider();
  const plan=await desktopTask({action:'plan',request:'자료를 설명해줘',mode:'demo'},{root,env:{},provider:{...fixture,async generate(call){
   const r=await fixture.generate(call);const v=r.value as any;
   v.workflow.nodes.find((n:any)=>n.type==='input').output_ports.push({name:'source',type:'text',description:'원문',required:true,fields:[]});
   const review=v.workflow.nodes.find((n:any)=>n.task?.kind==='final_review');
   review.input_ports.push({name:'source2',type:'text',description:'원문',required:true,fields:[]});
   v.workflow.edges.push({source_node:'input',source_port:'source',target_node:review.id,target_port:'source2'});
   return r;
  }}});
  assert.equal(plan.status,'draft');assert.equal(plan.inputs[0].name,'source');
  const result=await desktopTask({action:'run',taskId:plan.taskId,inputs:{}},{root,env:{}});
  assert.equal(result.error,'MISSING_INPUT');assert.equal(result.markdown,'');
 }finally{await rm(root,{recursive:true,force:true});}
});
