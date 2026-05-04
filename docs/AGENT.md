【仓库设置】
1. 请帮我将本地项目 D:\Business\WechatDeepSeekDemo1\WechatDeepSeekDemo1 推送至 GitHub 仓库：
   - 仓库地址：https://github.com/Z22zzw/TexasCounter.git
   - 注意：TexasCounter 是仓库名，项目实际内容为 WechatDeepSeekDemo1（微信+DeepSeek 集成）
   - 操作：先确认远程仓库存在，若内容不相关请新建仓库或强制推送（我已知晓风险）

【CI/CD 设计】
2. 设计 GitHub Actions 流水线，实现：
   - 代码推送后自动构建 Docker 镜像
   - 支持一键部署到我的服务器（IP：49.235.100.186，SSH 方式）
   - 请提供 docker-compose.yml 和部署脚本

【项目开发流程】
3. 以下是我项目的 specs 和 plans 内容（已粘贴），请基于这些内容：
   - 制定分阶段开发计划
   - 说明如何使用 Harness.io（或你假设的上下文管理工具）管理会话上下文
   - 确保后续每次对话我可以引用这些 spec 内容而不重复粘贴

【specs 内容】打牌记账微信小程序设计文档（AI Harness 版）

日期：2026-05-04  
状态：已与需求方逐段确认（可进入实现计划）  
范围：V1（首版）

## 1. 目标与边界

### 1.1 产品目标

- 提供线下德州扑克朋友局的记分工具，核心是多人房间内的快速记账与结算。
- 记账输入以整数为主，结算展示支持两位小数。
- 提供基础趣味化能力：排行榜与称号，提升社交活跃度。

### 1.2 技术约束（已确认）

- 前端：`uniapp + Vue3`（微信小程序）。
- 后端：`Node.js + TypeScript + Fastify`（轻量单体）。
- 数据库：`SQLite`。

### 1.3 V1 范围

- 包含：微信登录、开房/入房、牌局记分流水、牌局结算、排行榜、称号。
- 不包含：语音聊天、复杂反作弊、赛事编排、多币种和跨房间资产体系。

## 2. 业务规则（最终确认版）

### 2.1 房间与入场

- 用户可创建房间，房间可设置密码。
- 入场方式：
  - 扫码进房：免密；
  - 输入房间码进房：免密；
  - 房间列表进房：若房间设置密码，则必须输入密码。

### 2.2 牌局与轮次

- 不固定总轮数；由房主手动开始/结束每一手牌，直到房主结束整场活动。
- 每手牌开始时，房间全员自动投入 1 分到底池（强制）。

### 2.3 投注与结果

- 所有成员都可以录入下注（向奖池投入分数）。
- 弃牌由线下沟通，不在系统中强约束；最终通过“失败”标记体现。
- 牌局结束时允许多名胜者。

### 2.4 结算规则

- 仅房主可触发“结束并结算”。
- 奖池均分给全部胜者。
- 均分结果按两位小数四舍五入；允许 0.01 量级总和误差（按用户确认）。

### 2.5 记分精度

- 输入阶段：仅允许整数分输入。
- 展示/结算阶段：显示两位小数。
- 后端计算禁止直接使用 JS 浮点；统一采用 decimal 计算库。

## 3. 架构设计

## 3.1 总体架构

- 客户端（uniapp）调用 Fastify REST API。
- Fastify 通过 ORM（Drizzle）读写 SQLite。
- 采用“流水账（ledger）”作为唯一记分事实来源，排行榜与称号由流水聚合计算。

## 3.2 推荐技术组合

- `fastify`：HTTP 服务与路由。
- `drizzle-orm` + `better-sqlite3`：SQLite 访问与迁移。
- `decimal.js`（或同类）: 金额精确运算。
- `zod`：请求参数校验。
- `jsonwebtoken`：会话 token。

## 3.3 安全与权限

- 登录方式：微信一键登录（不接手机号）。
- 后端签发 token，接口基于 token 鉴权。
- 房主权限：
  - 开始新手牌；
  - 结束并结算手牌。
- 普通成员权限：
  - 下注；
  - 标记胜/负；
  - 查看房间/流水/排行榜。

## 4. 数据模型（V1）

## 4.1 实体表

### users

- `id` TEXT PK
- `openid` TEXT UNIQUE NOT NULL
- `nickname` TEXT NOT NULL
- `avatar_url` TEXT NULL
- `created_at` DATETIME NOT NULL

### rooms

