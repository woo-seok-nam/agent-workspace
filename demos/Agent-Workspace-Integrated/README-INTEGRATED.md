# Agent Workspace 통합 개발본

GitHub jtk745858/Agent-Workspace_User-Input의 e064a697fd11cb2e824f4833cfcf9e949583e93f 소스와 첨부 Agent_Runtime(2).zip의 Runtime 0.32.0을 결합했습니다. 원격 저장소에는 변경을 올리지 않았습니다.

## Windows CMD에서 처음 실행

1. ZIP을 `11-24` 폴더에 압축 해제합니다. `Agent-Workspace-Integrated` 폴더 안의 package.json과 agent-runtime 폴더가 같은 위치에 있어야 합니다.
2. 해당 폴더를 탐색기로 열고 주소창에 cmd를 입력합니다.
3. Node 24.x, Git, Rust/rustup, Visual Studio C++ 데스크톱 개발 도구 및 Windows SDK, WebView2가 필요합니다. Rust 버전은 rust-toolchain.toml의 1.99.1입니다.
4. 아래 명령을 순서대로 실행합니다. nvm 명령은 nvm-windows가 설치된 경우에만 사용합니다.

```cmd
nvm install 24
nvm use 24
node --version
npm install -g pnpm@10.34.9
pnpm install --frozen-lockfile --ignore-scripts
npm --prefix agent-runtime ci
pnpm build
pnpm tauri dev
```

Node는 v24.x여야 합니다. `nvm use 24`가 실패하면 `nvm list`에서 전체 버전 번호를 확인해 지정하세요. Node 24가 이미 활성화되어 있으면 nvm 명령은 생략합니다. 원본 UI의 Node 22 제한을 통합본에서는 Node 24로 변경했으며 이 버전에서 설치·빌드·프런트 테스트를 검증했습니다. 의존성/잠금 파일 버전은 유지했습니다.

기존 클론 폴더를 덮어쓰지 않고 통합본을 별도 폴더로 사용하는 것이 좋습니다. 원본 저장소의 scripts/dev-env.cmd 및 .cache/tauri.local.json은 작성자 PC 전용이므로 사용하지 않습니다. 설치/실행 시 오류가 나면 그 단계에서 멈추고 오류를 확인하세요.

## 화면 사용법

- 기본 `입력 수신 확인` 화면: 기존 입력 → Rust Core 수신 기능을 유지합니다.
- 상단 `AI 계획·실행`: 새로 추가한 계획/실행 화면입니다.
- 기본 `데모` 모드는 API 없이 고정된 예시 계획과 답변으로 연결을 검사합니다. 자유 입력에 맞춘 실제 AI 생성이 아닙니다.
- `계획 생성`을 누르면 Markdown 계획을 표시합니다. 아직 작업을 실행하지 않습니다.
- 필요한 추가 자료가 있으면 표시된 필수 입력란에 텍스트를 넣습니다.
- `이 계획으로 실행`을 누르면 저장된 계획을 실행하고 최종 검토 통과 시 답변을 표시합니다.
- 추가 질문이 나오면 질문의 답을 원래 요청에 포함하여 계획을 다시 생성합니다. 자동으로 실행하지 않습니다.
- 요청이나 모드를 바꾸면 이전 계획과 화면 결과를 초기화합니다. 저장된 파일은 유지합니다.
- 작업 중에는 같은 창의 중복 요청을 막습니다. 작업 제한은 약 5분이며 진행 중 앱을 열어 두세요. 취소/스트리밍 UI는 아직 없습니다.

## 실제 AI 설정

기존 키가 포함된 .env가 있다면 보존하고 agent-runtime/.env에 설정을 옮깁니다. .env와 API 키는 ZIP에 포함하지 않습니다.

통합본 최상위 CMD에서:

```cmd
cd agent-runtime
if not exist .env copy .env.example .env
notepad .env
```

학교 FactChat 설정 예:

```dotenv
AI_BACKEND=factchat
FACTCHAT_API_KEY=본인의_키
FACTCHAT_BASE_URL=https://factchat-cloud.mindlogic.ai/v1/gateway
OPENAI_MODEL=
GEMINI_MODEL=
CLAUDE_MODEL=
WORKFLOW_PROVIDER=openai
WORKFLOW_MODEL=
```

