import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  BarChart3,
  Code2,
  FileText,
  Search,
} from "lucide-react";

interface QuickAction {
  label: string;

  prompt: string;

  icon: typeof Search;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label:
      "웹 검색",

    prompt:
      "웹에서 최신 정보를 조사하고 핵심 내용을 정리해줘.",

    icon:
      Search,
  },
  {
    label:
      "문서 분석",

    prompt:
      "문서를 분석하고 핵심 내용과 중요한 내용을 정리해줘.",

    icon:
      FileText,
  },
  {
    label:
      "데이터 분석",

    prompt:
      "데이터를 분석하고 주요 패턴과 인사이트를 정리해줘.",

    icon:
      BarChart3,
  },
  {
    label:
      "코드 작업",

    prompt:
      "코드를 분석하고 필요한 수정 사항을 찾아 개선해줘.",

    icon:
      Code2,
  },
];

export function GoalInput() {
  const navigate =
    useNavigate();

  const [
    prompt,
    setPrompt,
  ] =
    useState(
      "",
    );

  const handleSubmit =
    () => {
      const trimmedPrompt =
        prompt.trim();

      if (
        !trimmedPrompt
      ) {
        return;
      }

      navigate(
        "/workflows/recommend",
        {
          state: {
            prompt:
              trimmedPrompt,
          },
        },
      );
    };

  const handleQuickAction = (
    quickPrompt: string,
  ) => {
    setPrompt(
      quickPrompt,
    );
  };

  const canSubmit =
    prompt.trim().length >
    0;

  return (
    <section className="goal-input">
      <textarea
        className="goal-input__textarea"
        value={
          prompt
        }
        placeholder="하고 싶은 작업을 자연어로 입력하세요. 예: 경쟁사 AI Agent 플랫폼을 조사하고 비교 보고서를 작성해줘."
        aria-label="작업 목표"
        onChange={(
          event,
        ) => {
          setPrompt(
            event.target.value,
          );
        }}
        onKeyDown={(
          event,
        ) => {
          /*
           * 한글 등 IME 입력 조합 중 Enter가
           * submit으로 처리되는 것을 방지한다.
           */
          if (
            event.nativeEvent
              .isComposing
          ) {
            return;
          }

          /*
           * Shift + Enter
           * → textarea 기본 동작 유지
           * → 줄바꿈
           */
          if (
            event.key ===
              "Enter" &&
            event.shiftKey
          ) {
            return;
          }

          /*
           * Enter
           * → 기본 줄바꿈 방지
           * → 작업 목표 제출
           */
          if (
            event.key ===
            "Enter"
          ) {
            event.preventDefault();

            handleSubmit();
          }
        }}
      />

      <div className="goal-input__footer">
        <div className="goal-input__actions">
          {QUICK_ACTIONS.map(
            (
              action,
            ) => {
              const Icon =
                action.icon;

              return (
                <button
                  key={
                    action.label
                  }
                  type="button"
                  className="quick-action"
                  title={`${action.label} 예시 입력`}
                  onClick={() => {
                    handleQuickAction(
                      action.prompt,
                    );
                  }}
                >
                  <Icon
                    size={14}
                  />

                  {action.label}
                </button>
              );
            },
          )}
        </div>

        <button
          type="button"
          className="goal-input__submit"
          aria-label="작업 시작"
          title={
            canSubmit
              ? "추천 작업 흐름 찾기"
              : "작업 목표를 입력하세요"
          }
          disabled={
            !canSubmit
          }
          onClick={
            handleSubmit
          }
        >
          <ArrowRight
            size={18}
          />
        </button>
      </div>
    </section>
  );
}