import cors from "cors";

import express from "express";

import {
  env,
} from "./config/env.js";

import {
  errorHandler,
} from "./middleware/errorHandler.js";

import {
  notFoundHandler,
} from "./middleware/notFoundHandler.js";

import {
  apiRouter,
} from "./routes/index.js";

export const app =
  express();

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin:
      env.frontendUrl,

    credentials: true,
  }),
);

/* =========================
   Body Parser
========================= */

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* =========================
   API
========================= */

app.use(
  "/api",
  apiRouter,
);

/* =========================
   Error Handling
========================= */

app.use(
  notFoundHandler,
);

app.use(
  errorHandler,
);