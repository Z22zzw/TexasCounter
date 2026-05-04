import { db } from "../lib/db.js";
import { userRoomStats, handPlayers, hands, ledgerEntries, titles } from "../schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export function getLeaderboard(roomId: string) {
  const rows = db.select()
    .from(userRoomStats)
    .where(eq(userRoomStats.roomId, roomId))
    .orderBy(desc(userRoomStats.netProfit))
    .all();

  const items = rows.map((r, i) => {
    const title = computeTitle(r.userId, roomId, r.netProfit, i, rows);
    return {
      userId: r.userId,
      handsCount: r.handsCount,
      winRate: r.handsCount > 0 ? r.winCount / r.handsCount : 0,
      netProfit: r.netProfit,
      title,
    };
  });

  return { items };
}

export function getTitles(roomId: string) {
  const allTitles = db.select().from(titles).all();
  return { items: allTitles };
}

function computeTitle(
  _userId: string,
  _roomId: string,
  netProfit: string,
  rank: number,
  allStats: Array<{ userId: string; netProfit: string }>,
): string | null {
  // Seed titles if not present
  const existing = db.select().from(titles).all();
  if (existing.length === 0) {
    db.insert(titles).values([
      { id: randomUUID(), key: "profit_king", name: "积分王", ruleType: "profit_top" },
      { id: randomUUID(), key: "streak_king", name: "连胜王", ruleType: "win_streak_top" },
    ]).run();
  }

  // Profit king: top net profit
  if (rank === 0 && parseFloat(netProfit) > 0) {
    return "积分王";
  }

  return null;
}

export function seedTitles() {
  const existing = db.select().from(titles).all();
  if (existing.length === 0) {
    db.insert(titles).values([
      { id: randomUUID(), key: "profit_king", name: "积分王", ruleType: "profit_top" },
      { id: randomUUID(), key: "streak_king", name: "连胜王", ruleType: "win_streak_top" },
    ]).run();
  }
}
