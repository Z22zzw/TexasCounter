import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../lib/db.js";
import { hands, handPlayers, ledgerEntries, roomMembers, rooms } from "../schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { toMoney } from "../lib/decimal.js";
import { executeSettlement } from "../services/settlement.js";
import { verifyToken, extractBearer, TokenPayload } from "../plugins/auth.js";

const betBody = z.object({
  amountInt: z.number().int().positive(),
  roundIndex: z.number().int().optional(),
});

const markResultBody = z.object({
  result: z.enum(["win", "lose"]),
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

export const handRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/rooms/:roomId/hands/start", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { roomId } = req.params as { roomId: string };

    const room = db.select().from(rooms).where(eq(rooms.id, roomId)).get();
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    if (room.ownerUserId !== auth.userId) {
      return reply.code(403).send({ code: "ONLY_OWNER_CAN_START_HAND" });
    }

    const ongoing = db.select().from(hands)
      .where(and(eq(hands.roomId, roomId), eq(hands.status, "ongoing")))
      .get();
    if (ongoing) return reply.code(400).send({ code: "HAND_STILL_ONGOING" });

    const maxHand = db.select().from(hands)
      .where(eq(hands.roomId, roomId))
      .orderBy(desc(hands.handNo))
      .get();
    const handNo = (maxHand?.handNo ?? 0) + 1;

    const now = new Date().toISOString();
    const handId = randomUUID();
    db.insert(hands).values({
      id: handId,
      roomId,
      handNo,
      status: "ongoing",
      startedAt: now,
    }).run();

    const members = db.select().from(roomMembers).where(eq(roomMembers.roomId, roomId)).all();
    for (const m of members) {
      db.insert(handPlayers).values({
        id: randomUUID(),
        handId,
        userId: m.userId,
        isWinner: 0,
        isLoser: 0,
      }).run();

      db.insert(ledgerEntries).values({
        id: randomUUID(),
        roomId,
        handId,
        userId: m.userId,
        entryType: "ante",
        amount: "-1.00",
        createdBy: auth.userId,
        createdAt: now,
      }).run();
    }

    return { handId, handNo };
  });

  app.post("/api/hands/:handId/bets", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { handId } = req.params as { handId: string };
    const { amountInt, roundIndex } = betBody.parse(req.body);

    const hand = db.select().from(hands).where(eq(hands.id, handId)).get();
    if (!hand) return reply.code(404).send({ code: "HAND_NOT_FOUND" });
    if (hand.status === "settled") {
      return reply.code(400).send({ code: "HAND_ALREADY_SETTLED" });
    }

    const hp = db.select().from(handPlayers)
      .where(and(eq(handPlayers.handId, handId), eq(handPlayers.userId, auth.userId)))
      .get();
    if (!hp) return reply.code(403).send({ code: "NOT_HAND_MEMBER" });

    const now = new Date().toISOString();
    db.insert(ledgerEntries).values({
      id: randomUUID(),
      roomId: hand.roomId,
      handId,
      userId: auth.userId,
      entryType: "bet",
      amount: `-${toMoney(amountInt)}`,
      roundIndex: roundIndex ?? null,
      createdBy: auth.userId,
      createdAt: now,
    }).run();

    return { ok: true };
  });

  app.post("/api/hands/:handId/mark-result", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { handId } = req.params as { handId: string };
    const { result } = markResultBody.parse(req.body);

    const hand = db.select().from(hands).where(eq(hands.id, handId)).get();
    if (!hand) return reply.code(404).send({ code: "HAND_NOT_FOUND" });
    if (hand.status === "settled") {
      return reply.code(400).send({ code: "HAND_ALREADY_SETTLED" });
    }

    const hp = db.select().from(handPlayers)
      .where(and(eq(handPlayers.handId, handId), eq(handPlayers.userId, auth.userId)))
      .get();
    if (!hp) return reply.code(403).send({ code: "NOT_HAND_MEMBER" });

    db.update(handPlayers).set({
      isWinner: result === "win" ? 1 : 0,
      isLoser: result === "lose" ? 1 : 0,
    }).where(eq(handPlayers.id, hp.id)).run();

    return { ok: true };
  });

  app.post("/api/hands/:handId/settle", async (req, reply) => {
    const auth = authenticate(req, reply);
    if (!auth) return;
    const { handId } = req.params as { handId: string };

    const hand = db.select().from(hands).where(eq(hands.id, handId)).get();
    if (!hand) return reply.code(404).send({ code: "HAND_NOT_FOUND" });
    if (hand.status === "settled") {
      return reply.code(400).send({ code: "HAND_ALREADY_SETTLED" });
    }

    const room = db.select().from(rooms).where(eq(rooms.id, hand.roomId)).get();
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    if (room.ownerUserId !== auth.userId) {
      return reply.code(403).send({ code: "ONLY_OWNER_CAN_SETTLE_HAND" });
    }

    const winners = db.select().from(handPlayers)
      .where(and(eq(handPlayers.handId, handId), eq(handPlayers.isWinner, 1)))
      .all();

    if (winners.length === 0) {
      return reply.code(400).send({ code: "NO_WINNER_SELECTED" });
    }

    const winnerIds = winners.map(w => w.userId);
    const payouts = executeSettlement(hand.roomId, handId, winnerIds, auth.userId);

    return { payouts };
  });

  app.get("/api/hands/:handId/ledger", async (req) => {
    const { handId } = req.params as { handId: string };
    const entries = db.select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.handId, handId))
      .all();
    return { items: entries };
  });
};
