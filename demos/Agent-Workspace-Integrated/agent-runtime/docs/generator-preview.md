# 생성 워크플로우 미리보기 (v0.29.0)

```powershell
npm.cmd run preview:generation -- --record examples/execution/record.json
```

실제 초안은 --record 뒤를 `.local/generations/ID/record.json` 또는 평가 폴더의 `clear-1/record.json`으로 바꾸세요. response.json 단독에는 요청·정책이 없으므로 지원하지 않습니다.

API를 호출하지 않고 새 `.local/previews/ID/preview.md`를 만듭니다. 터미널에 출력된 절대 경로를 VS Code로 열고 Ctrl+Shift+V로 Markdown 미리보기를 볼 수 있습니다. 각 실행은 다른 폴더에 저장하며 원본을 수정하지 않습니다.

문서는 다음을 보여줍니다.

- 요청, 목적, 예상 산출물, 요구사항, 설계 가정
- 필수/선택 입력과 자료형
- 배열 저장 순서가 아닌 실제 의존 관계에 따른 단계 순서
- 단계별 입력의 출처와 출력, 작업 지시, 완료 기준, 연결된 요구사항
- 모델 제안과 참고 자료 ID/위치의 구분, 단계의 설계 이유
- 사람 작업·도구·미분류 제약과 자료 입력 전 준비 검사

needs_clarification 기록은 질문을 표시하고 가상의 실행 순서를 만들지 않습니다. 잘못된 그래프나 기록 상태 불일치는 미리보기 생성 전에 거부합니다. 모델 텍스트의 Markdown/HTML 문법은 내용으로 표시합니다.

미리보기는 실행 전 계획이며 작업을 수행하거나 사용자 승인을 기록하지 않습니다. 내용상 적절성이나 참고 자료 적용 타당성은 사람이 확인해야 합니다. 준비 검사는 자료를 넣지 않은 상태이므로 MISSING_INPUT이 표시되는 것은 정상입니다. 자료를 채운 뒤 execute --check로 다시 확인하세요.

preview.md를 편집해도 실행 초안은 바뀌지 않습니다. 실행 내용을 수정하려면 생성 record.json의 response를 수정하고 다시 검증하거나 새로 생성해야 합니다. 입력 양식은 다음 명령으로 만들 수 있습니다.

```powershell
npm.cmd run prepare:execution -- --record examples/execution/record.json
```

두 명령에는 같은 생성 기록을 지정하세요. 아직 시각적 편집기나 승인/거절 UI를 제공하는 기능은 아닙니다.
