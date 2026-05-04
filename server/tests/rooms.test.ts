import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index.js";

let token: string;
let app: Awaited<ReturnType<typeof buildServer>>;

describe("room join rules", () => {
  beforeAll(async () => {
    app = await buildServer();
    const authRes = await request(app.server)
      .post("/api/auth/wechat-login")
      .send({ code: "owner" });
    token = authRes.body.token;
  });

  it("creates a room with password", async () => {
    const res = await request(app.server)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "局A", password: "1234" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  it("requires password when joining from room list", async () => {
    const create = await request(app.server)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "局B", password: "pass" });
    const roomId = create.body.id;

    const failJoin = await request(app.server)
      .post(`/api/rooms/${roomId}/join-by-list`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "wrong" });

    expect(failJoin.status).toBe(400);
    expect(failJoin.body.code).toBe("ROOM_PASSWORD_INVALID");
  });

  it("allows correct password for list join", async () => {
    const create = await request(app.server)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "局C", password: "right" });
    const roomId = create.body.id;

    const ok = await request(app.server)
      .post(`/api/rooms/${roomId}/join-by-list`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "right" });

    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
  });
});
