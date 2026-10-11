import { mkdirSync } from "node:fs";
import { createApp } from "./app";
mkdirSync("data", { recursive: true });
const { app, db } = createApp(
  process.env.DATABASE_PATH ?? "data/workbench.sqlite",
);
const port = Number(process.env.PORT ?? 4312);
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(
    `Fairshare: http://${process.env.HOST ?? "127.0.0.1"}:${port}`,
  ),
);
function close() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
