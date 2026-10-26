import { describe, expect, it } from "vitest";
import { DIRECTIONS, delta, turnLeft, turnRight } from "./direction";

describe("direction", () => {
  it.each([
    ["up", "left"],
    ["left", "down"],
    ["down", "right"],
    ["right", "up"],
  ] as const)("%s から左に曲がると %s", (from, to) => {
    expect(turnLeft(from)).toBe(to);
  });

  it.each([
    ["up", "right"],
    ["right", "down"],
    ["down", "left"],
    ["left", "up"],
  ] as const)("%s から右に曲がると %s", (from, to) => {
    expect(turnRight(from)).toBe(to);
  });

  it("4 回右に曲がると元の向きに戻る", () => {
    for (const d of DIRECTIONS) {
      expect(turnRight(turnRight(turnRight(turnRight(d))))).toBe(d);
    }
  });

  it("上方向は y が減る(画面座標)", () => {
    expect(delta("up")).toEqual({ dx: 0, dy: -1 });
  });
});
