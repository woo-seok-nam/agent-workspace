# v0.15.1 — 원본 입력 검토 보장

사용자 지정 기준 우선, 자료 속 명령 무시, 충돌 기록을 생성 프롬프트에 반영했습니다.
최종 검토는 Input의 모든 출력 포트를 직접 입력받아야 합니다. 자료 유무를 자연어 키워드로 추측하지 않고 모든 원본 입력(사용자 조건 포함)에 동일하게 적용합니다. 필수 여부, 타입, 내부 필드를 보존해야 합니다. 직전 작업 결과도 별도 필수 입력으로 받습니다.

연결 누락은 REVIEW_ORIGINAL_INPUT_MISSING, 직전 결과 누락은 REVIEW_RESULT_MISSING 오류입니다. 기존 보정 루프가 오류를 모델에 전달하며 기본 최대 2회 보정합니다. 한도 초과 시 failed로 종료합니다. 모델 출력 그래프를 임의로 패치하지 않습니다.

이 검사는 데이터 전달 구조를 보장합니다. 실제 원문 내용, 평가 기준의 의미 준수, 실행 결과의 정확성을 보증하지 않습니다. 원본 분량에 따른 실행 문맥 예산 및 파일 판독은 실행기 연동 시 처리해야 합니다. 현재 generate는 워크플로우 초안만 생성합니다.

## 설치
기존 agent-runtime 폴더에 ZIP의 agent-runtime 내용물을 덮어씁니다. 사용자 .env 및 .local 기록은 배포에 포함되지 않습니다. 별도 파일에 수정해둔 코드는 먼저 보관하세요.

PowerShell:
```powershell
cd "C:\Users\usuk1\Desktop\학교\Agent Orchestration\dev\agent-runtime"
npm.cmd run check
npm.cmd run generate -- --request "기획안 A·B·C를 개발 난이도, 사용자 가치, 차별성으로 비교하고 추천 보고서를 작성하는 절차를 만들어줘. 첨부 자료만 사용해." --no-search
```

주요 변경 파일: src/generator/prompt.ts, src/generator/validate.ts, tests/generator.test.ts.
프롬프트 버전 workflow-generator-0.1.1. 응답 스키마 0.1 유지.

## 검증 결과
TypeScript 검사 통과. 전체 자동 테스트 162개 통과(생성기 37개, 신규 회귀 테스트 6개). 사용자가 제공한 response(2).json은 새 검증에서 REVIEW_ORIGINAL_INPUT_MISSING으로 차단됨을 확인했습니다. 이번 변경의 실제 학교 API 호출은 수행하지 않았습니다.
