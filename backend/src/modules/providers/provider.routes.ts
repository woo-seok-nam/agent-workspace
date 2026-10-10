import {
  Router,
} from "express";

import {
  listProviders,
  readProvider,
  updateProviderController,
} from "./provider.controller.js";

export const providerRouter =
  Router();

providerRouter.get(
  "/",
  listProviders,
);

providerRouter.get(
  "/:providerId",
  readProvider,
);

providerRouter.patch(
  "/:providerId",
  updateProviderController,
);