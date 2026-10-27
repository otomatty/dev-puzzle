import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../shared/api";
import { App } from "./App";
import { colored, mockFetch, straightLine, summaries } from "./test/fixtures";

const ROUTES = {
  "GET /api/me": { user: null },
  "GET /api/puzzles": { puzzles: summaries },
  "GET /api/puzzles/first-steps": { puzzle: straightLine },
  "GET /api/puzzles/colored": { puzzle: colored },
  "POST /api/puzzles/first-steps/clears": { solves: 4 },
};

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
    fetchMock = vi.fn(mockFetch(ROUTES));
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

describe("ログイン", () => {
  const signedIn: User = {
    id: "user-1",
    name: "ロボ 太郎",
    email: "robo@example.com",
    picture: null,
  };

  function stubFetch(routes: Record<string, unknown>) {
    const fetchMock = vi.fn(mockFetch(routes));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("未ログインなら、今の画面に戻ってくる Google ログインのリンクを表示する", async () => {
    stubFetch(ROUTES);
    window.history.replaceState(null, "", "/puzzles/first-steps");
    render(<App />);
    expect(await screen.findByRole("link", { name: "Google でログイン" })).toHaveAttribute(
      "href",
      "/api/auth/google?returnTo=%2Fpuzzles%2Ffirst-steps",
    );
  });

  it("ログイン状態を確かめられなくても、ログインのリンクは表示する", async () => {
    const { "GET /api/me": _, ...withoutMe } = ROUTES;
    stubFetch(withoutMe);
    render(<App />);
    expect(await screen.findByRole("link", { name: "Google でログイン" })).toBeInTheDocument();
  });

  it("ログイン中なら名前を表示し、ログアウトできる", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({
      ...ROUTES,
      "GET /api/me": { user: signedIn },
      "POST /api/auth/logout": {},
    });
    render(<App />);
    expect(await screen.findByText("ロボ 太郎")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Google でログイン" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(await screen.findByRole("link", { name: "Google でログイン" })).toBeInTheDocument();
    expect(screen.queryByText("ロボ 太郎")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("プロフィール画像を表示し、読み込めなければ頭文字に切り替える", async () => {
    const picture = "https://lh3.googleusercontent.com/a/robo";
    stubFetch({ ...ROUTES, "GET /api/me": { user: { ...signedIn, picture } } });
    const { container } = render(<App />);
    await screen.findByText("ロボ 太郎");
    const img = container.querySelector("img.account-avatar");
    expect(img).toHaveAttribute("src", picture);
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");

    if (img) fireEvent.error(img);
    expect(container.querySelector("img.account-avatar")).not.toBeInTheDocument();
    expect(container.querySelector(".account-avatar")).toHaveTextContent("ロ");
  });

  it("ログアウトに失敗したらログイン中のまま", async () => {
    const user = userEvent.setup();
    stubFetch({ ...ROUTES, "GET /api/me": { user: signedIn } });
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "ログアウト" }));
    expect(screen.getByText("ロボ 太郎")).toBeInTheDocument();
  });

  it("ログインに失敗して戻ってきたら案内を出し、URL からは消す", async () => {
    const user = userEvent.setup();
    stubFetch(ROUTES);
    window.history.replaceState(null, "", "/?login=failed");
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("Google でログインできませんでした");
    expect(window.location.search).toBe("");

    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