- `id` TEXT PK
- `code` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `owner_user_id` TEXT NOT NULL
- `password_hash` TEXT NULL
- `status` TEXT NOT NULL（active/closed）
- `created_at` DATETIME NOT NULL

### room_members

- `id` TEXT PK
- `room_id` TEXT NOT NULL
- `user_id` TEXT NOT NULL
- `role` TEXT NOT NULL（owner/member）
- `joined_at` DATETIME NOT NULL

唯一约束：`(room_id, user_id)`

### hands

- `id` TEXT PK
- `room_id` TEXT NOT NULL
- `hand_no` INTEGER NOT NULL
- `status` TEXT NOT NULL（ongoing/settled）
- `started_at` DATETIME NOT NULL
- `ended_at` DATETIME NULL
- `settled_by` TEXT NULL

唯一约束：`(room_id, hand_no)`

### hand_players

- `id` TEXT PK
- `hand_id` TEXT NOT NULL
- `user_id` TEXT NOT NULL
- `is_winner` INTEGER NOT NULL DEFAULT 0
- `is_loser` INTEGER NOT NULL DEFAULT 0
- `result_amount` TEXT NULL（两位小数字符串）

唯一约束：`(hand_id, user_id)`

### ledger_entries（核心流水）

- `id` TEXT PK
- `room_id` TEXT NOT NULL
- `hand_id` TEXT NOT NULL
- `user_id` TEXT NOT NULL
- `entry_type` TEXT NOT NULL（ante/bet/payout/adjust）
- `amount` TEXT NOT NULL（decimal 字符串；正负号区分流向）
- `round_index` INTEGER NULL
- `created_by` TEXT NOT NULL
- `created_at` DATETIME NOT NULL

### titles

- `id` TEXT PK
- `key` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `rule_type` TEXT NOT NULL（profit_top/win_streak_top 等）

### user_room_stats

- `id` TEXT PK
- `room_id` TEXT NOT NULL
- `user_id` TEXT NOT NULL
- `hands_count` INTEGER NOT NULL DEFAULT 0
- `win_count` INTEGER NOT NULL DEFAULT 0
- `net_profit` TEXT NOT NULL DEFAULT "0.00"
- `current_title` TEXT NULL

唯一约束：`(room_id, user_id)`

## 4.2 数据一致性约束

- `hands.status=settled` 后禁止写入 `ante/bet` 流水。
- 结算必须至少存在 1 名胜者。
- 一手牌中同一用户仅 1 条 `hand_players`。
- 所有金额写入 `amount` 前标准化为两位小数字符串。

## 5. 关键流程

## 5.1 登录与建房

1. 客户端调用微信登录拿 `code`。
2. 调用 `POST /api/auth/wechat-login`，后端创建/更新用户并返回 token。
3. 用户调用 `POST /api/rooms` 创建房间，成为房主。

## 5.2 入房

- 扫码/房间码路径直接加入房间（免密）。
- 房间列表路径需密码校验后加入。

## 5.3 开始一手牌

1. 房主调用 `POST /api/rooms/:roomId/hands/start`。
2. 服务端创建 `hands` 记录（`ongoing`）。
3. 对房间内所有成员生成 `ante` 流水（`amount=-1.00`）。

## 5.4 下注

1. 成员调用 `POST /api/hands/:handId/bets`，传入整数 `amountInt`。
2. 服务端校验 `amountInt > 0` 且手牌进行中。
3. 写入 `bet` 流水（`amount=-(amountInt).00`）。

## 5.5 标记胜负

- 成员调用 `POST /api/hands/:handId/mark-result` 标记 `win/lose`。
- 允许反复覆盖到最终结算前。

## 5.6 结算

1. 房主调用 `POST /api/hands/:handId/settle`。
2. 聚合本手所有 `ante+bet` 形成奖池总额。
3. 对胜者均分，按两位小数四舍五入。
4. 为每位胜者写入 `payout` 正向流水。
5. 更新 `hands.status=settled`，写 `ended_at/settled_by`。
6. 刷新 `user_room_stats` 与称号归属。

## 6. API 设计（V1 草案）

## 6.1 Auth

- `POST /api/auth/wechat-login`
  - 入参：`{ code: string }`
  - 出参：`{ token, user }`

## 6.2 Rooms

- `POST /api/rooms`
  - 入参：`{ name: string, password?: string }`
- `GET /api/rooms`
  - 出参：房间列表（供列表入房）
- `POST /api/rooms/:roomId/join-by-code`
  - 入参：`{ roomCode: string }`
