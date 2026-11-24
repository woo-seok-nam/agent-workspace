# v0.23.0 생성기 평가

자연어 Workflow 생성기의 구조·상태·보정 지표를 측정합니다. 내용 품질은 별도 사람 검토입니다. [평가 사용법](docs/generator-evaluation.md).

# v0.22.0 사용자 피드백 반영

needs_review 결과를 사용자 지시에 따라 수정하고 재검토합니다. [사용법](docs/user-feedback.md).

# v0.21.0 중단된 실행 재개

완료된 작업을 재사용하고 남은 작업부터 실행합니다. v0.21.0 이후 기록만 지원합니다. [재개 사용법](docs/generated-resume.md).

# v0.20.0 실행 기록 저장 강화

작업마다 실행 기록을 저장하고 보류 시 초안·검토 의견을 별도로 내보냅니다. [사용 안내](docs/execution-progress.md).

# v0.19.0 실행 응답 구조 강화

실행 단계마다 API에 JSON Schema를 전달합니다. [설정·지원 범위](docs/structured-execution.md).

# v0.18.0 검토 후 자동 수정

기본 최대 2회 작성·재검토를 수행하고 모든 시도를 기록합니다. [사용법과 제한](docs/review-revisions.md).

# v0.17.2 일반 작업 verdict 오류 수정

일반 작업의 불필요한 verdict 값 때문에 중단되던 문제를 수정했습니다. 최종 검토 판정은 엄격하게 유지합니다.

# v0.17.1 실행 오류 진단

실패 단계와 원인을 구분해 표시합니다. [오류 안내](docs/execution-diagnostics.md).

# v0.17.0 파일 자료 입력

TXT/Markdown 파일을 읽고 완료 보고서를 report.md로 저장합니다. [파일 위치와 실행 안내](docs/file-input.md).

# v0.16.0 생성 Workflow 실행

텍스트 자료를 입력받아 실제 AI 작업과 최종 검토까지 실행합니다. [실행 방법과 제한](docs/generated-execution.md).

# v0.15.1 개선

원본 입력의 최종 검토 연결을 검증하고 누락 시 자동 보정합니다. 설치 및 제한: [개선 내역](docs/generator-improvements.md).

# Agent Runtime 0.15.0 — 학교 Gateway와 Claude 지원

학교 FactChat API 키 하나로 **OpenAI·Gemini·Claude**를 호출할 수 있도록 연결했습니다. 채팅·역할 Agent·도구 호출·기존 Runtime·Workflow 초안 생성에서 선택합니다.

1. ZIP을 새 폴더에 풀고 `agent-runtime`을 VS Code로 엽니다.
2. `.env.example`을 참고해 `.env`에 `FACTCHAT_API_KEY`를 입력합니다. 기존 `.env`는 보관하고 필요한 설정을 옮기세요.
3. 아래 명령으로 모델 ID를 조회합니다.

```powershell
npm.cmd ci
npm.cmd run models
```

반환된 실제 ID를 `.env`의 `OPENAI_MODEL`, `GEMINI_MODEL`, `CLAUDE_MODEL`에 넣습니다. 사용할 모델만 채워도 됩니다. `WORKFLOW_PROVIDER=claude`로 설정하면 Claude로 Workflow를 생성할 수 있습니다.

```powershell
npm.cmd run doctor
npm.cmd run chat -- claude "한 문장으로 인사해줘"
npm.cmd run generate -- --request "기획안 세 개를 비교하는 보고서 작성 절차를 만들어줘."
```

[학교 API 설정과 전체 사용법](docs/factchat.md)을 먼저 읽어주세요. 학교 모드에서는 `OPENAI_API_KEY`, `GEMINI_API_KEY`를 각각 발급할 필요가 없습니다. 이전의 본사 API 연결도 `AI_BACKEND=direct`로 유지합니다.

**실제 학교 키로 인증·모델 품질 검증은 아직 하지 않았습니다.** 새 기능은 모의 HTTP와 회귀 테스트로 검증했습니다. Gateway에서 실제 사용할 수 있는 모델 및 Structured Outputs/도구 지원은 계정과 모델별로 확인해야 합니다.

아래 0.14.0 안내의 본사 키 설정은 direct 모드에만 해당합니다. 학교 연결은 위 새 설정을 사용하세요.

## 이전 버전 0.14.0 — Workflow 초안 생성기

자연어에서 질문 또는 구조화된 Workflow JSON을 생성하는 첫 모듈을 추가했습니다. 실제 작업 실행은 하지 않습니다. 생성 결과는 기존 실행용 `steps`와 다른 `nodes/ports/edges` 계약입니다.

## 지금 시작하기

ZIP을 **새 폴더**에 풀고 `agent-runtime`을 VS Code로 연 다음 Windows 터미널에서 실행하세요. Node.js 24가 필요합니다.

```powershell
npm.cmd ci
npm.cmd run generate:demo
```

데모는 API 없이 고정 응답을 사용합니다. `결과: draft`와 7개 Node가 나오면 생성 파이프라인의 기본 검증에 통과한 것입니다.

실제 자연어를 생성하려면 `.env.example`을 `.env`로 복사한 뒤 `OPENAI_API_KEY`와 `WORKFLOW_MODEL`을 입력하세요. 기존 `.env`가 있으면 보존하고 필요한 설정만 추가하세요. `WORKFLOW_MODEL`이 비어 있으면 `OPENAI_MODEL`을 사용합니다. Sol을 실제 모델 ID로 임의 변환하지 않았습니다.

```powershell
npm.cmd run generate -- --request "기획안 A·B·C를 비교하고 추천 보고서를 만드는 절차를 만들어줘. 첨부 자료만 사용해." --no-search
```

- [생성기 사용법과 계약](docs/workflow-generator.md)
- [상세 입력 예시](examples/generator/request.json)
- [기대 Workflow JSON](examples/generator/expected-draft.json)
- [생성 응답 JSON Schema](schemas/workflow-generator-response.schema.json)

**현재 한계:** 순차 Workflow만 지원합니다. 구조·명시 정책 검증과 의미상 적절성 검토는 구분합니다. 정상 초안도 사용자 검토가 필요합니다. API 키·모델이 설정되지 않은 개발 환경에서는 실제 LLM 생성 품질을 검증하지 않았습니다.

ZIP에는 `.env`, API 키, `.local` 기록, `node_modules`가 포함되지 않습니다. 아래 이전 버전 안내의 기본 실행 기능은 유지됩니다.

## 이전 버전 0.13.0 안내

이 프로젝트는 실제 API 호출을 담당하는 AI 실행 모듈입니다. 공급자는 OpenAI(GPT)와 Google(Gemini) 두 가지입니다. 기본 채팅 호출 외에 계획·작성·검토 역할과 시스템 지시문을 적용하는 Agent Runner를 추가했습니다.

## 이번 단계: 단계별 실행 제한 시간(timeout)

특정 단계가 오래 응답하지 않으면 모델 요청에 중단 신호를 보내고 해당 단계를 Failed로 저장합니다. 완료된 단계는 보존하고 이후 단계는 Skipped가 됩니다. 오류 코드는 STEP_TIMEOUT이며 사용자 취소(Cancelled)와 구분합니다.

ZIP을 **새 폴더**에 풀고 안쪽 `agent-runtime`을 VS Code에서 열어 실행하세요. 기존 `.env`와 `.local`은 보관하세요. 데모에는 API 키가 필요 없습니다. 설정은 `.env.example`을 참고하세요.

```powershell
npm.cmd ci
npm.cmd run timeout:demo
```

데모는 draft의 제한 시간을 1초로 설정하고 모의 작업을 5초 기다리게 합니다. 제한에 도달하면 대기를 중단합니다. 이어서 모의 지연을 제거하고 기존 계획 결과를 재사용해 다시 실행합니다. 재개는 데모 프로그램이 명시적으로 요청하며 런타임의 자동 재시도가 아닙니다.

```text
[Completed] plan
[Running] draft
[Failed] draft
[Skipped] review
오류 코드: STEP_TIMEOUT
...
[재개] 모의 지연을 제거하고 완료된 plan을 재사용합니다.
[Running] draft
[Completed] draft
[Running] review
[Completed] review
...
TIMEOUT DEMO PASS
```

