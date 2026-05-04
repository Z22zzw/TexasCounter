import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema/index.js";

const sqlite = new Database(process.env.DATABASE_URL || "./data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      openid TEXT UNIQUE NOT NULL,
      nickname TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_members (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      UNIQUE(room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS hands (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      hand_no INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ongoing',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      settled_by TEXT,
      UNIQUE(room_id, hand_no)
    );

    CREATE TABLE IF NOT EXISTS hand_players (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_winner INTEGER NOT NULL DEFAULT 0,
      is_loser INTEGER NOT NULL DEFAULT 0,
      result_amount TEXT,
      UNIQUE(hand_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      hand_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      amount TEXT NOT NULL,
      round_index INTEGER,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS titles (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_room_stats (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      hands_count INTEGER NOT NULL DEFAULT 0,
      win_count INTEGER NOT NULL DEFAULT 0,
      net_profit TEXT NOT NULL DEFAULT '0.00',
      current_title TEXT,
      UNIQUE(room_id, user_id)
    );
  `);
}
