import { env, exports } from "cloudflare:workers";
import { getMigrations } from "better-auth/db/migration";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { fakeIdToken } from "./test/fixtures";

const ORIGIN = "http://example.com";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SESSION_COOKIE = "better-auth.session_token";
const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.restoreAllMocks();
});

/** ブラウザの代わりに Cookie を持ち回る */
class CookieJar {
  #cookies = new Map<string, string>();

  store(res: Response) {
    for (const header of res.headers.getSetCookie()) {
      const [pair = ""] = header.split(";");
      const index = pair.indexOf("=");
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);
      if (value === "" || /max-age=0/i.test(header)) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }

  get header() {
    return [...this.#cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  clone() {
    const jar = new CookieJar();
    jar.#cookies = new Map(this.#cookies);
    return jar;
  }
}

function setCookieFor(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((header) => header.startsWith(`${name}=`));
}

function fetchApi(path: string, init: RequestInit = {}, jar?: CookieJar) {
  const headers = new Headers(init.headers);
  if (jar?.header) headers.set("cookie", jar.header);
  // Google への転送を追いかけず、302 のまま受け取る
  return exports.default.fetch(`${ORIGIN}/api${path}`, { redirect: "manual", ...init, headers });
}

/** 画面の「Google でログイン」と同じリクエスト */
async function signIn(jar: CookieJar, callbackURL = "/puzzles/corners", origin = ORIGIN) {
  const res = await fetchApi(
    "/auth/sign-in/social",
    {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ provider: "google", callbackURL, errorCallbackURL: callbackURL }),
    },
    jar,
  );
  jar.store(res);
  return res;
}

function googleClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: env.GOOGLE_CLIENT_ID,
    sub: "google-user-1",
    email: "robo@example.com",
    email_verified: true,
    name: "ロボ 太郎",
    picture: "https://lh3.googleusercontent.com/a/robo",
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

/** Google のトークンエンドポイントを差し替え、送られた本文を記録する */
function mockTokenEndpoint(respond: () => Response) {
  const bodies: URLSearchParams[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);
    if (request.url !== TOKEN_ENDPOINT) throw new Error(`想定外のリクエスト: ${request.url}`);
    bodies.push(new URLSearchParams(new TextDecoder().decode(await request.arrayBuffer())));
    return respond();
  });
  return { spy, bodies };
}

function tokenResponse(claims: Record<string, unknown> = {}) {
  return Response.json({
    access_token: "google-access-token",
    id_token: fakeIdToken(googleClaims(claims)),
    expires_in: 3599,
    token_type: "Bearer",
    scope: "openid email profile",
  });
}

async function callback(jar: CookieJar, query: Record<string, string>) {
  const res = await fetchApi(`/auth/callback/google?${new URLSearchParams(query)}`, {}, jar);
  jar.store(res);
  return res;
}

/** ログイン開始から Google のコールバックまでを通しで行う */
async function login(claims: Record<string, unknown> = {}, jar = new CookieJar()) {
  const start = await signIn(jar);
  const { url } = await start.json<{ url: string }>();
  const authorization = new URL(url);
  const google = mockTokenEndpoint(() => tokenResponse(claims));
  const res = await callback(jar, {
    code: "auth-code",
    state: authorization.searchParams.get("state") ?? "",
  });
  return { jar, authorization, google, res };
}

async function getSession(jar?: CookieJar) {
  const res = await fetchApi("/auth/get-session", {}, jar);
  jar?.store(res);
  type Session = { user: Record<string, unknown>; session: Record<string, unknown> } | null;
  return { res, session: await res.json<Session>() };
}

function signOut(jar: CookieJar, origin = ORIGIN) {
  return fetchApi(
    "/auth/sign-out",
    { method: "POST", headers: { "content-type": "application/json", origin }, body: "{}" },
    jar,
  );
}

function silenceConsole() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("スキーマ", () => {
  it("migrations/ のテーブルが Better Auth の必要とするものと一致する", async () => {
    const { toBeCreated, toBeAdded, compileMigrations } = await getMigrations(
      createAuth(env, ORIGIN).options,
    );
    const missing = [...toBeCreated, ...toBeAdded].map((table) => table.table);
    // 失敗したら、表示された SQL で migrations/ に新しいマイグレーションを足す
    expect(missing, missing.length > 0 ? await compileMigrations() : "").toEqual([]);
  });
});

describe("createAuth", () => {
  it("BETTER_AUTH_SECRET がなければ、既定の鍵で動かずに止まる", () => {
    expect(() => createAuth({ ...env, BETTER_AUTH_SECRET: "" }, ORIGIN)).toThrow(
      "BETTER_AUTH_SECRET",
    );
  });
});

describe("GET /api/auth/get-session", () => {
  it("ログインしていなければ null", async () => {
    const { res, session } = await getSession();
    expect(res.status).toBe(200);
    expect(session).toBeNull();
  });
});