중간의 Failed는 이 데모가 의도한 결과입니다. 마지막 **TIMEOUT DEMO PASS**가 나오면 시간 초과와 재개 검증이 완료된 것입니다. 데모 자체는 검증 성공 시 종료 코드 0을 반환합니다. 일반 workflow CLI에서 실제 단계가 실패하면 기존과 같이 종료 코드 1입니다.

### 실제 워크플로에 적용

사용하는 `workflows/content.json`, `content-tools.json`, `content-review.json`의 단계에 timeoutMs를 추가하세요. IPC run.start에 전달하는 workflow.steps에도 같은 필드를 사용할 수 있습니다. 예를 들어 초안 단계 전체에 30초를 허용하려면 다음처럼 설정합니다.

```json
{"id":"draft","agent":"writer","provider":"openai","timeoutMs":30000}
```

- 단위는 밀리초이며 정수 100~300000(0.1초~5분)을 허용합니다. 0·문자열·범위 밖 값은 실행 전에 거부합니다.
- 생략하면 추가적인 단계 제한은 없습니다. 기존의 **HTTP 요청 1회당 60초 제한**은 그대로 적용됩니다. 단계 제한을 5분으로 설정해도 개별 HTTP 제한이 늘어나지는 않습니다.
- 시간은 Agent 실행 시작부터 계산합니다. 같은 단계 안의 모델·도구 반복 전체가 하나의 제한 시간을 공유하며 다음 단계에서는 새로 시작합니다. 승인 대기 시간은 포함하지 않습니다.
- 이미 완료된 단계와 실제 실행한 도구 trace는 보존합니다. 시간 초과 뒤의 늦은 성공 결과는 저장하지 않습니다. 사용자 취소와 시간 초과가 경합하면 먼저 발생한 중단 사유를 유지합니다.
- 실행기가 signal에 따라 중단하고 정리하는 동안은 기다립니다. **동기 작업이나 signal을 무시하는 사용자 정의 실행기를 강제 종료하는 기능은 아닙니다.** 정리가 끝나기 전 다음 단계나 Sidecar의 새 워크플로를 실행하지 않습니다. 기존 공급자 어댑터는 signal로 HTTP를 중단합니다.

`workflows/content-timeout.json`은 timeout:demo 전용 예시입니다. 이 파일의 변경은 일반 workflow 명령에 적용되지 않습니다. 모델 응답 시간에 맞게 실제 사용하는 정의 파일의 값을 설정하세요. 이미 저장된 Snapshot은 정의 파일을 편집해도 바뀌지 않습니다.

### 시간 초과 후 재개

```powershell
npm.cmd run runs
npm.cmd run resume:demo -- 실행ID
# 실제 API 실행 기록은 같은 live 모드로 재개
npm.cmd run resume -- 실행ID
```

재개는 저장된 Snapshot의 동일한 timeoutMs로 실패한 단계 처음부터 실행합니다. 제한 시간이 계속 부족하면 다시 실패할 수 있습니다. 제한을 변경하려면 정의를 편집한 뒤 새 워크플로를 시작하세요. 완료 단계는 재개에서 다시 호출하지 않고 원본 실패 기록은 유지합니다. 도구 루프 중간 재개·자동 재시도·워크플로 전체 기한·UI 설정 화면은 아직 없습니다.

Sidecar는 새 메서드 없이 timeoutMs를 수신하며 응답의 해당 step.errorCode에 STEP_TIMEOUT을 반환합니다. 단계 이벤트는 기존 Failed입니다. 제한 중단은 이미 발생한 외부 API 처리·사용량을 되돌리지는 않습니다. 계약 예시는 [IPC 문서](docs/ipc-contract.md)를 참고하세요. 이전 런타임은 새 timeoutMs/errorCode 필드를 알지 못하므로 새 기록을 읽는 데 사용하지 마세요. 기존 0.12.0 이하 기록은 계속 읽을 수 있습니다.

## 이전 단계: 실행 중 취소 → 완료 결과 보존 → 재개

새 폴더에 압축을 풀고 안쪽 `agent-runtime`을 VS Code에서 여세요. 기존 `.env`와 `.local`은 덮어쓰지 말고 보관하세요. 설정은 `.env.example`을 참고하세요.

```powershell
npm.cmd ci
npm.cmd run cancel:demo
```

API 키 없이 실행합니다. 계획 완료 후 초안의 모의 대기 중 자동 취소하고, 실제 LangGraph/SQLite 기록으로 미완료 단계만 재개합니다. 마지막 **CANCEL DEMO PASS**가 성공 표시입니다.

| 취소 시점의 단계 | 저장 상태 | 재개 시 동작 |
|---|---|---|
| plan | Completed | 기존 결과 재사용 |
| draft | Cancelled | 단계 처음부터 다시 실행 |
| review | Skipped | draft 완료 후 실행 |

실행 전체 상태도 Cancelled입니다. 원본 취소 기록은 유지하고 재개 결과에는 새로운 실행 ID와 parentRunId를 부여합니다. 취소한 실행도 runs/export로 조회·내보내기 가능합니다. 실제 API 워크플로 명령 실행 중에는 **Ctrl+C**로 취소를 요청할 수 있습니다. 취소 상태 저장 후 CLI 종료 코드는 130입니다. 강제 종료는 정상 취소와 달라 Running 기록이 남을 수 있습니다.

```powershell
# 실제 API 사용 시: 앞서 출력된 취소 실행 ID로 재개
npm.cmd run resume -- 실행ID
# 데모 기록을 직접 재개할 때
npm.cmd run resume:demo -- 실행ID
```

`cancel:demo`는 재개까지 자동 검증합니다. 데모가 출력한 **취소 실행 ID**를 사용하면 별도의 재개 실행도 만들 수 있습니다.

Sidecar에는 `run.cancel`을 추가했습니다. 실행 중 조회/취소는 즉시 처리하고 새 실행 요청은 BUSY로 거부합니다. 요청의 도착 순서와 응답 순서가 다를 수 있으므로 requestId로 연결해야 합니다. [IPC 계약](docs/ipc-contract.md)을 참고하세요.

OpenAI/Gemini HTTP 요청에 취소 신호를 전달하고 도구 루프의 후속 호출을 막습니다. 이미 실행한 도구 기록은 보존하지만 외부 공급자가 이미 처리한 요청·사용량을 되돌리지는 않습니다. 현재 동기 로컬 도구는 실행 도중 강제 중단할 수 없으며 사용자 정의 실행기도 signal을 따라야 합니다. 재개는 도구 루프 중간이 아니라 해당 단계 처음부터 실행합니다. 승인 대기(Attention)는 실행 중이 아니므로 run.cancel 대상이 아니며 승인 반려 기능은 별도입니다.

Cancelled 상태를 추가했으므로 새 기록을 이전 버전 런타임으로 읽는 것은 지원하지 않습니다. 기존 기록은 계속 읽을 수 있습니다. React 취소 버튼·Rust 연결은 아직 구현하지 않았습니다.

## 이전 단계: 초안 확인 후 승인

선택한 단계에 `reviewBefore: true`를 지정하면 해당 Agent/도구를 호출하기 전에 멈춥니다. 실행과 대기 단계는 Attention, 이후 단계는 Pending입니다. 대기 상태와 앞선 결과는 DB에 저장되므로 프로그램을 종료해도 유지됩니다.

### 실행 → 초안 확인 → 승인

ZIP을 새 폴더에 풀고 `agent-runtime`을 열어 실행하세요. 빈 `.env`를 포함하며 데모에는 API 키가 필요 없습니다.

```powershell
npm.cmd ci
npm.cmd run workflow:review:demo -- "캡스톤 프로젝트 개발 계획"
```

계획과 초안만 생성한 뒤 `워크플로: Attention`과 `사용자 승인 대기: review`가 출력됩니다. **오류가 아니라 초안 확인을 기다리는 정상 상태**이며 CLI 종료 코드는 0입니다. review의 도구 실행 기록은 아직 없어야 합니다.

출력된 초안을 확인한 뒤, 실행 ID를 아래 자리에 넣어 승인합니다.

```powershell
npm.cmd run approve:demo -- 실행ID review
```

