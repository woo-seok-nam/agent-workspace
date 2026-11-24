import {z} from 'zod';
import {GeneratorRequestSchema} from './schema.js';
import {validateDraft} from './validate.js';
import {GenerationError} from './provider.js';
export function draftRevisionRequest(saved:unknown,feedback:unknown){
 const old=z.object({run_id:z.string().uuid().optional(),outcome:z.literal('draft'),request:GeneratorRequestSchema,response:z.unknown()}).safeParse(saved);
 const edit=z.string().trim().min(1).max(2000).safeParse(feedback);
 if(!old.success || !edit.success)throw new GenerationError('REVISION_INPUT_INVALID','draft 생성 record.json과 1~2,000자의 수정 요청이 필요합니다.');
 const checked=validateDraft(old.data.response,old.data.request);
 if(!checked.validation.passed || !checked.response?.workflow)throw new GenerationError('REVISION_INPUT_INVALID','기존 초안의 구조·정책 검증에 실패했습니다.');
 // Replace, do not nest the prior revision snapshot. Preserve accumulated conditions.
 return GeneratorRequestSchema.parse({...old.data.request,
  confirmed_requirements:[...new Set([...old.data.request.confirmed_requirements,...checked.response.intent.requirements,edit.data])],
  draft_revision:{feedback:edit.data,source_run_id:old.data.run_id??null,previous_draft:checked.response},
 });
}
