import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.js";
import type { ErrorCode } from "../contracts/discover.js";

const definitions: Record<ErrorCode, { status: number; message: string }> = {
  INVALID_REQUEST: { status: 400, message: "The request is invalid." },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    message: "Use application/json for swipe requests.",
  },
  PAYLOAD_TOO_LARGE: { status: 413, message: "The request body is too large." },
  PROFILE_NOT_FOUND: { status: 404, message: "The profile does not exist." },
  SELF_SWIPE: { status: 400, message: "You cannot swipe on your own profile." },
  SWIPE_CONFLICT: {
    status: 409,
    message: "A different swipe decision was already recorded.",
  },
  NOT_FOUND: { status: 404, message: "The endpoint does not exist." },
  METHOD_NOT_ALLOWED: { status: 405, message: "This method is not allowed." },
  TEMPORARILY_UNAVAILABLE: {
    status: 503,
    message: "The database is temporarily unavailable. Please retry.",
  },
  INTERNAL_ERROR: { status: 500, message: "An unexpected error occurred." },
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  let code: ErrorCode =
    error instanceof AppError ? error.code : "INTERNAL_ERROR";
  if (typeof error === "object" && error !== null && "type" in error) {
    if (
      error.type === "entity.parse.failed" ||
      error.type === "request.aborted" ||
      error.type === "request.size.invalid"
    )
      code = "INVALID_REQUEST";
    if (error.type === "entity.too.large") code = "PAYLOAD_TOO_LARGE";
    if (
      error.type === "encoding.unsupported" ||
      error.type === "charset.unsupported"
    )
      code = "UNSUPPORTED_MEDIA_TYPE";
  }
  const { status, message } = definitions[code];
  response.status(status).json({ error: { code, message } });
};
