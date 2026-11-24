# 학교 Gateway 및 Claude 지원 검증

버전 0.15.0, 검증일 2026-11-19, Linux / Node.js 24.22.3.

- TypeScript 검사 통과.
- 전체 테스트 156개 통과, 실패 0개. 학교 Gateway 추가 테스트 18개 포함.
- 세 공급자의 채팅·역할 Agent·도구 왕복·Workflow 생성 요청을 모의 HTTP로 검사.
- 학교 Gateway 주소와 Bearer 인증, 모델 ID 선택, strict JSON Schema 요청 확인.
- 거절·잘림·빈 응답·잘못된 설정을 실패 처리하고 본사 API 자동 대체를 하지 않음.
- Claude를 포함한 실행 Workflow의 SQLite 저장·조회, Sidecar IPC 계약 확인.
- API 키를 출력하지 않는 학교 모드 doctor 및 키 누락 모델 조회 중단을 CLI에서 확인.
- 기존 Claude 거부 테스트의 잘못된 공급자 예시는 unsupported로 변경. 실제 Claude 허용 경로는 새 테스트에서 확인.
- 기존 생성기의 보정 데모 재확인.

실제 학교 API 키가 없어 인증·모델 가용성·실모델 Structured Outputs/도구 호출 지원과 결과 품질은 미검증이다. 사용자 환경에서 models 조회와 최소 채팅 호출부터 확인한다.
