import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MeResponse } from "../shared/api";
import { safeReturnTo } from "./auth";
import { base64url, sha256, TOKEN_ENDPOINT } from "./google";
import app from "./index";
import { SESSION_TTL } from "./session";
import { fakeIdToken } from "./test/fixtures";

const ORIGIN = "http://example.com";
const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.restoreAllMocks();
});

function fetchApi(path: string, init?: RequestInit) {
  // Google への転送を追いかけず、302 のまま受け取る
  return exports.default.fetch(`${ORIGIN}/api${path}`, { redirect: "manual", ...init });
}

/** Set-Cookie のうち、指定した名前のものを返す */
function setCookieFor(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

/** リクエストに付ける「名前=値」 */
function cookieFor(res: Response, name: string): string {
  return setCookieFor(res, name)?.split(";")[0] ?? "";
}

async function startLogin(returnTo?: string) {
  const query = returnTo === undefined ? "" : `?returnTo=${encodeURIComponent(returnTo)}`;
  const res = await fetchApi(`/auth/google${query}`);
  const location = new URL(res.headers.get("location") ?? "");
  return { res, location, params: location.searchParams, cookie: cookieFor(res, "google_login") };
}

function googleClaims(nonce: string, overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: env.GOOGLE_CLIENT_ID,
    sub: "google-user-1",
    email: "robo@example.com",
    name: "ロボ 太郎",
    picture: "https://lh3.googleusercontent.com/a/robo",
    nonce,
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

/** Google のトークンエンドポイントを差し替え、送られた本文を記録する */
function mockTokenEndpoint(respond: () => Response) {
  const bodies: URLSearchParams[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== TOKEN_ENDPOINT) throw new Error(`想定外のリクエスト: ${url}`);
    bodies.push(new URLSearchParams(String(init?.body)));
    return respond();
  });
  return { spy, bodies };
}

function callback(query: Record<string, string>, cookie: string) {
  return fetchApi(`/auth/google/callback?${new URLSearchParams(query)}`, { headers: { cookie } });
}

/** ログイン開始から Google のコールバックまでを通しで行う */
async function login(overrides: Record<string, unknown> = {}, returnTo = "/puzzles/corners") {
  const start = await startLogin(returnTo);
  const nonce = start.params.get("nonce") ?? "";
  const google = mockTokenEndpoint(() =>
    Response.json({ id_token: fakeIdToken(googleClaims(nonce, overrides)) }),
  );
  const res = await callback(
    { code: "auth-code", state: start.params.get("state") ?? "" },
    start.cookie,
  );
  return { start, google, res, session: cookieFor(res, "session") };
}

async function me(cookie?: string) {
  const res = await fetchApi("/me", { headers: cookie ? { cookie } : {} });
  return { res, user: (await res.json<MeResponse>()).user };
}

function logout(cookie: string, origin = ORIGIN) {
  return fetchApi("/auth/logout", { method: "POST", headers: { cookie, origin } });
}

function silenceConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("GET /api/me", () => {
  it("ログインしていなければ user は null", async () => {
    const { res, user } = await me();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(user).toBeNull();
  });

  it("知らないセッションなら null を返し、Cookie を消す", async () => {
    const { res, user } = await me("session=unknown-token");
    expect(user).toBeNull();
    expect(setCookieFor(res, "session")).toContain("Max-Age=0");
  });
});

