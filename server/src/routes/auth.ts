import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../lib/db.js";
import { users } from "../schema/index.js";
import { eq } from "drizzle-orm";
import { signToken } from "../plugins/auth.js";

const wechatLoginBody = z.object({
  code: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/wechat-login", async (req) => {
    const { code } = wechatLoginBody.parse(req.body);
    const openid = `wx-${code}`;
    const now = new Date().toISOString();

    const existing = db.select().from(users).where(eq(users.openid, openid)).get();
    let user: typeof existing;

    if (existing) {
      user = existing;
    } else {
      const id = randomUUID();
      db.insert(users).values({
        id,
        openid,
        nickname: "新玩家",
        createdAt: now,
      }).run();
      user = { id, openid, nickname: "新玩家", avatarUrl: null, createdAt: now };
    }

    const token = signToken({ userId: user!.id, openid: user!.openid });
    return { token, user };
  });
};
