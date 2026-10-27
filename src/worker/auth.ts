import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { ErrorResponse, MeResponse } from "../shared/api";
import {
  type AuthorizationRequest,
  authorizationUrl,
  createAuthorizationRequest,
  exchangeCode,
  type GoogleClient,
} from "./google";
import {
  type AppContext,
  cookieOptions,
  createSession,
  deleteSession,
  getSessionUser,
  upsertUser,
} from "./session";

/**
 * Google アカウントでのログイン。
 * /api/auth/google でログインを始め、Google から /api/auth/google/callback に戻ってきたら
 * セッションを作って元の画面に戻す。
 */

const LOGIN_COOKIE = "google_login";
/** ログイン用の Cookie は開始とコールバックにだけ送る */
const LOGIN_COOKIE_PATH = "/api/auth/google";
const CALLBACK_PATH = "/api/auth/google/callback";
/** Google の画面でアカウントを選ぶまでの猶予(秒) */
const LOGIN_TTL = 10 * 60;

interface PendingLogin extends AuthorizationRequest {
  returnTo: string;
}

/**
 * ログイン後に戻る先。オープンリダイレクトにならないよう、このアプリの中のパスだけを受け付ける。
 * (`//evil.example` のようなプロトコル相対 URL や、クエリ・バックスラッシュを含むものは不可)
 */
export function safeReturnTo(value: string | undefined): string {
  return value && value.length <= 200 && /^\/(?!\/)[\w\-/]*$/.test(value) ? value : "/";
}

function googleClient(c: AppContext): GoogleClient | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: new URL(CALLBACK_PATH, c.req.url).toString(),
  };
}

function readPendingLogin(raw: string | undefined): PendingLogin | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { state, codeVerifier, nonce, returnTo } = value as Record<string, unknown>;
    if (typeof state !== "string" || typeof codeVerifier !== "string") return null;
    if (typeof nonce !== "string" || typeof returnTo !== "string") return null;
    return { state, codeVerifier, nonce, returnTo: safeReturnTo(returnTo) };
  } catch {
    return null;
  }
}

/** ログインに失敗したことを、戻った先の画面に伝える */
function failedUrl(returnTo: string) {
  return `${returnTo}?login=failed`;
}

export const auth = new Hono<{ Bindings: Env }>();

auth.get("/me", async (c) => {
  const user = await getSessionUser(c);
  c.header("cache-control", "no-store");
  return c.json<MeResponse>({ user });
});

auth.get("/auth/google", async (c) => {
  const client = googleClient(c);
  if (!client) {
    return c.json<ErrorResponse>({ error: "Google ログインが設定されていません" }, 503);
  }
  const request = createAuthorizationRequest();
  const pending: PendingLogin = { ...request, returnTo: safeReturnTo(c.req.query("returnTo")) };
  setCookie(c, LOGIN_COOKIE, JSON.stringify(pending), {
    ...cookieOptions(c, LOGIN_COOKIE_PATH),
    maxAge: LOGIN_TTL,
  });
  return c.redirect(await authorizationUrl(client, request));
});

auth.get("/auth/google/callback", async (c) => {
  const pending = readPendingLogin(getCookie(c, LOGIN_COOKIE));
  deleteCookie(c, LOGIN_COOKIE, cookieOptions(c, LOGIN_COOKIE_PATH));
  const returnTo = pending?.returnTo ?? "/";

  // Google の画面でキャンセルされたときは、何もせず元の画面に戻す
  const error = c.req.query("error");
  if (error === "access_denied") return c.redirect(returnTo);

  const client = googleClient(c);
  const code = c.req.query("code");
  if (error || !client || !pending || !code || c.req.query("state") !== pending.state) {
    return c.redirect(failedUrl(returnTo));
  }

  try {
    const profile = await exchangeCode(client, code, pending);
    const user = await upsertUser(c.env.DB, profile);
    await createSession(c, user.id);
  } catch (err) {
    console.error(err);
    return c.redirect(failedUrl(returnTo));
  }
  return c.redirect(returnTo);
});

auth.post("/auth/logout", async (c) => {
  await deleteSession(c);
  return c.body(null, 204);
});
