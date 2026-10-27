import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { User } from "./auth";
import { colored, mockFetch, straightLine, summaries } from "./test/fixtures";

const signedIn: User = {
  id: "user-1",
  name: "ロボ 太郎",
  email: "robo@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  updatedAt: new Date("2026-10-01T00:00:00Z"),
};

function session(user: User) {
  return {
    user,
    session: { id: "session-1", userId: user.id, expiresAt: "2026-11-30T00:00:00Z" },
  };
}

/** ふだんはログイン中として応答する */
const ROUTES = {
  "GET /api/auth/get-session": session(signedIn),
  "GET /api/puzzles": { puzzles: summaries },
  "GET /api/puzzles/first-steps": { puzzle: straightLine },
  "GET /api/puzzles/colored": { puzzle: colored },
  "POST /api/puzzles/first-steps/clears": { solves: 4 },
};

const SIGNED_OUT = { ...ROUTES, "GET /api/auth/get-session": null };

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

  it("未定義のページは案内を表示する", async () => {
    window.history.replaceState(null, "", "/nowhere");
    render(<App />);
    expect(await screen.findByText("このページは見つかりません。")).toBeInTheDocument();
  });

  it("色を形でも表示する設定を保存する", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("switch", { name: "色を形でも表示" }));
    expect(window.localStorage.getItem("robozzle:color-assist")).toBe("true");
  });
});

