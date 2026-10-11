import {
  Router,
} from "express";

import {
  createGuidedWorkflowController,
  recommendWorkflowController,
} from "./guidance.controller.js";

export const guidanceRouter =
  Router();

guidanceRouter.post(
  "/recommend",
  recommendWorkflowController,
);

guidanceRouter.post(
  "/workflows",
  createGuidedWorkflowController,
);