describe("GET /api/auth/google", () => {
  it("Google の認可画面へ転送し、ログイン用の Cookie を置く", async () => {
    const { res, location, params } = await startLogin("/puzzles/corners");
    expect(res.status).toBe(302);
    expect(`${location.origin}${location.pathname}`).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(params.get("client_id")).toBe(env.GOOGLE_CLIENT_ID);
    expect(params.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback`);
    expect(params.get("code_challenge_method")).toBe("S256");

    const cookie = setCookieFor(res, "google_login") ?? "";
    expect(cookie).toContain("Path=/api/auth/google");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=600");
  });

  it("OAuth クライアントが設定されていなければ 503", async () => {
    const res = await app.request("/api/auth/google", {}, { ...env, GOOGLE_CLIENT_ID: "" });
    expect(res.status).toBe(503);
  });
});

describe("safeReturnTo", () => {
  it.each(["/", "/puzzles/corners", "/puzzles/red-corners/"])("%s はそのまま", (path) => {
    expect(safeReturnTo(path)).toBe(path);
  });

  it.each([
    undefined,
    "",
    "puzzles",
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/puzzles?login=failed",
    `/${"a".repeat(200)}`,
  ])("%s はアプリの外かもしれないので / にする", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });
});

describe("GET /api/auth/google/callback", () => {
  it("認可コードを交換してセッションを作り、元の画面に戻す", async () => {
    const { start, google, res, session } = await login();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/puzzles/corners");

    // PKCE: 送った code_verifier が、開始時の code_challenge と対応している
    const [body] = google.bodies;
    expect(body?.get("grant_type")).toBe("authorization_code");
    expect(body?.get("code")).toBe("auth-code");
    expect(body?.get("client_id")).toBe(env.GOOGLE_CLIENT_ID);
    expect(body?.get("client_secret")).toBe(env.GOOGLE_CLIENT_SECRET);
    expect(body?.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback`);
    expect(base64url(await sha256(body?.get("code_verifier") ?? ""))).toBe(
      start.params.get("code_challenge"),
    );

    const sessionCookie = setCookieFor(res, "session") ?? "";
    expect(sessionCookie).toContain("Path=/");
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("SameSite=Lax");
    expect(sessionCookie).toContain(`Max-Age=${SESSION_TTL / 1000}`);
    expect(setCookieFor(res, "google_login")).toContain("Max-Age=0");

    const { user } = await me(session);
    expect(user).toEqual({
      id: expect.any(String),
      name: "ロボ 太郎",
      email: "robo@example.com",
      picture: "https://lh3.googleusercontent.com/a/robo",
    });
  });

  it("DB にはセッションのトークンそのものを保存しない", async () => {
    const { session } = await login();
    const token = session.slice("session=".length);
    const { results } = await env.DB.prepare("SELECT id FROM sessions").run<{ id: string }>();
    expect(results).toHaveLength(1);
    expect(results[0]?.id).not.toBe(token);
    expect(results[0]?.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("同じ Google アカウントなら同じユーザーとして、名前などを更新する", async () => {
    const first = await me((await login()).session);
    const second = await me((await login({ name: "ロボ 次郎", picture: undefined })).session);
    expect(second.user).toEqual({ ...first.user, name: "ロボ 次郎", picture: null });

    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first<number>("n");
    expect(count).toBe(1);
  });

  it("Google の画面でキャンセルしたら、そのまま元の画面に戻す", async () => {
    const start = await startLogin("/puzzles/corners");
    const res = await callback({ error: "access_denied" }, start.cookie);
    expect(res.headers.get("location")).toBe("/puzzles/corners");
    expect(setCookieFor(res, "session")).toBeUndefined();
  });

  it("state が一致しなければ、トークンを交換せずに失敗として戻す", async () => {
    const start = await startLogin("/puzzles/corners");
    const google = mockTokenEndpoint(() => Response.json({}));
    const res = await callback({ code: "auth-code", state: "forged-state" }, start.cookie);
    expect(res.headers.get("location")).toBe("/puzzles/corners?login=failed");
    expect(google.spy).not.toHaveBeenCalled();
    expect(setCookieFor(res, "session")).toBeUndefined();
  });

  it("ログイン用の Cookie がなければ失敗として戻す", async () => {
    const start = await startLogin("/puzzles/corners");
    const res = await callback({ code: "auth-code", state: start.params.get("state") ?? "" }, "");
    expect(res.headers.get("location")).toBe("/?login=failed");
  });

  it("トークンの交換に失敗したら失敗として戻す", async () => {
    const consoleError = silenceConsoleError();
    const start = await startLogin("/puzzles/corners");
    mockTokenEndpoint(() => Response.json({ error: "invalid_grant" }, { status: 400 }));
    const res = await callback(
      { code: "auth-code", state: start.params.get("state") ?? "" },
      start.cookie,
    );
    expect(res.headers.get("location")).toBe("/puzzles/corners?login=failed");
    expect(consoleError).toHaveBeenCalled();
  });

  it("ID トークンの検証に通らなければ失敗として戻す", async () => {
    silenceConsoleError();
    const { res, session } = await login({ nonce: "replayed-nonce" });
    expect(res.headers.get("location")).toBe("/puzzles/corners?login=failed");
    expect(session).toBe("");
  });
});

describe("セッションの有効期限", () => {
  async function setExpiresAt(expiresAt: number) {
    await env.DB.prepare("UPDATE sessions SET expires_at = ?").bind(expiresAt).run();
  }

  it("期限まで余裕があれば Cookie を送り直さない", async () => {
    const { session } = await login();
    const { res } = await me(session);
    expect(setCookieFor(res, "session")).toBeUndefined();
  });

  it("期限が近づいたら延ばす", async () => {
    const { session } = await login();
    await setExpiresAt(Date.now() + DAY);

    const { res, user } = await me(session);
    expect(user).not.toBeNull();
    expect(setCookieFor(res, "session")).toContain(`Max-Age=${SESSION_TTL / 1000}`);
    const expiresAt = await env.DB.prepare("SELECT expires_at FROM sessions").first<number>(
      "expires_at",
    );
    expect(expiresAt).toBeGreaterThan(Date.now() + SESSION_TTL - DAY);
  });

  it("期限が切れたら未ログインに戻す", async () => {
    const { session } = await login();
    await setExpiresAt(Date.now() - 1);

    const { res, user } = await me(session);
    expect(user).toBeNull();
    expect(setCookieFor(res, "session")).toContain("Max-Age=0");
  });
});

describe("POST /api/auth/logout", () => {
  it("セッションを消して Cookie も削除する", async () => {
    const { session } = await login();
    const res = await logout(session);
    expect(res.status).toBe(204);
    expect(setCookieFor(res, "session")).toContain("Max-Age=0");

    expect((await me(session)).user).toBeNull();
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first<number>("n");
    expect(count).toBe(0);
  });

  it("ログインしていなくても 204", async () => {
    expect((await logout("")).status).toBe(204);
  });

  it("ほかのサイトからの POST は受け付けない", async () => {
    const { session } = await login();
    const res = await logout(session, "https://evil.example");
    expect(res.status).toBe(403);
    expect((await me(session)).user).not.toBeNull();
  });
});
