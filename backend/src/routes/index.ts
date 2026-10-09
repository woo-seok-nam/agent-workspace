import {
  Router,
} from "express";

import {
  agentRouter,
} from "../modules/agents/agent.routes.js";

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