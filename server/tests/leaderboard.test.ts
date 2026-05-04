import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index.js";

describe("leaderboard and titles", () => {
  it("returns ranking with required fields", async () => {
    const app = await buildServer();
    const res = await request(app.server).get("/api/rooms/r1/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    await app.close();
  }, 10000);

  it("returns titles", async () => {
    const app = await buildServer();
    const res = await request(app.server).get("/api/rooms/r1/titles");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    await app.close();
  }, 10000);
});
