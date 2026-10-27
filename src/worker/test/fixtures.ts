import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { createAuth } from "../auth";

function base64url(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** 署名なしの ID トークン。Google のトークンエンドポイントの応答を差し替えるテスト用 */
export function fakeIdToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => base64url(JSON.stringify(value));
  return `${encode({ alg: "RS256", kid: "test", typ: "JWT" })}.${encode(claims)}.signature`;
}

/**
 * ログイン済みのユーザーを作り、そのセッションの Cookie を付けたヘッダーを返す。
 * Google を通さずにセッションを作れるよう、テストでだけ Better Auth の testUtils を足す
 */
export async function signedInHeaders(): Promise<Headers> {
  const options = createAuth(env, "http://example.com").options;
  const auth = betterAuth({ ...options, plugins: [testUtils()] });
  const { test } = await auth.$context;
  const user = await test.saveUser(test.createUser({ name: "ロボ 太郎" }));
  return test.getAuthHeaders({ userId: user.id });
}
