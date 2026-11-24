import AgentTaskPanel from "../features/agent-task/AgentTaskPanel";
import { useState } from "react";
import AppLayout from "../layouts/AppLayout";
import MainPage from "../pages/MainPage";
import WorkspacePages from "../pages/WorkspacePages";
import type { WorkspaceRoute } from "../pages/workspaceDemo";
import { useTheme } from "../theme/useTheme";

export default function App() {
  const [route, navigate] = useState<WorkspaceRoute>({ page: "home" });
  const theme = useTheme();
  const [agentMode, setAgentMode] = useState(false);
  return (
    <AppLayout route={route} navigate={navigate} {...theme}>
      {route.page === "home" && <div className="row agent-mode-tabs">
        <button aria-pressed={!agentMode} onClick={() => setAgentMode(false)}>입력 수신 확인</button>
        <button aria-pressed={agentMode} onClick={() => setAgentMode(true)}>AI 계획·실행</button>
      </div>}
      <MainPage hidden={route.page !== "home" || agentMode} />
      <AgentTaskPanel hidden={route.page !== "home" || !agentMode} />
      {route.page !== "home" && <WorkspacePages route={route} navigate={navigate} {...theme} />}
    </AppLayout>
  );
}
