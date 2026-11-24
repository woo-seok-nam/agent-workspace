# 실행 준비 검사 (v0.24.0)

생성 평가 통과는 실행 준비 완료를 의미하지 않습니다. 실행기는 API 호출 전에 전체 그래프를 검사합니다.

- 필수 Input 값 누락: MISSING_INPUT
- text 이외 포트: TEXT_PORTS_ONLY
- 도구 호출 필요: TOOLS_NOT_SUPPORTED (현재 생성 그래프 실행기는 도구 실행 미지원)
- missing_capabilities 설명이 남은 단계: CAPABILITY_REVIEW_REQUIRED

```powershell
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json --check
```

검사만 할 때 입력 파일을 생략하면 필요한 입력 포트 목록을 확인할 수 있습니다. AI API는 호출하지 않습니다. 검사 결과는 출력된 실행 기록 폴더의 readiness.json과 execution.json에 저장됩니다. 준비된 검사 기록의 status는 checked이며 completed가 아닙니다. 검사 중 잘못된 기록·입력은 failed로 저장됩니다. ready면 종료 코드 0, 차단되거나 입력이 잘못되면 1입니다.

일반 execute에도 동일한 검사가 자동 적용됩니다. 준비 부족이면 status=failed와 readiness.status=blocked를 저장하며 모델 호출 및 부분 작업을 시작하지 않습니다. 이 기록은 resume 대상이 아니므로 원래 생성 기록과 수정된 입력으로 새 실행을 시작하세요.

missing_capabilities는 자유문이므로 사람 작업, 자료 부족, 선택적 한계를 자동 판별하지 않습니다. 모두 검토가 필요한 제약으로 보수적으로 차단합니다. 따라서 기존 초안에서 자료를 입력한 뒤에도 자료 확보 안내가 남아 있으면 차단될 수 있습니다. 이를 단순 무시하는 우회 옵션은 없습니다. 실제 준비 상태에 맞춰 초안을 재생성하거나 검토·수정해야 합니다. 실제 인터뷰는 외부에서 수행하고, 기록을 필수 Input으로 받는 분석 절차로 구성하세요. PDF 생성은 현재 실행기가 지원하지 않으므로 도구 연결을 구현하기 전까지 실행할 수 없습니다.

이 검사는 명시된 포트·도구·제약만 확인합니다. 모델이 제약을 누락한 경우까지 탐지하거나 텍스트 내용의 진실성, 파일의 실제 출처를 보증하지 않습니다. 사람 작업을 위한 구조화된 상태 및 해결 증거 연결은 후속 과제입니다.

## v0.25.0: 구조화된 선행 조건

새 생성 프롬프트(0.1.2)는 task.prerequisites를 작성합니다.

| kind | input_port | 실행 준비 판단 |
|---|---|---|
| input | Input의 필수 출력 포트 이름 | 해당 값이 입력되면 충족 |
| human | null | HUMAN_ACTION_REQUIRED로 차단 |
| tool | null | TOOL_CONNECTION_REQUIRED로 차단 |

```json
{"kind":"input","description":"기획안 원문 확보","input_port":"proposals"}
```

존재하지 않거나 선택 사항인 Input 포트를 참조하면 구조 검증에 실패합니다. 입력 텍스트에 '완료'라고 써도 human/tool 조건은 해제되지 않습니다. 자료 내용의 적절성까지 자동 검증하는 기능은 아닙니다.

missing_capabilities 자유문은 기존과 같이 차단합니다. 단순 범위 한계는 assumptions와 instructions에 기록하고, 실제 필수 선행 조건과 구분하도록 생성 규칙을 개선했습니다. 이전 response.json은 자동으로 의미를 변환하지 않으며 새 규칙을 적용하려면 다시 생성해야 합니다. 기존 파일은 prerequisites 생략 시 빈 배열로 읽으므로 호환됩니다. 새 형식은 v0.25.0 실행기를 사용하세요.

사람 작업 완료 확인/재개, 실제 도구 연결은 아직 미지원입니다. 인터뷰를 밖에서 수행한 뒤 실제 전사본을 Input으로 받는 절차로 재구성하는 방식은 가능합니다.

## v0.28.0: 초안별 입력 양식 생성

```powershell
npm.cmd run prepare:execution -- --record examples/execution/record.json
```

실제 생성 결과에는 `.local/generations/ID/record.json` 또는 `.local/evaluations/평가ID/clear-1/record.json` 경로를 넣으세요. response.json은 요청/정책 정보가 없으므로 단독 사용하지 않습니다. API를 호출하지 않습니다.

출력된 `.local/inputs/prepared-.../` 폴더에는 다음 파일이 생성됩니다.

- README.md: 실제 입력 포트별 설명, 자료 경로와 프로젝트 폴더에서 실행할 검사/실행 명령
- files.json: 입력 포트 이름과 해당 TXT 파일 경로 매핑
- materials/input-N.txt: 필수 text 포트마다 빈 자료 파일
- record.json: 검증된 생성 기록 사본
- readiness.json: 빈 입력 상태의 준비 검사 결과

빈 TXT 파일에 실제 자료를 UTF-8로 저장한 뒤 README.md의 --check 명령을 실행하세요. 빈 자료는 거부됩니다. 예시 문구를 실제 내용으로 자동 입력하지 않습니다. optional 포트는 기본 files.json에서 제외하며 필요한 경우 해당 포트 이름으로 실제 TXT/MD 경로를 추가할 수 있습니다. 경로는 files.json 위치 기준입니다.

사람 작업/도구/미분류 제약은 양식 생성이나 자료 입력만으로 해제되지 않습니다. file_ref/table/object 입력을 TXT로 변환하지 않으며 현재 실행기에서 미지원으로 표시합니다. 양식을 만들었다고 실행 준비가 완료된 것은 아닙니다. 파일 로더의 기존 제한(총 파일 20개, 각 파일 64KB, 총256KB, 포트별20,000자)도 유지됩니다.

매 실행마다 새로운 폴더를 만들어 이전 자료를 덮어쓰지 않습니다. 저장 실패 시 이번에 만든 폴더만 정리합니다. 실행에는 사본 record.json이 사용되므로 원래 초안을 변경했다면 새 양식을 만들고 필요한 자료를 옮겨주세요. API 키 환경변수와 일치하는 값은 저장 시 기존 비밀정보 제거 규칙이 적용됩니다.