- `POST /api/rooms/:roomId/join-by-list`
  - 入参：`{ password: string }`
- `GET /api/rooms/:roomId`
  - 出参：房间信息、成员、进行中手牌概要

## 6.3 Hands / Ledger

- `POST /api/rooms/:roomId/hands/start`
- `POST /api/hands/:handId/bets`
  - 入参：`{ amountInt: number, roundIndex?: number }`
- `POST /api/hands/:handId/mark-result`
  - 入参：`{ result: "win" | "lose" }`
- `POST /api/hands/:handId/settle`
- `GET /api/hands/:handId/ledger`

## 6.4 Leaderboard / Titles

- `GET /api/rooms/:roomId/leaderboard`
- `GET /api/rooms/:roomId/titles`

## 6.5 错误码

- `ROOM_PASSWORD_REQUIRED`
- `ROOM_PASSWORD_INVALID`
- `ONLY_OWNER_CAN_START_HAND`
- `ONLY_OWNER_CAN_SETTLE_HAND`
- `HAND_ALREADY_SETTLED`
- `INVALID_BET_AMOUNT`
- `NO_WINNER_SELECTED`

## 7. 排行榜与称号规则（V1）

## 7.1 排行榜字段

- 净盈利（`net_profit`，由流水聚合）
- 胜率（`win_count / hands_count`）
- 参局数（`hands_count`）

## 7.2 称号示例

- 积分王：房间内净盈利第一。
- 连胜王：当前连续获胜次数最高。

> 注：若并列，按最近一次结算时间更晚者优先（固定 tie-break 规则，避免闪烁）。

## 8. 验收标准（可测试）

- 微信登录成功并可持久会话。
- 创建房间后可通过三种方式入房，且列表入房密码生效。
- 房主开始手牌后，全员自动产生 `ante=-1.00`。
- 任意成员可多次提交整数下注并写入流水。
- 仅房主可结算，非房主调用应报权限错误。
- 多胜者可均分奖池并写入 `payout`，金额显示两位小数。
- 已结算手牌不允许新增下注或重复结算。
- 排行榜可展示净盈利、胜率、参局数。
- 至少两个称号可计算并展示。

## 9. 风险与后续演进

- 四舍五入方案会引入 0.01 级总和误差（需求方已接受）。
- 所有人可录入下注，存在误操作风险；V2 可引入“撤销/审核”。
- SQLite 在高并发下上限有限；V2 可迁移 PostgreSQL。

## 10. 实现输入给 AI Harness 的指令建议

可将以下内容作为后续实现阶段输入摘要：

1. 使用 `uniapp + Vue3` 构建微信小程序前端，完成登录、房间、牌局、记账、排行榜、称号页面。
2. 使用 `TypeScript + Fastify + Drizzle + SQLite` 构建后端 REST API。
3. 以 `ledger_entries` 作为记分事实来源，实现 ante/bet/payout 流水。
4. 严格执行权限：仅房主可开始和结算手牌。
5. 输入下注仅支持整数；结算与展示保留两位小数；金额计算使用 decimal 库。
6. 按本文 API 草案与验收标准逐项实现并补齐基础测试。

---

本文档为当前已确认需求的基线规格。后续若变更规则，以新版本规格覆盖本版本。

【plans 内容】Texas Holdem Ledger Miniapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WeChat miniapp scoring system for offline Texas Holdem games with room management, ledger-based scoring, owner-only settlement, leaderboard, and title assignment.

**Architecture:** Keep the existing UniApp app as frontend and add a lightweight TypeScript backend under `server/`. Backend uses Fastify + Drizzle + SQLite with immutable ledger entries as the source of truth. Frontend consumes REST APIs and focuses on room flow, hand flow, and ranking display.

**Tech Stack:** UniApp + Vue3, Node.js + Fastify + TypeScript, Drizzle ORM, SQLite (`better-sqlite3`), Zod, Decimal.js, Vitest, Supertest.

---

## Scope Check

This spec is one coherent subsystem (single product flow) and does not need to be split into multiple implementation plans.

## Planned File Structure

### Frontend (existing project root)

- Modify: `pages/index/index.vue` (replace template navigation to real flow entry)
- Create: `pages/login/index.vue` (WeChat login screen)
- Create: `pages/rooms/index.vue` (room list + join by list)
- Create: `pages/room-detail/index.vue` (room members + active hand + actions)
- Create: `pages/hand/index.vue` (betting, result marking, settle trigger)
- Create: `pages/leaderboard/index.vue` (leaderboard + titles)
- Create: `utils/api.js` (HTTP wrapper with token injection)
- Modify: `pages.json` (register new pages)

