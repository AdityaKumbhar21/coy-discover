import { setTimeout as delay } from "node:timers/promises";
import { AppError } from "../errors.js";
import { openDatabase } from "./connection.js";
import type { Database, DatabaseConnection } from "./connection.js";

export function databaseErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5; depth++) {
    if (typeof current !== "object" || current === null) return undefined;
    if ("code" in current && typeof current.code === "string")
      return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

// The operation includes the complete transaction when used for a write.
// Never reuse a client whose BEGIN failed: this driver can retain native state.
export async function runDatabaseOperation<T>(
  configuration: unknown,
  operation: (db: Database) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let connection: DatabaseConnection | undefined;
    try {
      connection = await openDatabase(configuration).catch((error: unknown) => {
        // The native driver's constructor can return an empty error code for an
        // inaccessible path. Classify failures at the connection boundary.
        if (/^SQLITE_(BUSY|LOCKED)/.test(databaseErrorCode(error) ?? ""))
          throw error;
        throw new AppError("TEMPORARILY_UNAVAILABLE");
      });
      return await operation(connection.db);
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      const code = databaseErrorCode(error);
      const busy =
        code?.startsWith("SQLITE_BUSY") || code?.startsWith("SQLITE_LOCKED");
      if (!busy) {
        if (
          code &&
          /^(SQLITE_CANTOPEN|SQLITE_IOERR|SQLITE_READONLY)/.test(code)
        ) {
          throw new AppError("TEMPORARILY_UNAVAILABLE");
        }
        throw error;
      }
      if (attempt === 2) throw new AppError("TEMPORARILY_UNAVAILABLE");
    } finally {
      connection?.client.close();
    }
    await delay(10 * (attempt + 1));
  }
  throw new AppError("TEMPORARILY_UNAVAILABLE");
}
