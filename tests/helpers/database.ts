import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { openDatabase } from "@/server/db/connection";
import { migrateDatabase } from "@/server/db/migrate";

export async function createTestDatabase() {
  const directory = await mkdtemp(join(tmpdir(), "coy-test-"));
  const configuration = {
    DATABASE_URL: pathToFileURL(join(directory, "test.sqlite")).href,
  };
  const connections: Awaited<ReturnType<typeof openDatabase>>[] = [];

  async function connect() {
    const connection = await openDatabase(configuration);
    connections.push(connection);
    return connection;
  }

  async function cleanup() {
    for (const connection of connections) connection.client.close();
    await rm(directory, { recursive: true, force: true });
  }

  try {
    const connection = await connect();
    await migrateDatabase(connection.db);
    return { ...connection, configuration, connect, cleanup };
  } catch (error: unknown) {
    await cleanup();
    throw error;
  }
}
