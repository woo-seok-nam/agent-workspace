# 학교 FactChat에서 GPT Gemini Claude 사용하기

Agent Runtime 0.15.0은 학교 API 키 하나로 세 모델 계열을 선택한다. 학교 Gateway의 OpenAI 호환 Chat Completions 형식을 사용한다. Claude는 채팅, 역할 Agent, 도구 왕복, 기존 Runtime의 단계 실행, Workflow 초안 생성에서 선택 가능하다. 이 문서의 기능은 코드 구현 범위이며 모든 모델의 실제 계정 접근이나 기능 지원을 보장하지 않는다.

## 설정 순서

새 ZIP의 `agent-runtime` 폴더를 VS Code에서 연다. 기존 `.env`와 `.local`은 보관하고, 새 `.env.example`을 참고해 설정한다. 이미 사용 중인 `.env`를 복사 명령으로 덮어쓰지 않는다.

```dotenv
AI_BACKEND=factchat
FACTCHAT_API_KEY=학교에서_발급한_키
FACTCHAT_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway

OPENAI_MODEL=
GEMINI_MODEL=
CLAUDE_MODEL=

WORKFLOW_PROVIDER=openai
WORKFLOW_MODEL=
```

키를 넣은 후 모델 목록부터 확인한다. 모델 ID는 임의로 넣지 말고 학교 API가 반환한 `id`를 사용한다. 화면에 표시되는 모델 별칭이 API ID와 같다고 가정하지 않는다.

```powershell
npm.cmd ci
npm.cmd run models
```

모델 목록의 `provider`와 `id`를 보고 필요한 `OPENAI_MODEL`, `GEMINI_MODEL`, `CLAUDE_MODEL`을 채운다. 세 모델을 동시에 사용할 필요가 없으면 사용할 모델만 채워도 된다. `models`는 생성 요청을 보내지 않고 모델 목록을 조회한다.

```powershell
npm.cmd run doctor
```

`doctor`는 설정 형식과 값의 존재만 검사한다. 실제 인증·계정 권한·모델 기능까지 확인하는 명령은 아니다.

## 각각의 모델 호출

다음 명령은 실제 모델을 호출하므로 학교 계정 사용량이 발생할 수 있다.

```powershell
npm.cmd run chat -- openai "안녕, 한 문장으로 답해줘"
npm.cmd run chat -- gemini "안녕, 한 문장으로 답해줘"
npm.cmd run chat -- claude "안녕, 한 문장으로 답해줘"
```

역할 Agent와 도구 호출도 같은 공급자 이름을 사용한다. 도구 호출은 선택 모델이 해당 기능을 지원해야 한다.

```powershell
npm.cmd run agent -- claude reviewer "이 개발 계획에서 빠진 부분을 찾아줘: 요구사항 정리 후 구현"
npm.cmd run tools -- claude reviewer "안녕 세상의 글자 수를 도구로 확인해줘"
```

## Workflow 생성 모델 선택

세 가지 중 하나를 `WORKFLOW_PROVIDER`로 지정한다. 기본은 `openai`다.

```dotenv
WORKFLOW_PROVIDER=claude
WORKFLOW_MODEL=
```

이 경우 `CLAUDE_MODEL`을 사용한다. `WORKFLOW_MODEL`에 값이 있으면 해당 값을 우선하므로, 공급자를 바꿀 때 남아 있는 이전 모델 ID도 확인한다.

```powershell
npm.cmd run generate -- --request "기획안 세 개를 비교하고 추천 보고서를 만드는 절차를 만들어줘. 첨부 자료만 사용해." --no-search
```

생성기는 Gateway의 `response_format.json_schema`를 요청한다. 해당 모델이 Structured Outputs를 지원하지 않으면 오류를 표시한다. 일반 텍스트 출력으로 몰래 바꾸거나 다른 공급자·모델로 자동 대체하지 않는다. 생성 그래프는 여전히 순차 초안이며 자동으로 실행하지 않는다.

