import {
  Router,
} from "express";

import {
  listTools,
  readTool,
  updateToolController,
} from "./tool.controller.js";

export const toolRouter =
  Router();

toolRouter.get(
  "/",
  listTools,
);

toolRouter.get(
  "/:toolId",
  readTool,
);

toolRouter.patch(
  "/:toolId",
  updateToolController,
);