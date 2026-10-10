import {
  Router,
} from "express";

import {
  agentRouter,
} from "../modules/agents/agent.routes.js";

import {
  providerRouter,
} from "../modules/providers/provider.routes.js";

import {
  runRouter,
} from "../modules/runs/run.routes.js";

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