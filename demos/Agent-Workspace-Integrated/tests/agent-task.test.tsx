import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import AgentTaskPanel from '../src/features/agent-task/AgentTaskPanel';
const api=vi.hoisted(()=>({invoke:vi.fn(),isTauri:vi.fn()}));
vi.mock('@tauri-apps/api/core',()=>api);
beforeEach(()=>{api.invoke.mockReset();api.isTauri.mockReturnValue(true);});
test('plan generation does not execute; run uses stored task id and explicit click',async()=>{
 api.invoke.mockResolvedValueOnce({taskId:'id',mode:'demo',status:'draft',markdown:'# 計画',inputs:[]})
  .mockResolvedValueOnce({status:'completed',markdown:'# 最終回答'});
 render(<AgentTaskPanel/>);
 fireEvent.click(screen.getByRole('button',{name:'계획 생성'}));
 const run=await screen.findByRole('button',{name:'이 계획으로 실행'});
 expect(api.invoke).toHaveBeenCalledTimes(1);
 fireEvent.click(run);
 await screen.findByText('最終回答');
 expect(api.invoke).toHaveBeenLastCalledWith('agent_task',{payload:{action:'run',taskId:'id',inputs:{}}});
});
test('required material gates execution and changing request invalidates saved plan',async()=>{
 api.invoke.mockResolvedValue({taskId:'id',status:'draft',inputs:[{name:'source',description:'원문 자료',required:true}]});
 render(<AgentTaskPanel/>);
 fireEvent.click(screen.getByRole('button',{name:'계획 생성'}));
 const run=await screen.findByRole('button',{name:'이 계획으로 실행'});
 expect(run).toBeDisabled();
 fireEvent.change(screen.getByLabelText('원문 자료 (필수)'),{target:{value:'자료'}});
 expect(run).toBeEnabled();
 fireEvent.change(screen.getByLabelText('요청'),{target:{value:'새 요청'}});
 expect(screen.queryByRole('button',{name:'이 계획으로 실행'})).toBeNull();
});
test('browser preview does not claim to execute and IPC errors release busy state',async()=>{
 api.isTauri.mockReturnValue(false);render(<AgentTaskPanel/>);
 fireEvent.click(screen.getByRole('button',{name:'계획 생성'}));
 expect(screen.getByRole('alert')).toHaveTextContent('pnpm tauri dev');expect(api.invoke).not.toHaveBeenCalled();
 api.isTauri.mockReturnValue(true);api.invoke.mockRejectedValue('실패');
 fireEvent.click(screen.getByRole('button',{name:'계획 생성'}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('실패'));
 expect(screen.getByRole('button',{name:'계획 생성'})).toBeEnabled();
});
