import {z} from 'zod';
import {GeneratorRequestSchema} from '../generator/schema.js';
import {generateWorkflow,type Limits} from '../generator/generate.js';
import type {GenerationProvider} from '../generator/provider.js';
import {executeDraft,type ExecutionRecord,type StepCall} from '../execution/run.js';
export function planTask(request:string,provider:GenerationProvider,signal:AbortSignal,limits:Partial<Limits>={}){
 return generateWorkflow({request,execution_input_mode:'request'},provider,limits,signal);
}
export async function runTask(saved:unknown,extra:unknown,call:StepCall,signal:AbortSignal,hooks:{checkpoint?:(r:ExecutionRecord)=>Promise<void>;checkOnly?:boolean}={}){
 const envelope=z.object({outcome:z.literal('draft'),request:GeneratorRequestSchema}).parse(saved);
 if(envelope.request.execution_input_mode!=='request')throw new Error('TASK_RECORD_REQUIRED');
 const values=z.record(z.string(),z.string().max(20000)).parse(extra);
 if(Object.hasOwn(values,'user_request'))throw new Error('REQUEST_INPUT_OVERRIDE');
 const filled=Object.fromEntries(Object.entries(values).filter(([,v])=>v.trim()));
 return executeDraft(saved,{...filled,user_request:envelope.request.request},call,signal,{},hooks);
}
