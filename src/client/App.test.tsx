import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { colored, mockFetch, straightLine, summaries } from "./test/fixtures";

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    fetchMock = vi.fn(
      mockFetch({
        "GET /api/puzzles": { puzzles: summaries },
        "GET /api/puzzles/first-steps": { puzzle: straightLine },
        "GET /api/puzzles/colored": { puzzle: colored },
        "POST /api/puzzles/first-steps/clears": { solves: 4 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ステージ一覧を表示する", async () => {
    render(<App />);
    expect(await screen.findByRole("link", { name: /まっすぐ進もう/ })).toHaveAttribute(
      "href",
      "/puzzles/first-steps",
    );
    expect(screen.getByText("2 ステージ中 0 ステージをクリア")).toBeInTheDocument();
  });

  it("ステージを選ぶとプレイ画面に移り、初めてのクリアだけ報告する", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("link", { name: /まっすぐ進もう/ }));
    expect(window.location.pathname).toBe("/puzzles/first-steps");
    expect(await screen.findByRole("heading", { name: "まっすぐ進もう" })).toBeInTheDocument();
    expect(screen.getByText("3 人がクリア")).toBeInTheDocument();

    for (let i = 0; i < 4; i++) await user.click(screen.getByRole("button", { name: "前進" }));
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "1 手進める" }));
    }
    expect(await screen.findByText("4 人がクリア")).toBeInTheDocument();
    expect(screen.getAllByText("クリア済み").length).toBeGreaterThan(0);

    // もう一度クリアしても報告しない
    await user.click(
      within(screen.getByRole("status")).getByRole("button", { name: "もう一度見る" }),
    );
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "1 手進める" }));
    }
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
  });

  it("存在しないステージはエラーを表示する", async () => {
    window.history.replaceState(null, "", "/puzzles/missing");
    render(<App />);
    expect(await screen.findByText("見つかりません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ステージ一覧に戻る" })).toBeInTheDocument();
  });

  it("未定義のページは案内を表示する", () => {
    window.history.replaceState(null, "", "/nowhere");
    render(<App />);
    expect(screen.getByText("このページは見つかりません。")).toBeInTheDocument();
  });

  it("色を形でも表示する設定を保存する", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("switch", { name: "色を形でも表示" }));
    expect(window.localStorage.getItem("robozzle:color-assist")).toBe("true");
  });
});
