import { decode } from "hono/jwt";

/**
 * Google の OpenID Connect(認可コードフロー + PKCE)。
 * 使うのはログインに要る手順だけなので、ライブラリを入れずに書いている。
 * https://developers.google.com/identity/openid-connect/openid-connect
 */

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** ログインを始めるときに作り、Google から戻ってくるまで Cookie で持っておく値 */
export interface AuthorizationRequest {
  /** 戻ってきたリクエストが、このブラウザで始めたログインのものかを確かめる */
  state: string;
  /** PKCE。認可コードだけを盗まれてもトークンに交換されないようにする */
  codeVerifier: string;
  /** ID トークンの使い回しを防ぐ */
  nonce: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** 推測できないランダムな文字列(既定は 256 ビット) */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function createAuthorizationRequest(): AuthorizationRequest {
  return { state: randomToken(), codeVerifier: randomToken(), nonce: randomToken() };
}

export async function authorizationUrl(
  client: GoogleClient,
  request: AuthorizationRequest,
): Promise<string> {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: request.state,
    nonce: request.nonce,
    code_challenge: base64url(await sha256(request.codeVerifier)),
    code_challenge_method: "S256",
    // 共有の端末でも別のアカウントでログインできるよう、毎回アカウントを選んでもらう
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** 認可コードを ID トークンに交換し、検証したうえでプロフィールを返す */
export async function exchangeCode(
  client: GoogleClient,
  code: string,
  request: AuthorizationRequest,
): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: client.redirectUri,
      code_verifier: request.codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google のトークン交換に失敗しました (${res.status}): ${await res.text()}`);
  }
  const body: unknown = await res.json();
  const idToken = typeof body === "object" && body !== null ? Reflect.get(body, "id_token") : null;
  if (typeof idToken !== "string") throw new Error("Google の応答に ID トークンがありません");
  return verifyIdToken(idToken, { clientId: client.clientId, nonce: request.nonce });
}

/**
 * ID トークンのクレームを確かめる。
 * トークンは Google のトークンエンドポイントから TLS で直接受け取っているので、
 * 署名の検証は省いている(OpenID Connect Core 1.0 3.1.3.7 の 6)。
 */
export function verifyIdToken(
  idToken: string,
  expected: { clientId: string; nonce: string; now?: number },
): GoogleProfile {
  const { payload } = decode(idToken);
  const now = expected.now ?? Date.now();
  if (typeof payload.iss !== "string" || !ISSUERS.includes(payload.iss)) {
    throw new Error("ID トークンの発行者が Google ではありません");
  }
  if (payload.aud !== expected.clientId) throw new Error("ID トークンの宛先が違います");
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) {
    throw new Error("ID トークンの有効期限が切れています");
  }
  if (payload.nonce !== expected.nonce) throw new Error("ID トークンの nonce が一致しません");

  const { sub, email, name, picture } = payload;
  if (typeof sub !== "string" || sub === "") throw new Error("ID トークンに sub がありません");
  if (typeof email !== "string") throw new Error("ID トークンにメールアドレスがありません");
  return {
    sub,
    email,
    // 名前を公開していないアカウントでは、メールアドレスを表示名にする
    name: typeof name === "string" && name !== "" ? name : email,
    picture: typeof picture === "string" && picture !== "" ? picture : null,
  };
}
