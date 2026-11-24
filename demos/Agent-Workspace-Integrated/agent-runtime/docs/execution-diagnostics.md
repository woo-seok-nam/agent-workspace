# v0.17.1 실행 실패 진단

MODEL_OR_OUTPUT_ERROR로 묶이던 실패를 모델 호출, JSON 구문, 출력 스키마 단계로 구분합니다. execution.json의 diagnostic에 실패 node_id, phase, 안내 message, 스키마 위반 경로와 코드가 저장됩니다. 공급자 응답 원문과 인증 헤더는 저장하지 않습니다.

API_HTTP_401/403: 키·권한, API_HTTP_429: 한도·잔액, API_HTTP_400/404: 모델·API 지원 여부, API_TIMEOUT: 60초 요청 제한, MODEL_CONFIG_ERROR: 설정, MODEL_INVALID_JSON: JSON 구문, MODEL_OUTPUT_SCHEMA_INVALID: 포트·값 자료형·검토 상태 오류입니다.

단일 JSON 코드블록은 감싸는 표식만 제거하고 파싱합니다. 설명문에서 JSON 일부를 추측해 추출하지 않습니다. 결과 예시를 프롬프트에 추가했습니다. 자동 실행 재시도는 하지 않습니다.

TypeScript 검사와 실행 관련 테스트 20개 통과. 사용자 화면의 기존 오류는 원인 정보가 없어 특정 원인으로 확정할 수 없습니다. 수정본을 같은 명령으로 실행하면 구분된 오류를 확인할 수 있습니다. 실제 학교 API 재현은 개발 환경에서 수행하지 않았습니다.

기존 폴더의 내용물을 덮어쓰고 .env를 유지하세요. 새 의존성은 없습니다.

## v0.17.2 일반 작업 verdict 처리
일반 작업은 verdict를 실행 판정에 사용하지 않으므로 누락 또는 임의 값이 와도 내부 기록에서 null로 정규화합니다. outputs의 필수 포트와 문자열 자료형은 계속 검사합니다. 최종 검토에서는 verdict=pass 또는 needs_revision만 허용하며 누락·null·다른 값은 실패합니다. needs_revision 또는 미해결 issues는 기존대로 needs_review로 중단합니다.
TypeScript 검사 및 실행 관련 테스트 22개 통과. 실제 학교 API 재실행은 사용자 환경에서 필요합니다.
