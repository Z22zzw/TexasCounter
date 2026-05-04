import { describe, expect, it } from "vitest";
import { users, rooms, hands, ledgerEntries, titles } from "../src/schema/index.js";

describe("schema exports", () => {
  it("should expose required table objects", () => {
    expect(users).toBeDefined();
    expect(rooms).toBeDefined();
    expect(hands).toBeDefined();
    expect(ledgerEntries).toBeDefined();
    expect(titles).toBeDefined();
  });
});