계획·초안을 재사용하고 review만 실행합니다. 승인한 단계와 시각을 새 실행에 남기고 원본 대기 기록은 보존합니다. 새 ID에서 `Completed`가 나오면 완료입니다. 승인 전 초안을 파일로 확인하고 싶으면 `npm.cmd run export -- 실행ID`를 사용할 수 있습니다. 대기 기록의 문서 제목에도 승인 대기 중인 부분 결과라고 표시합니다.

| 동작 | 결과 |
|---|---|
| approve | 현재 대기 중인 단계 한 곳을 승인하고 계속 실행 |
| resume | 실패·강제 중단 복구용. Attention의 승인 우회는 거부 |
| rerun | 선택 단계와 이후 결과 및 기존 승인을 초기화하고 다시 실행 |
| 승인하지 않기 | Attention 상태를 그대로 유지하며 이후 단계 미실행 |

초안을 새로 만들려면 `npm.cmd run rerun:demo -- 실행ID draft`를 사용하세요. review 승인은 해제되어 새 초안 뒤 다시 Attention에서 멈춥니다. 검토 지점이 여러 개면 각각 승인해야 합니다. 승인 후 모델 오류가 난 경우, 동일 Snapshot으로 resume하면 기존 승인을 유지합니다.

### 설정과 실제 API

`workflows/content-review.json`이 승인 예시입니다. review 단계에 reviewBefore=true와 tools 설정이 있습니다. 기존 content.json/content-tools.json은 승인 없이 동작하므로 기존 명령의 동작은 유지합니다. 승인 필드를 추가하려면 새 실행을 시작해야 하며 기존 기록의 Snapshot을 파일 편집으로 바꾸지는 않습니다.

```json
{"id":"review","agent":"reviewer","provider":"openai","reviewBefore":true,"tools":{"maxModelCalls":4,"maxToolCalls":8}}
```

live 모드는 `npm.cmd run workflow:review -- "목표"`로 시작하고 `npm.cmd run approve:live -- 실행ID review`로 승인합니다. 승인 전 plan/draft도 실제 모델 호출이므로 사용량이 발생합니다. 승인 후에는 남은 단계가 실제 API를 사용합니다. 429 문제는 여전히 별도 확인이 필요합니다.

### 승인 기록과 범위

새 실행에 approvedSteps와 이번 승인 단계·시각(approval)을 저장하고 parentRunId로 원본을 연결합니다. 승인 명령을 다른 요청 ID로 반복하면 원본에서 별도의 실행 가지가 만들어질 수 있습니다. 호스트는 버튼 중복 제출을 막아야 하며 프로세스 간 단일 소비 잠금은 아직 없습니다.

이 기능은 **작업 진행 전 검토를 위한 개발용 게이트**입니다. 승인자 신원·역할 인증, 전자 서명, 권한 보안 경계, 승인 반려, 초안 직접 편집, 피드백 전달은 아직 없습니다. React 화면은 아직 연결하지 않았습니다. 사용자의 승인 행동을 확인하고 요청하는 책임은 호스트에 있으며, 모델이 스스로 승인을 요청하거나 승인하는 도구는 제공하지 않습니다.

Sidecar는 run.approve를 지원합니다. 계약은 [IPC 문서](docs/ipc-contract.md)를 참고하세요. 파일별 주요 변경은 WorkflowSchema/RunRecordSchema, compiler의 대기 분기, runner의 approveWorkflow, CLI와 IPC 승인 명령입니다. 기존 기록은 읽을 수 있지만 Attention이 포함된 새 기록을 이전 버전으로 읽는 것은 지원하지 않습니다.

## 이전 단계: 통신 요청으로 재개·재실행

기존 CLI에서 지원하던 실패 후 재개와 선택 단계 재실행을 Sidecar 요청으로 연결했습니다. 아직 React/Rust 화면을 만든 것은 아니며, 해당 계층에서 사용할 Node 통신 기능입니다.

새 폴더에 압축을 풀어 `agent-runtime`을 열고 다음을 실행하세요. 빈 `.env`를 포함하며 데모는 API 키 없이 실행됩니다.

```powershell
npm.cmd ci
npm.cmd run ipc:demo -- "캡스톤 프로젝트 개발 계획"
```

데모는 같은 Sidecar 프로세스에서 다음 세 요청을 순서대로 보냅니다.

1. `run.start`: 계획 → 작성 → 도구 검토 실행
2. `run.rerun`: 기존 계획·초안을 재사용하고 review만 재실행
3. `run.get`: 새 실행 ID의 저장 결과 조회

`[재실행 완료] 검토만 실행`, `[조회 완료]`, 마지막 `IPC DEMO PASS`가 나오면 성공입니다. 데모의 모델 응답은 고정 시나리오이고 도구 계산과 프로세스 통신은 실제 동작합니다. 재개(run.resume)는 자동 테스트에서 저장된 실패 실행과 중단 상태를 사용하여 별도로 검증합니다.

| 요청 | 사용 목적 |
|---|---|
| run.start | 새로운 목표·워크플로 실행 |
| run.get / run.list | 실행 상세·목록 조회 |
| run.resume | 실패 실행의 미완료 단계부터 재개 |
| run.rerun | 지정 단계와 그 이후 단계 다시 실행 |

재개·재실행은 원본 기록을 유지하고 새 실행을 만듭니다. 완료된 도구 단계의 trace도 재사용하며 다시 실행하는 단계의 기록은 새로 생성합니다. mode는 원본과 같아야 합니다. 프로토콜 버전은 1이며 ready.methods로 지원 메서드를 확인합니다. 요청 예시와 제한은 [IPC 계약](docs/ipc-contract.md)에 있습니다.

이전 결과를 사용하려면 모든 실행 프로세스를 종료한 후 기존 `.local` 폴더를 새 프로젝트로 옮기세요. 새 데모만 실행할 때는 필요 없습니다. 기존 `.env`는 보관하고 이번 ZIP의 빈 양식에 사용할 값을 입력하세요.

**남은 범위:** React·Rust 실제 연결, 복수 워크플로 동시 실행, 프로세스 간 중복 방지, 중단 자동 감지, Rust 저장소/비밀키 연동은 아직 없습니다. 기존 프로세스 종료가 확인된 경우에만 recoverInterrupted=true로 Running 기록을 복구해야 합니다.

## 이전 단계: 별도 프로세스와 실행 요청 주고받기

Node 프로세스를 계속 켜 둔 상태에서 JSON 요청으로 Workflow 실행·기록 조회·목록 조회를 처리합니다. 이번에는 React나 Rust가 대신 보낼 요청을 Node 데모 클라이언트가 전송합니다. 실제 두 프로세스 사이에서 통신하고 기존 LangGraph·도구 실행·SQLite 저장이 동작합니다.

새 폴더에 압축을 풀고 안쪽 agent-runtime을 VS Code에서 열어 실행하세요. 빈 `.env`가 포함되어 있고 데모에는 키가 필요 없습니다.

```powershell
npm.cmd ci
npm.cmd run ipc:demo -- "캡스톤 프로젝트 개발 계획"
```

데모가 자동으로 Sidecar 프로세스를 시작하고, 계획 → 작성 → 도구 검토를 요청합니다. 진행 이벤트를 받은 후 같은 프로세스에 저장된 결과를 다시 요청합니다. 마지막에 **IPC DEMO PASS**가 나오면 실행과 조회의 왕복이 성공한 것입니다. 모델 응답은 고정 시나리오이고 실제 API는 호출하지 않습니다. 실행 ID는 출력되며 기존 runs/export 명령으로 조회·내보내기를 할 수 있습니다.

| 추가 파일 | 역할 |
|---|---|
| src/ipc/protocol.ts | 요청 형식·버전·응답·오류 계약 |
| src/ipc/framing.ts | UTF-8 JSONL 행 복원, 64 KiB 입력 제한 |
| src/ipc/service.ts | 실행·조회·목록 요청 처리, 요청 ID 중복 방지 |
| src/ipc/sidecar.ts | stdin/stdout으로 계속 실행되는 Node 프로세스 |
| src/ipc/demo.ts | 별도 자식 프로세스를 시작하는 통신 데모 |
| docs/ipc-contract.md | FE/Core 전달용 계약 초안·예시·제한 |

