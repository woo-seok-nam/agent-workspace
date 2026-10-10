import {
  Router,
} from "express";

import {
  approveStepController,
  createRunController,
  listRuns,
  readRun,
  rejectStepController,
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