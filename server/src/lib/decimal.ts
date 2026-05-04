import Decimal from "decimal.js";

export function toMoney(v: Decimal.Value): string {
  return new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function add(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).plus(b);
}

export function sum(vals: Decimal.Value[]): Decimal {
  return vals.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0));
}

export function divide(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).dividedBy(b);
}

export function isPositive(v: Decimal.Value): boolean {
  return new Decimal(v).gt(0);
}

export function isZero(v: Decimal.Value): boolean {
  return new Decimal(v).isZero();
}
