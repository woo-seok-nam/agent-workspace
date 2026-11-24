# Sidecar IPC 계약 초안 v1

이 문서는 독립 Node 런타임의 개발 계약입니다. 팀의 FE/Core 승인 또는 Tauri 연동 완료를 뜻하지 않습니다. 전송은 stdin/stdout의 UTF-8 JSON Lines이며 네트워크 포트는 열지 않습니다. 프로세스당 워크플로 실행은 최대 1개이며 실행 중에도 조회·취소 요청을 처리합니다.

## 호스트 실행 방법

프로젝트 루트를 cwd로 지정하고 Node 실행 파일을 직접 실행하세요. npm은 헤더를 stdout에 출력하므로 프로그램 간 통신에서는 사용하지 않습니다.

```text
node --env-file-if-exists=.env --import tsx src/ipc/sidecar.ts
```

개발 의존성 설치가 필요합니다. 배포용 Node 번들·실행 파일·Tauri sidecar 패키징은 아직 없습니다. Rust는 자식 프로세스의 stdin에 요청 한 줄을 쓰고, stdout을 청크 단위가 아닌 행 단위로 파싱해야 합니다. stderr는 진단 채널입니다. stdout에는 JSONL만 출력합니다. 시작 실패는 ready 없이 stderr와 종료 코드 1로 표시됩니다.

준비 완료 메시지:

```json
{"protocolVersion":1,"type":"ready","methods":["run.start","run.get","run.list","run.resume","run.rerun","run.approve","run.cancel"]}
```

## 요청

공통 필드: protocolVersion=1, requestId(영문·숫자·_·- 1~64자), method, params. 추가 필드와 모드 생략은 거부합니다. 요청에 API 키나 DB 경로를 전달하지 않습니다. 키/DB 경로는 호스트가 통제하는 프로세스 설정입니다.

실행 요청 예시:

```json
{"protocolVersion":1,"requestId":"req-1","method":"run.start","params":{"mode":"demo","goal":"캡스톤 개발 계획","workflow":{"schemaVersion":1,"id":"sample","name":"도구 검토","steps":[{"id":"review","agent":"reviewer","provider":"openai","tools":{"maxModelCalls":4,"maxToolCalls":8}}]}}}
```

mode는 demo 또는 live입니다. live는 실제 외부 API를 사용하며 실행 전에 필요한 공급자 설정을 검사합니다. demo는 API를 호출하지 않습니다. workflow는 기존 WorkflowSchema의 순차 단계 부분집합입니다. 호스트에서 만든 입력은 여기서 다시 검증합니다.

조회와 목록:

```json
{"protocolVersion":1,"requestId":"req-2","method":"run.get","params":{"runId":"실제 UUID로 교체"}}
{"protocolVersion":1,"requestId":"req-3","method":"run.list","params":{}}
```

run.list는 최근 최대 100개 요약을 반환합니다. 실행 중 get/list/cancel은 처리하지만 추가 start/resume/rerun/approve는 BUSY로 거부합니다. 응답 순서는 도착 순서와 다를 수 있습니다. requestId로 응답을 연결하고, 결과에 의존하는 다음 요청은 앞 요청의 종료 응답 이후에 보내세요. 프로세스 내 shutdown 메서드는 없습니다.

## 재개·부분 재실행 (0.10.0 추가)

프로토콜 버전은 1을 유지하며 새 메서드를 추가했습니다. 호스트는 ready.methods에 필요한 메서드가 있는지 확인하세요. 기존 start/get/list 요청과 응답은 유지합니다.

```json
{"protocolVersion":1,"requestId":"resume-1","method":"run.resume","params":{"runId":"실제 UUID로 교체","mode":"demo"}}
{"protocolVersion":1,"requestId":"rerun-1","method":"run.rerun","params":{"runId":"실제 UUID로 교체","mode":"demo","stepId":"review"}}
```

