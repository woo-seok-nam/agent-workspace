import {
  Router,
} from "express";

import {
  downloadArtifact,
  listRunArtifacts,
} from "./artifact.controller.js";

export const artifactRouter =
  Router();

artifactRouter.get(
  "/runs/:runId/artifacts",
  listRunArtifacts,
);

artifactRouter.get(
  "/artifacts/:artifactId/download",
  downloadArtifact,
);