호스트는 Node 실행 파일을 직접 실행해야 합니다. npm 출력은 프로토콜용 stdout에 섞일 수 있으므로 자동 연결 시 npm을 경유하지 않습니다. `npm.cmd run sidecar`는 수동 개발용으로 입력을 기다리며, 바로 결과가 출력되는 명령은 `ipc:demo`입니다.

동시에 실행하는 워크플로는 1개이며 실행 중 조회·취소를 지원합니다. Rust 저장소·비밀키 관리 연결, React 화면, Tauri 번들 및 설치 프로그램은 후속입니다. 통신 계약은 팀 합의 전 초안이며 제품 통합 완료로 간주하지 않습니다. 자세한 요청·응답 예시는 [IPC 계약](docs/ipc-contract.md)에 있습니다.

## 이전 단계: Workflow 안에서 도구 사용

계획 → 작성 → 검토 중 검토 단계가 `text_stats`를 사용할 수 있습니다. 기존 Agent 역할 지시문, GPT·Gemini 도구 어댑터, 반복 호출 제어를 연결했습니다. 각 단계의 `tools` 설정이 없으면 기존 단일 모델 호출을 유지합니다.

### API 없이 바로 실행

ZIP을 새 폴더에 풀어 `agent-runtime`을 VS Code에서 열고 실행하세요. 빈 `.env`가 포함되어 있으며 데모는 키가 없어도 됩니다.

```powershell
npm.cmd ci
npm.cmd run workflow:tools:demo -- "캡스톤 프로젝트 개발 계획"
```

계획과 초안을 만든 뒤 검토 단계에서 **앞 단계 초안 원문**의 글자·공백 기준 단어·줄 수를 실제 도구로 계산합니다. 모델의 도구 선택과 최종 의견은 고정 시나리오입니다. 기대 결과는 세 단계 Completed, 검토 출력의 `실제 text_stats 결과`, 그리고 `도구 실행 기록: 모델 2회 / 도구 1회`입니다. 통계 숫자는 초안 내용에 따라 달라집니다. 여기서 모델 2회는 데모 세션의 두 차례 응답이며 외부 API 호출은 0회입니다.

출력된 실행 ID를 아래 실행ID 자리에 넣습니다.

```powershell
npm.cmd run runs -- 실행ID
npm.cmd run rerun:demo -- 실행ID review
npm.cmd run export -- 실행ID
```

`rerun:demo`는 기존 계획·초안을 재사용하고 도구 검토만 다시 실행합니다. 새 기록은 새 ID에 저장되므로 새 결과를 내보내려면 재실행이 출력한 ID로 export하세요. 실패한 실행에는 기존 `resume:demo`를 사용합니다. 예전 버전의 일반 Workflow 기록에는 tools 설정이 없으므로 자동으로 도구가 추가되지 않습니다.

### 실제 GPT·Gemini 실행

API 설정이 준비되면 `workflows/content-tools.json`의 provider를 단계별로 openai/gemini로 정한 뒤 실행합니다. 현재 기본값은 모두 openai입니다.

```powershell
npm.cmd run workflow:tools -- "초안을 작성하고 검토 시 text_stats로 글자 수를 확인해줘"
```

실제 모델은 필요에 따라 도구를 호출하거나 바로 답할 수 있습니다. 도구 사용이 무조건 강제되는 것은 아닙니다. 원문을 정확히 전달했는지와 답변에 통계를 제대로 반영했는지는 실제 모델 검증이 필요합니다. 429 문제는 이번 변경으로 해결하지 않았습니다.

### 단계 설정과 저장 계약

`workflows/content-tools.json`은 도구 검토 예시이고 `content.json`은 기존 일반 Workflow입니다. tools 필드는 다음처럼 선택적으로 추가합니다.

```json
{"id":"review","agent":"reviewer","provider":"openai","tools":{"maxModelCalls":4,"maxToolCalls":8}}
```

`tools: {}`도 가능하며 기본 한도는 모델 4회·도구 8회입니다. 모델 호출 한도는 1~10, 도구 호출 한도는 0~20입니다. 도구 실행 후 답변을 받을 호출 여유가 없으면 실행 전에 중단합니다. 현재 허용 도구는 text_stats뿐입니다. 미등록 도구·잘못된 인수는 거부 정보를 모델에 반환하며, 최종 답변을 받으면 단계가 Completed일 수 있습니다. 따라서 Completed가 모든 도구 호출의 성공을 뜻하지는 않습니다.

단계별 `toolTrace`에 모델 요청 횟수와 도구 호출 ID·이름·성공 여부·통계/오류 코드가 저장됩니다. SQLite, runs 상세 조회, report.md, run.json에 포함됩니다. 도구 입력 인수 원문·공급자 원본 응답·reasoning·인증 설정은 trace에 별도로 저장하지 않습니다. 사용자 목표와 최종 답변은 기존처럼 저장되므로 개인정보 자동 제거 기능은 아닙니다.

완료된 단계를 재사용할 때는 trace도 보존합니다. 다시 실행할 단계와 하위 단계의 기존 trace는 제거하고 새 기록을 남깁니다. 원본 실행은 변경하지 않습니다. 0.7 이하 기록은 tools/trace 없이 읽을 수 있으나 새 기록을 구버전 프로그램에서 읽는 것은 지원하지 않습니다.

**복구 범위:** trace는 단계가 성공 또는 실패로 반환된 시점에 저장합니다. 도구 루프 도중 강제 종료하면 진행 중 trace는 유실될 수 있으며 복구 시 그 단계 전체를 다시 실행합니다. 도구 호출 단위의 체크포인트·정확히 한 번 실행은 아직 없습니다. text_stats는 외부 변경을 하지 않는 계산 도구이며, 파일/메일 같은 변경 도구는 연결하지 않았습니다.

추가 파일: src/workflow/tool-executor.ts, tool-trace.ts, workflows/content-tools.json, tests/workflow-tools.test.ts. 전체 테스트 67개 및 타입 검사를 통과했고, 실제 API와 Windows 실행은 아직 검증하지 않았습니다.

## 이전 단계: 결과 문서 내보내기

터미널에서 확인하던 실행 결과를 문서와 JSON 파일로 저장할 수 있습니다. 완료된 결과뿐 아니라 실패한 실행의 부분 결과도 내보냅니다. 내보내기는 저장된 DB를 읽는 작업이며 GPT·Gemini API를 호출하지 않습니다.

### 바로 실행하기

ZIP을 새 폴더에 풀어 안쪽 `agent-runtime`을 VS Code에서 엽니다. `.env`는 이미 포함되어 있고 아래 데모에는 키가 필요 없습니다.

```powershell
npm.cmd ci
npm.cmd run workflow:demo -- "캡스톤 프로젝트 개발 계획"
```

완료 메시지에 나온 실행 ID를 복사하고 아래 `실행ID` 자리에 붙여 넣습니다. export 명령에는 draft 같은 단계 이름을 붙이지 않습니다.

```powershell
npm.cmd run export -- 실행ID
```

저장된 결과 경로가 출력됩니다. VS Code 파일 탐색기에서 해당 `report.md`를 열고 **Ctrl+Shift+V**로 Markdown 미리보기를 볼 수 있습니다. 단계별 원문은 코드 블록으로 보존하므로 모델이 만든 Markdown/HTML도 그대로 읽을 수 있습니다.

| 파일 | 포함 내용 |
|---|---|
| `report.md` | 목표, 실행 정보, 계획·초안·검토 의견, 단계 상태 |
| `run.json` | 검증된 실행 기록 전체: Snapshot, 결과, 이벤트, 원본 실행 ID |
| `manifest.json` | 내보내기 ID, 생성 시각, 파일 크기·SHA-256 |

기본 저장 위치는 `.local/artifacts/실행ID/내보내기ID/`입니다. 같은 실행을 다시 내보내도 별도의 폴더를 만들므로 기존 파일을 수정한 내용이 유지됩니다. `AGENT_RUNTIME_DB`를 지정했다면 해당 DB 옆의 artifacts 폴더에 저장합니다.

### 기존 실행 결과 내보내기

```powershell
npm.cmd run runs
npm.cmd run export -- 실행ID
```

