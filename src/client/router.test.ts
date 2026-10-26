import { describe, expect, it } from "vitest";
import { matchRoute, puzzlePath } from "./router";

describe("matchRoute", () => {
  it.each([
    ["/", { name: "list" }],
    ["/puzzles/first-steps", { name: "play", id: "first-steps" }],
    ["/puzzles/first-steps/", { name: "play", id: "first-steps" }],
    ["/puzzles/", { name: "notFound" }],
    ["/puzzles/Bad_ID", { name: "notFound" }],
    ["/other", { name: "notFound" }],
  ])("%s", (path, route) => {
    expect(matchRoute(path)).toEqual(route);
  });

  it("puzzlePath と対になる", () => {
    expect(matchRoute(puzzlePath("way-back"))).toEqual({ name: "play", id: "way-back" });
  });
});
