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
