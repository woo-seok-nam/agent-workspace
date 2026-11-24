# Workflow 생성기 v0.1 개발 안내

현재 0.15.0의 학교 Gateway 설정은 [학교 API 안내](factchat.md)를 따른다. 아래 OpenAI 본사 키 설정은 direct 모드용이다. 학교 모드에서는 세 공급자 모두 선택 가능하며 생성기 CLI의 출력 토큰 기본값은 16384다.

자연어에서 **질문 또는 Workflow 계획 JSON**을 생성한다. 새 `nodes/ports/edges` 계약은 기존 Runtime의 `steps` 계약과 별개이며 자동 실행·기존 Compiler 변환은 하지 않는다. 설계 명세를 기준으로 시작한 첫 구현이다.

## 빠른 시작

Node.js 24가 필요하다. ZIP을 새 폴더에 풀고 `agent-runtime` 폴더를 VS Code로 연다. 아래는 Windows PowerShell 명령이다.

```powershell
npm.cmd ci
npm.cmd run generate:demo
```

데모는 API를 호출하지 않고 고정 예시 응답을 주입해 생성 파이프라인을 확인한다. 임의 자연어를 이해하는 모델이나 모델 성능 평가가 아니다. 정상 시 `결과: draft`와 7개 Node가 표시된다. 결과 폴더는 매번 새로 생성된다.

```powershell
npm.cmd run generate:demo -- --scenario clarification
npm.cmd run generate:demo -- --scenario repair
npm.cmd run generate:demo -- --scenario failure
```

- `clarification`: 질문 1개와 `workflow: null` 반환.
- `repair`: 최종 검토가 빠진 초안 → 오류 검출 → 전체 수정본 → 재검증 통과. 구조 보정 1회.
- `failure`: 같은 오류가 계속 남아 한도에 도달한다. `VALIDATION_FAILED`, 종료 코드 1이 의도한 결과다.

## 실제 자연어 생성

1. `.env.example`을 `.env`로 복사한다. 기존 `.env`가 있으면 복사로 덮어쓰지 않고 필요한 값만 추가한다.
2. `.env`의 `OPENAI_API_KEY`와 `WORKFLOW_MODEL`에 본인 API 키와 Structured Outputs를 지원하는 실제 API 모델 ID를 넣는다.
3. `WORKFLOW_MODEL`이 비어 있으면 기존 `OPENAI_MODEL` 값을 사용한다.

```dotenv
OPENAI_API_KEY=
WORKFLOW_MODEL=
```

설계 대화의 **Sol은 자동으로 API 모델 ID에 매핑하지 않았다.** 계정에서 사용 가능한 정확한 ID를 직접 설정한다. 키를 소스 코드나 사용자 요청에 넣지 않는다. ZIP에는 `.env`가 포함되지 않는다.

```powershell
npm.cmd run generate -- --request "기획안 A·B·C를 개발 난이도, 사용자 가치, 차별성으로 비교하고 추천 보고서를 작성하는 절차를 만들어줘. 첨부 자료만 사용해." --no-search
```

원문의 모든 조건을 보존하려면 상세 요청 JSON도 사용할 수 있다. `confirmed_requirements`에는 확정 조건의 원문을, `policies.allow_external_search`에는 코드로 강제할 정책을 적는다.

```powershell
npm.cmd run generate -- --input examples/generator/request.json
```

`--no-search`는 도구 capability가 `web_search`인 도구를 계획에서 요구하지 못하게 한다. 자연어에만 적힌 복잡한 조건은 모델의 해석과 사용자 검토가 필요하다. 정책 플래그와 확정 조건 배열은 기계 검증을 강화하기 위한 입력이다.

## 질문에 답하고 이어 생성

`needs_clarification` 응답이 나오면 출력된 기록 경로를 사용한다. 원래 요청과 확정 조건은 유지하고 질문·답변을 문맥에 누적한다. 이 명령은 실제 모델을 다시 호출한다.

```powershell
npm.cmd run generate -- --resume ".local/generations/앞서_출력된_ID/record.json" --answer "최종 산출물은 비교 보고서이고 대상은 기획안 A·B·C입니다."
```

