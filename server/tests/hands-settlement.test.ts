import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index.js";

let ownerToken: string;
let memberToken: string;
let roomId: string;
let roomCode: string;
let app: Awaited<ReturnType<typeof buildServer>>;

describe("hand lifecycle and settlement", () => {
  beforeAll(async () => {
    app = await buildServer();

    const owner = await request(app.server)
      .post("/api/auth/wechat-login")
      .send({ code: "owner-hs" });
    ownerToken = owner.body.token;

    const member = await request(app.server)
      .post("/api/auth/wechat-login")
      .send({ code: "member-hs" });
    memberToken = member.body.token;

    const room = await request(app.server)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "测试房" });
    roomId = room.body.id;
    roomCode = room.body.code;

    await request(app.server)
      .post(`/api/rooms/${roomId}/join-by-code`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ roomCode });
  });

  it("blocks non-owner from starting hand", async () => {
    const res = await request(app.server)
      .post(`/api/rooms/${roomId}/hands/start`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ONLY_OWNER_CAN_START_HAND");
  });

  it("full hand lifecycle: start -> bet -> mark -> settle", async () => {
    // Start hand
    const start = await request(app.server)
      .post(`/api/rooms/${roomId}/hands/start`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(start.status).toBe(200);
    const handId = start.body.handId;

    // Non-owner tries to settle (should fail)
    const badSettle = await request(app.server)
      .post(`/api/hands/${handId}/settle`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({});
    expect(badSettle.status).toBe(403);
    expect(badSettle.body.code).toBe("ONLY_OWNER_CAN_SETTLE_HAND");

    // Member places bet
    const bet = await request(app.server)
      .post(`/api/hands/${handId}/bets`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ amountInt: 5 });
    expect(bet.status).toBe(200);

    // Mark both users as winners
    await request(app.server)
      .post(`/api/hands/${handId}/mark-result`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ result: "win" });
    await request(app.server)
      .post(`/api/hands/${handId}/mark-result`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ result: "win" });

    // Owner settles
    const settle = await request(app.server)
      .post(`/api/hands/${handId}/settle`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(settle.status).toBe(200);
    expect(settle.body.payouts.length).toBe(2);
    for (const p of settle.body.payouts) {
      expect(p.amount).toMatch(/^\d+\.\d{2}$/);
    }

    // Verify settling again fails
    const doubleSettle = await request(app.server)
      .post(`/api/hands/${handId}/settle`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(doubleSettle.status).toBe(400);
    expect(doubleSettle.body.code).toBe("HAND_ALREADY_SETTLED");

    // Verify betting on settled hand fails
    const lateBet = await request(app.server)
      .post(`/api/hands/${handId}/bets`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ amountInt: 3 });
    expect(lateBet.status).toBe(400);
    expect(lateBet.body.code).toBe("HAND_ALREADY_SETTLED");

    // Verify ledger exists
    const ledger = await request(app.server).get(`/api/hands/${handId}/ledger`);
    expect(ledger.status).toBe(200);
    expect(ledger.body.items.length).toBeGreaterThan(0);
  });

  it("blocks settle with no winner", async () => {
    const start = await request(app.server)
      .post(`/api/rooms/${roomId}/hands/start`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(start.status).toBe(200);
    const handId = start.body.handId;

    const settle = await request(app.server)
      .post(`/api/hands/${handId}/settle`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({});
    expect(settle.status).toBe(400);
    expect(settle.body.code).toBe("NO_WINNER_SELECTED");
  });
});
