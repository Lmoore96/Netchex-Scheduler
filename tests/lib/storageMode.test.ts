import { beforeEach, describe, expect, it } from "vitest";
import { readDatabaseConnected, writeDatabaseConnected } from "../../src/lib/storageMode";

describe("storageMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to connected mode", () => {
    expect(readDatabaseConnected()).toBe(true);
  });

  it("persists a manually selected mode", () => {
    writeDatabaseConnected(false);
    expect(readDatabaseConnected()).toBe(false);

    writeDatabaseConnected(true);
    expect(readDatabaseConnected()).toBe(true);
  });
});
