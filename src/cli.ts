import { createMonitor } from "./monitor";
import { serveMonitor } from "./server";

const command = Bun.argv[2] ?? "serve";
const database = process.env.DATABASE_PATH ?? "state/eleicao.db";

if (command === "serve") {
  const server = serveMonitor(createMonitor(database));
  console.log(`Monitor Eleitoral em ${server.url}`);
} else {
  console.error(`Comando desconhecido: ${command}`);
  process.exit(1);
}
