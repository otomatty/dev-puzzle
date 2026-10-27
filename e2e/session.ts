import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/**
 * E2E でのログイン。本物の Google には接続できないので、テスト用のユーザーとセッションを
 * ローカルの D1 に入れ(global-setup.ts)、そのセッションの Cookie をブラウザに持たせる。
 */

/** wrangler.jsonc の secrets.required。本物の Google には接続しないのでダミーでよい */
export const SECRETS = {
  BETTER_AUTH_SECRET: "e2e-secret-Qw8rT2yU6iO0pA4sD7fG1hJ5kL9zX3cV",
  GOOGLE_CLIENT_ID: "e2e-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "e2e-client-secret",
};

const USER_ID = "e2e-user";
const SESSION_TOKEN = "e2e-session-token";
const DAY = 24 * 60 * 60 * 1000;

/** テスト用のユーザーとセッションを入れ直す SQL。セッションの期限は 30 日後 */
export function seedSessionSql(now = new Date()): string {
  const at = now.toISOString();
  const expiresAt = new Date(now.getTime() + 30 * DAY).toISOString();
  return [
    `INSERT OR REPLACE INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt)
     VALUES ('${USER_ID}', 'E2E ロボ', 'e2e@example.com', 1, NULL, '${at}', '${at}');`,
    `INSERT OR REPLACE INTO session (id, expiresAt, token, createdAt, updatedAt, userId)
     VALUES ('e2e-session', '${expiresAt}', '${SESSION_TOKEN}', '${at}', '${at}', '${USER_ID}');`,
  ].join("\n");
}

/** サーバーの鍵。vite preview は .dev.vars があればそれだけを読み、webServer で渡した値は使わない */
function serverSecret(): string {
  const devVars = new URL("../.dev.vars", import.meta.url);
  if (!existsSync(devVars)) return SECRETS.BETTER_AUTH_SECRET;
  return parseEnv(readFileSync(devVars, "utf8")).BETTER_AUTH_SECRET ?? "";
}

/** Better Auth と同じく、トークンに BETTER_AUTH_SECRET で HMAC-SHA256 の署名を付けた Cookie */
export function sessionCookie(domain: string) {
  const signature = createHmac("sha256", serverSecret()).update(SESSION_TOKEN).digest("base64");
  return {
    name: "better-auth.session_token",
    value: encodeURIComponent(`${SESSION_TOKEN}.${signature}`),
    domain,
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };
}
