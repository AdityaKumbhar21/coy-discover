import express from "express";
import type { DiscoverServices } from "./services/discover.js";
import { feedHandler } from "./routes/feed.js";
import { matchesHandler } from "./routes/matches.js";
import { swipeHandler } from "./routes/swipe.js";
import { onlyMethod, requireJson } from "./http/validation.js";
import { errorHandler } from "./http/errors.js";
import { AppError } from "./errors.js";

export function createApp(services: DiscoverServices) {
  const app = express();
  app.disable("x-powered-by");
  app.disable("etag");
  app.enable("strict routing");
  app.enable("case sensitive routing");
  app.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.route("/feed").all(onlyMethod("GET")).get(feedHandler(services));
  app.route("/matches").all(onlyMethod("GET")).get(matchesHandler(services));
  app
    .route("/swipe")
    .all(onlyMethod("POST"))
    .post(requireJson, express.json({ limit: "4kb" }), swipeHandler(services));
  app.use(() => {
    throw new AppError("NOT_FOUND");
  });
  app.use(errorHandler);
  return app;
}
