import Fastify from "fastify";
import { authRoutes } from "./routes/auth.js";
import { roomRoutes } from "./routes/rooms.js";
import { handRoutes } from "./routes/hands.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";
import { initDb } from "./lib/db.js";

export async function buildServer() {
  initDb();
  const app = Fastify({ logger: false });

  await app.register(authRoutes);
  await app.register(roomRoutes);
  await app.register(handRoutes);
  await app.register(leaderboardRoutes);

  app.get("/api/health", async () => ({
    ok: true,
    time: new Date().toISOString(),
  }));

  await app.ready();
  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";
  const app = await buildServer();
  await app.listen({ port, host });
  console.log(`Server running on http://${host}:${port}`);
}

export default buildServer;
