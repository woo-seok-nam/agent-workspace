import {
  Router,
} from "express";

import {
  downloadArtifact,
  listRunArtifacts,
  readArtifactContent,
} from "./artifact.controller.js";

export const artifactRouter =
  Router();

artifactRouter.get(
  "/runs/:runId/artifacts",
  listRunArtifacts,
);

artifactRouter.get(
  "/artifacts/:artifactId/content",
  readArtifactContent,
);

artifactRouter.get(
  "/artifacts/:artifactId/download",
  downloadArtifact,
);