한 번에 나온 질문 여러 개에는 `--answer` 문자열 안에서 각각 답하면 된다. 반복 질문 여부의 의미 판단은 모델이 담당한다. 새 주제로 바꾸려면 `--request` 또는 `--input`으로 새 요청을 시작한다.

## 저장되는 파일

각 실행은 `.local/generations/<UUID>/`에 새 기록을 남긴다.

| 파일 | 내용 |
|---|---|
| `response.json` | 모델 응답 계약. 질문 또는 Workflow. 파싱할 수 없는 실패에서는 없을 수 있음 |
| `validation.json` | 시스템 검사 결과와 오류·권고 |
| `record.json` | 입력, 모델·Prompt·Schema 버전, 설정, 전체 후보와 검증 기록, 변경 경로, 사용량, 최종 상태 |

`record.json.outcome`은 `draft`, `needs_clarification`, `failed` 중 하나다. `response.status=draft`인데도 최종 검증에 실패하면 `outcome=failed`가 될 수 있다. 항상 외부 `outcome`과 `validation.passed`를 함께 본다. 실제 작업 실행 상태는 이 계약에 없다.

실행 기록에는 사용자 요청과 자료 설명이 포함된다. `.local/`은 Git과 배포 ZIP에서 제외한다. API 키는 인증 헤더에만 사용하고 공급자 오류 원문을 기록하지 않는다. CLI는 환경변수에 설정된 공급자 키가 기록에 나타나면 가린다. 사용자가 자료에 포함한 임의의 모든 비밀정보까지 탐지하는 DLP 기능은 아니다.

## 첫 구현에서 상세화한 계약

기존 Word 명세에서 미정인 세부 필드를 다음과 같이 **구현 기준안**으로 정했다. 팀 합의가 추가로 필요한 부분이며 상위 Canonical Schema를 대체하지 않는다.

| 항목 | 첫 구현 |
|---|---|
| 지원 연결 | Input 1개 → 작업 → final_review 1개 → Output 1개. 위상 정렬 순서가 하나인 순차 DAG |
| 이전 데이터 전달 | 이전 자료를 뒤쪽 단계로 전달하는 추가 Edge 허용. 독립 작업·분기·순환은 차단 |
| Port | `name`, `type`, `description`, `required`, `fields` |
| 내부 필드 | object는 평탄한 객체, table은 행 구조. 필드는 `name`, `type(text/number/boolean)`, `required` |
| 출력 required | 해당 출력이 항상 제공됨을 선언. 필수 입력에 선택적 출력을 연결할 수 없음 |
| task | `kind`, `purpose`, `instructions`, `completion_criteria`, `rationale`, `required_tools`, `missing_capabilities`, `requirement_refs` |
| task.kind | `work` 또는 `final_review`. Input/Output의 task는 null |
| 설계 근거 | `kind`, `reference_id`, `location`, `reason`. 모델 제안은 ID·위치 null |
| 조건 추적 | `requirement_refs`에서 intent.requirements 원문 참조. 실제 작업과 최종 검토에 모든 조건 연결 |
| 결과 전달 | Output은 최종 검토 단계의 출력만 수신 |

Schema 원본은 `src/generator/schema.ts`, 자동 생성 JSON은 `schemas/workflow-generator-response.schema.json`이다. Schema 변경 후 `npm run generate:assets`로 예시와 Schema JSON을 다시 만든다. 테스트에서 둘의 일치를 검사한다.

## 호출과 보정 한도

아래 값은 첫 구현의 유한한 기본값이다. 실행 결과 품질 보완 최대 2회 정책과는 독립적이다.

| 설정 | 기본값 | 변경 |
|---|---|---|
| 구조 보정 | 최초 생성 후 최대 2회 | `--max-repairs` |
| API 재시도 | 생성 요청 전체에서 최대 1회 | `--max-api-retries` |
| 전체 생성 기한 | 120초 | `--timeout-ms` |
| API 호출별 기한 | 60초 | Provider 코드 설정 |
| 호출당 최대 출력 토큰 | 8192 | `--max-output-tokens` |
| 문맥 길이 | Context JSON 60000자 | 라이브러리 `maxContextChars` |
| HTTP 응답 크기 | 1MB | Provider 코드 설정 |

