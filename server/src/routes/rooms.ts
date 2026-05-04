import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import { z } from "zod";
import { db } from "../lib/db.js";
import { rooms, roomMembers } from "../schema/index.js";
import { eq, and } from "drizzle-orm";
import { verifyToken, extractBearer, TokenPayload } from "../plugins/auth.js";

function genCode(): string {
  return randomUUID().slice(0, 6).toUpperCase();
}

function hashPassword(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

const createRoomBody = z.object({
  name: z.string().min(1).max(100),
  password: z.string().optional(),
});

const joinByListBody = z.object({
  password: z.string(),
});

const joinByCodeBody = z.object({
  roomCode: z.string().min(1),
});

function authenticate(req: any, reply: any): TokenPayload | null {
  const token = extractBearer(req);
  if (!token) {
    reply.code(401).send({ code: "UNAUTHORIZED" });
    return null;
  }
  try {
    return verifyToken(token);
  } catch {
    reply.code(401).send({ code: "UNAUTHORIZED" });
    return null;
  }
}

export const roomRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/rooms", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const body = createRoomBody.parse(req.body);
    const id = randomUUID();
    const code = genCode();
    const now = new Date().toISOString();

    db.insert(rooms).values({
      id,
      code,
      name: body.name,
      ownerUserId: auth.userId,
      passwordHash: body.password ? hashPassword(body.password) : null,
      status: "active",
      createdAt: now,
    }).run();

    db.insert(roomMembers).values({
      id: randomUUID(),
      roomId: id,
      userId: auth.userId,
      role: "owner",
      joinedAt: now,
    }).run();

    return { id, code, name: body.name, ownerUserId: auth.userId, status: "active" };
  });

  app.get("/api/rooms", async () => {
    const all = db.select().from(rooms).where(eq(rooms.status, "active")).all();
    return { items: all };
  });

  app.get("/api/rooms/:roomId", async (req) => {
    const { roomId } = req.params as { roomId: string };
    const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
    if (!room) return { code: "ROOM_NOT_FOUND" };
    const members = db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId)).all();
    return { room, members };
  });

  app.post("/api/rooms/:roomId/join-by-code", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { roomId } = req.params as { roomId: string };
    const { roomCode } = joinByCodeBody.parse(req.body);

    const room = db.select().from(rooms).where(eq(rooms.code, roomCode)).get();
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    if (room.id !== roomId) return reply.code(400).send({ code: "ROOM_CODE_MISMATCH" });

    const existing = db.select().from(roomMembers)
      .where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, auth.userId)))
      .get();
    if (existing) return { ok: true, roomId: room.id };

    db.insert(roomMembers).values({
      id: randomUUID(),
      roomId: room.id,
      userId: auth.userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    }).run();

    return { ok: true, roomId: room.id };
  });

  app.post("/api/rooms/:roomId/join-by-list", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { roomId } = req.params as { roomId: string };
    const { password } = joinByListBody.parse(req.body);

    const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });

    if (!room.passwordHash) {
      return reply.code(400).send({ code: "ROOM_PASSWORD_NOT_SET" });
    }
    if (hashPassword(password) !== room.passwordHash) {
      return reply.code(400).send({ code: "ROOM_PASSWORD_INVALID" });
    }

    const existing = db.select().from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, auth.userId)))
      .get();
    if (existing) return { ok: true, roomId };

    db.insert(roomMembers).values({
      id: randomUUID(),
      roomId,
      userId: auth.userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    }).run();

    return { ok: true, roomId };
  });
};
