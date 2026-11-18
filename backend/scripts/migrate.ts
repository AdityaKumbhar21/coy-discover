import { openDatabase } from "../src/db/connection.js";
import { migrateDatabase } from "../src/db/migrate.js";

const connection = await openDatabase(process.env);
try {
  await migrateDatabase(connection.db);
  console.log("Database migrations applied.");
} finally {
  connection.client.close();
}
