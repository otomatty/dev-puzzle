# RoboZZle

ロボットに命令を並べて盤面の星をすべて集める、RoboZZle 型のプログラミングパズル。Cloudflare Workers 上で動く Web アプリ。

- 内蔵ステージ 14 問(難しさ 1〜5)
- 命令: 前進・左右回転・関数呼び出し(F1〜F5)・ペンキ。各命令に「赤／緑／青の床のときだけ」の条件を付けられる
- 組んだプログラムとクリア状況はブラウザ(localStorage)に保存
- クリア人数は D1 に記録。送られたプログラムを Worker 側でも同じエンジンで実行し、本当にクリアできるときだけ数える
- 色を形(▲●■)でも表示する設定、ダークモード、スマートフォン対応
- Google アカウントでログインできる(任意。ログインしなくてもすべて遊べる)

## 技術スタック

| 役割                      | 採用                                    | バージョン                |
| ------------------------- | --------------------------------------- | ------------------------- |
| ランタイム / ホスティング | Cloudflare Workers(静的アセット + API)  | wrangler 4.152.0          |
| データベース              | Cloudflare D1                           |                           |
| フロントエンド            | React + Vite(`@cloudflare/vite-plugin`) | React 19.3.1 / Vite 8.3.5 |
| API                       | Hono                                    | 4.13.14                   |
| 言語 / 型チェック         | TypeScript(ネイティブ版 `tsc`)          | 7.0.2                     |
| パッケージマネージャ      | Bun                                     | 1.4.4                     |

## Lint・テスト

| 役割                                   | 採用                        | バージョン      |
| -------------------------------------- | --------------------------- | --------------- |
| Lint + Format                          | Biome                       | 2.6.3           |
| ユニット / コンポーネント / API テスト | Vitest                      | 5.0.5           |
| Workers ランタイム上のテスト           | `@cloudflare/vitest-plugin` | 1.4.7           |
| DOM 環境                               | happy-dom + Testing Library | 21.0.4 / 16.3.3 |
| E2E                                    | Playwright                  | 1.64.1          |

選定理由:

- **Biome**: Lint と Format が 1 ツールで完結し、TypeScript 本体に依存しない。typescript-eslint は TypeScript 6.1 未満のみ対応で TS 7 と組み合わせられないため ESLint は採らない。
- **Vitest**: Vite と設定を共有でき、Cloudflare 公式プラグインで Worker と D1 を本番と同じ workerd 上でテストできる。旧 `@cloudflare/vitest-pool-workers` は非推奨になったため後継の `@cloudflare/vitest-plugin` を使う。
- **Playwright**: `vite preview`(workerd + ローカル D1)に対して、デスクトップとモバイルの両方で E2E を回す。

依存パッケージまわりの安全策は、次の 2 つのファイルで設定している。

- `package.json`: 依存はすべて完全一致のバージョンで書く。`trustedDependencies` で、インストール時のスクリプト実行を esbuild と workerd だけに許可している
- `bunfig.toml`: `exact = true` で `bun add` でも完全一致のバージョンで保存し、`minimumReleaseAge = 86400` で公開から 1 日未満の版を入れない

Bun はパッケージマネージャとスクリプトの実行に使う。Vite・Vitest・Wrangler・Playwright は Node.js 上で動くので、Node.js 22.18 以上も必要(`.node-version`)。

## ディレクトリ

```
src/
  engine/    ゲームのルール(盤面・命令・実行)。DOM にも Workers にも依存しない純粋な TS
  puzzles/   内蔵ステージの定義(catalog.ts)と D1 用シード SQL の生成
  shared/    API のレスポンス型(Worker とクライアントで共有)
  worker/    Hono の API(/api/*)、D1 アクセス、Google ログイン
  client/    React の UI
migrations/  D1 のスキーマ
seeds/       内蔵ステージを登録する SQL(catalog.ts から生成。手で編集しない)
e2e/         Playwright
```

エンジンはクライアントと Worker の両方で使う。クライアントは 1 手ずつ実行してアニメーションし、Worker はクリア報告を受けたときに同じエンジンで最後まで実行して検証する。

Vitest は 3 プロジェクトに分かれている。

- `engine`: `src/engine/` と `src/puzzles/`。全ステージが模範解答でクリアできることもここで確かめる(模範解答はテストにだけ置き、配信しない)
- `client`: `src/client/`(happy-dom)
- `worker`: `src/worker/`(workerd。テストごとに D1 を作り直す。Google への通信は `fetch` を差し替えて確かめる)

## 開発

```sh
bun install
bun run db:setup:local   # ローカルの D1 にスキーマとステージを入れる(初回とスキーマ・ステージ変更時)
cp .dev.vars.example .dev.vars   # ログインを試すときだけ。値は「Google ログイン」を参照
bun run dev              # http://localhost:5173
```

| コマンド                   | 内容                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `bun run check`            | Biome(lint + format)                                         |
| `bun run check:fix`        | Biome の自動修正                                             |
| `bun run typecheck`        | `tsc -b`                                                     |
| `bun run test`             | Vitest(engine / client / worker)                             |
| `bun run test:coverage`    | カバレッジ付き                                               |
| `bun run test:e2e`         | Playwright(初回は `bunx playwright install chromium`)        |
| `bun run verify`           | check + typecheck + test                                     |
| `bun run db:generate-seed` | `catalog.ts` から `seeds/0001_puzzles.sql` を作り直す        |
| `bun run cf-typegen`       | `wrangler.jsonc` から `worker-configuration.d.ts` を作り直す |

