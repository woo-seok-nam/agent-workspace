import {
  createBrowserRouter,
  Navigate,
} from "react-router-dom";

import {
  AppLayout,
} from "../components/layout/AppLayout";

import {
  HomePage,
} from "../pages/HomePage";

import {
  WorkflowRecommendationPage,
} from "../pages/WorkflowRecommendationPage";

import {
  WorkflowBuilderPage,
} from "../pages/WorkflowBuilderPage";

import {
  WorkflowRuntimePage,
} from "../pages/WorkflowRuntimePage";

import {
  WorkspaceResultPage,
} from "../pages/WorkspaceResultPage";

import {
  AgentManagementPage,
} from "../pages/AgentManagementPage";

import {
  ToolManagementPage,
} from "../pages/ToolManagementPage";

import {
  RunsHistoryPage,
} from "../pages/RunsHistoryPage";

import {
  WorkflowsPage,
} from "../pages/WorkflowsPage";

export const router =
  createBrowserRouter([
    {
      path: "/",

      element:
        <AppLayout />,

      children: [
        {
          index: true,

          element: (
            <Navigate
              to="/home"
              replace
            />
          ),
        },

        {
          path: "home",

          element:
            <HomePage />,
        },

        {
          path: "new-task",

          element: (
            <Navigate
              to="/home"
              replace
            />
          ),
        },

        {
          path: "workflows",

          element:
            <WorkflowsPage />,
        },

        {
          path:
            "workflows/recommend",

          element:
            <WorkflowRecommendationPage />,
        },

        {
          path:
            "workflows/:workflowId/builder",

          element:
            <WorkflowBuilderPage />,
        },

        {
          path: "runs",

          element:
            <RunsHistoryPage />,
        },

        {
          path:
            "runs/:runId",

          element:
            <WorkflowRuntimePage />,
        },

        {
          path: "workspace",

          element: (
            <Navigate
              to="/runs"
              replace
            />
          ),
        },

        {
          path:
            "workspace/:runId",

          element:
            <WorkspaceResultPage />,
        },

        {
          path: "agents",

          element:
            <AgentManagementPage />,
        },

        {
          path: "tools",

          element:
            <ToolManagementPage />,
        },

        {
          path: "settings",

          element: (
            <Navigate
              to="/tools"
              replace
            />
          ),
        },
      ],
    },
  ]);