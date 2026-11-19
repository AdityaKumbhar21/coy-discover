import { once } from "node:events";
import type { Server } from "node:http";
import { createApp } from "../../backend/src/app";
import { createDiscoverServices } from "../../backend/src/services/discover";
import type { DiscoverServices } from "../../backend/src/services/discover";
import { createSeedData } from "../../backend/scripts/seed-data";
import { seedDatabase } from "../../backend/src/db/seed";
import { createTestDatabase } from "./database";

export async function createDiscoverFixture() {
  const database = await createTestDatabase();
  const servers: Server[] = [];
  const forActor = (id: number) =>
    createDiscoverServices({
      ...database.configuration,
      DEMO_USER_ID: String(id),
    });
  const services = forActor(1);
  try {
    await seedDatabase(database.db, createSeedData(1));
  } catch (error: unknown) {
    await database.cleanup();
    throw error;
  }

  async function startHttp(dependencies: DiscoverServices = services) {
    const server = createApp(dependencies).listen(0, "127.0.0.1");
    servers.push(server);
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test server address.");
    return `http://127.0.0.1:${address.port}`;
  }

  return {
    ...database,
    services,
    forActor,
    startHttp,
    async cleanup() {
      for (const server of servers) {
        server.closeAllConnections();
        if (server.listening)
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
      }
      await database.cleanup();
    },
  };
}
