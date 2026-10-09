import {
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  mockRuns,
} from "../mocks/runs";

import {
  mockWorkflows,
} from "../mocks/workflows";

import {
  mockResultFiles,
} from "../mocks/results";

import {
  ResultHeader,
} from "../features/workspace/components/ResultHeader";

import {
  ResultTabs,
  type ResultTab,
} from "../features/workspace/components/ResultTabs";

import {
  ResultViewer,
} from "../features/workspace/components/ResultViewer";

import {
  GeneratedFilesPanel,
} from "../features/workspace/components/GeneratedFilesPanel";

import "../features/workspace/WorkspaceResult.css";

export function WorkspaceResultPage() {
  const {
    runId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ResultTab>(
      "final",
    );

  const run =
    mockRuns.find(
      (item) =>
        item.id === runId,
    );

  const workflow =
    mockWorkflows.find(
      (item) =>
        item.id ===
        (
          run?.workflowId ??
          "workflow-research-report"
        ),
    );

  if (!workflow) {
    return (
      <div>
        Workflow를 찾을
        수 없습니다.
      </div>
    );
  }

  const files =
    mockResultFiles.filter(
      (file) =>
        file.runId ===
          runId ||
        (
          runId ===
            "run-preview" &&
          file.runId ===
            "run-001"
        ),
    );

  const resultTitle =
    run?.name ??
    "경쟁사 비교 분석 보고서";

  const handleRerun = () => {
    navigate(
      `/workflows/${workflow.id}/builder`,
    );
  };

  return (
    <div className="workspace-result-page">
      <ResultHeader
        title={
          resultTitle
        }
        workflowName={
          workflow.name
        }
        onRerun={
          handleRerun
        }
      />

      <ResultTabs
        activeTab={
          activeTab
        }
        onChange={
          setActiveTab
        }
      />

      <div className="workspace-result-layout">
        <ResultViewer
          activeTab={
            activeTab
          }
        />

        <GeneratedFilesPanel
          files={
            files
          }
        />
      </div>
    </div>
  );
}