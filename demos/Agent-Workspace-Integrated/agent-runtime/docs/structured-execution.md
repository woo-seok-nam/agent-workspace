# v0.19.0 — 실행 단계 Structured Output

생성기뿐 아니라 실행기의 각 작업도 API에 JSON Schema를 전달합니다. 스키마는 현재 노드의 output_ports에서 생성합니다. outputs에 실제 포트 이름과 문자열 타입을 정의하고 추가 필드를 금지합니다. 일반 작업 verdict는 null, 최종 검토 verdict는 pass/needs_revision만 요청합니다. 로컬 Zod 검증 및 검토 보류·수정 상한은 유지합니다.

학교 Gateway의 OpenAI/Gemini/Claude 요청 모두 Chat Completions response_format.json_schema(strict=true)를 사용합니다. OpenAI 본사 경로는 Responses text.format을 사용합니다. 본사 Gemini 구조화 실행은 아직 미지원이며 API 호출 전에 명시적으로 실패합니다. 일반 채팅은 기존 동작을 유지합니다.

## 설치 및 실행
기존 agent-runtime 폴더에 내용을 덮어쓰고 .env와 node_modules를 유지합니다. 새 의존성은 없습니다. 새 폴더라면 npm.cmd ci 후 .env를 준비합니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\캡스톤\Dev\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json --max-revisions 2
```
별도 스위치 없이 구조화 출력을 요청합니다. API 사용량이 발생합니다. 모델이 스키마 형식을 지원하지 않으면 HTTP 오류로 중단하며 일반 텍스트 방식으로 몰래 전환하지 않습니다. 기존 학교 모델에서 생성기의 strict schema가 동작했어도 실행 스키마의 실제 지원 여부는 별도 실행으로 확인해야 합니다.

## 계약
- API에는 optional 포트도 키를 요구하지만 빈 문자열을 허용합니다. required 포트는 비어 있으면 실패합니다.
- HTTP 응답의 상태, JSON 구문, 로컬 출력 계약을 계속 검사합니다.
- API 형식 제약은 사실 정확성·출처 타당성·최종 검토 판단을 보장하지 않습니다.
- 이전 버전과 같이 일반 작업 verdict가 다르게 반환되더라도 로컬에서는 사용하지 않고 null로 정규화합니다. 최종 검토 판정은 엄격합니다.

## 변경 파일
src/execution/schema.ts: 노드별 출력 스키마
src/execution/run.ts 및 cli.ts: 실행 호출에 스키마 전달
src/run.ts, src/types.ts: 선택적 responseSchema 계약
src/providers/factchat.ts, openai.ts: 공급자 요청에 스키마 반영

## 검증 범위
모의 HTTP 요청에서 학교 3개 공급자와 본사 OpenAI의 스키마 전달, 미지원 응답의 자동 다운그레이드 금지, 최종 검토 상태와 동적 출력 포트 구성을 테스트합니다. 개발 환경에서 실제 학교 API 호출은 수행하지 않았습니다.

TypeScript 검사 통과, 전체 자동 테스트 196개 통과(신규 구조화 실행 테스트 7개 포함).
