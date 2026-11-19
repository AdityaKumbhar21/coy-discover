import type { RequestHandler } from "express";
import type { z } from "zod";
import { AppError } from "../errors.js";

export function validateRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError("INVALID_REQUEST");
  return result.data;
}

export function onlyMethod(method: "GET" | "POST"): RequestHandler {
  return (request, response, next) => {
    if (request.method !== method) {
      response.setHeader("Allow", method);
      throw new AppError("METHOD_NOT_ALLOWED");
    }
    next();
  };
}

export const requireJson: RequestHandler = (request, _response, next) => {
  const mediaType = request
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json")
    throw new AppError("UNSUPPORTED_MEDIA_TYPE");
  next();
};
