# v0.16.0 — 생성된 Workflow 실행

텍스트 포트로 연결된 순차 Workflow의 작업을 학교 AI API로 실제 실행합니다. 생성기의 record.json(request, response, outcome=draft)을 입력받아 최신 검증을 통과한 그래프만 실행합니다. 기존 steps 기반 LangGraph 실행기와 별도의 첫 통합 경로입니다. SQLite 체크포인트·중단 후 재개·부분 재실행은 이 경로에 아직 없습니다.

## 설치와 바로 실행
ZIP의 agent-runtime 내용물을 기존 폴더에 덮어쓰고 .env를 유지합니다. 새 의존성은 없습니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --inputs examples/execution/inputs.json
```
이 명령은 가상 기획안으로 실제 API를 호출하므로 사용량이 발생합니다. 학교 계정 연결은 기존 .env의 WORKFLOW_PROVIDER, WORKFLOW_MODEL 및 FACTCHAT_API_KEY 설정을 사용합니다. 예시 workflow는 고정 fixture이며 실제 모델 생성 품질을 증명하지 않습니다.

## 본인 생성 결과 실행
```powershell
npm.cmd run execute -- --record ".local/generations/실행폴더ID/record.json" --inputs inputs.json
```
inputs.json에는 Input 노드 output_ports의 이름을 키로, 실제 자료 텍스트를 값으로 넣습니다. 예를 들어 포트가 source_materials 하나이면:
```json
{"source_materials":"기획안 A: ...\n기획안 B: ...\n기획안 C: ..."}
```
원본 텍스트는 AI API에 전달됩니다. source_materials 같은 포트 이름을 하드코딩하지 않고 edges의 실제 포트를 따라 데이터를 전달합니다.

## 결과와 실패
.local/executions/실행ID/execution.json에 완료 단계와 상태를 저장합니다. completed인 경우에만 output.json을 저장합니다. 최종 검토가 needs_revision이거나 미해결 문제를 반환하면 needs_review로 멈춥니다. 검토 초안은 execution.json의 마지막 steps.outputs에서 확인할 수 있습니다. LLM 자체 검토 통과는 사람의 승인이나 사실 정확성 보증을 뜻하지 않습니다.

text 포트만 지원합니다. 도구 호출·파일 판독·object/table/file_ref 포트는 호출 전에 거부합니다. 단계 프롬프트 10,000 UTF-16 단위 제한, 전체 5분 제한, Ctrl+C 취소를 적용합니다. 입력이나 출력이 크면 자동으로 잘라내지 않고 실패합니다. 재시도 및 결과 보정은 이 실행 경로에 아직 없으며, malformed JSON·필수 출력 누락은 중단합니다. 다음 실행은 전체를 새로 시작합니다.

## 변경 파일
src/execution/run.ts, src/execution/cli.ts, tests/execution.test.ts, examples/execution/.

## 검증
TypeScript 검사 및 전체 자동 테스트 171개 통과. 신규 실행기 테스트 9개 포함. CLI 도움말 실행 확인. 이번 실행기의 실제 학교 API 호출은 개발 환경에서 수행하지 않았습니다.
