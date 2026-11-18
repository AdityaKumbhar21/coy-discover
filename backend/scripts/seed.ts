import { parseEnvironment } from "../src/config/env.js";
import { openDatabase } from "../src/db/connection.js";
import { seedDatabase } from "../src/db/seed.js";
import { createSeedData } from "./seed-data.js";

const env = parseEnvironment(process.env);
const data = createSeedData(env.DEMO_USER_ID);
const connection = await openDatabase(process.env);
try {
  await seedDatabase(connection.db, data);
  console.log("Demo seed data applied without resetting existing progress.");
} finally {
  connection.client.close();
}
