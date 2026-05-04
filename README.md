# TexasCounter — 德州扑克记分微信小程序

线下德州扑克朋友局的记分工具，支持多人房间、快速记账与结算、排行榜和称号。

## 技术栈

- **前端**: UniApp + Vue3 (微信小程序)
- **后端**: Node.js + TypeScript + Fastify
- **数据库**: SQLite (better-sqlite3 + Drizzle ORM)
- **精确计算**: decimal.js
- **测试**: Vitest + Supertest

## 项目结构

```
├── pages/                    # UniApp 前端页面
│   ├── index/index.vue       # 首页
│   ├── login/index.vue       # 微信登录
│   ├── rooms/index.vue       # 房间列表 + 创建/加入
│   ├── room-detail/index.vue # 房间详情 + 成员
│   ├── hand/index.vue        # 牌局: 下注/标记/结算
│   └── leaderboard/index.vue # 排行榜 + 称号
├── utils/api.js              # 前端 API 封装
├── server/                   # 后端服务
│   ├── src/
│   │   ├── index.ts          # Fastify 入口
│   │   ├── routes/           # API 路由
│   │   ├── services/         # 业务逻辑 (结算/统计)
│   │   ├── schema/           # 数据库表定义
│   │   ├── lib/              # 工具 (DB/Decimal)
│   │   └── plugins/          # JWT 认证
│   └── tests/                # 后端测试
└── docker-compose.yml        # Docker 部署配置
```

## 快速开始

### 前端

```bash
npm install
npm run dev:mp-weixin
```

### 后端

```bash
cd server
npm install
cp .env.example .env    # 编辑配置
npm run dev              # 开发模式 (http://localhost:3000)
npm run test             # 运行测试
```

### Docker 部署

```bash
docker compose up -d
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/wechat-login | 微信登录 |
| POST | /api/rooms | 创建房间 |
| GET  | /api/rooms | 房间列表 |
| GET  | /api/rooms/:id | 房间详情 |
| POST | /api/rooms/:id/join-by-code | 扫码/房间码加入 |
| POST | /api/rooms/:id/join-by-list | 列表加入（需密码） |
| POST | /api/rooms/:id/hands/start | 开始一手牌 |
| POST | /api/hands/:id/bets | 下注 |
| POST | /api/hands/:id/mark-result | 标记胜负 |
| POST | /api/hands/:id/settle | 结算 |
| GET  | /api/hands/:id/ledger | 流水查询 |
| GET  | /api/rooms/:id/leaderboard | 排行榜 |
| GET  | /api/rooms/:id/titles | 称号列表 |

## 错误码

- `ROOM_PASSWORD_REQUIRED` / `ROOM_PASSWORD_INVALID`
- `ONLY_OWNER_CAN_START_HAND` / `ONLY_OWNER_CAN_SETTLE_HAND`
- `HAND_ALREADY_SETTLED` / `HAND_STILL_ONGOING`
- `INVALID_BET_AMOUNT` / `NO_WINNER_SELECTED`

## CI/CD

推送代码到 `main` 分支自动触发：
1. 运行测试
2. 构建 Docker 镜像
3. 部署到服务器 (49.235.100.186)

需要在 GitHub Secrets 中配置 `SSH_PRIVATE_KEY`。
