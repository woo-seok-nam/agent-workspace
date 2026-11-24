# v0.22.0 — 사용자 피드백에 따른 보류 결과 수정

v0.21.0 이후 생성된 snapshot이 있는 needs_review 기록을 대상으로 합니다. 원본 입력, 마지막 작성 결과, 최종 검토 issues를 재사용해 새 수정·검토 Workflow를 만듭니다. 이전 비교·조사 작업을 전부 재실행하지 않습니다.

## 설치와 실행
기존 agent-runtime 내용물을 덮어쓰고 .env, node_modules를 유지합니다. 새 의존성은 없습니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --revise ".local/executions/실행ID/execution.json" --feedback "B와 C의 원문에 있는 특징을 비교표에 반영하고 추천 유보는 유지해. 인용은 실제 파일과 줄 번호로 정리해." --max-revisions 2
```
실행ID를 실제 폴더명으로 바꿉니다. --revise는 --record, --resume, --inputs, --input-files와 함께 사용할 수 없습니다. --feedback은 1~2,000자입니다. 파일을 다시 읽지 않고 이전 snapshot의 원본을 사용합니다. 추가 자료 투입·요구사항 전체 교체는 새 실행을 사용하세요.

## 동작
1. 과거 실행을 API 호출 없이 재검증해 보류 상태와 결과 형식을 확인합니다.
2. 원본 입력과 이전 초안·검토 의견을 받아 전체 수정본을 작성합니다.
3. 최종 검토는 원본·새 수정본·사용자 지시를 대조합니다. 검토 통과 시 전체 검토본을 출력합니다.
4. 문제 지속 시 기존 자동 수정 로직을 적용합니다. 기본 최대 2회 추가 수정이며 이후 needs_review로 보류합니다.

기본 최초 작성·검토 2회, 자동 수정마다 2회 추가하므로 최대 6개 AI 호출입니다. 새 실행이므로 API 사용량이 발생합니다. 별도 실행 폴더에 revised_from, user_feedback과 작업·검토 기록을 남깁니다. 이전 기록은 수정하지 않습니다. 완료 시 report.md/output.json, 보류 시 draft.md/review.md를 생성합니다.

사용자 지시는 기존 요구사항에 추가됩니다. 충돌하거나 자료 부족으로 해결할 수 없는 조건은 표시하도록 모델에 지시하지만 의미적 준수 여부를 코드로 보증하지는 않습니다. 사용자 지시가 자동 승인으로 처리되지는 않습니다. completed 기록을 수정하는 기능은 이번 범위에 없습니다.

새 수정 Workflow는 원본 입력을 JSON 문자열 묶음으로 전달합니다. 기존 포트별 20,000자 및 단계 프롬프트 10,000 UTF-16 단위 제한이 적용됩니다. 초과 시 내용을 임의로 자르지 않고 중단합니다. 여러 번 수정하면 이전 피드백과 입력 묶음이 누적될 수 있습니다. 긴 문서는 새로 자료 범위를 정리해 실행하세요.

## 검증
TypeScript 검사와 실행 관련 테스트 52개 통과. 원본·초안·검토 의견 전달, 사용자 요구사항 추가, 기존 기록 보존, 검토 보류 유지, 손상된 기록/빈 지시 차단 및 취소를 확인했습니다. 실제 학교 API에서 수정본의 품질은 검증하지 않았습니다.

주요 파일: src/execution/revise.ts, src/execution/cli.ts, src/execution/run.ts, tests/execution-revise.test.ts.