이전 버전의 실행 ID를 쓰려면 모든 실행 프로세스를 종료한 뒤 기존 `.local` 폴더를 새 프로젝트로 복사해야 합니다. 또는 새 폴더에서 데모를 실행하고 새 ID를 사용하세요. Running 기록은 내보내지 않습니다. 먼저 실행 종료 또는 resume 복구를 마친 뒤 내보내세요. Failed 기록은 문서 제목에도 **실패한 실행의 부분 결과**라고 표시합니다.

내보내기에는 목표와 모델 응답이 그대로 포함됩니다. API 키 및 환경변수를 별도 필드로 수집하지 않으며, 사람이 입력이나 응답 안에 넣은 민감한 내용을 자동으로 지우지는 않습니다. demo 결과는 실제 AI 문서와 구분하도록 표시합니다. 초안과 검토 의견은 분리하며 검토를 반영한 최종 수정본이라고 표시하지 않습니다.

### 개발 범위

`src/workflow/artifacts.ts`가 문서와 파일 정보를 생성하고 `src/workflow/export-cli.ts`가 저장된 실행을 불러옵니다. 임시 폴더에 세 파일을 모두 쓴 뒤 완성된 폴더로 옮깁니다. 오류가 나면 성공 경로를 출력하지 않습니다. 프로세스를 강제 종료하면 `.export-` 임시 폴더가 남을 수 있으며, 전원 장애까지 포함한 파일시스템 내구성을 보장하는 구현은 아닙니다.

현재 파일 쓰기는 개발 CLI의 어댑터입니다. Tauri 제품에서는 Rust Artifact Gateway/권한 검사에 연결해야 하며, 제품 Artifact DB·버전 관리·자동 게시·공유·UI는 아직 구현하지 않았습니다. 이 JSON은 조회·통합용이며 외부 JSON을 불러와 실행하는 import 기능은 없습니다.

## 이전 단계: 원하는 단계부터 다시 실행

완료된 실행에서도 특정 단계와 그 이후 단계를 다시 실행할 수 있습니다. `draft`를 선택하면 기존 plan 결과만 재사용하고 draft와 review를 새로 만듭니다. 이전 draft/review 결과가 새 요청에 섞이지 않습니다. 원본은 보존하고 새 실행에 원본 ID와 시작 단계 ID를 기록합니다.

### 바로 실행하기

새 폴더에 압축을 풀고 VS Code에서 안쪽 `agent-runtime` 폴더를 엽니다. **이번 ZIP에는 `.env`가 이미 포함되어 있습니다.** 데모는 키 없이 실행할 수 있습니다.

```powershell
npm.cmd ci
npm.cmd run workflow:demo -- "캡스톤 프로젝트 개발 계획"
```

완료 메시지의 실행 ID를 복사한 뒤 아래 `실행ID`를 그 값으로 바꿉니다.

```powershell
npm.cmd run rerun:demo -- 실행ID draft
```

`저장된 완료 단계 재사용: plan`과 `다시 실행할 단계: draft → review`가 표시됩니다. Running 로그에는 draft와 review만 나타나야 합니다. 데모는 고정 응답을 사용하므로 결과 문구가 이전과 같을 수 있지만, 단계 실행과 새 기록 저장은 실제로 수행합니다.

| 시작 단계 | 재사용 | 다시 실행 |
|---|---|---|
| `plan` | 없음 | plan → draft → review |
| `draft` | plan | draft → review |
| `review` | plan, draft | review |

커스텀 워크플로에는 **저장된 Snapshot의 단계 ID**를 사용합니다. 시작 단계 앞에 미완료 단계가 있으면 거부합니다. Running 기록은 먼저 기존 resume/복구 명령으로 처리해야 합니다. 선택한 단계 이후 결과는 의존 관계를 따라 모두 다시 실행하며, 중간 단계 하나만 바꾸고 옛 검토 결과를 유지하는 동작은 지원하지 않습니다.

API 설정이 준비된 live 기록은 `npm.cmd run rerun -- 실행ID draft`로 다시 실행합니다. 다시 실행할 공급자 설정만 사전 검사하며, 호출한 단계만큼 API 사용량이 발생합니다. demo/live 모드는 혼용할 수 없습니다. 최초 실행 때의 목표와 단계 정의를 사용하고, 실제 모델 설정과 Agent 지시문은 현재 코드를 사용합니다. 429 문제는 계속 별도 해결 대상입니다.

### .env에 값 입력하기

