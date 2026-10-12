import {
  Router,
} from "express";

import {
  readExecutionTraceController,
} from "../../observability/observability.controller.js";

import {
  approveStepController,
  cancelRunController,
  createRunController,
  listRuns,
  pauseRunController,
  readRun,
  rejectStepController,
  resumeRunController,
  startRunController,
  updateRunController,
  updateStepRunController,
} from "./run.controller.js";

export const runRouter =
  Router();

runRouter.get(
  "/",
  listRuns,
);

runRouter.get(
  "/:runId/trace",
  readExecutionTraceController,
);

runRouter.get(
  "/:runId",
  readRun,
);

runRouter.post(
  "/",
  createRunController,
);

runRouter.post(
  "/:runId/start",
  startRunController,
);

runRouter.post(
  "/:runId/pause",
  pauseRunController,
);

runRouter.post(
  "/:runId/resume",
  resumeRunController,
);

runRouter.post(
  "/:runId/cancel",
  cancelRunController,
);

runRouter.post(
  "/:runId/steps/:nodeId/approve",
  approveStepController,
);

runRouter.post(
  "/:runId/steps/:nodeId/reject",
  rejectStepController,
);

runRouter.patch(
  "/:runId",
  updateRunController,
);

runRouter.patch(
  "/:runId/steps/:nodeId",
  updateStepRunController,
);