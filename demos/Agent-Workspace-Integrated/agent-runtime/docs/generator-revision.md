# 실행 전 초안 수정 (v0.30.0)

미리보기에서 확인한 계획을 자연어로 수정하고 새 생성 기록으로 저장합니다. 실제 작업을 수행하는 execute --revise와 다릅니다.

```powershell
npm.cmd run generate -- --revise examples/execution/record.json --feedback "비교와 보고서 작성 단계를 분리하고 각 단계의 완료 기준을 구체화해줘"
```

실제 초안에는 --revise 뒤를 `.local/generations/ID/record.json` 또는 `.local/evaluations/평가ID/clear-1/record.json`으로 바꾸세요. draft로 검증되는 기록만 받습니다. response.json 단독은 지원하지 않습니다. --feedback은 1~2,000자입니다. 실제 AI API를 호출하며 기본 한도는 최초 생성+구조 보정2회+API 재시도1회입니다. --max-repairs 등 기존 생성 한도 옵션을 사용할 수 있습니다.

원래 요청·정책·목적·산출물과 초안의 요구사항을 보존합니다. 수정 지시도 명시적 조건으로 추가하여 실제 작업과 최종 검토에 연결되는지 검사합니다. 이전 초안은 request.draft_revision.previous_draft로 전달되며, 새 기록은 별도 UUID 폴더에 저장됩니다. 이전 파일은 바뀌지 않습니다. 원본에 run_id가 있으면 source_run_id로 추적하고 예제처럼 없는 경우 null입니다. 재수정 시 직전 초안만 보관하여 스냅샷이 재귀적으로 중첩되지 않습니다.

새 record.json의 revision_changes는 이전 초안과 달라진 JSON 경로를 최대100개 기록합니다. 이는 수정 지시가 의미상 제대로 반영됐다는 인증이 아닙니다. 결과가 draft이면 새 기록으로 preview:generation을 실행하고 변경 내용을 확인하세요. 노드/입력 포트 변경이 있을 수 있으므로 기존 files.json을 그대로 재사용하기 전에 prepare:execution으로 새 입력 양식을 확인하세요.

목적·산출물 변경이나 기존 확정 조건의 완화/삭제는 이 명령의 범위가 아닙니다. 충돌하면 needs_clarification으로 질문하도록 요청하며, 목적·산출물·필수 조건 변경은 검증에서 차단합니다. 이런 변경이 필요하면 --request 또는 --input으로 새 요청을 생성하세요. needs_clarification 결과의 질문 답변은 기존 --resume ... --answer ... 방식으로 이어갈 수 있으나, 기존 조건 삭제가 자동 승인되는 것은 아닙니다.

실행 가능성과 내용 적절성은 별도 확인 대상입니다. 긴 초안은 기존 문맥 한도를 초과하면 잘라 보내지 않고 호출 전에 중단합니다. 도구·사람 작업 제약, 검색 정책, 원문 검토 연결 검사도 유지됩니다. 이번 버전은 로컬 고정 응답 테스트로 검증했으며 학교 AI의 실제 수정 응답 품질은 --revise 실행 결과로 확인해야 합니다.

## v0.31.0 변경 비교 자동 저장

--revise 결과가 draft 또는 needs_clarification으로 검증에 통과하면 같은 생성 폴더에 changes.md(변경 전후), changes.json(변경 항목과 개수), preview.md(전체 미리보기)를 추가합니다. 기존 revision_changes 경로 목록도 유지합니다.

Node ID, Port 이름, Edge 연결을 기준으로 비교하므로 배열 순서만 바뀐 경우 차이로 세지 않습니다. 단계 ID가 바뀌면 삭제+추가로 표시합니다. 요구사항과 완료 기준 같은 텍스트 목록 순서는 그대로 비교합니다. 개수는 단계 수가 아닌 변경 항목 수입니다.

실패한 후보는 비교 문서를 생성하지 않습니다. needs_clarification의 workflow=null에 따른 삭제 표시는 새 계획이 미확정이라는 뜻이며 실제 작업 삭제 명령이 아닙니다. 변경 비교는 요청 반영 여부나 승인을 자동 판정하지 않습니다. 문서를 수정해도 실행 초안은 바뀌지 않습니다.

v0.30.0 수정 기록도 preview:generation --record 수정본/record.json으로 열면 새 미리보기 폴더에 changes.md를 함께 생성합니다. 일반 생성 기록은 미리보기만 생성합니다. 비교와 미리보기에는 API를 호출하지 않고 기존 기록을 수정하지 않습니다.