- resume은 실패·취소한 실행의 완료 단계를 재사용하고 미완료 단계부터 실행합니다. Completed 원본은 거부합니다.
- rerun은 지정한 단계와 하위 단계를 다시 실행합니다. 앞선 단계는 모두 Completed여야 하며 Running 원본은 거부합니다.
- 양쪽 모두 원본은 유지하고 새 runId와 parentRunId를 생성합니다. 응답은 `{run: WorkflowRun}`이며 새 실행 상태를 확인해야 합니다.
- goal이나 workflow를 바꾸는 추가 필드는 허용하지 않습니다. 저장된 Snapshot을 사용합니다. mode는 원본과 같아야 합니다.
- 진행 이벤트는 새 요청의 requestId로 연결됩니다. 재사용 단계는 Running 이벤트를 다시 보내지 않습니다.
- live 요청은 실제 다시 실행할 단계에 필요한 공급자 설정만 확인합니다. 모델 ID와 Agent 지시문은 현재 실행 환경의 값을 사용합니다. API 사용량이 발생할 수 있습니다.
- 없는 runId는 RUN_NOT_FOUND, 모드 불일치·잘못된 상태·없는 단계는 OPERATION_FAILED, 잘못된 입력 형식은 INVALID_REQUEST입니다.

강제 종료된 Running 기록은 기본적으로 재개하지 않습니다. **기존 실행 프로세스가 종료됐음을 호스트가 확인한 뒤** recoverInterrupted=true를 명시합니다.

```json
{"protocolVersion":1,"requestId":"recover-1","method":"run.resume","params":{"runId":"실제 UUID로 교체","mode":"demo","recoverInterrupted":true}}
```

이 옵션은 프로세스 종료 여부를 자동으로 판정하거나 잠그지 않습니다. 중간에 결과를 저장하지 못한 단계는 전체를 다시 요청하므로 중복 API 사용량이 발생할 수 있습니다. 도구 루프 내부부터의 복구는 지원하지 않습니다.

## 승인 게이트 (0.11.0 추가)

Workflow의 특정 단계에 reviewBefore=true를 설정하면 실행 직전 Attention 이벤트와 상태를 저장하고 정상 응답을 반환합니다. 응답 ok=true가 완료를 뜻하지 않습니다. data.run.status=Attention이면 호스트는 앞선 산출물을 표시하고 사용자의 검토·승인 행동을 기다려야 합니다. 이 시점에 stdin 연결을 유지하거나 종료해도 DB에 기록은 남습니다.

```json
{"protocolVersion":1,"requestId":"approve-1","method":"run.approve","params":{"runId":"실제 UUID로 교체","mode":"demo","stepId":"review"}}
```

현재 Attention 단계와 stepId가 일치하고 원본 mode가 같아야 합니다. 성공 응답은 새 WorkflowRun을 반환하고 parentRunId, approvedSteps, approval(stepId/approvedAt)를 포함합니다. 승인 후에도 다음 승인 지점에서 다시 Attention이 될 수 있으므로 최종 상태를 확인하세요. 원본 대기 기록은 수정하지 않습니다.

run.resume은 Attention을 거부합니다. run.rerun은 선택 단계 이후의 승인도 제거하므로 변경된 초안에 옛 승인을 적용하지 않습니다. 승인 뒤 실패한 실행을 같은 Snapshot으로 resume할 때는 승인을 유지합니다.

원본을 다른 requestId로 다시 승인하면 별도의 실행 가지가 만들어집니다. 호스트는 승인 버튼 중복 제출을 차단하고 어떤 새 runId를 표시할지 관리해야 합니다. 현재 승인자 인증·권한·원자적 단일 승인 소비·반려는 구현하지 않았습니다. run.start를 보낼 수 있는 로컬 호스트는 Workflow 정의도 정할 수 있으므로 이 게이트를 보안 권한 검사로 사용하면 안 됩니다. 모델에게 run.approve를 호출하는 도구는 제공하지 않습니다.

## 실행 중 취소 (0.12.0 추가)

```json
{"protocolVersion":1,"requestId":"cancel-1","method":"run.cancel","params":{"targetRequestId":"req-1"}}
```

대상은 현재 프로세스에서 실행 중인 start/resume/rerun/approve의 **requestId**입니다. runId가 아닙니다. 호스트는 실행 요청 ID를 보관하고 사용자 취소 행동에 맞춰 새 requestId로 이 요청을 보냅니다.

```json
{"protocolVersion":1,"type":"response","requestId":"cancel-1","ok":true,"data":{"targetRequestId":"req-1","accepted":true}}
```

