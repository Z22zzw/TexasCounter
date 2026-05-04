import { FastifyPluginAsync } from "fastify";
import { getLeaderboard, getTitles, seedTitles } from "../services/stats.js";

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  seedTitles();

  app.get("/api/rooms/:roomId/leaderboard", async (req) => {
    const { roomId } = req.params as { roomId: string };
    return getLeaderboard(roomId);
  });

  app.get("/api/rooms/:roomId/titles", async (req) => {
    const { roomId } = req.params as { roomId: string };
    return getTitles(roomId);
  });
};
