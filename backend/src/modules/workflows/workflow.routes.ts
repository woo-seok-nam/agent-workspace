import {
  Router,
} from "express";

import {
  createWorkflowController,
  deleteWorkflowController,
  listWorkflows,
  readWorkflow,
  updateWorkflowController,
} from "./workflow.controller.js";

export const workflowRouter =
  Router();

workflowRouter.get(
  "/",
  listWorkflows,
);

workflowRouter.get(
  "/:workflowId",
  readWorkflow,
);

workflowRouter.post(
  "/",
  createWorkflowController,
);

workflowRouter.put(
  "/:workflowId",
  updateWorkflowController,
);

workflowRouter.patch(
  "/:workflowId",
  updateWorkflowController,
);

workflowRouter.delete(
  "/:workflowId",
  deleteWorkflowController,
);