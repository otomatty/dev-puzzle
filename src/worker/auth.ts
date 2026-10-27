import { betterAuth } from "better-auth";

/**
 * ログインは Better Auth で行う。ログインの手段は Google アカウントだけ。
 * ユーザー・セッション・連携アカウント・ログイン途中の state は D1 に保存する
 * (テーブルは migrations/0002_create_auth_tables.sql)。
 */

const DAY = 60 * 60 * 24;

export function createAuth(env: Env, baseURL: string) {
  // Better Auth は NODE_ENV が production でないと、鍵がなくても公開されている既定の鍵で動いてしまう。
  // Workers では NODE_ENV が決まらないので、ここで止める
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET が設定されていません(README の「Google ログイン」を参照)");
  }
  return betterAuth({
    appName: "RoboZZle",
    // リクエストが届いたオリジン。Google からの戻り先 URL と、Cookie に Secure を付けるかはここから決まる
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        // 共有の端末でも別のアカウントでログインできるよう、毎回アカウントを選んでもらう
        prompt: "select_account",
        // Google 側で名前やアイコンを変えたら、次のログインで反映する
        overrideUserInfoOnSignIn: true,
      },
    },
    session: {
      expiresIn: 30 * DAY,
      // 前回の延長から 1 日以上たってアクセスしたら、期限を延ばす
      updateAge: DAY,
    },
    account: {
      // Google のアクセストークンなどは使わないが保存はされるので、暗号化しておく
      encryptOAuthTokens: true,
    },
    // 戻り先がわからないままログインに失敗したときは、Better Auth のエラー画面ではなくトップに戻す
    onAPIError: { errorURL: "/" },
    advanced: {
      // 接続元の IP は Cloudflare が付けるヘッダーから取る
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;

const instances = new Map<string, Auth>();

/** 初期化をリクエストごとにしないよう、オリジンごとに使い回す(env は Worker の中で変わらない) */
export function getAuth(env: Env, origin: string): Auth {
  let auth = instances.get(origin);
  if (!auth) {
    auth = createAuth(env, origin);
    instances.set(origin, auth);
  }
  return auth;
}
