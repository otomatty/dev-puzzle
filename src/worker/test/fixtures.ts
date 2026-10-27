import { base64url } from "../google";

/** 署名なしの ID トークン(中身の検証だけを確かめるテスト用) */
export function fakeIdToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(claims)}.signature`;
}
