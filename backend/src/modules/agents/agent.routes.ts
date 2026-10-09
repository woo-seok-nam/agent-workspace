import {
  Router,
} from "express";

import {
  createAgentController,
  deleteAgentController,
  listAgents,
  readAgent,
  updateAgentController,
} from "./agent.controller.js";

export const agentRouter =
  Router();

agentRouter.get(
  "/",
  listAgents,
);

agentRouter.get(
  "/:agentId",
  readAgent,
);

agentRouter.post(
  "/",
  createAgentController,
);

agentRouter.patch(
  "/:agentId",
  updateAgentController,
);

agentRouter.delete(
  "/:agentId",
  deleteAgentController,
);