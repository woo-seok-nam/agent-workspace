import {
  Router,
} from "express";

import {
  createRunController,
  listRuns,
  readRun,
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

runRouter.patch(
  "/:runId",
  updateRunController,
);

runRouter.patch(
  "/:runId/steps/:nodeId",
  updateStepRunController,
);