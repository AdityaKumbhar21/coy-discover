import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { parseEnvironment } from "../config/env.js";
import * as schema from "./schema.js";

export async function openDatabase(configuration: unknown) {
  const env = parseEnvironment(configuration);

  // Remote libSQL is optional; do not promise unverified per-stream guarantees.
  if (!env.DATABASE_URL.startsWith("file:")) {
    throw new Error("Remote libSQL is not enabled. Use a local file database.");
  }

  // One physical connection per client keeps connection-scoped pragmas reliable.
  // Independent clients still contend through SQLite's database write lock.
  // Callers own this connection and must close it in finally. A failed BEGIN
  // can leave a native statement active in this driver; retry with a fresh client.
  const client = createClient({ url: env.DATABASE_URL, concurrency: 1 });

  try {
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute("PRAGMA busy_timeout = 100");
    const foreignKeys = await client.execute("PRAGMA foreign_keys");
    if (foreignKeys.rows[0]?.foreign_keys !== 1) {
      throw new Error("Database foreign-key enforcement could not be enabled.");
    }

    return { client, db: drizzle(client, { schema }) };
  } catch (error: unknown) {
    client.close();
    throw error;
  }
}

export type DatabaseConnection = Awaited<ReturnType<typeof openDatabase>>;
export type Database = DatabaseConnection["db"];
