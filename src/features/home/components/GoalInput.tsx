import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Code2,
  FileText,
  Search,
} from "lucide-react";

export function GoalInput() {
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    navigate("/workflows/recommend", {
      state: {
        prompt: trimmedPrompt,
      },
    });
  };

  return (
    <section className="goal-input">
      <textarea
        className="goal-input__textarea"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />

      <div className="goal-input__footer">
        <div className="goal-input__actions">
          <button type="button" className="quick-action">
            <Search size={14} />
            웹 검색
          </button>

          <button type="button" className="quick-action">
            <FileText size={14} />
            문서 분석
          </button>

          <button type="button" className="quick-action">
            <BarChart3 size={14} />
            데이터 분석
          </button>

          <button type="button" className="quick-action">
            <Code2 size={14} />
            코드 작업
          </button>
        </div>

        <button
          type="button"
          className="goal-input__submit"
          aria-label="작업 시작"
          onClick={handleSubmit}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}