describe("POST /api/auth/sign-in/social", () => {
  it("state と PKCE(S256)を付けた Google の認可画面の URL を返す", async () => {
    const res = await signIn(new CookieJar());
    expect(res.status).toBe(200);
    const { url, redirect } = await res.json<{ url: string; redirect: boolean }>();
    expect(redirect).toBe(true);

    const authorization = new URL(url);
    expect(`${authorization.origin}${authorization.pathname}`).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    const params = authorization.searchParams;
    expect(params.get("client_id")).toBe(env.GOOGLE_CLIENT_ID);
    expect(params.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/google`);
    expect(params.get("response_type")).toBe("code");
    expect(params.get("scope")?.split(" ").sort()).toEqual(["email", "openid", "profile"]);
    expect(params.get("prompt")).toBe("select_account");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBeTruthy();
    expect(params.get("state")).toBeTruthy();
    expect(params.has("client_secret")).toBe(false);
  });

  it("アプリの外への戻り先は受け付けない", async () => {
    silenceConsole();
    const res = await signIn(new CookieJar(), "https://evil.example/");
    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/callback/google", () => {
  it("認可コードを交換してユーザーとセッションを作り、元の画面に戻す", async () => {
    const { jar, google, res } = await login();
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/puzzles/corners");

    const [body] = google.bodies;
    expect(body?.get("grant_type")).toBe("authorization_code");
    expect(body?.get("code")).toBe("auth-code");
    expect(body?.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/callback/google`);
    expect(body?.get("code_verifier")).toBeTruthy();

    const cookie = setCookieFor(res, SESSION_COOKIE) ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${(30 * DAY) / 1000}`);

    const { session } = await getSession(jar);
    expect(session?.user).toMatchObject({
      name: "ロボ 太郎",
      email: "robo@example.com",
      image: "https://lh3.googleusercontent.com/a/robo",
      emailVerified: true,
    });
  });

  it("Google のアクセストークンは暗号化して保存する", async () => {
    await login();
    const accessToken = await env.DB.prepare("SELECT accessToken FROM account").first<string>(
      "accessToken",
    );
    expect(accessToken).toBeTruthy();
    expect(accessToken).not.toBe("google-access-token");
  });

  it("同じ Google アカウントなら同じユーザーとして、名前やアイコンを更新する", async () => {
    const first = await getSession((await login()).jar);
    const second = await getSession((await login({ name: "ロボ 次郎", picture: null })).jar);
    expect(second.session?.user.id).toBe(first.session?.user.id);
    expect(second.session?.user.name).toBe("ロボ 次郎");

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM "user"').first<number>("n");
    expect(count).toBe(1);
  });

  it("Google の画面でキャンセルしたら、理由を付けて元の画面に戻す", async () => {
    silenceConsole();
    const jar = new CookieJar();
    const { url } = await (await signIn(jar)).json<{ url: string }>();
    const state = new URL(url).searchParams.get("state") ?? "";
    const res = await callback(jar, { error: "access_denied", state });
    expect(res.headers.get("location")).toBe("/puzzles/corners?error=access_denied");
    expect(setCookieFor(res, SESSION_COOKIE)).toBeUndefined();
  });

  it("state が一致しなければ、トークンを交換せずにトップへ戻す", async () => {
    silenceConsole();
    const jar = new CookieJar();
    await signIn(jar);
    const google = mockTokenEndpoint(() => tokenResponse());
    const res = await callback(jar, { code: "auth-code", state: "forged-state" });
    expect(res.headers.get("location")).toMatch(/^\/\?error=/);
    expect(google.spy).not.toHaveBeenCalled();
    expect(setCookieFor(res, SESSION_COOKIE)).toBeUndefined();
  });

  it("トークンの交換に失敗したら、理由を付けて元の画面に戻す", async () => {
    silenceConsole();
    const jar = new CookieJar();
    const { url } = await (await signIn(jar)).json<{ url: string }>();
    mockTokenEndpoint(() => Response.json({ error: "invalid_grant" }, { status: 400 }));
    const res = await callback(jar, {
      code: "auth-code",
      state: new URL(url).searchParams.get("state") ?? "",
    });
    expect(res.headers.get("location")).toMatch(/^\/puzzles\/corners\?error=/);
    expect(setCookieFor(res, SESSION_COOKIE)).toBeUndefined();
  });
});

describe("セッションの有効期限", () => {
  async function shiftExpiresAt(deltaMs: number) {
    const { results } = await env.DB.prepare("SELECT id, expiresAt FROM session").run<{
      id: string;
      expiresAt: string;
    }>();
    for (const row of results) {
      const expiresAt = new Date(new Date(row.expiresAt).getTime() + deltaMs).toISOString();
      await env.DB.prepare("UPDATE session SET expiresAt = ? WHERE id = ?")
        .bind(expiresAt, row.id)
        .run();
    }
  }

  it("前回の延長から 1 日以上たっていたら、期限を 30 日後に延ばす", async () => {
    const { jar } = await login();
    await shiftExpiresAt(-2 * DAY);

    const { res, session } = await getSession(jar);
    expect(session).not.toBeNull();
    expect(setCookieFor(res, SESSION_COOKIE)).toContain(`Max-Age=${(30 * DAY) / 1000}`);
    const expiresAt = new Date(String(session?.session.expiresAt)).getTime();
    expect(expiresAt).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it("期限が切れたら未ログインに戻す", async () => {
    const { jar } = await login();
    await shiftExpiresAt(-31 * DAY);
    expect((await getSession(jar)).session).toBeNull();
  });
});

describe("POST /api/auth/sign-out", () => {
  it("セッションを消して Cookie も削除する", async () => {
    const { jar } = await login();
    const stale = jar.clone();
    const res = await signOut(jar);
    expect(res.status).toBe(200);
    expect(setCookieFor(res, SESSION_COOKIE)).toContain("Max-Age=0");

    // ログアウト前の Cookie を持ち続けていても、もう使えない
    expect((await getSession(stale)).session).toBeNull();
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM session").first<number>("n");
    expect(count).toBe(0);
  });

  it("ほかのサイトからのログアウトは受け付けない", async () => {
    silenceConsole();
    const { jar } = await login();
    const res = await signOut(jar, "https://evil.example");
    expect(res.status).toBe(403);
    expect((await getSession(jar)).session).not.toBeNull();
  });
});
