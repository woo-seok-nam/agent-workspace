import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "../components/layout/AppLayout";
import { HomePage } from "../pages/HomePage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "new-task",
        element: <PlaceholderPage />,
      },
      {
        path: "workflows",
        element: <PlaceholderPage />,
      },
      {
        path: "runs",
        element: <PlaceholderPage />,
      },
      {
        path: "agents",
        element: <PlaceholderPage />,
      },
      {
        path: "tools",
        element: <PlaceholderPage />,
      },
      {
        path: "settings",
        element: <PlaceholderPage />,
      },
    ],
  },
]);