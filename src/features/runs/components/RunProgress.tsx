interface RunProgressProps {
  completedSteps: number;

  totalSteps: number;
}

export function RunProgress({
  completedSteps,
  totalSteps,
}: RunProgressProps) {
  const percentage =
    totalSteps === 0
      ? 0
      : Math.round(
          (completedSteps /
            totalSteps) *
            100,
        );

  return (
    <section className="run-progress">
      <div className="run-progress__header">
        <span>
          실행 진행률
        </span>

        <strong>
          {completedSteps} /{" "}
          {totalSteps}
        </strong>
      </div>

      <div className="run-progress__track">
        <div
          className="run-progress__bar"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="run-progress__footer">
        <span>
          {percentage}% 완료
        </span>
      </div>
    </section>
  );
}