accepted는 취소 신호 전달을 뜻합니다. 대상 실행의 최종 응답은 원래 requestId로 별도 반환됩니다. 진행 중 단계는 Cancelled, 이후 단계는 Skipped로 저장되고 완료 단계는 보존됩니다. 실행 최종 상태도 Cancelled이며 ok=true입니다. 마지막 단계 완료와 취소가 경합하면 Completed일 수 있으므로 최종 data.run.status를 확인하세요. 취소 응답 직후에도 정리가 진행될 수 있으므로 원래 실행의 종료 응답 전에 새 실행을 보내면 BUSY입니다.

실행 중이 아니거나 대상 ID가 다르면 NOT_RUNNING입니다. Attention 대기 기록·다른 프로세스의 작업은 대상이 아닙니다. 유효한 취소 요청도 requestId 중복 방지와 1,000개 제한에 포함됩니다. 취소해도 이미 일어난 공급자 처리·사용량·도구 효과는 되돌리지 않습니다. 현재 HTTP 취소 및 단계/도구 루프 경계의 협력적 중단을 지원합니다. 동기 도구·signal을 무시하는 사용자 실행기의 강제 종료 기능은 없습니다.

취소한 실행은 run.resume으로 완료 단계를 재사용해 새 실행으로 재개할 수 있습니다. 재실행할 단계의 기존 중간 도구 trace는 재사용하지 않습니다. 새 상태 Cancelled를 이해하지 못하는 이전 클라이언트/런타임은 업데이트해야 합니다. 프로토콜 초안 v1은 유지하며 ready.methods에서 run.cancel 지원 여부를 확인합니다.

## 단계 제한 시간 (0.13.0 추가)

run.start의 workflow.steps 항목에 선택 필드 timeoutMs를 지정할 수 있습니다. 프로토콜과 schemaVersion은 초안 v1을 유지하며 새로운 메서드는 없습니다. 호스트와 런타임 버전을 함께 업데이트하세요.

```json
{"protocolVersion":1,"requestId":"timed-1","method":"run.start","params":{"mode":"live","goal":"개발 초안 작성","workflow":{"schemaVersion":1,"id":"timed","name":"30초 초안","steps":[{"id":"draft","agent":"writer","provider":"openai","timeoutMs":30000}]}}}
```

허용 범위는 정수 100~300000ms입니다. 생략하면 단계 전체 제한을 추가하지 않습니다. HTTP 1회당 60초 제한은 별도로 유지합니다. 제한은 Agent 실행 시작부터 단계 내 모든 모델/도구 반복에 적용됩니다. 승인 대기와 이전 단계 실행 시간은 포함하지 않습니다.

시간 초과 시 진행 이벤트는 Failed, 뒤 단계는 Skipped입니다. 원래 실행 요청의 최종 응답은 ok=true이며 data.run.status=Failed, data.run.steps의 해당 단계는 status=Failed, errorCode=STEP_TIMEOUT, error=안전한 설명을 포함합니다. 원시 공급자 응답은 오류에 포함하지 않습니다. Failed 이벤트 자체에는 errorCode가 없으므로 최종 응답 또는 run.get 기록에서 원인을 확인하세요.

사용자 취소는 기존 Cancelled이며 STEP_TIMEOUT 코드를 사용하지 않습니다. 동일 실행 중 취소와 시간 초과가 경합하면 먼저 발생한 사유를 유지합니다. 이미 실행한 도구 trace는 중단 정리가 끝난 뒤 함께 저장합니다. 외부 처리·비용을 되돌리지 않습니다. signal에 반응하지 않는 실행기를 강제 종료하지 않으며 정리 완료 전 새 실행 요청은 계속 BUSY입니다.

run.resume은 동일 Snapshot과 제한 시간으로 미완료 단계부터 새 실행을 만듭니다. 정의 파일 변경으로 기존 실행의 timeoutMs를 바꾸지 않습니다. 설정을 바꾸려면 새 run.start를 보내세요. 이미 완료된 단계는 보존하며 재개 시 실패 단계의 errorCode/trace는 초기화합니다. 자동 재시도는 없습니다. 기존 기록은 계속 읽지만 0.13.0 기록을 이전 런타임으로 읽는 것은 지원하지 않습니다.

## 이벤트와 응답