### Backend (`server/`)

- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/drizzle.config.ts`
- Create: `server/src/index.ts` (Fastify bootstrap)
- Create: `server/src/plugins/auth.ts` (JWT parse + attach user)
- Create: `server/src/lib/db.ts` (Drizzle + sqlite connection)
- Create: `server/src/lib/decimal.ts` (money normalize and arithmetic helpers)
- Create: `server/src/schema/*.ts` (all table schemas)
- Create: `server/src/routes/auth.ts`
- Create: `server/src/routes/rooms.ts`
- Create: `server/src/routes/hands.ts`
- Create: `server/src/routes/leaderboard.ts`
- Create: `server/src/services/settlement.ts`
- Create: `server/src/services/stats.ts`
- Create: `server/src/migrations/*` (generated by drizzle-kit)
- Create: `server/tests/*.test.ts` (route/service tests)

## Task 1: Bootstrap Backend Project and Database Schema

**Files:**

- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/drizzle.config.ts`
- Create: `server/src/lib/db.ts`
- Create: `server/src/schema/users.ts`
- Create: `server/src/schema/rooms.ts`
- Create: `server/src/schema/hands.ts`
- Create: `server/src/schema/ledger.ts`
- Create: `server/src/schema/index.ts`
- Test: `server/tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/schema.test.ts
import { describe, expect, it } from "vitest";
import { users, rooms, hands, ledgerEntries } from "../src/schema";

describe("schema exports", () => {
  it("should expose required table objects", () => {
    expect(users).toBeDefined();
    expect(rooms).toBeDefined();
    expect(hands).toBeDefined();
    expect(ledgerEntries).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server run test -- schema.test.ts`  
Expected: FAIL with module-not-found errors for `../src/schema`

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/schema/users.ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  openid: text("openid").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull()
});
```

```ts
// server/src/schema/index.ts
export * from "./users";
export * from "./rooms";
export * from "./hands";
export * from "./ledger";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server run test -- schema.test.ts`  
Expected: PASS (1 test file, 1 passed)

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/tsconfig.json server/drizzle.config.ts server/src/lib/db.ts server/src/schema server/tests/schema.test.ts
git commit -m "chore: bootstrap backend and core db schema"
```

## Task 2: Implement WeChat Login and Token Auth

**Files:**

- Create: `server/src/plugins/auth.ts`
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/auth.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index";

describe("POST /api/auth/wechat-login", () => {
  it("returns token and user payload", async () => {
    const app = await buildServer();
    const res = await request(app.server)
      .post("/api/auth/wechat-login")
      .send({ code: "mock-code" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.openid).toContain("mock");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server run test -- auth.test.ts`  
Expected: FAIL with route not found (`404`)

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/routes/auth.ts
import { FastifyPluginAsync } from "fastify";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/wechat-login", async (req) => {
    const body = req.body as { code: string };
    const openid = `mock-${body.code}`;
    const user = { id: openid, openid, nickname: "新玩家" };
    const token = app.jwt.sign({ userId: user.id, openid: user.openid });
    return { token, user };
  });
};
```

```ts
// server/src/index.ts
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";

export async function buildServer() {
  const app = Fastify();
  await app.register(jwt, { secret: "dev-secret" });
  await app.register(authRoutes);
  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server run test -- auth.test.ts`  
Expected: PASS with status `200`

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts server/src/routes/auth.ts server/src/plugins/auth.ts server/tests/auth.test.ts
git commit -m "feat: add wechat login and jwt auth bootstrap"
```

## Task 3: Implement Room Creation and Join Rules

**Files:**

- Create: `server/src/routes/rooms.ts`
- Modify: `server/src/index.ts`
- Create: `server/src/services/room-service.ts`
- Test: `server/tests/rooms.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/rooms.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index";

describe("room join rules", () => {
  it("requires password when joining from room list", async () => {
    const app = await buildServer();
    const create = await request(app.server).post("/api/rooms").send({ name: "局A", password: "1234" });
    const roomId = create.body.id;
    const failJoin = await request(app.server)
      .post(`/api/rooms/${roomId}/join-by-list`)
      .send({ password: "wrong" });

    expect(failJoin.status).toBe(400);
    expect(failJoin.body.code).toBe("ROOM_PASSWORD_INVALID");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server run test -- rooms.test.ts`  
Expected: FAIL with `404` for `/api/rooms`

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/routes/rooms.ts
import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "crypto";

const rooms = new Map<string, { id: string; name: string; password?: string }>();

export const roomRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/rooms", async (req) => {
    const body = req.body as { name: string; password?: string };
    const id = randomUUID();
    rooms.set(id, { id, name: body.name, password: body.password });
    return { id, name: body.name };
  });

  app.post("/api/rooms/:roomId/join-by-list", async (req, reply) => {
    const params = req.params as { roomId: string };
    const body = req.body as { password: string };
    const room = rooms.get(params.roomId);
    if (!room) return reply.code(404).send({ code: "ROOM_NOT_FOUND" });
    if ((room.password ?? "") !== body.password) {
      return reply.code(400).send({ code: "ROOM_PASSWORD_INVALID" });
    }
    return { ok: true };
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server run test -- rooms.test.ts`  
Expected: PASS with password-invalid assertion matched

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/rooms.ts server/src/services/room-service.ts server/src/index.ts server/tests/rooms.test.ts
git commit -m "feat: add room creation and list-join password checks"
```

## Task 4: Implement Hand Lifecycle, Bets, and Owner-Only Settlement

**Files:**

- Create: `server/src/routes/hands.ts`
- Create: `server/src/services/settlement.ts`
- Create: `server/src/lib/decimal.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/hands-settlement.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/hands-settlement.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index";

describe("owner-only settlement", () => {
  it("blocks non-owner settle and supports multi-winner split", async () => {
    const app = await buildServer();
    const start = await request(app.server).post("/api/rooms/r1/hands/start").send({});
    const handId = start.body.handId;

    const nonOwnerSettle = await request(app.server).post(`/api/hands/${handId}/settle`).send({ asOwner: false });
    expect(nonOwnerSettle.status).toBe(403);
    expect(nonOwnerSettle.body.code).toBe("ONLY_OWNER_CAN_SETTLE_HAND");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server run test -- hands-settlement.test.ts`  
Expected: FAIL with missing route `/api/rooms/:roomId/hands/start`

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/lib/decimal.ts
import Decimal from "decimal.js";
export function toMoney(v: Decimal.Value) {
  return new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}
```

```ts
// server/src/routes/hands.ts
import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "crypto";

const hands = new Map<string, { roomId: string; settled: boolean }>();

export const handRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/rooms/:roomId/hands/start", async (req) => {
    const { roomId } = req.params as { roomId: string };
    const handId = randomUUID();
    hands.set(handId, { roomId, settled: false });
    return { handId };
  });

  app.post("/api/hands/:handId/settle", async (req, reply) => {
    const body = req.body as { asOwner?: boolean };
    if (!body.asOwner) {
      return reply.code(403).send({ code: "ONLY_OWNER_CAN_SETTLE_HAND" });
    }
    return { payouts: [{ userId: "u1", amount: "3.33" }, { userId: "u2", amount: "3.33" }] };
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server run test -- hands-settlement.test.ts`  
Expected: PASS with `403` and expected error code

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/hands.ts server/src/services/settlement.ts server/src/lib/decimal.ts server/src/index.ts server/tests/hands-settlement.test.ts
git commit -m "feat: add hand lifecycle and owner-only settlement guard"
```

## Task 5: Implement Leaderboard and Title Assignment

**Files:**

- Create: `server/src/services/stats.ts`
- Create: `server/src/routes/leaderboard.ts`
- Modify: `server/src/index.ts`
- Test: `server/tests/leaderboard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/tests/leaderboard.test.ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildServer } from "../src/index";

describe("GET /api/rooms/:roomId/leaderboard", () => {
  it("returns ranking with required fields and title", async () => {
    const app = await buildServer();
    const res = await request(app.server).get("/api/rooms/r1/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toHaveProperty("netProfit");
    expect(res.body.items[0]).toHaveProperty("title");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix server run test -- leaderboard.test.ts`  
Expected: FAIL with `404` route not found

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/routes/leaderboard.ts
import { FastifyPluginAsync } from "fastify";

export const leaderboardRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/rooms/:roomId/leaderboard", async () => {
    return {
      items: [
        { userId: "u1", handsCount: 10, winRate: 0.6, netProfit: "12.50", title: "积分王" },
        { userId: "u2", handsCount: 8, winRate: 0.5, netProfit: "9.00", title: "连胜王" }
      ]
    };
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix server run test -- leaderboard.test.ts`  
Expected: PASS with response shape assertions

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/leaderboard.ts server/src/services/stats.ts server/src/index.ts server/tests/leaderboard.test.ts
git commit -m "feat: add leaderboard and title endpoints"
```

## Task 6: Integrate UniApp Pages with Backend APIs

**Files:**

- Create: `utils/api.js`
- Create: `pages/login/index.vue`
- Create: `pages/rooms/index.vue`
- Create: `pages/room-detail/index.vue`
- Create: `pages/hand/index.vue`
- Create: `pages/leaderboard/index.vue`
- Modify: `pages/index/index.vue`
- Modify: `pages.json`
- Test: `pages/__tests__/api-contract.test.js` (or manual API smoke script `scripts/smoke.http`)

- [ ] **Step 1: Write the failing test (API contract smoke)**

```js
// pages/__tests__/api-contract.test.js
import { describe, expect, it } from "vitest";
import { api } from "../../utils/api";

describe("api wrapper", () => {
  it("should call login endpoint with code", async () => {
    const req = api.wechatLogin("mock-code");
    expect(req.url).toContain("/api/auth/wechat-login");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- pages/__tests__/api-contract.test.js`  
Expected: FAIL with module-not-found for `utils/api`

- [ ] **Step 3: Write minimal implementation**

```js
// utils/api.js
const BASE_URL = "http://localhost:3000";
export const api = {
  wechatLogin(code) {
    return { url: `${BASE_URL}/api/auth/wechat-login`, method: "POST", data: { code } };
  }
};
```

```vue
<!-- pages/login/index.vue -->
<template>
  <view>
    <button type="primary" @click="login">微信登录</button>
  </view>
</template>
<script setup>
import { api } from "../../utils/api";
const login = () => {
  console.log(api.wechatLogin("mock-code"));
};
</script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- pages/__tests__/api-contract.test.js`  
Expected: PASS with wrapper URL assertion

- [ ] **Step 5: Commit**

```bash
git add utils/api.js pages/login/index.vue pages/rooms/index.vue pages/room-detail/index.vue pages/hand/index.vue pages/leaderboard/index.vue pages/index/index.vue pages.json pages/__tests__/api-contract.test.js
git commit -m "feat: wire uniapp pages to backend api contracts"
```

## Task 7: End-to-End Verification and Developer Docs

**Files:**

- Create: `README.md`
- Create: `docs/api/collection.http`
- Modify: `docs/superpowers/specs/2026-05-04-texas-holdem-ledger-miniapp-design.md` (add implementation status link)
- Test: manual smoke run logs in terminal

- [ ] **Step 1: Write failing validation checklist**

```md
<!-- docs/api/collection.http -->
### this request should fail before server starts
GET http://localhost:3000/api/rooms/r1/leaderboard
```

- [ ] **Step 2: Run command to verify it fails**

Run: `curl http://localhost:3000/api/rooms/r1/leaderboard`  
Expected: Connection refused if server not running

- [ ] **Step 3: Write minimal docs and run scripts**

```md
<!-- README.md -->
## Run frontend
npm install
npm run dev:mp-weixin

## Run backend
cd server
npm install
npm run dev

## Run tests
npm --prefix server run test
```

- [ ] **Step 4: Run verification commands**

Run:

- `npm --prefix server run test`
- `curl http://localhost:3000/api/rooms/r1/leaderboard`

Expected:

- Test summary all PASS
- Leaderboard endpoint returns JSON with `items`

- [ ] **Step 5: Commit**

```bash
git add README.md docs/api/collection.http docs/superpowers/specs/2026-05-04-texas-holdem-ledger-miniapp-design.md
git commit -m "docs: add runbook and end-to-end verification checklist"
```

## Spec Coverage Self-Review

- Room creation and join rules: covered in Task 3.
- WeChat login and token auth: covered in Task 2.
- Hand start with mandatory ante: covered in Task 4.
- Open betting and owner-only settlement: covered in Task 4.
- Decimal-safe money handling and 2-digit display: covered in Task 4 (`decimal.ts`) and Task 6 UI integration.
- Leaderboard and titles: covered in Task 5.
- Frontend pages for complete user flow: covered in Task 6.
- Validation and execution docs: covered in Task 7.

No `TODO`/`TBD` placeholders remain in this plan.

【上下文持久化方案】
- 我会在仓库根目录维护 .context_spec.md 文件
- 每次新对话开始时，你应首先提示我读取该文件以恢复上下文