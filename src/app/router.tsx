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
  PlaceholderPage,
} from "../pages/PlaceholderPage";

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

          element:
            <PlaceholderPage />,
        },

        {
          path: "workflows",

          element:
            <PlaceholderPage />,
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

          element:
            <PlaceholderPage />,
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

          element:
            <PlaceholderPage />,
        },
      ],
    },
  ]);