진행 이벤트는 실행 요청 ID로 연결합니다. runId는 최종 응답에서 받습니다.

```json
{"protocolVersion":1,"type":"event","requestId":"req-1","event":"step.status","stepId":"review","status":"Running"}
```

상태는 기존 단계 계약의 Running/Completed/Failed/Skipped/Attention/Cancelled입니다. 지금은 단계 경계 이벤트이며 토큰 스트리밍·도구별 실시간 이벤트는 아닙니다. 성공 응답의 data는 run.start/run.get/run.resume/run.rerun/run.approve에서 `{run: WorkflowRun}`, run.list에서 `{runs: RunSummary[]}`입니다. 전체 계약은 src/workflow/records.ts를 참조하세요.

`ok: true`는 명령 처리가 완료됐다는 뜻입니다. 실제 실행 성공 여부는 반드시 `data.run.status`로 확인하세요. 단계가 실패한 실행도 기록을 조회할 수 있도록 ok=true와 status=Failed를 반환합니다.

```json
{"protocolVersion":1,"type":"response","requestId":"req-2","ok":false,"error":{"code":"RUN_NOT_FOUND","message":"실행 ID를 찾을 수 없습니다."}}
```

오류 코드는 INVALID_JSON, INVALID_REQUEST, INVALID_UTF8, FRAME_TOO_LARGE, DUPLICATE_REQUEST, SESSION_LIMIT, RUN_NOT_FOUND, BUSY, NOT_RUNNING, OPERATION_FAILED, INTERNAL_ERROR입니다. JSON/프레이밍 실패처럼 요청 ID를 신뢰할 수 없으면 requestId=null입니다. 입력 원문·Zod 전체 오류·내부 예외는 반환하지 않습니다. 요청의 텍스트와 결과는 성공 실행 데이터에 포함되므로 응답 전체를 무조건 로그에 남기지 마세요.

## 프레이밍·중복·종료

- 입력 한 행은 LF 제외 최대 65,536바이트입니다. CRLF도 허용하며 CR은 크기에 포함됩니다. 빈 행은 무시합니다. EOF 직전 개행 없는 마지막 행도 처리합니다.
- 초과 행이나 잘못된 UTF-8은 거부한 뒤 다음 행을 처리합니다. 한글·이모지가 청크 사이에서 나뉘어도 복원합니다.
- 검증을 통과한 requestId는 명령 실패 여부와 무관하게 해당 프로세스 안에서 재사용할 수 없습니다. 재시도하려면 새 ID를 사용합니다. 최대 1,000개의 유효 요청 후 SESSION_LIMIT을 반환합니다.
- 중복 방지는 프로세스 메모리 범위입니다. 재시작 후 중복 방지, 정확히 한 번 실행, 자동 재전송은 구현하지 않았습니다. 연결이 끊겼다면 먼저 실행 기록을 조회하고 새 실행 여부를 판단해야 합니다.
- stdin EOF는 종료 요청으로 취급하되 이미 받은 요청을 모두 처리한 다음 DB를 닫고 종료합니다. 실행 취소가 아닙니다. 강제 종료된 Running 기록은 기존 CLI의 명시적 복구 절차를 사용합니다.
- stdout 연결 오류 시 종료 코드 1로 종료합니다. 응답이 유실돼도 DB에 실행이 저장되어 있을 수 있습니다.

## 제품 통합 시 남은 작업

현재 SQLite는 개발용 어댑터입니다. 제품에서는 WorkflowStore를 Rust IPC 저장 구현으로 교체하고, Secret Manager·권한 검사를 호스트에 연결해야 합니다. 이번 계약에는 인증/권한, session_id/workspace_id, 반려, export 메서드가 없습니다. 재개·재실행은 0.10.0부터 IPC에서도 지원합니다. 기존 CLI의 재개·재실행·내보내기는 그대로 사용할 수 있습니다. 프로토콜 변경과 ID 발급 책임은 FE/Core와 합의해야 합니다.


## 0.15.0 공급자 확장

Workflow steps의 provider는 openai, gemini, claude를 허용합니다. AI_BACKEND=factchat이면 세 공급자가 학교 키 하나를 공유합니다. Claude 기록은 이전 버전에서 읽지 마세요. 기존 OpenAI/Gemini 기록과 IPC 메서드는 유지됩니다.