describe("ログイン", () => {
  function stubFetch(routes: Record<string, unknown>) {
    const fetchMock = vi.fn(mockFetch(routes));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  /** 指定したメソッドとパスへのリクエストの本文(JSON) */
  function bodiesOf(fetchMock: ReturnType<typeof vi.fn>, method: string, path: string) {
    return fetchMock.mock.calls
      .filter(([input, init]) => {
        const url = new URL(String(input), window.location.origin);
        return (init?.method ?? "GET").toUpperCase() === method && url.pathname === path;
      })
      .map(([, init]) => JSON.parse(String(init?.body ?? "null")));
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("ログインしていなければ、開いた画面の代わりにログイン画面を出し、ステージは読み込まない", async () => {
    const fetchMock = stubFetch(SIGNED_OUT);
    window.history.replaceState(null, "", "/puzzles/first-steps");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "ログインして遊ぶ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google でログイン" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
    expect(document.title).toBe("ログイン | DevPuzzle");
    const paths = fetchMock.mock.calls.map(
      ([input]) => new URL(String(input), "http://x").pathname,
    );
    expect(paths.filter((path) => path.startsWith("/api/puzzles"))).toEqual([]);
  });

  it("ログイン状態を確かめているあいだは、ステージもログイン画面も出さない", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );
    render(<App />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Google でログイン" })).not.toBeInTheDocument();
  });

  it("押すと今の画面に戻ってくる設定で Google の画面に移る", async () => {
    const user = userEvent.setup();
    const assign = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    const googleUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=test";
    const fetchMock = stubFetch({
      ...SIGNED_OUT,
      "POST /api/auth/sign-in/social": { url: googleUrl, redirect: false },
    });
    window.history.replaceState(null, "", "/puzzles/first-steps");
    render(<App />);

    const button = await screen.findByRole("button", { name: "Google でログイン" });
    await user.click(button);
    expect(bodiesOf(fetchMock, "POST", "/api/auth/sign-in/social")).toEqual([
      {
        provider: "google",
        callbackURL: "/puzzles/first-steps",
        errorCallbackURL: "/puzzles/first-steps",
        disableRedirect: true,
      },
    ]);
    expect(assign).toHaveBeenCalledWith(googleUrl);
    // Google の画面に移るまで二重に押せない
    expect(button).toBeDisabled();
  });

  it("ログインを始められなければ案内を出し、もう一度押せるようにする", async () => {
    const user = userEvent.setup();
    stubFetch(SIGNED_OUT);
    render(<App />);
    const button = await screen.findByRole("button", { name: "Google でログイン" });
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Google でログインできませんでした");
    expect(button).toBeEnabled();
  });

  it("通信できなくても、ログインのボタンを表示し、押したら案内を出す", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const { pathname } = new URL(String(input), window.location.origin);
        if (pathname.startsWith("/api/auth/")) throw new TypeError("Failed to fetch");
        return mockFetch(ROUTES)(input, init);
      }),
    );
    render(<App />);
    const button = await screen.findByRole("button", { name: "Google でログイン" });
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Google でログインできませんでした");
    expect(button).toBeEnabled();
  });

  it("ログイン状態を確かめられなければ、ログイン画面を出す", async () => {
    const { "GET /api/auth/get-session": _, ...withoutSession } = ROUTES;
    stubFetch(withoutSession);
    render(<App />);
    expect(await screen.findByRole("button", { name: "Google でログイン" })).toBeInTheDocument();
  });

  it("ログイン中なら名前を表示し、ログアウトするとログイン画面に戻る", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch({ ...ROUTES, "POST /api/auth/sign-out": { success: true } });
    render(<App />);
    expect(await screen.findByText("ロボ 太郎")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /まっすぐ進もう/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Google でログイン" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(await screen.findByRole("heading", { name: "ログインして遊ぶ" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /まっすぐ進もう/ })).not.toBeInTheDocument();
    expect(screen.queryByText("ロボ 太郎")).not.toBeInTheDocument();
    expect(bodiesOf(fetchMock, "POST", "/api/auth/sign-out")).toHaveLength(1);
  });

  it("遊んでいるあいだにセッションが切れたら、ログイン画面に戻す", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const { pathname } = new URL(String(input), window.location.origin);
        if (pathname === "/api/puzzles/colored") {
          return new Response(JSON.stringify({ error: "ログインしてください" }), { status: 401 });
        }
        return mockFetch(ROUTES)(input, init);
      }),
    );
    render(<App />);
    await user.click(await screen.findByRole("link", { name: /色つき/ }));
    expect(await screen.findByRole("heading", { name: "ログインして遊ぶ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
    // ログインし直すと、開こうとしていたステージに戻る
    expect(window.location.pathname).toBe("/puzzles/colored");
  });

  it("プロフィール画像を表示し、読み込めなければ頭文字に切り替える", async () => {
    const image = "https://lh3.googleusercontent.com/a/robo";
    stubFetch({ ...ROUTES, "GET /api/auth/get-session": session({ ...signedIn, image }) });
    const { container } = render(<App />);
    await screen.findByText("ロボ 太郎");
    const img = container.querySelector("img.account-avatar");
    expect(img).toHaveAttribute("src", image);
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");

    if (img) fireEvent.error(img);
    expect(container.querySelector("img.account-avatar")).not.toBeInTheDocument();
    expect(container.querySelector(".account-avatar")).toHaveTextContent("ロ");
  });

  it("ログアウトに失敗したらログイン中のまま", async () => {
    const user = userEvent.setup();
    stubFetch(ROUTES);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "ログアウト" }));
    expect(screen.getByText("ロボ 太郎")).toBeInTheDocument();
  });

  it("ログインに失敗して戻ってきたら案内を出し、URL からは消す", async () => {
    const user = userEvent.setup();
    stubFetch(SIGNED_OUT);
    window.history.replaceState(null, "", "/puzzles/first-steps?error=state_mismatch");
    render(<App />);
    expect(screen.getByRole("alert")).toHaveTextContent("Google でログインできませんでした");
    expect(window.location.pathname).toBe("/puzzles/first-steps");
    expect(window.location.search).toBe("");

    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Google の画面でキャンセルして戻ってきたときは案内を出さない", async () => {
    stubFetch(SIGNED_OUT);
    window.history.replaceState(null, "", "/?error=access_denied");
    render(<App />);
    expect(await screen.findByRole("button", { name: "Google でログイン" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
