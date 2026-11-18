import { app } from "./app.js";
import { env } from "./config/index.js";

const server = app.listen(env.BACKEND_PORT, env.BACKEND_HOST, () => {
  console.log(
    `Coy backend listening at http://${env.BACKEND_HOST}:${env.BACKEND_PORT}`,
  );
});

server.on("error", () => {
  console.error(
    "Backend could not start. Check BACKEND_HOST, BACKEND_PORT, and server availability.",
  );
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
