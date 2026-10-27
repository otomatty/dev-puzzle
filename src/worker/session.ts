import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";
import type { User } from "../shared/api";
import { type GoogleProfile, randomToken, sha256 } from "./google";

export type AppContext = Context<{ Bindings: Env }>;

export const SESSION_COOKIE = "session";
const DAY = 24 * 60 * 60 * 1000;
/** セッションの有効期間。使われている間は延ばす */
export const SESSION_TTL = 30 * DAY;
/** 残りがこれより短くなったら延ばす(リクエストのたびに書き込まないため) */
const RENEW_WITHIN = 15 * DAY;

interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

function toUser(row: UserRow): User {
  return { id: row.id, name: row.name, email: row.email, picture: row.picture };
}

/** JavaScript から読めず、ほかのサイトからの POST では送られない Cookie にする */
export function cookieOptions(c: AppContext, path = "/"): CookieOptions {
  return {
    path,
    httpOnly: true,
    sameSite: "Lax",
    // 本番は HTTPS。http://localhost の開発サーバーでも使えるよう、HTTPS のときだけ付ける
    secure: new URL(c.req.url).protocol === "https:",
  };
}

/** DB には Cookie のトークンそのものではなくハッシュを置く(DB が漏れてもなりすませない) */
async function sessionId(token: string): Promise<string> {
  return Array.from(await sha256(token), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setSessionCookie(c: AppContext, token: string) {
  setCookie(c, SESSION_COOKIE, token, { ...cookieOptions(c), maxAge: SESSION_TTL / 1000 });
}

/** Google アカウントのユーザーを登録する。登録済みなら名前などを最新にする */
export async function upsertUser(db: D1Database, profile: GoogleProfile): Promise<User> {
  const row = await db
    .prepare(
      `INSERT INTO users (id, google_sub, email, name, picture) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (google_sub) DO UPDATE SET
         email = excluded.email, name = excluded.name, picture = excluded.picture,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, name, picture`,
    )
    .bind(crypto.randomUUID(), profile.sub, profile.email, profile.name, profile.picture)
    .first<UserRow>();
  if (!row) throw new Error("ユーザーを登録できませんでした");
  return toUser(row);
}

export async function createSession(c: AppContext, userId: string): Promise<void> {
  const token = randomToken();
  const now = Date.now();
  await c.env.DB.batch([
    // 期限切れのセッションはログインのついでに片付ける
    c.env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now),
    c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(
      await sessionId(token),
      userId,
      now + SESSION_TTL,
    ),
  ]);
  setSessionCookie(c, token);
}

/** Cookie のセッションからログイン中のユーザーを返す。未ログインや期限切れなら null */
export async function getSessionUser(c: AppContext): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;

  const id = await sessionId(token);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.picture, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
  )
    .bind(id)
    .first<UserRow & { expires_at: number }>();

  const now = Date.now();
  if (!row || row.expires_at <= now) {
    deleteCookie(c, SESSION_COOKIE, cookieOptions(c));
    return null;
  }
  if (row.expires_at - now < RENEW_WITHIN) {
    await c.env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
      .bind(now + SESSION_TTL, id)
      .run();
    setSessionCookie(c, token);
  }
  return toUser(row);
}

export async function deleteSession(c: AppContext): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(await sessionId(token))
      .run();
  }
  deleteCookie(c, SESSION_COOKIE, cookieOptions(c));
}
