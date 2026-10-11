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

export function GoalInput() {
  const navigate =
    useNavigate();

  const [
    prompt,
    setPrompt,
  ] =
    useState("");

  const handleSubmit =
    () => {
      const trimmedPrompt =
        prompt.trim();

      if (!trimmedPrompt) {
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

  return (
    <section className="goal-input">
      <textarea
        className="goal-input__textarea"
        value={
          prompt
        }
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
           * 한글 입력 조합 중 Enter가
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
           * → 기본 textarea 동작 유지
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
           * → 줄바꿈 방지
           * → 기존 submit 로직 실행
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
          <button
            type="button"
            className="quick-action"
          >
            <Search
              size={
                14
              }
            />
            웹 검색
          </button>

          <button
            type="button"
            className="quick-action"
          >
            <FileText
              size={
                14
              }
            />
            문서 분석
          </button>

          <button
            type="button"
            className="quick-action"
          >
            <BarChart3
              size={
                14
              }
            />
            데이터 분석
          </button>

          <button
            type="button"
            className="quick-action"
          >
            <Code2
              size={
                14
              }
            />
            코드 작업
          </button>
        </div>

        <button
          type="button"
          className="goal-input__submit"
          aria-label="작업 시작"
          onClick={
            handleSubmit
          }
        >
          <ArrowRight
            size={
              18
            }
          />
        </button>
      </div>
    </section>
  );
}