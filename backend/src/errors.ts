import type { ErrorCode } from "./contracts/discover.js";

export class AppError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = "AppError";
  }
}
