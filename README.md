# DevPuzzle

ロボットに命令を並べて、盤面の星をすべて集めるプログラミングパズルです。RoboZZle と同じ種類のパズルで、元のサイトは https://robozzle.com/ です。

遊べる場所は https://robozzle.saedgewell.workers.dev です。ステージは 14 問で、難しさは 1 から 5 です。

## 遊び方

ステージを開いて、関数のマスに命令を置きます。置ける命令は前進、左を向く、右を向く、関数の呼び出し、赤・緑・青に塗るです。ステージによって、関数の数、マスの数、塗れる色は違います。

各命令は、いつでも実行するか、赤・緑・青の床にいるときだけ実行するかを選べます。

実行するとロボットが動きます。星を全部集めるとクリアです。組んだプログラムと、クリアしたステージは、そのブラウザに保存されます。クリア人数は、サーバーが同じルールでプログラムを最後まで実行し、解けたときだけ増えます。

色の区別がしにくいときは、色を形でも表示できます。画面は端末のライトモードとダークモードに合わせ、スマートフォンでも操作できます。

## 手元で動かす

Bun 1.4.4 と Node.js 22.18 以上が必要です。

```sh
bun install
bun run db:setup:local
bun run dev
```

ブラウザで http://localhost:5173 を開きます。`db:setup:local` はローカルのデータベースに表とステージを入れます。ステージ定義を変えたあとにもう一度実行します。

| コマンド                   | 内容                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `bun run check`            | Biome で lint と format を見る                                   |
| `bun run typecheck`        | 型を検査する                                                     |
| `bun run test`             | テストを実行する                                                 |
| `bun run test:e2e`         | Playwright。初回は `bunx playwright install chromium` を実行する |
| `bun run verify`           | check、型検査、テスト                                            |
| `bun run db:generate-seed` | ステージ定義からシード SQL を作り直す                            |

テストは `bun run test` で実行します。`bun test` は Bun 組み込みのテストランナーが起動し、Workers 用のテストが動きません。

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
