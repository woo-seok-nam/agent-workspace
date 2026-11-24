# v0.21.0 — 생성 Workflow 실행 재개

## 지원 범위
v0.21.0 이후 생성된 execution.json 중 running, failed, cancelled 상태를 재개합니다. 기존 워크플로우와 입력 텍스트, 수정 한도를 snapshot에 저장합니다. 저장된 결과들을 동일 실행기로 재검증하고, 완료된 작업 결과를 재사용하여 미완료 작업부터 모델을 호출합니다. 기존 파일과 기록은 덮어쓰지 않고 새 실행 ID를 만들며 resumed_from으로 연결합니다.

completed 또는 needs_review는 재개 대상이 아닙니다. 검토 보류는 실패가 아니며 수정 한도를 임의로 초기화하지 않습니다. 이전 버전 기록은 원본 스냅샷이 없으므로 재개할 수 없습니다.

## 설치
기존 agent-runtime에 덮어쓰고 .env와 node_modules를 유지합니다. 새 의존성은 없습니다. 새 폴더 설치는 npm.cmd ci 후 .env를 설정합니다.

## 새 실행
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json --max-revisions 2
```

## 중단한 실행 재개
```powershell
npm.cmd run execute -- --resume ".local/executions/실행ID/execution.json"
```
실행ID는 실제 기록 폴더명으로 바꿉니다. --record, --inputs, --input-files, --max-revisions는 --resume과 함께 사용할 수 없습니다. 입력 파일을 다시 읽지 않고 기록 속 snapshot.inputs를 사용하므로 파일을 편집해도 재개 입력은 바뀌지 않습니다. 입력을 바꾸려면 새 실행을 시작하세요.

현재 .env의 공급자·모델 설정을 사용합니다. 이전 실행과 같은 모델을 사용하려면 설정을 유지하세요. 재개마다 전체 5분 시간 제한은 새로 적용하지만, 이전 수정 회차는 그대로 복원합니다. 재개 시 현재 원본 프로세스는 종료되어 있어야 합니다. running 상태는 마지막 기록일 뿐 실행 중인 프로세스를 자동 탐지하거나 종료하지 않습니다.

새 AI 호출만 사용량이 발생합니다. 예를 들어 최초 5단계 중 2개 완료 후 실패했다면 2개 결과를 재사용하고 남은 3개를 호출합니다. 서버에서 응답이 생성됐어도 클라이언트에 저장되지 않은 작업은 다시 호출될 수 있습니다.

## 저장 내용과 결과
- snapshot: 실행에 사용한 생성 기록, 입력 텍스트, 수정 한도
- resumed_from: 이전 실행 ID
- reused_steps: 재사용한 작업 시도 수
- steps/attempt: 이전 결과를 포함한 전체 작업 시도 기록
- 새 폴더의 execution.json은 작업마다 저장하며 완료 시 report.md와 output.json을 생성
- 원본 자료의 sources.json은 이전 실행 폴더에 보존; 재개 폴더에 복제하지 않음

snapshot은 원본 자료 본문을 포함합니다. API 키 값은 기존 저장 경로에서 마스킹합니다. 기록은 최대 2MB 파일 읽기 제한을 적용합니다. 기록을 편집하거나 결과 포트·단계 순서가 호환되지 않으면 새 호출 전에 차단합니다. 이 구조 검사는 악의적인 변조에 대한 서명 검증이 아닙니다.

## 검증
TypeScript 검사 및 실행 관련 테스트 47개 통과. 결과 재사용, 원본 기록 불변, 저장 입력 사용, 수정 한도 복원, 잘못된 순서/포트 차단, 이전 버전 거부, 검토 직후 중단한 기록의 무호출 완료, 취소를 확인했습니다. 실제 학교 API 및 Windows 강제 종료·재개를 직접 검증하지 않았습니다.

주요 변경 파일: src/execution/resume.ts, src/execution/run.ts, src/execution/cli.ts, tests/execution-resume.test.ts.
