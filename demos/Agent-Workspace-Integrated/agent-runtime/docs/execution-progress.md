# v0.20.0 — 단계별 실행 기록과 검토 파일

실행 시작 시 기록 경로를 출력하고, AI 호출 직전 및 각 작업 완료 후 execution.json을 갱신합니다. status=running, current_node, updated_at을 통해 마지막 진행 상태를 확인할 수 있습니다. 수정 회차별 결과는 기존 steps/attempt로 누적됩니다.

임시 파일에 완전한 내용을 쓰고 flush한 후 대상 파일을 교체합니다. 저장 실패는 다음 AI 호출을 중단시킵니다. 강제 종료·정전 시 아직 저장되지 않은 응답은 유실될 수 있습니다. 강제 종료 후 running으로 남은 기록은 마지막 저장 상태이지, 현재 프로세스가 실행 중이라는 보장은 아닙니다. 운영체제 강제 종료나 전원 장애에 대한 완전한 복구 보장은 없습니다.

## 설치와 실행
기존 agent-runtime 폴더에 배포 파일을 덮어쓰고 .env, node_modules를 유지합니다. 새 의존성은 없습니다. 신규 설치는 npm.cmd ci와 .env 설정이 필요합니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json --max-revisions 2
```
실행 초기에 기록 경로가 표시되고 각 AI 호출에 작업 이름, ID, 수정 회차가 표시됩니다.

## 저장 파일
.local/executions/실행ID/ 아래:
- execution.json: 실행 중에도 갱신되는 단계별 기록
- sources.json: 원본 자료 식별 정보
- completed: output.json, report.md
- needs_review/failed/cancelled: 완료된 일반 작업이 있으면 draft.md, 완료된 검토가 있으면 review.md

보류·실패의 draft.md는 마지막 일반 작업 결과이며, 실패 시점에 따라 보고서 이전 단계의 결과일 수 있습니다. 각 파일 첫머리에 미완료 표시가 있습니다. review.md는 가장 최근 검토 의견과 미해결 목록이며 최종 보고서가 아닙니다. 실행 강제 종료 시 별도 Markdown 파일 생성까지 도달하지 못할 수 있으나, 마지막 execution.json에는 저장된 단계가 남습니다.

재개/resume은 아직 지원하지 않습니다. 같은 명령을 다시 실행하면 새로운 ID로 전체 작업을 시작합니다. 입력 원문과 워크플로우의 재개용 스냅샷은 이 기록에 포함하지 않습니다. 중간 결과와 파일 출처에는 사용자 자료가 포함될 수 있으며 API 키 값은 저장 시 마스킹합니다.

## 검증
TypeScript 검사 및 실행 관련 테스트 40개 통과. 저장 순서, 결과 누적, 모델 실패, 초기/단계 저장 실패 시 후속 호출 차단, 보류 파일 구분, 원자적 파일 교체와 임시파일 정리를 확인했습니다. 테스트는 개발 환경에서 수행했으며 실제 학교 API 호출과 Windows 강제 종료 복구를 직접 검증하지 않았습니다.

주요 변경: src/execution/store.ts, run.ts, cli.ts, report.ts 및 tests/execution-store.test.ts.