파일 목록에서 `.env`를 열고 다음 네 항목 중 사용할 공급자의 값만 `=` 오른쪽에 붙여 넣고 저장합니다. `.env.example`을 복사하거나 이름을 바꿀 필요가 없습니다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
```

키와 모델 ID는 본인 계정의 값을 입력하세요. 데모만 실행할 때는 비워 둡니다. `npm.cmd run doctor`는 값의 존재만 검사하며 실제 인증이나 사용 한도를 확인하지 않습니다.

이번 ZIP의 `.env`는 값이 비어 있는 입력 양식입니다. 기존 프로젝트 폴더에 압축을 덮어 풀면 작성해 둔 `.env`가 비워질 수 있으므로 **새 폴더에 풀어 사용**하세요. 이후에도 값이 들어 있는 `.env`는 Git에 포함되지 않습니다.

추가 코드: `runner.ts`의 getRerunPlan/rerunWorkflow, 저장 계약의 rerunFromStepId, CLI의 rerun 명령, tests/rerun.test.ts. 0.5.0 실행 DB는 변환 없이 계속 읽을 수 있습니다.

## 이전 단계: 실행 저장·조회·재개

Workflow 실행 결과를 SQLite에 저장합니다. 프로그램을 종료해도 실행 목표, 단계 정의의 Snapshot, 완료 결과, 실패 상태를 불러올 수 있습니다. 재개하면 **완료한 단계의 결과를 재사용하고 미완료 단계부터 실행**합니다. 원본 기록은 그대로 두고 새 실행 ID와 parentRunId를 만듭니다.

먼저 새 ZIP을 풀어 VS Code에서 `agent-runtime` 폴더를 엽니다. 터미널에서 다음을 한 줄씩 실행하세요. API 키는 필요 없습니다.

```powershell
npm.cmd ci
npm.cmd run workflow:demo -- --fail-at draft "캡스톤 프로젝트 개발 계획"
npm.cmd run runs
```

두 번째 명령은 실패·재개 기능을 확인하기 위해 **draft에서 의도적으로 실패**합니다. `plan: Completed`, `draft: Failed`, `review: Skipped`가 정상적인 실습 결과입니다. 종료 코드도 1입니다. 출력된 실행 ID를 복사하여 아래 `여기에-실행-ID` 자리에 넣으세요.

```powershell
npm.cmd run resume:demo -- 여기에-실행-ID
npm.cmd run runs -- 여기에-실행-ID
```

재개 명령에서 `저장된 완료 단계 재사용: plan`이 나오고 draft와 review만 Running → Completed로 바뀌면 성공입니다. 마지막 조회 명령은 원본 실패 기록을 보여 줍니다. 새 완료 기록을 보려면 재개 명령이 출력한 **새 실행 ID**로 조회합니다. 데모 답변은 고정 시나리오이고, 그래프 제어·DB 저장·재개 코드는 실제로 작동합니다.

| 명령 | 동작 |
|---|---|
| `npm.cmd run workflow:demo -- "목표"` | API 없이 실행하고 자동 저장 |
| `npm.cmd run workflow:demo -- --fail-at draft "목표"` | 지정 단계에서 실패를 재현 |
| `npm.cmd run runs` | 최근 100개 실행의 ID·모드·상태·시각 조회 |
| `npm.cmd run runs -- 실행ID` | 해당 실행의 단계별 결과 조회 |
| `npm.cmd run resume:demo -- 실행ID` | demo 실패 기록 재개 |
| `npm.cmd run resume -- 실행ID` | live 실패 기록 재개, 실제 API 사용 |

`demo` 기록은 `resume:demo`, `live` 기록은 `resume`으로만 재개할 수 있습니다. 완료된 실행은 재개하지 않습니다. 같은 실패 ID를 여러 번 재개하면 각각 별도의 새 실행이 만들어집니다. 자동 중복 실행 방지나 분산 잠금은 아직 없습니다.

### 프로그램 강제 종료 후 복구

프로세스가 갑자기 종료되면 마지막 상태가 Running일 수 있습니다. 이 상태는 실제로 실행 중인지 확인할 수 없으므로 기본 재개를 거부합니다. **기존 프로세스가 종료되었는지 확인한 뒤** 해당 모드의 명령에 `--recover`를 붙입니다.

```powershell
npm.cmd run resume:demo -- 실행ID --recover
```

완료 결과가 저장된 단계만 재사용합니다. API 응답을 받았지만 저장하기 전에 종료되었다면 그 단계는 다시 요청되므로 사용량이 중복될 수 있습니다. 현재 Workflow는 모델 호출과 선택적인 text_stats 계산을 수행하며 파일 쓰기·메일 발송 같은 외부 변경 도구의 정확히 한 번 실행을 보장하지 않습니다. 자동 재시도·자동 장애 판정·동시 복구 잠금은 후속 개발입니다.

### 저장 위치와 제품 통합 경계

기본 DB는 프로젝트의 `.local/agent-runtime.sqlite`입니다. 새 버전 폴더로 옮길 때 실행 기록을 유지하려면 프로그램을 모두 종료하고 `.local` 폴더를 함께 복사하세요. `AGENT_RUNTIME_DB` 환경변수로 다른 경로를 지정할 수 있습니다. 기본 DB는 Git 및 배포 ZIP에서 제외합니다. `.env`는 Git에서 제외하고, 배포 ZIP에는 실제 키가 없는 빈 입력 양식만 포함합니다.

저장 내용은 목표·Workflow Snapshot·단계 결과·정제된 실패 메시지·상태 이벤트·실행 ID입니다. API 키나 전체 환경변수를 설정 필드로 저장하지 않습니다. **입력과 결과는 로컬 DB에 평문으로 저장**하므로 목표나 답변에 포함된 민감한 정보도 그대로 남습니다. live 재개에는 현재 `.env`를 사용하며, 모델 ID와 Agent 지시문 버전까지 고정한 완전한 재현 기능은 아직 아닙니다.

`WorkflowStore`는 저장소 인터페이스이고 `SqliteWorkflowStore`는 독립 실행용 개발 어댑터입니다. 제품 설계상 SQLite 소유권은 Rust Core에 있으므로 Tauri 통합에서는 Rust IPC 구현으로 교체합니다. 이는 단계 경계의 애플리케이션 체크포인트이며 LangGraph Checkpointer 전체 상태·도구 루프 내부 복구 구현은 아닙니다.

| 파일 | 추가된 책임 |
|---|---|
| `src/workflow/records.ts` | 저장 계약·Zod 검증·WorkflowStore 인터페이스 |
| `src/workflow/sqlite-store.ts` | 개발용 SQLite 저장·조회 |
| `src/workflow/runner.ts` | 단계별 저장·완료 결과 재사용·새 실행과 원본 연결 |
| `src/workflow/cli.ts` | 목록·상세·실패 재현·재개·명시적 복구 |
| `tests/persistence.test.ts` | DB 재접속·별도 프로세스 재개·비정상 종료 검증 |

## 이전 단계: 계획 → 작성 → 검토 워크플로

API 문제를 보류한 상태에서 개발을 계속할 수 있도록 외부 API 없는 워크플로 데모를 제공합니다. **실제 LangGraph.js 엔진이 순차 실행·상태 전달·실패 처리를 수행**하며, 모델 답변은 고정 시나리오입니다. 실제 AI 결과 품질이나 라이브 인증 검증은 아닙니다.

```powershell
npm.cmd ci
npm.cmd run workflow:demo -- "캡스톤 프로젝트의 개발 계획을 작성해줘"
```

@langchain/langgraph 1.7.4와 zod 4.6.7을 사용합니다. 0.5.0의 저장 기능은 Node.js 내장 node:sqlite를 사용하므로 추가 npm 의존성이 없습니다. 이전 node_modules를 그대로 사용하는 대신 npm ci로 설치하세요.

정상 실행 시 plan, draft, review 순서로 Running → Completed가 표시되고 각 단계 결과가 출력됩니다. 초안과 검토 의견은 서로 다른 산출물이며 검토 결과를 수정 완료된 최종 문서로 표시하지 않습니다.

## 워크플로 정의를 수정하기

`workflows/content.json`은 LangGraph 내부 형식에 의존하지 않는 순차 Workflow 정의입니다. 현재는 전체 Canonical Workflow Schema의 초기 부분집합이며 Input/Output 노드·임의 Edge·병렬·분기 편집까지 구현한 계약은 아닙니다.

```json
{
  "schemaVersion": 1,
  "id": "plan-write-review",
  "name": "계획 → 작성 → 검토",
  "steps": [
    { "id": "plan", "agent": "planner", "provider": "openai" },
    { "id": "draft", "agent": "writer", "provider": "openai" },
    { "id": "review", "agent": "reviewer", "provider": "openai" }
  ]
}
```

steps 배열 순서가 실행 순서입니다. 각 단계는 사용자 목표와 지금까지 완료된 모든 단계의 결과를 받습니다. 단계 ID는 중복되지 않는 영문 소문자로 시작하는 영문/숫자/_/- 문자열입니다. Agent는 planner/writer/reviewer, 공급자는 openai/gemini만 허용합니다. Zod가 정의를 실행 전에 검사합니다.

직접 수정 연습: steps 배열 마지막에 `{"id":"revision","agent":"writer","provider":"openai"}`를 추가하고 데모를 다시 실행합니다. 기존 review 항목 뒤에 쉼표가 필요합니다. revision이 네 번째 단계로 실행되고 plan/draft/review 결과를 참조하는지 확인하세요. 데모에서는 고정 예시 초안이 출력되며 실제 검토 반영 품질을 판단하지 않습니다.

## 새 파일과 실행 책임

| 파일 | 역할 |
|---|---|
| workflows/content.json | 사용자가 편집하는 순차 단계 정의 |
| src/workflow/schema.ts | Zod 검증·제품 측 실행 계약 |
| src/workflow/compiler.ts | 각 단계 → LangGraph 노드, 순서·실패 시 종료 경로 생성 |
| src/workflow/runner.ts | 실행 Snapshot·ID·상태 이벤트·전체 결과 |
| src/workflow/executors.ts | 기존 Agent Runner 연결 및 고정 데모 실행자 |
| src/workflow/cli.ts | 터미널 실행·상태·단계별 결과 출력 |

정의는 실행 시작 시 복사하여 Snapshot으로 사용합니다. 성공한 단계 결과를 보존하며 실패한 단계는 Failed, 그 뒤 단계는 Skipped로 표시하고 호출하지 않습니다. 자동 재시도는 없습니다. Workflow CLI는 데이터와 상태를 단계 경계마다 저장하며, 함수를 직접 사용할 때는 store 옵션을 전달해야 영속 저장합니다.

실제 API 사용이 가능해지면 .env와 각 단계 provider를 설정한 뒤 다음을 실행합니다.

```powershell
npm.cmd run workflow -- "캡스톤 프로젝트의 개발 계획을 작성해줘"
```

이 명령은 기본 3단계를 각각 모델 호출 1회로 실행합니다. 각 호출에 API 사용량이 발생할 수 있습니다. 설정이 누락된 공급자가 있으면 첫 요청 전에 중단합니다. 누적 결과가 UTF-16 10,000을 넘으면 다음 단계는 입력 초과로 실패하며 임의로 자르지 않습니다. 모델 접근 가능 여부·크레딧은 실행 전 검사로 확인하지 않습니다. 429 문제는 이번 변경으로 해결되지 않았습니다.

전체 목표 입력은 UTF-16 5,000까지, 단계는 1~10개까지 지원합니다. Workflow 단계의 Tool Loop 옵션은 0.8.0에서 추가했습니다. 단계 전 사용자 검토 게이트는 0.11.0에서 추가했습니다. 병렬 실행·검토 UI·Tauri/Rust 실제 연결은 후속 구현입니다. 선택한 단계와 이후 단계의 재실행은 0.6.0에서 지원합니다. 실패 지점 재개와 명시적 중단 복구는 0.5.0에서 지원합니다. 기존 단일 agent 명령과 tools 명령은 계속 사용할 수 있습니다.

이 개발용 Workflow CLI는 LangSmith 추적 관련 환경변수를 비활성화합니다. 외부 애플리케이션에서 runWorkflow 함수를 직접 불러 사용할 때에는 호스트 애플리케이션이 추적 설정을 책임집니다.

## 이전 단계: 도구 실행과 반복 호출

`npm.cmd run demo`로 API 키 없이 다음 흐름을 확인할 수 있습니다. 모델의 선택·답변은 정해진 시나리오로 대체하며 **text_stats 도구와 반복 제어 코드는 실제 실행**됩니다. 라이브 AI의 판단·답변을 검증한 것은 아닙니다.

```powershell
npm.cmd ci
npm.cmd run demo -- "안녕 세상"
```

결과: `[데모 결과] 글자 5개, 공백 기준 단어 2개, 줄 1개`

기존 .env는 보관하고 업데이트 ZIP을 새 폴더에 풀어 엽니다. 데모에는 .env가 필요하지 않습니다.

## 기존 기능

- Claude 호출 코드·설정·실행 선택지를 제거했습니다.
- `npm run agent`로 역할을 선택합니다. `planner`, `writer`, `reviewer`를 제공합니다.
- 실행 결과에 실행 ID, 시작 시각, 소요 시간, Completed/Failed 상태를 포함합니다.
- `npm run doctor`가 키·모델 설정 유무만 검사합니다. 실제 인증 확인이나 API 호출을 하지는 않습니다.

## Windows에서 업데이트하기

1. 이번 ZIP은 새 폴더에 압축을 풉니다. 기존 코드와 `.env`는 보관합니다. 기존 폴더에 덮어쓰면 삭제한 소스가 남을 수 있으므로 새 폴더를 사용하세요.
2. VS Code의 파일 → 폴더 열기로 **이번에 푼 `agent-runtime`**을 엽니다. package.json 버전이 `0.13.0`인지 확인합니다.
3. 기존 터미널을 닫고 새 터미널을 엽니다.
4. Node.js는 24.x를 사용합니다. 아래 명령을 한 줄씩 실행하세요.

```powershell
node -v
npm.cmd ci
npm.cmd run check
npm.cmd test
```

현재 자동 테스트는 107개입니다. 테스트는 외부 API를 호출하지 않으며 API 키가 없어도 실행됩니다.

## 포함된 설정 파일 편집하기

포함된 `.env`를 열어 값을 입력하고 저장합니다. `.env.example`은 원본 양식 참고용입니다. 키 값을 대화나 스크린샷으로 공유하지 않습니다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=
```

