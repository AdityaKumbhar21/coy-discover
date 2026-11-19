import type { RequestHandler } from "express";
import { emptyQuerySchema } from "../contracts/discover.js";
import type { DiscoverServices } from "../services/discover.js";
import { validateRequest } from "../http/validation.js";

export function matchesHandler(services: DiscoverServices): RequestHandler {
  return async (request, response) => {
    validateRequest(emptyQuerySchema, request.query);
    response.json(await services.matches());
  };
}
