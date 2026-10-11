import {
  Router,
} from "express";

import {
  agentRouter,
} from "../modules/agents/agent.routes.js";

import {
  artifactRouter,
} from "../modules/artifacts/artifact.routes.js";

import {
  providerRouter,
} from "../modules/providers/provider.routes.js";

import {
  runRouter,
} from "../modules/runs/run.routes.js";

import {
  runDeleteRouter,
} from "../modules/runs/runDelete.routes.js";

import {
  toolRouter,
} from "../modules/tools/tool.routes.js";

import {
  workflowRouter,
} from "../modules/workflows/workflow.routes.js";

import {
  healthRouter,
} from "./health.routes.js";

export const apiRouter =
  Router();

apiRouter.use(
  "/health",
  healthRouter,
);

apiRouter.use(
  "/agents",
  agentRouter,
);

apiRouter.use(
  "/tools",
  toolRouter,
);

apiRouter.use(
  "/providers",
  providerRouter,
);

apiRouter.use(
  "/workflows",
  workflowRouter,
);

apiRouter.use(
  "/runs",
  runRouter,
);

/*
 * runDeleteRouter 내부에:
 *
 * DELETE /runs/:runId
 *
 * 가 정의되어 있으므로 "/"에 연결한다.
 */
apiRouter.use(
  "/",
  runDeleteRouter,
);

/*
 * artifactRouter 내부에:
 *
 * GET /runs/:runId/artifacts
 * GET /artifacts/:artifactId/download
 *
 * 가 정의되어 있다.
 */
apiRouter.use(
  "/",
  artifactRouter,
);