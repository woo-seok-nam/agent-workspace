import { ArrowRight, BarChart3, Code2, FileText, Search } from "lucide-react";

export function GoalInput() {
  return (
    <section className="goal-input">
      <textarea
        className="goal-input__textarea"
        placeholder="예) 경쟁사 3곳을 조사해서 비교 보고서를 만들어줘."
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
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}