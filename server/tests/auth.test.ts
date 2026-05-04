import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index.js";

describe("POST /api/auth/wechat-login", () => {
  it("returns token and user payload", async () => {
    const app = await buildServer();
    const res = await request(app.server)
      .post("/api/auth/wechat-login")
      .send({ code: "mock-code" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.openid).toContain("mock");
    await app.close();
  }, 10000);
});
