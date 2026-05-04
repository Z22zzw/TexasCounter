import Decimal from "decimal.js";
import { toMoney, sum, divide } from "../lib/decimal.js";
import { randomUUID } from "crypto";
import { db } from "../lib/db.js";
import { ledgerEntries, handPlayers, hands, userRoomStats } from "../schema/index.js";
import { eq, and } from "drizzle-orm";

export function computePayouts(
  winnerIds: string[],
  totalPool: Decimal.Value
): Array<{ userId: string; amount: string }> {
  if (winnerIds.length === 0) throw new Error("NO_WINNER_SELECTED");
  const perWinner = divide(totalPool, winnerIds.length);
  const rounded = toMoney(perWinner);

  // Distribute with rounding — last winner absorbs remainder
  const exactShare = new Decimal(rounded).times(winnerIds.length);
  const remainder = new Decimal(totalPool).minus(exactShare);

  return winnerIds.map((uid, i) => ({
    userId: uid,
    amount: i === winnerIds.length - 1
      ? toMoney(new Decimal(rounded).plus(remainder))
      : rounded,
  }));
}

export function executeSettlement(
  roomId: string,
  handId: string,
  winnerIds: string[],
  settledBy: string
): Array<{ userId: string; amount: string }> {
  // Aggregate ante + bet amounts for this hand
  const rows = db.select({ amount: ledgerEntries.amount })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.handId, handId),
        eq(ledgerEntries.entryType, "ante")
      )
    ).all();

  const betRows = db.select({ amount: ledgerEntries.amount })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.handId, handId),
        eq(ledgerEntries.entryType, "bet")
      )
    ).all();

  const allOutflows = [...rows, ...betRows];
  const totalPool = sum(allOutflows.map(r => r.amount)).abs();

  const payouts = computePayouts(winnerIds, totalPool);
  const now = new Date().toISOString();

  // Write payout ledger entries
  for (const p of payouts) {
    db.insert(ledgerEntries).values({
      id: randomUUID(),
      roomId,
      handId,
      userId: p.userId,
      entryType: "payout",
      amount: p.amount,
      createdBy: settledBy,
      createdAt: now,
    }).run();
  }

  // Mark hand settled
  db.update(hands).set({
    status: "settled",
    endedAt: now,
    settledBy,
  }).where(eq(hands.id, handId)).run();

  // Update hand_players result_amount
  for (const p of payouts) {
    db.update(handPlayers)
      .set({ resultAmount: p.amount })
      .where(and(eq(handPlayers.handId, handId), eq(handPlayers.userId, p.userId)))
      .run();
  }

  // Refresh stats
  refreshRoomStats(roomId);

  return payouts;
}

function refreshRoomStats(roomId: string) {
  const members = db.select().from(handPlayers)
    .innerJoin(hands, eq(hands.id, handPlayers.handId))
    .where(and(eq(hands.roomId, roomId), eq(hands.status, "settled")))
    .all();

  // Group by user
  const statsByUser = new Map<string, { handsCount: number; winCount: number; netProfit: Decimal }>();

  for (const row of members) {
    const uid = row.hand_players.userId;
    let s = statsByUser.get(uid);
    if (!s) {
      s = { handsCount: 0, winCount: 0, netProfit: new Decimal(0) };
      statsByUser.set(uid, s);
    }
    s.handsCount++;
    if (row.hand_players.isWinner) {
      s.winCount++;
      if (row.hand_players.resultAmount) {
        s.netProfit = s.netProfit.plus(row.hand_players.resultAmount);
      }
    }
    // Also subtract ante/bet outflows
    const outflows = db.select({ amount: ledgerEntries.amount })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.userId, uid),
          eq(ledgerEntries.handId, row.hand_players.handId),
          eq(ledgerEntries.entryType, "ante")
        )
      ).all();

    const betOutflows = db.select({ amount: ledgerEntries.amount })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.userId, uid),
          eq(ledgerEntries.handId, row.hand_players.handId),
          eq(ledgerEntries.entryType, "bet")
        )
      ).all();

    for (const o of [...outflows, ...betOutflows]) {
      s.netProfit = s.netProfit.plus(o.amount); // amounts are negative
    }
  }

  // Upsert stats
  for (const [uid, s] of statsByUser) {
    const existing = db.select().from(userRoomStats)
      .where(and(eq(userRoomStats.roomId, roomId), eq(userRoomStats.userId, uid)))
      .get();

    if (existing) {
      db.update(userRoomStats).set({
        handsCount: s.handsCount,
        winCount: s.winCount,
        netProfit: toMoney(s.netProfit),
      }).where(eq(userRoomStats.id, existing.id)).run();
    } else {
      db.insert(userRoomStats).values({
        id: randomUUID(),
        roomId,
        userId: uid,
        handsCount: s.handsCount,
        winCount: s.winCount,
        netProfit: toMoney(s.netProfit),
      }).run();
    }
  }
}