`=` 오른쪽에 실제 API 키와 본인 계정에서 지원하는 모델 ID를 입력합니다. 한 공급자만 설정되어도 그 공급자는 실행할 수 있습니다. GPT나 Gemini 같은 서비스 이름 자체는 모델 ID가 아닙니다.

설정 확인:

```powershell
npm.cmd run doctor
```

설정이 있으면 `OPENAI: 설정 있음 (실제 인증은 호출 시 확인)`처럼 표시합니다. 빈 설정은 필요한 변수명을 알려 줍니다. 값이 존재한다는 뜻이며 키·모델의 유효성을 보장하지 않습니다.

개발자 설정 페이지:
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/apikey

## 실제 Agent 실행

준비된 공급자의 명령 하나를 실행하세요. 실제 요청은 선택한 공급자에 전송되며 계정 정책에 따라 API 사용량이 발생할 수 있습니다.

```powershell
npm.cmd run agent -- openai planner "캡스톤 프로젝트의 이번 주 개발 계획을 작성해줘"
npm.cmd run agent -- gemini writer "Agent Workspace 소개문을 작성해줘. 대상은 대학생 개발팀이야."
npm.cmd run agent -- openai reviewer "다음 계획을 검토해줘: 하루 안에 UI, API 연동, 테스트를 모두 끝낸다."
```

선택 가능한 역할:

| 역할 | 수행할 작업 |
|---|---|
| planner | 목표를 작업 순서·입력·산출물로 분해 |
| writer | 제공한 정보로 문서 초안 작성 |
| reviewer | 제공한 계획·문서의 누락·모순·개선점 검토 |

실행 시 터미널에 Running, 이후 Completed 또는 Failed가 표시됩니다. 성공 시 AI의 실제 답변이 표시됩니다. 각 명령은 독립된 작업이며 이전 명령의 대화나 결과를 자동으로 기억하지 않습니다. API 키가 없으면 Failed와 필요한 설정 안내가 나오며 모의 AI 답변을 만들지 않습니다.

기존 단순 호출도 사용할 수 있습니다.

```powershell
npm.cmd run chat -- openai "Agent Orchestration을 설명해줘"
npm.cmd run chat -- gemini "Agent Orchestration을 설명해줘"
```

## 직접 코드를 수정해 보는 순서

| 파일 | 역할 |
|---|---|
| src/agents.ts | 역할 이름과 시스템 지시문 |
| src/agent-runner.ts | 역할 검증, 모델 호출, 성공·실패 결과 |
| src/run.ts | 공급자 선택, 입력 및 설정 검사 |
| src/providers/openai.ts | OpenAI Responses API 연결 |
| src/providers/gemini.ts | Gemini generateContent API 연결 |
| src/providers/http.ts | HTTP 요청·60초 제한·오류 처리 |
| src/agent-cli.ts | Agent 터미널 명령 |
| src/doctor.ts | 네트워크 없는 설정 검사 |

첫 수정: `src/agents.ts`에서 planner의 instructions에 `각 작업의 예상 소요 시간을 포함하세요.`를 추가합니다. 저장한 뒤 같은 planner 명령을 실행하면 다음 API 요청부터 해당 지시문을 사용합니다. 출력 내용은 모델 특성상 매번 달라질 수 있습니다.

## 실제 API의 도구 실행 모드

API 설정과 사용 한도가 준비되면 별도 `tools` 명령을 사용합니다. 현재 429 문제는 해결하지 않았으며, API 호출 시 동일 오류가 발생할 수 있습니다.

```powershell
npm.cmd run tools -- gemini reviewer "안녕 세상의 글자 수와 단어 수를 text_stats 도구로 계산해줘"
npm.cmd run tools -- openai reviewer "안녕 세상의 글자 수와 단어 수를 text_stats 도구로 계산해줘"
```

선택한 공급자만 호출합니다. 모델은 도구가 필요 없으면 곧바로 답할 수 있으며, 필요한 경우 도구 결과를 받은 후 답변합니다. 각 후속 모델 요청도 API 사용량에 포함됩니다. 한 번의 실행 안에서 기본 모델 호출 4회·도구 호출 8회로 제한합니다. HTTP 요청당 60초 제한이며 자동 재시도는 없습니다. 워크플로에서는 사용자 취소를 지원합니다. 단계 전체의 제한 시간은 0.13.0의 timeoutMs로 설정할 수 있습니다. 워크플로 전체 실행 기한과 도구 루프 내부 체크포인트는 후속 작업입니다. 단독 agent/tools 명령의 Ctrl+C는 저장 가능한 워크플로 취소와 다릅니다.

## text_stats 도구의 정확한 규칙

- `characters`: 공백·개행을 포함한 Unicode 코드 포인트 수. 이모지 결합 문자 등 화면상 한 글자의 수와 다를 수 있습니다. CRLF는 문자 2개로 계산합니다.
- `words`: 양끝 공백을 제외한 문자열을 공백 연속 구간으로 나눈 개수. 한국어 형태소 분석이 아닙니다.
- `lines`: CRLF/CR/LF를 줄 구분으로 사용합니다. 빈 문자열은 0줄, 마지막 개행 뒤의 빈 줄도 포함합니다.
- 입력은 `{ "text": "..." }` 하나만 허용하며 추가 필드·다른 타입·UTF-16 길이 10,000 초과를 거부합니다.
- 도구는 전달된 텍스트만 계산합니다. 파일·네트워크·프로세스 접근이 없습니다. OS 자원에 접근하는 도구는 향후 Rust Gateway 및 권한 검사를 통해 연결해야 합니다.

## 새 코드 읽는 순서