기본값의 최대 API 시도 수는 최초 1 + 구조 보정 2 + API 재시도 1 = 4다. 408·429·일부 5xx·연결 오류 등만 재시도한다. 400·401·403·거절·불완전 응답은 재시도 또는 보정으로 감추지 않는다. JSON/Schema/그래프 오류는 구조 보정으로 처리한다. 전체 기한은 재시도 대기에도 적용된다.

```powershell
npm.cmd run generate -- --input examples/generator/request.json --max-repairs 1 --max-api-retries 0 --timeout-ms 120000 --max-output-tokens 10000
```

호출 횟수·입력 길이·출력 토큰·시간을 제한하지만 **원화/달러 비용의 강제 상한과 입력 토큰의 사전 정밀 계산은 아직 구현하지 않았다.** 사용량은 공급자가 반환한 값을 합산하고, 누락 응답이 있으면 `usage_complete=false`다. 알 수 없는 비용을 0으로 확정하지 않는다. 취소와 타임아웃은 이미 발생한 공급자 사용량을 되돌리지 않는다.

## 검증 범위와 한계

검증 범위는 `structural_and_explicit_policies`다. Schema, 참조, 필수 연결, 내부 필드, 유일한 순차 순서, 최종 검토 경로, 등록 도구, 명시 검색 정책, Reference ID·위치, 확정 조건의 보존과 작업 연결을 검사한다. 보정 중 최초로 구조 파싱에 성공한 초안에서 이미 채워진 목적·산출물·필수 조건 변경도 막는다. 빈 목적·산출물의 완성과 누락된 사용자 확정 조건의 복구는 허용한다.

이 검사는 다음 사항까지 증명하지 않는다.

- 원문 자연어의 모든 요구사항을 모델이 빠짐없이 추출했는지
- 작업 지시가 의미상 충분하고 목적 달성에 적절한지
- 제공 Reference 내용을 정확히 해석·적용했는지
- 최종 검토라고 표시한 작업이 실행 중 충분히 검토하는지
- 실제 파일 접근 가능 여부와 실행 결과의 품질

따라서 정상 초안도 `human_review_required=true`와 `SEMANTIC_REVIEW_REQUIRED` 경고를 반환한다. 의미 검토 모델, 실제 Agent 실행, UI 및 기존 Runtime Compiler 연결은 후속 단계다.

## 개발 파일

| 경로 | 책임 |
|---|---|
| `src/generator/schema.ts` | 입력·응답 계약, JSON Schema |
| `src/generator/prompt.ts` | 생성 Prompt, Context Builder |
| `src/generator/provider.ts` | OpenAI Responses의 Structured Outputs, 거절·잘림·HTTP 오류 분류 |
| `src/generator/validate.ts` | 구조·명시 정책 검사 |
| `src/generator/generate.ts` | 생성·보정·재시도·기한·기록 |
| `src/generator/cli.ts` | 자연어/JSON 입력, 질문 답변 재개, 결과 저장 |
| `src/generator/demo.ts` | 실제 모델을 쓰지 않는 고정 예시 |
| `tests/generator.test.ts` | 실패 경로 포함 회귀 테스트 |
| `examples/generator/evaluation-cases.json` | 실모델 확인용 5개 대표 과제. 자동 점수 산정은 없음 |

## 검증 명령과 모델 평가

```powershell
npm.cmd run check
npm.cmd run test:generator
npm.cmd test
npm.cmd run generate -- --validate examples/generator/expected-draft.json --input examples/generator/request.json
```

실제 LLM을 연결한 후 대표 과제를 각각 실행하고 요청 이해·질문 적절성·절차·근거를 사람이 평가한다. 고정 데모와 HTTP 모의 테스트의 성공률을 모델 생성 품질로 집계하지 않는다. 이번 개발 환경에는 사용자 API 키와 모델 ID가 설정되어 있지 않아 실제 API 생성 품질 검증은 수행하지 않았다.

## 공식 API 참고

OpenAI Responses API의 `text.format`에 strict JSON Schema를 지정한다. 모든 객체는 추가 필드를 금지하며 nullable 필드도 required로 명시한다. 거절과 incomplete 응답은 정상 Workflow와 분리한다.

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses

확인일: 2026-11-18. 모델 ID와 계정별 지원 여부는 실행 환경에서 확인한다.