학교 Gateway를 쓰는 생성기 CLI는 호출당 출력 토큰 기본값을 16384로 사용한다. `--max-output-tokens`로 조정할 수 있다. 내부 추론 토큰을 같은 예산에서 소비하는 모델이 있으므로 출력 잘림이나 빈 응답이 나타나면 모델 지원과 한도를 확인한다. 일반 채팅·역할 Agent·도구 호출도 학교 모드에서 16384를 사용한다. 실제 소모량은 응답에 따라 다르다.

## 기존 Runtime에서 Claude 단계 사용

실행용 Workflow JSON의 원하는 작업에 `"provider": "claude"`를 지정하면 `CLAUDE_MODEL`을 사용한다. `npm run workflow`는 기존 `workflows/content.json`을 사용하고, `--with-tools`와 `--with-review`는 각각의 기존 정의 파일을 사용한다. 생성된 nodes/ports/edges JSON과 실행용 steps JSON은 아직 자동 변환하지 않는다.

```json
{"id":"draft","agent":"writer","provider":"claude"}
```

세 공급자를 섞은 실행과 SQLite 저장·조회 및 IPC 계약을 모의 응답으로 테스트했다. 새 Claude 실행 기록은 Claude를 모르는 0.14.0 이하 프로그램으로 읽지 않는다. 기존 OpenAI/Gemini 기록은 새 버전에서 계속 읽을 수 있다.

## 연결 방식과 키 우선순위

- `AI_BACKEND=factchat`: 반드시 `FACTCHAT_API_KEY`를 사용한다. 이 키가 없으면 중단한다. 본사 키로 대신 호출하지 않는다.
- `AI_BACKEND=direct`: 이전 OpenAI/Gemini 본사 연결을 사용한다. 각각의 본사 키가 필요하다. Claude 본사 네이티브 연결은 이번 범위에 포함하지 않는다.
- `AI_BACKEND` 생략: FactChat 키 또는 주소가 있으면 factchat, 둘 다 없으면 이전 버전 호환을 위해 direct.
- 이전에 예시로 안내한 `OPENAI_BASE_URL`은 사용하지 않는다. 학교 연결은 `FACTCHAT_BASE_URL`로 통일했다.
- 기본 주소는 `https://factchat-cloud.mindlogic.ai/v1/gateway`다. 채팅 페이지 링크나 끝에 `/chat/completions`가 이미 붙은 주소를 넣지 않는다.
- 팩트챗 채팅 화면에서 선택해 둔 모델과 설정된 챗봇 지식은 이 코드로 자동 전달되지 않는다. 모델 API 직접 호출이며 특정 채팅방/챗봇 실행은 아니다.

## 검증 범위

모의 HTTP로 세 모델의 요청 경로, 학교 키 공유, 모델 선택, 정상/거절/불완전 응답, 도구 결과 연결, Structured Output 요청, 사용량 정규화, 취소, Runtime·SQLite·IPC를 검사한다. 실제 학교 API 키가 없어 계정 인증과 실모델 품질은 테스트하지 않았다. 조직에서 활성화한 모델과 기능은 `models` 조회와 실제 호출로 확인해야 한다.

모델별 기능 차이로 HTTP 400이 나오면 모델 ID와 Structured Outputs/도구 지원 여부를 확인한다. Chat Completions 미지원 Responses 전용 모델은 이 학교 통합 경로에서 사용할 수 없다. 필요하면 이후 Responses 경로를 선택하는 옵션을 별도로 추가한다.

## 공식 문서

- https://docs.mindlogic.ai/docs/dcu-ac/api-gateway/getting-started/overview
- https://docs.mindlogic.ai/docs/dcu-ac/api-gateway/reference/chat-completions
- https://docs.mindlogic.ai/docs/dcu-ac/api-gateway/getting-started/models

확인일 2026-11-19. 계정별로 활성화된 모델과 기능이 다를 수 있다.