| 파일 | 역할 |
|---|---|
| src/tools/registry.ts | 허용 도구 정의, 입력 검사, 실제 계산 |
| src/tool-loop.ts | 모델 응답 확인, 도구 실행, 결과 반환, 횟수 제한 |
| src/providers/tool-session.ts | GPT·Gemini 도구 호출/응답 변환과 실행별 대화 이력 |
| src/tool-cli.ts | 실제 API를 쓰는 tools 명령 |
| src/demo.ts | API 없는 고정 시나리오로 같은 Loop 실행 |
| tests/tools.test.ts | 계산·허용 목록·반복 제한·공급자 왕복 검사 |

도구 이름과 인수는 모델 출력을 신뢰해 바로 실행하지 않고 registry에서 확인합니다. 도구가 거부되면 오류 코드를 다음 모델 입력으로 반환합니다. Gemini의 thoughtSignature와 호출 ID, OpenAI reasoning 출력 항목을 실행별 세션 안에서 보존해 후속 요청에 재전달합니다. 내부 이력은 로그나 파일로 저장하지 않습니다.

## 개발 범위와 다음 단계

기존 `agent` 명령은 역할을 적용한 모델 호출 1회를 유지합니다. 새 `tools` 명령은 도구 사용과 후속 모델 호출을 제한된 횟수 안에서 수행합니다. 순차 Workflow/LangGraph 연결은 0.4.0에서 추가했습니다. Workflow의 단계 경계 저장과 Resume는 0.5.0에서 추가했습니다. 스트리밍, 구조화 출력, 사용량 정규화, 실행 간 대화 기억·자동 Retry는 아직 구현하지 않았습니다. 0.8.0에서는 도구 루프의 결과를 Workflow Step 결과 및 저장 계약에 연결했습니다. 제품 전체 Run/NodeRun/Attempt 계약으로 확장하는 작업은 남아 있습니다.

단일 agent/tools 명령의 결과는 아직 터미널과 메모리에만 존재합니다. Workflow CLI에만 SQLite 저장을 적용했습니다. Run ID와 상태는 제품의 Run/NodeRun/Attempt 전체 계약의 구현 완료를 뜻하지 않습니다.

API 키는 로컬 개발용 .env에서 읽습니다. 제품에서는 PDF의 secret_ref → Rust Secret Manager/Stronghold, Outbound Policy와 연결해야 합니다. npm은 현재 개발 환경을 이어 쓰기 위한 선택이며 팀 저장소 통합 때 pnpm·Zod 경계 검증을 적용합니다. 요청 한도는 UTF-16 10,000, 출력 토큰 한도 4096, 요청 제한 시간 60초이며 자동 재시도는 하지 않습니다. 출력 한도 초과·거부·빈 답변은 성공 처리하지 않습니다.

## 검증 결과와 제한

Linux / Node v24.22.1에서 타입 검사 및 자동 테스트 107개를 통과했습니다. GPT·Gemini 요청/응답 매핑, 역할별 지시문, 설정 누락 시 미호출, 공급자 장애의 Failed 처리, 설정 값 비노출, CLI 종료코드를 확인했습니다. 도구 계산 및 API 없는 데모, 가상 HTTP 응답을 통한 양쪽 공급자의 도구 왕복·서명 보존·오류·반복 제한을 검증했습니다. 문서/JSON 내보내기, 파일 해시·원문 보존, 반복 내보내기 시 기존 파일 보존, 선택 단계부터 재실행, 하위 결과 초기화, 재실행 실패 후 재개, 이전 DB 호환, SQLite 재접속, 완료 단계 미호출, 원본 기록 보존, 저장 장애 시 중단, 모드 혼용 차단, 별도 프로세스에서의 실패·재개·강제 종료 복구도 검사합니다. 실제 API는 이번 개발에서 호출하지 않았습니다. 이전 0.11.0 승인 데모는 사용자 Windows 화면에서 완료를 확인했습니다. 취소 및 이번 0.13.0 단계 제한 시간은 Linux 자동 테스트로 검증했습니다. Windows에서 새 기능과 Ctrl+C 동작은 별도 확인이 필요합니다.

## 구현 참고 공식 문서

- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://ai.google.dev/api/generate-content

도구 호출 참고: https://developers.openai.com/api/docs/guides/function-calling 및 https://ai.google.dev/api/caching#FunctionDeclaration

Workflow 공식 참고: https://docs.langchain.com/oss/javascript/langgraph/graph-api

SQLite 공식 참고: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html

## v0.24.0 실행 준비 검사

API 호출 전에 필수 자료·미지원 포트/도구·미해결 기능 제약을 검사합니다. `execute -- --record record.json --check`로 호출 없이 검사할 수 있습니다. 자세한 범위와 기존 초안의 차단 처리: [실행 준비 검사](docs/execution-readiness.md).

## v0.25.0 선행 조건 구분

새 생성 초안은 `task.prerequisites`에서 자료 입력, 사람 작업, 도구를 구분합니다. 자료 입력 조건은 해당 필수 포트가 채워지면 충족됩니다. 사람/도구 조건은 아직 자동 실행할 수 없어 차단합니다. 기존 자유문 제약은 자동 해제하지 않습니다. 자세한 내용은 [실행 준비 검사](docs/execution-readiness.md)를 확인하세요.

## v0.26.0 생성 평가 보강

`evaluate:generation`이 사례별 선행 조건 종류와 불필요한 차단 조건도 검사합니다. 구조와 응답 상태가 맞아도 필요한 선행 조건이 빠지면 자동 기준 미통과로 표시합니다. 기존 명령은 동일합니다. [평가 범위와 분모](docs/generator-evaluation.md)를 확인하세요.

## v0.27.0 평가 전후 비교

`npm.cmd run compare:generation -- --before 이전/report.json --after 이후/report.json`으로 같은 기준의 새 평가 기록을 비교할 수 있습니다. API 호출 없이 개선·악화 사례와 시간/호출/보정 차이를 저장합니다. v0.27.0부터 생성한 평가끼리 지원하며 구버전 또는 기준이 다른 평가는 거부합니다.

## v0.28.0 입력 양식 자동 생성

`npm.cmd run prepare:execution -- --record examples/execution/record.json`으로 포트별 빈 TXT 자료와 files.json, 준비 검사/실행 안내를 만듭니다. 실제 사용 시 --record를 생성 기록 경로로 바꾸세요. API 호출 없이 새 폴더를 만들며 기존 자료를 덮어쓰지 않습니다. 상세 사용법은 [실행 준비](docs/execution-readiness.md)에 있습니다.

## v0.29.0 워크플로우 미리보기

`npm.cmd run preview:generation -- --record examples/execution/record.json`으로 실행 전 계획을 Markdown 문서로 확인할 수 있습니다. 실제 사용 시 생성 기록 경로를 지정하세요. 입력 자료, 작업 순서, 지시/완료 기준, 참고 근거와 제약을 표시하며 API는 호출하지 않습니다. [미리보기 사용법](docs/generator-preview.md)을 확인하세요.

## v0.30.0 자연어로 실행 전 초안 수정

`npm.cmd run generate -- --revise 이전/record.json --feedback "비교와 보고서 작성을 분리해줘"`로 기존 목적/조건을 유지한 수정본을 새로 생성합니다. 실제 API를 호출하지만 작업은 실행하지 않습니다. 원본을 덮어쓰지 않으며 변경 경로를 기록합니다. [초안 수정 사용법과 범위](docs/generator-revision.md)를 확인하세요.

## v0.31.0 초안 변경 비교

초안 수정이 검증에 통과하면 changes.md/changes.json과 preview.md를 생성 기록 옆에 자동 저장합니다. 단계·지시·포트·연결의 이전/이후를 ID 기준으로 비교하며 추가 API 호출은 없습니다. 기존 v0.30.0 수정 기록도 preview:generation으로 변경 비교를 볼 수 있습니다.

## v0.32.0 자연어 계획부터 답변까지

`npm.cmd run task -- --request "요청"`으로 Markdown 계획을 만들고, 표시된 `task -- --run ...` 명령으로 저장된 계획을 실행해 Markdown 답변을 받습니다. 최초 요청은 자동 전달하며 별도 원문이 필요하면 입력을 요청합니다. [전체 사용 흐름](docs/task-flow.md)을 확인하세요. 계획 생성과 실행은 각각 API를 사용하며 웹 검색은 아직 미지원입니다.
