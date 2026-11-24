# v0.18.0 — 검토 의견 기반 수정과 재검토

최종 검토가 needs_revision을 반환하거나 issues가 남으면 직전 작성 작업을 재호출하고 최종 검토를 다시 수행합니다. 기본 최대 수정 2회, 옵션 범위 0~3회입니다. 초안 생성기의 구조 보정과는 별개입니다.

## 실행
기존 agent-runtime 폴더에 배포 내용을 덮어쓰고 .env, node_modules를 유지합니다. 새 의존성은 없습니다. 새 폴더 설치라면 npm.cmd ci 및 .env 설정이 필요합니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json --max-revisions 2
```
`--max-revisions 0`은 첫 검토에서 수정 필요일 때 즉시 보류하는 기존 방식입니다. `--max-revisions` 생략 시 2를 사용합니다.

## 동작
- 일반 작업은 기존 순서대로 실행합니다.
- 최종 검토가 보류하면 직전 일반 작업에 이전 산출물, issues, 원본 입력을 전달합니다.
- 수정 시 낡은 중간 요약을 중복 전송하지 않습니다. 원본 및 이전 초안을 바탕으로 전체 수정본을 요구합니다.
- 재검토는 수정된 산출물과 원본 입력을 받습니다. pass 및 빈 issues일 때만 최종 출력으로 진행합니다.
- 최종 검토가 pass를 반환할 때 outputs에 검토 의견이 아니라 전체 검토본을 담도록 프롬프트를 보강했습니다. 실제 내용의 적절성을 자동 보증하지는 않습니다.
- 수정 상한 후에도 미해결이면 needs_review. API·JSON·취소 오류는 failed/cancelled로 구분합니다.
- execution.json에 revisions와 각 steps의 attempt, outputs, verdict, issues를 누적 보존합니다. completed일 때만 report.md와 output.json을 생성합니다.

예제는 최초 5개 AI 작업, 수정 1회당 작성·검토 2개 호출이 추가됩니다. 기본 최대 9개 호출이며 실제 API 사용량이 증가합니다. 기존 전체 5분 및 단계당 10,000 UTF-16 단위 문맥 제한을 유지합니다. 초과 시 원본을 자르지 않고 중단합니다.

## 범위와 제한
원본 그래프에 순환 edge를 추가하는 기능이 아닙니다. 실행기가 마지막 작성·검토 쌍만 제한적으로 반복합니다. 이전 조사·비교 단계부터의 의존성 기반 재실행, 사람 승인, 저장된 보류 실행 재개는 아직 이 경로에서 지원하지 않습니다. 이 명령은 새 실행으로 시작합니다.

## 검증
TypeScript 검사와 실행 관련 테스트 27개 통과. 수정 후 통과, 반복 보류 상한, 수정 비활성화, 수정 중 취소·실패, 잘못된 한도를 검증했습니다. 사용자가 제공한 기존 실행 기록을 초기 모의 응답으로 재생해 7회 호출 흐름 및 최대 프롬프트 6,001자를 확인했습니다. 이는 수정 보고서의 의미적 품질이나 실제 학교 API 성공을 검증한 결과가 아닙니다.

주요 변경: src/execution/run.ts, src/execution/cli.ts, tests/execution.test.ts.
