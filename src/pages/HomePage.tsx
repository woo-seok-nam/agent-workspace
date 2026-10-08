import { Bell, CircleUserRound } from "lucide-react";

import { GoalInput } from "../features/home/components/GoalInput";
import { RecommendedWorkflows } from "../features/home/components/RecommendedWorkflows";
import { RecentRuns } from "../features/home/components/RecentRuns";

import "../features/home/HomePage.css";

export function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <div>
          <h1>무엇을 작업하고 싶으신가요?</h1>

          <p>
            AI Agent가 최적의 작업 방법을 찾아 도와드립니다.
          </p>
        </div>

        <div className="home-header__actions">
          <button
            type="button"
            className="icon-button"
            aria-label="알림"
          >
            <Bell size={18} />
          </button>

          <button
            type="button"
            className="icon-button"
            aria-label="프로필"
          >
            <CircleUserRound size={19} />
          </button>
        </div>
      </header>

      <GoalInput />

      <RecommendedWorkflows />

      <RecentRuns />
    </div>
  );
}