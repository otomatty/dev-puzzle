import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseNotation } from "../engine";
import {
  loadCleared,
  loadColorAssist,
  loadProgram,
  markCleared,
  saveColorAssist,
  saveProgram,
  unmarkCleared,
} from "./storage";
import { straightLine } from "./test/fixtures";

describe("storage", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("クリアしたステージを記録する", () => {
    expect(loadCleared().size).toBe(0);
    markCleared("a");
    markCleared("b");
    markCleared("a");
    expect([...loadCleared()]).toEqual(["a", "b"]);

    unmarkCleared("a");
    unmarkCleared("c");
    expect([...loadCleared()]).toEqual(["b"]);
  });

  it("プログラムを保存して読み戻す", () => {
    const program = parseNotation(["F F"], straightLine.definition);
    saveProgram(straightLine.id, program);
    expect(loadProgram(straightLine.id, straightLine.definition)).toEqual(program);
  });

  it("ステージの形と合わない保存データは捨てる", () => {
    saveProgram(straightLine.id, parseNotation(["F", "F"]));
    expect(loadProgram(straightLine.id, straightLine.definition)).toBeNull();
  });

  it("壊れた JSON は無視する", () => {
    window.localStorage.setItem("robozzle:cleared", "{oops");
    expect(loadCleared().size).toBe(0);
  });

  it("localStorage が使えなくても例外にしない", () => {
    // ブラウザの設定でストレージが拒否されると、localStorage へのアクセス自体が例外になる
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => markCleared("a")).not.toThrow();
    expect(loadCleared().size).toBe(0);
    expect(() => saveColorAssist(true)).not.toThrow();
    expect(loadColorAssist()).toBe(false);
  });
});
