import type { RequestHandler } from "express";
import { emptyQuerySchema, swipeRequestSchema } from "../contracts/discover.js";
import type { DiscoverServices } from "../services/discover.js";
import { validateRequest } from "../http/validation.js";

export function swipeHandler(services: DiscoverServices): RequestHandler {
  return async (request, response) => {
    validateRequest(emptyQuerySchema, request.query);
    const body: unknown = request.body;
    const input = validateRequest(swipeRequestSchema, body);
    response.json(await services.swipe(input));
  };
}
