import {
  Router,
} from "express";

import {
  listRunArtifacts,
} from "./artifact.controller.js";

export const artifactRouter =
  Router();

artifactRouter.get(
  "/runs/:runId/artifacts",
  listRunArtifacts,
);