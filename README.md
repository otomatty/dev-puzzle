# DevPuzzle

ロボットに命令を並べて、盤面の星をすべて集めるプログラミングパズルです。RoboZZle と同じ種類のパズルで、元のサイトは https://robozzle.com/ です。

遊べる場所は https://robozzle.saedgewell.workers.dev です。ステージは 14 問で、難しさは 1 から 5 です。

## 遊び方

ステージを開いて、関数のマスに命令を置きます。置ける命令は前進、左を向く、右を向く、関数の呼び出し、赤・緑・青に塗るです。ステージによって、関数の数、マスの数、塗れる色は違います。

各命令は、いつでも実行するか、赤・緑・青の床にいるときだけ実行するかを選べます。

実行するとロボットが動きます。星を全部集めるとクリアです。組んだプログラムと、クリアしたステージは、そのブラウザに保存されます。クリア人数は、サーバーが同じルールでプログラムを最後まで実行し、解けたときだけ増えます。

遊ぶには Google アカウントでのログインが必要です。ログインしていないと、どの画面を開いてもログイン画面が出て、ログインするとその画面に戻ります。ログイン中は、画面の右上に名前とアイコンが出ます。

色の区別がしにくいときは、色を形でも表示できます。画面は端末のライトモードとダークモードに合わせ、スマートフォンでも操作できます。

## 手元で動かす

Bun 1.4.4 と Node.js 22.18 以上が必要です。

```sh
bun install
bun run db:setup:local
bun run dev
```

ブラウザで http://localhost:5173 を開きます。`db:setup:local` はローカルのデータベースに表とステージを入れます。ステージ定義を変えたあとにもう一度実行します。遊ぶにはログインが必要なので、先に下の「Google ログインを設定する」を済ませます。

| コマンド                   | 内容                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `bun run check`            | Biome で lint と format を見る                                   |
| `bun run typecheck`        | 型を検査する                                                     |
| `bun run test`             | テストを実行する                                                 |
| `bun run test:e2e`         | Playwright。初回は `bunx playwright install chromium` を実行する |
| `bun run verify`           | check、型検査、テスト                                            |
| `bun run db:generate-seed` | ステージ定義からシード SQL を作り直す                            |

テストは `bun run test` で実行します。`bun test` は Bun 組み込みのテストランナーが起動し、Workers 用のテストが動きません。

### Google ログインを設定する

`bun run dev` や `bun run preview` で遊ぶには必要です。`bun run test` と `bun run test:e2e` には要りません。

1. [Google Cloud Console](https://console.cloud.google.com/) の「Google Auth Platform」で、ブランディングと対象を設定する。公開ステータスが「テスト」のあいだは、テストユーザーに追加したアカウントしかログインできない。ログインしないと遊べないので、本番では「対象」の「アプリを公開」で公開ステータスを「本番環境」にする。
2. 「クライアント」から、種類が「ウェブ アプリケーション」の OAuth クライアントを作り、「承認済みのリダイレクト URI」に次を登録する。
   - `http://localhost:5173/api/auth/callback/google`(`bun run dev`)
   - `http://localhost:4173/api/auth/callback/google`(`bun run preview`)
   - `https://robozzle.saedgewell.workers.dev/api/auth/callback/google`(本番)
3. `.dev.vars.example` を `.dev.vars` にコピーし、値を入れる。`BETTER_AUTH_SECRET` は `openssl rand -base64 32` で作る。
4. 本番には、同じ 3 つを `bunx wrangler secret put <名前>` で登録する。`BETTER_AUTH_SECRET` はローカルと別の値にする。

3 つのシークレットは `wrangler.jsonc` の `secrets.required` に書いてあり、本番に登録していないと `bun run deploy` は失敗します。ログインの表は `migrations/0002_create_auth_tables.sql` で、本番へは `bun run db:setup:remote` で反映します。

E2E では Google を通せないので、`e2e/global-setup.ts` がローカルのデータベースにテスト用のユーザーとセッションを入れ、ブラウザにそのセッションの Cookie を持たせます(`e2e/session.ts`)。シークレットは、`.dev.vars` がなければ `playwright.config.ts` からダミーの値を渡し、あれば `.dev.vars` の値を使います。

### ステージを追加・変更する

1. `src/puzzles/catalog.ts` を編集する。公開済みステージの `id` は変えない。
2. `src/puzzles/catalog.test.ts` の `SOLUTIONS` に模範解答を書く。
3. `bun run db:generate-seed` でシード SQL を作り直す。
4. `bun run test` で全ステージが解けることを確認する。

模範解答はテストにだけあり、サイトには出しません。シード SQL は手で編集しません。`seeds/` が `catalog.ts` とずれているとテストが失敗します。

本番のクリア人数を残したままステージを更新するときは、先にリモートのデータベースへ反映してからデプロイします。D1 の ID は `wrangler.jsonc` に書いてあります。

```sh
bun run db:setup:remote
bun run deploy
```

## 構成

ゲームのルールは `src/engine/` にあります。ブラウザは 1 手ずつ動かして表示し、サーバーはクリア報告を受けたときに同じルールで最後まで実行します。ステージ定義は `src/puzzles/catalog.ts`、API は `src/worker/`、画面は `src/client/` です。

配信は Cloudflare Workers、ステージとクリア人数は D1、画面は React です。push と pull request では、lint、型検査、テスト、Playwright が動きます。

ログインは Better Auth で、手段は Google アカウントだけです。ユーザーとセッションも D1 に保存します。ステージの API(`/api/puzzles` 以下)は、ログインしていないと 401 を返します。設定は `src/worker/auth.ts`、画面側は `src/client/auth.tsx` です。Better Auth は Node.js の機能を使うので、`wrangler.jsonc` で `nodejs_compat` を有効にしています。Better Auth に組み込まれたレート制限は Workers では有効にならないので、必要なら Cloudflare のレート制限ルールを使います。

Better Auth を更新して必要な表や列が変わると、`src/worker/auth.test.ts` のテストが失敗し、足りない分の SQL を表示します。その SQL で `migrations/` にマイグレーションを足します。
