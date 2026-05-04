import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  openid: text("openid").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull(),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  passwordHash: text("password_hash"),
  status: text("status", { enum: ["active", "closed"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const roomMembers = sqliteTable("room_members", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  joinedAt: text("joined_at").notNull(),
}, (table) => ({
  unqRoomUser: unique().on(table.roomId, table.userId),
}));

export const hands = sqliteTable("hands", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  handNo: integer("hand_no").notNull(),
  status: text("status", { enum: ["ongoing", "settled"] }).notNull().default("ongoing"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  settledBy: text("settled_by"),
}, (table) => ({
  unqRoomHand: unique().on(table.roomId, table.handNo),
}));

export const handPlayers = sqliteTable("hand_players", {
  id: text("id").primaryKey(),
  handId: text("hand_id").notNull(),
  userId: text("user_id").notNull(),
  isWinner: integer("is_winner").notNull().default(0),
  isLoser: integer("is_loser").notNull().default(0),
  resultAmount: text("result_amount"),
}, (table) => ({
  unqHandUser: unique().on(table.handId, table.userId),
}));

export const ledgerEntries = sqliteTable("ledger_entries", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  handId: text("hand_id").notNull(),
  userId: text("user_id").notNull(),
  entryType: text("entry_type", { enum: ["ante", "bet", "payout", "adjust"] }).notNull(),
  amount: text("amount").notNull(),
  roundIndex: integer("round_index"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const titles = sqliteTable("titles", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  ruleType: text("rule_type", { enum: ["profit_top", "win_streak_top"] }).notNull(),
});

export const userRoomStats = sqliteTable("user_room_stats", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull(),
  userId: text("user_id").notNull(),
  handsCount: integer("hands_count").notNull().default(0),
  winCount: integer("win_count").notNull().default(0),
  netProfit: text("net_profit").notNull().default("0.00"),
  currentTitle: text("current_title"),
}, (table) => ({
  unqRoomUser: unique().on(table.roomId, table.userId),
}));