テストは `bun run test` で実行する。`bun test` は Bun 組み込みのテストランナーが起動してしまうため、案内を出して止めるようにしている(`scripts/bun-test-guard.ts`)。

### ステージを追加・変更する

1. `src/puzzles/catalog.ts` を編集する(公開済みステージの `id` は変えない)
2. `src/puzzles/catalog.test.ts` の `SOLUTIONS` に模範解答を書く
3. `bun run db:generate-seed` でシード SQL を作り直す
4. `bun run test` で全ステージが解けることを確認する

シード SQL は upsert なので、本番で流し直してもクリア人数は保たれる。`seeds/` が `catalog.ts` とずれていると、テストと CI が失敗する。

## Google ログイン

ログインは任意で、していなくてもすべてのステージを遊べる。ログインするとヘッダーに名前とアイコンが出る。組んだプログラムとクリア状況は、ログインしていてもこれまでどおりブラウザに保存する。

- Google の OpenID Connect(認可コードフロー)を、ライブラリを使わず Worker で実装している(`src/worker/google.ts`)。state・nonce・PKCE(S256)を付け、ID トークンの発行者・宛先・有効期限・nonce を確かめる
- ログインできたら D1 の `users` にユーザーを登録し(Google アカウントの `sub` で本人を見分ける)、`sessions` にセッションを作る。ブラウザには HttpOnly・SameSite=Lax の Cookie でトークンを渡し、D1 にはそのハッシュ(SHA-256)だけを置く
- セッションの有効期間は 30 日。残りが 15 日を切ってからアクセスすると、そこから 30 日に延びる
- ログインが終わると、ログインを始めた画面に戻る。戻り先はアプリ内のパスだけを受け付ける
- ほかのサイトのフォームからの POST は、Hono の CSRF ミドルウェアで拒否する

| API                                    | 内容                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `GET /api/me`                          | ログイン中のユーザー。未ログインなら `{ "user": null }`          |
| `GET /api/auth/google?returnTo=<パス>` | ログインを始める(Google の画面に転送する)                        |
| `GET /api/auth/google/callback`        | Google からの戻り先。失敗したら戻り先に `?login=failed` を付ける |
| `POST /api/auth/logout`                | ログアウト                                                       |

### 設定

1. [Google Cloud Console](https://console.cloud.google.com/) の「Google Auth Platform」で、ブランディング(アプリ名など)と対象(外部・内部)を設定する
2. 「クライアント」から、種類が「ウェブ アプリケーション」の OAuth クライアントを作り、「承認済みのリダイレクト URI」に次を登録する(「承認済みの JavaScript 生成元」は不要)
   - `http://localhost:5173/api/auth/google/callback`(`bun run dev`)
   - `http://localhost:4173/api/auth/google/callback`(`bun run preview`)
   - `https://<本番のドメイン>/api/auth/google/callback`
3. ローカル: `.dev.vars.example` を `.dev.vars` にコピーし、クライアント ID とクライアント シークレットを書く
4. 本番: `bunx wrangler secret put GOOGLE_CLIENT_ID` と `bunx wrangler secret put GOOGLE_CLIENT_SECRET` で登録する

公開ステータスが「テスト」のあいだは、「対象」のテストユーザーに追加したアカウントしかログインできない。

`wrangler.jsonc` の `secrets.required` に 2 つのシークレットを書いているので、`worker-configuration.d.ts` に型が入る。未設定のまま `bun run dev` すると警告が出て、ログインのリンクを押すと 503 になる(ステージは遊べる)。本番では未設定のままの `wrangler deploy` が失敗する。

## CI

`.github/workflows/ci.yml` で、push(main)と pull request ごとに次を実行する。

- Biome、型チェック、シード SQL のずれ検知、Vitest(カバレッジ付き)
- Playwright(Chromium のデスクトップとモバイル)。失敗時はレポートを artifact に保存

## Cloudflare へのデプロイ

`wrangler.jsonc` の D1 には `database_id` を書いていない。初回の `wrangler deploy` で D1 が自動作成され、ID が `wrangler.jsonc` に書き戻される。

```sh
bunx wrangler login
bun run deploy             # ビルドしてデプロイ(初回は D1 も作成される)
bun run db:setup:remote    # 本番 D1 にスキーマとステージを入れる
```

初回デプロイ後に `wrangler.jsonc` に追記された `database_id` はコミットしておく。以降、スキーマやステージを変えたときは `bun run db:setup:remote` を流してから `bun run deploy` する。

Google ログインのシークレット(「Google ログイン」の設定 4)がないとデプロイは失敗する。Worker がまだない初回は `wrangler secret put` が使えないので、`.dev.vars.example` と同じ形式のファイル(`.dev.vars.production` など `.gitignore` 済みの名前にする)に本番の値を書き、`bun run build && bunx wrangler deploy --secrets-file .dev.vars.production` でデプロイする。シークレットは一度登録すれば以降のデプロイに引き継がれる。

Cloudflare の Workers Builds(GitHub 連携)で自動デプロイする場合は、ビルドコマンドを `bun run build`、デプロイコマンドを `bunx wrangler deploy && bun run db:setup:remote` にする(Workers Builds は `bun.lock` を見て Bun でインストールする)。シークレットは先に `wrangler secret put` かダッシュボードで登録しておく。
