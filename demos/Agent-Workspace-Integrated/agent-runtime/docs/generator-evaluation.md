# v0.23.0 — 자연어 Workflow 생성 평가

실행기 기능 추가에 앞서 자연어→Workflow 생성기 PoC의 평가를 지원합니다. 기존 examples/generator/evaluation-cases.json의 5개 사례(명확/모호/조건 충돌/자료 미확보/도구 미등록)를 사용합니다. 최종 팀 스키마 확정이나 실제 Guidance 검색·연동은 이번 범위에 포함되지 않습니다.

## 설치
기존 agent-runtime 내용물을 덮어쓰고 .env와 node_modules를 유지합니다. 새 의존성은 없습니다. 새 폴더 설치는 npm.cmd ci 및 .env 설정을 수행합니다.

## 평가 도구 확인 — API 호출 없음
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run evaluate:generation -- --demo
```
데모는 예상 상태에 맞춘 고정 fixture를 반환합니다. 다른 주제에도 같은 예시 그래프를 사용하므로 자연어 해석 품질이나 모델 성능 평가가 아닙니다. 데모의 model_calls 카운터는 fixture provider 호출 횟수이며 실제 API 호출은 0회입니다.

## 실제 학교 모델 평가
```powershell
npm.cmd run evaluate:generation -- --live
```
.env의 WORKFLOW_PROVIDER/MODEL 및 학교 키로 실제 생성기를 5개 사례에 호출합니다. 사례당 보정 2회, API 재시도 총 1회, 120초 제한입니다. 기본 5건의 API 요청은 최대 20회일 수 있습니다. 실제 비용·잔액은 별도로 확인해야 합니다.

선택 실행과 반복:
```powershell
npm.cmd run evaluate:generation -- --live --case clear
npm.cmd run evaluate:generation -- --live --repeat 3
```
--repeat은 1~5, --cases는 동일 JSON 형식의 사례 파일 경로, 사례는 최대 20개입니다. 예상 상태는 실행 전에 사례 파일에 정의합니다. 실제 결과에 맞춰 예상 상태를 바꾸면 평가 기준이 흔들리므로 동일 사례·모델·프롬프트 버전으로 비교하세요. 최초 평가는 repeat=1로 연결을 확인하고 안정성 평가는 동일 설정에서 반복 측정하세요.

## 평가 결과
.local/evaluations/평가ID/ 아래 cases.json, report.json, summary.md와 사례-반복번호별 record.json/response.json을 저장합니다. 각 사례가 끝날 때 요약을 갱신합니다. Ctrl+C 중단 시 이후 사례를 호출하지 않으며 완료·실패 사례 기록은 남습니다. 저장 실패 시에도 다음 사례 실행을 중단합니다.

자동 지표:
- 구조 통과율: 최종 구조·명시 정책 검사를 통과한 비율
- 최초 구조 통과율: 첫 후보에서 구조 검사를 통과한 비율
- 예상 상태 일치율: draft/needs_clarification 예상과 실제 outcome 일치
- 자동 기준 동시 통과율: 최종 구조와 예상 상태가 모두 맞는 비율
- 평균 소요시간, 모델 호출·보정·API 재시도 횟수, 실패 건수

분모는 시도한 사례 수입니다. API 실패도 실패로 포함하고 중단 후 미시도 사례는 제외하되 evaluated/planned를 함께 표시합니다. 아직 시도하지 않은 경우 비율은 null(미측정)입니다. 각 결과의 모델·프롬프트 버전·생성 ID를 기록합니다.

내용 품질 점수는 null(미평가)이며 사람 검토 항목은 모두 pending입니다. 요구사항 추출의 완전성, 실제 절차 적절성, 출처 적용의 타당성을 자동 점수로 주장하지 않습니다. JSON의 구조 통과가 사용자 의도 충족을 뜻하지 않습니다. summary.md 체크리스트는 사람 검토용이며 수정한 체크 상태를 report.json에 자동 동기화하지 않습니다. 다른 모델·설정의 비용/품질 자동 비교 기능도 아직 없습니다.

## 파일 위치
- examples/generator/evaluation-cases.json: 사례·예상 상태·사람 검토 기준
- src/evaluation/generator.ts: 반복 실행·채점·보고서 생성
- src/evaluation/cli.ts: 명령과 저장
- tests/evaluation.test.ts: 평가 도구 회귀 테스트

## 검증
TypeScript 검사와 신규 평가 테스트 6개 통과. 모의 반복 평가, 자동 기준 분리, 실패 분모, 취소, 잘못된 설정 및 저장 실패를 검증했습니다. 5개 fixture 사례의 CLI 데모 저장을 확인했습니다. 실제 학교 API 평가는 개발 환경에서 수행하지 않았습니다.

## v0.26.0 선행 조건 평가

사례의 선택적 prerequisite_checks로 required_any(input/human/tool 중 하나 이상), forbidden(없어야 하는 종류), allow_unclassified(missing_capabilities 허용 여부)를 설정할 수 있습니다. required_any는 AND가 아니라 OR입니다. 검사 기준은 모델 프롬프트에 넣지 않습니다.

기본 clear는 input을 요구하고 human/tool과 미분류 제약을 금지합니다. missing_material은 input 또는 human을 허용하며, missing_tool은 tool을 요구합니다. 두 사례도 미분류 제약은 허용하지 않습니다. 이 규칙은 해당 평가 요청에 한정된 기대값이며 모든 업무의 생성 규칙이 아닙니다.

구조·예상 상태가 맞아도 지정된 선행 조건 검사에 실패하면 automatic_passed=false입니다. 생성 outcome=draft와 평가 미통과는 동시에 나올 수 있습니다. report.json의 prerequisite_checks와 summary.md에서 실패 이유를 확인하세요.

선행 조건 통과율 분모는 검사 항목이 지정된 평가 결과만 포함합니다. 기본 5개 사례 중 3개이며 해당 사례의 API/구조 실패도 미통과에 포함합니다. 기준 없는 사례는 null(미평가)입니다. 전체 자동 기준 통과율 분모는 기존과 같이 시도한 모든 사례입니다. 이전 버전과 통과율을 비교할 때 기준이 달라졌음을 고려하세요.

이 검사는 종류와 명시적 필드만 확인합니다. input을 부적절하게 지정했는지, 실제 인터뷰가 필요한데 단순 입력으로 대체했는지 등의 의미적 적절성은 여전히 사람 검토 대상입니다. 실행 준비가 ready인지 또는 작업이 실제 완료됐는지를 점수로 표시하는 기능도 아닙니다.

DEMO는 기대 종류를 명시적으로 넣은 고정 fixture입니다. 통과해도 실제 모델이 선행 조건을 잘 분류했다는 증거가 아닙니다. 실제 생성 품질은 --live로 확인합니다.

## v0.27.0 평가 전후 비교

새 report.json에는 scoring_version과 사례별 case_fingerprint가 추가됩니다. 지문은 정규화된 입력·예상 상태·선행 조건 검사·사람 검토 항목 전체로 계산됩니다. 같은 사례/반복 구성과 지문을 가진, 중단되지 않은 완료 평가끼리 비교합니다. DEMO/LIVE 혼합과 구버전 기록은 거부합니다. 모델/프롬프트 차이는 허용하고 결과 JSON에 보존합니다.

```powershell
npm.cmd run compare:generation -- --before .local/evaluations/BEFORE/report.json --after .local/evaluations/AFTER/report.json
```

BEFORE/AFTER는 실제 평가 폴더 ID로 바꾸세요. 비교 자체는 API를 호출하지 않습니다. 결과는 출력된 `.local/comparisons/ID/comparison.md`와 `comparison.json`에 저장됩니다. 기존 평가 파일은 수정하지 않습니다. 악화 사례가 하나라도 있거나 입력을 비교할 수 없으면 종료 코드 1, 그 외에는 0입니다. 두 경로에 동일 파일을 넣으면 변화 없음이므로 수정 효과를 확인하려면 실제 서로 다른 평가 기록을 사용하세요.

자동 통과율의 변화(%p), 사례별 개선/악화, 실행 시간·호출·보정 횟수 차이(이후−이전)를 표시합니다. 통과율은 저장된 집계값이 아니라 비교 대상 행에서 다시 계산합니다. 호출 수는 금전 비용이 아닙니다. 실행 속도는 서버 상태 영향을 받으며 단일 반복은 통계적 성능 개선의 증거가 아닙니다. 입력/기준은 같아도 실행 환경·제한 설정은 다를 수 있으므로 원래 record.json도 함께 확인하세요.

기존 v0.26.0 이하 평가에는 지문이 없으므로 자동 추측해 비교하지 않습니다. 새 버전으로 기준 평가를 저장한 뒤, 후속 변경 평가와 비교하세요. 기존 100% 결과는 당시 기준에서 유효하며 새 기준 점수와 동일한 측정으로 해석하면 안 됩니다.
