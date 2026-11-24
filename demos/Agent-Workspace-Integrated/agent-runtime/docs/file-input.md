# v0.17.0 — TXT/Markdown 자료 입력과 보고서 파일

## 바로 실행
기존 agent-runtime에 배포 내용물을 덮어쓰고 .env를 유지합니다. 새 의존성은 없습니다.
```powershell
cd "C:\Users\usuk1\Desktop\학교\Agent Orchestration\dev\agent-runtime"
npm.cmd run execute -- --record examples/execution/record.json --input-files examples/execution/files.json
```
포함된 예시는 가상 기획안이며 학교 AI API를 실제 호출합니다. 텍스트 자료 내용과 파일명은 모델에 전달됩니다. API 설정은 이전 .env를 그대로 사용합니다.

## 본인 자료 연결
`files.json`의 키는 실행할 workflow의 Input 노드 output_ports 이름과 일치해야 합니다. 값은 해당 포트에 넣을 파일 경로 배열입니다. 각 경로는 터미널 위치가 아니라 files.json의 폴더 기준입니다. 절대 경로도 지원합니다.
```json
{"source_materials": ["자료/A.txt", "자료/B.md", "자료/C.md"]}
```
```powershell
npm.cmd run execute -- --record ".local/generations/실행폴더ID/record.json" --input-files files.json
```
포트 이름이 proposals이면 source_materials 대신 proposals를 사용합니다. `--inputs`로 다른 포트의 텍스트를 추가할 수 있으나 같은 포트를 두 방식에 중복 지정하면 실패합니다. JSON 경로의 역슬래시는 이중으로 쓰거나 `/`를 사용하세요.

## 결과
완료 시 `.local/executions/실행ID/`에 다음 파일을 저장합니다.
- execution.json: 단계별 결과와 상태
- output.json: 최종 출력 포트별 결과
- report.md: 바로 읽을 수 있는 최종 보고서
- sources.json: source_id, 원래 파일명, 연결 포트, SHA-256, 바이트 수, 줄 수

검토 보류 또는 실행 실패 시 최종 report.md/output.json은 생성하지 않습니다. 검토 초안과 중간 결과는 execution.json에서 확인합니다. 입력 파일 자체는 수정하지 않습니다.

파일 본문에 source_id 및 L1, L2 형태의 줄 번호를 붙여 전달합니다. 모델은 해당 위치를 인용하도록 지시받지만 인용의 의미적 정확성을 자동 보증하지는 않습니다. sources.json의 해시는 실제 입력 파일 바이트 기준입니다.

## 지원 범위
UTF-8 TXT/MD만 지원합니다. PDF, Word, 이미지/OCR은 아직 지원하지 않습니다. 등록 도구를 모델이 호출하는 방식이 아니라 실행 전 파일을 읽어 text 포트에 넣는 방식입니다. 파일 경로는 사용자가 files.json에 직접 지정합니다.

파일당 64,000바이트, 전체 256,000바이트, 최대 20개, 포트별 출처 표기 포함 20,000자 제한입니다. 기존 단계 프롬프트 10,000 UTF-16 단위 제한도 적용되므로 실제 허용 분량은 작업 지시문과 중간 결과 크기에 따라 더 작습니다. 제한 초과 시 내용을 자르거나 요약하지 않고 중단합니다. 긴 문서 분할·검색은 후속 범위입니다.

## 주요 파일
src/execution/files.ts: 자료 로드 및 출처 구성
src/execution/report.ts: Markdown 생성 및 키 마스킹
src/execution/cli.ts: --input-files 및 결과 저장
examples/execution/files.json: 파일 연결 설정
examples/execution/materials/: 가상 자료