```cmd
npm run models
```

조회된 실제 모델 ID를 OPENAI_MODEL 등에 입력합니다. Claude 사용 시 CLAUDE_MODEL을 채우고 WORKFLOW_PROVIDER=claude로 지정합니다. 본사 API 직접 연결 등 자세한 설정은 agent-runtime/docs/factchat.md를 참고합니다.

```cmd
npm run doctor
cd ..
pnpm tauri dev
```

화면에서 `실제 AI`를 선택한 후 요청을 입력하세요. 계획과 실행 각각 API 사용량이 발생합니다. API 키는 React에 전달하지 않고 Node 프로세스에서 .env를 읽습니다. 계획 생성과 실행 사이에 모델 설정을 바꾸면 실행에는 변경한 설정이 적용됩니다.

## 저장 위치

- 계획: agent-runtime/.local/desktop-tasks/작업ID/plan.md
- 실행용 계획: 같은 폴더의 record.json
- 실행 기록: 같은 폴더의 runs/실행ID/execution.json
- 완료 답변: 실행 폴더의 answer.md
- 검토 보류: 실행 폴더의 draft.md, review.md (존재하는 경우)

plan.md만 수정해도 실행 계획이 바뀌지는 않습니다. 데모/실제 모드는 작업 기록에 묶여 있으며 실행 시 화면의 값으로 변경하지 않습니다. 기존 Runtime CLI와 .local/tasks 경로는 그대로 사용할 수 있습니다. 새 통합본의 기록/키를 이전 폴더로 자동 복사하지 않습니다.

## 연결 방식과 제한

React invoke(agent_task) → Rust command → Node 24 child process → task API → JSON 응답 → Markdown 화면.

이 버전은 **개발용 통합**입니다. 요청마다 Node 자식 프로세스를 실행하고 종료합니다. 기존 Runtime의 persistent IPC sidecar와 별개이며, 배포용 Node 번들/설치 프로그램/상시 sidecar 관리까지 구현한 것은 아닙니다. 컴파일 시 소스 디렉터리를 기준으로 Runtime을 찾으므로 ZIP을 풀어 놓은 원래 위치에서 pnpm tauri dev로 사용하세요. 앱 빌드 후 폴더를 옮기면 다시 빌드해야 합니다. 필요하면 앱 실행 전 `set "AGENT_NODE_PATH=C:\...\node.exe"`로 Node 24 실행 파일을 지정할 수 있습니다.

순차 텍스트 작업만 지원합니다. 웹 검색, 외부 도구 실행, PDF 출력은 기존 Runtime에서 지원하지 않으며 필요한 기능이 선언되면 준비 검사에서 차단될 수 있습니다. 기존 메뉴 중 샘플 워크스페이스 목록은 새 Runtime 실행 기록과 자동 동기화하지 않습니다. 브라우저의 pnpm dev는 화면 미리보기이며 Rust/AI 실행은 데스크톱 앱에서만 가능합니다.

## 검증

Node 24.22.3에서 프런트 빌드/테스트 및 Runtime 타입 검사·테스트, JSON stdin/stdout 자식 프로세스 흐름을 확인했습니다. 상세 수치는 VALIDATION.md에 기록합니다. 이 환경에는 Rust/Cargo 및 Windows GUI가 없어 새 Rust 연결의 컴파일·Windows 앱 실행은 확인하지 못했습니다. 실제 학교 API 키를 사용한 모델 호출도 미검증입니다.

## 변경 파일

- src/features/agent-task/AgentTaskPanel.tsx: 계획/추가 자료/실행/답변 UI
- src/app/App.tsx, src/styles/global.css: 화면 전환과 스타일
- src-tauri/src/agent_task.rs, src-tauri/src/lib.rs: Node 실행과 Tauri 명령 등록
- agent-runtime/src/task/desktop.ts, desktop-cli.ts: JSON 경계, 저장, 기존 task API 연결
- tests/agent-task.test.tsx, agent-runtime/tests/desktop.test.ts: 신규 연결 검사
- package.json, .nvmrc: Node 24 및 설치 보조 명령

기존 README는 원본 프로젝트의 과거 안내를 포함합니다. **통합본 실행은 이 문서를 우선**합니다.
