# 打牌记账微信小程序设计文档（AI Harness 版）

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
