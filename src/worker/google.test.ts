import { describe, expect, it } from "vitest";
import {
  authorizationUrl,
  base64url,
  createAuthorizationRequest,
  sha256,
  verifyIdToken,
} from "./google";
import { fakeIdToken } from "./test/fixtures";

const CLIENT_ID = "client-id.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 9, 27);

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "1234567890",
    email: "robo@example.com",
    name: "ロボ 太郎",
    picture: "https://lh3.googleusercontent.com/a/robo",
    nonce: "expected-nonce",
    iat: NOW / 1000 - 10,
    exp: NOW / 1000 + 3600,
    ...overrides,
  };
}

function verify(overrides?: Record<string, unknown>) {
  return verifyIdToken(fakeIdToken(claims(overrides)), {
    clientId: CLIENT_ID,
    nonce: "expected-nonce",
    now: NOW,
  });
}

describe("verifyIdToken", () => {
  it("ID トークンからプロフィールを取り出す", () => {
    expect(verify()).toEqual({
      sub: "1234567890",
      email: "robo@example.com",
      name: "ロボ 太郎",
      picture: "https://lh3.googleusercontent.com/a/robo",
    });
  });

  it("発行者は https なしの accounts.google.com でもよい", () => {
    expect(verify({ iss: "accounts.google.com" }).sub).toBe("1234567890");
  });

  it("名前がなければメールアドレスを表示名にし、画像がなければ null", () => {
    expect(verify({ name: undefined, picture: undefined })).toEqual({
      sub: "1234567890",
      email: "robo@example.com",
      name: "robo@example.com",
      picture: null,
    });
  });

  it.each([
    ["発行者が Google でない", { iss: "https://evil.example" }],
    ["宛先がほかのクライアント", { aud: "other-client" }],
    ["有効期限が切れている", { exp: NOW / 1000 }],
    ["有効期限がない", { exp: undefined }],
    ["nonce が一致しない", { nonce: "other-nonce" }],
    ["sub がない", { sub: undefined }],
    ["メールアドレスがない", { email: undefined }],
  ])("%s なら受け付けない", (_, overrides) => {
    expect(() => verify(overrides)).toThrow();
  });

  it("JWT の形をしていなければ受け付けない", () => {
    expect(() =>
      verifyIdToken("not-a-jwt", { clientId: CLIENT_ID, nonce: "expected-nonce", now: NOW }),
    ).toThrow();
  });
});

describe("authorizationUrl", () => {
  it("state・nonce・PKCE(S256)を付けて Google の認可画面を指す", async () => {
    const request = createAuthorizationRequest();
    const url = new URL(
      await authorizationUrl(
        {
          clientId: CLIENT_ID,
          clientSecret: "secret",
          redirectUri: "https://example.com/api/auth/google/callback",
        },
        request,
      ),
    );
    expect(`${url.origin}${url.pathname}`).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    // クライアントシークレットや code_verifier はブラウザに渡さない
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: "https://example.com/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
      state: request.state,
      nonce: request.nonce,
      code_challenge: base64url(await sha256(request.codeVerifier)),
      code_challenge_method: "S256",
      prompt: "select_account",
    });
  });

  it("リクエストごとに別のランダムな値を作る", () => {
    const a = createAuthorizationRequest();
    const b = createAuthorizationRequest();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    // RFC 7636: code_verifier は 43〜128 文字の unreserved 文字
    expect(a.codeVerifier).toMatch(/^[\w-]{43}$/);
  });
});

describe("base64url", () => {
  it("PKCE の code_challenge が RFC 7636 の例と一致する", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(base64url(await sha256(verifier))).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
