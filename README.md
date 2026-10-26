# RoboZZle

ロボットに命令を並べて盤面の星をすべて集める、RoboZZle 型のプログラミングパズル。Cloudflare Workers 上で動く Web アプリ。

- 内蔵ステージ 14 問(難しさ 1〜5)
- 命令: 前進・左右回転・関数呼び出し(F1〜F5)・ペンキ。各命令に「赤／緑／青の床のときだけ」の条件を付けられる
- 組んだプログラムとクリア状況はブラウザ(localStorage)に保存
- クリア人数は D1 に記録。送られたプログラムを Worker 側でも同じエンジンで実行し、本当にクリアできるときだけ数える
- 色を形(▲●■)でも表示する設定、ダークモード、スマートフォン対応

## 技術スタック

| 役割                      | 採用                                    | バージョン                |
| ------------------------- | --------------------------------------- | ------------------------- |
| ランタイム / ホスティング | Cloudflare Workers(静的アセット + API)  | wrangler 4.152.0          |
| データベース              | Cloudflare D1                           |                           |
| フロントエンド            | React + Vite(`@cloudflare/vite-plugin`) | React 19.3.1 / Vite 8.3.5 |
| API                       | Hono                                    | 4.13.14                   |
| 言語 / 型チェック         | TypeScript(ネイティブ版 `tsc`)          | 7.0.2                     |
| パッケージマネージャ      | pnpm                                    | 12.15.0                   |

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

すべての依存は完全一致でバージョンを固定し、pnpm の `minimumReleaseAge`(公開から 1 日未満の版を入れない)を有効のままにしている。

## ディレクトリ

```
src/
  engine/    ゲームのルール(盤面・命令・実行)。DOM にも Workers にも依存しない純粋な TS
  puzzles/   内蔵ステージの定義(catalog.ts)と D1 用シード SQL の生成
  shared/    API のレスポンス型(Worker とクライアントで共有)
  worker/    Hono の API(/api/*)と D1 アクセス
  client/    React の UI
migrations/  D1 のスキーマ
seeds/       内蔵ステージを登録する SQL(catalog.ts から生成。手で編集しない)
e2e/         Playwright
```

エンジンはクライアントと Worker の両方で使う。クライアントは 1 手ずつ実行してアニメーションし、Worker はクリア報告を受けたときに同じエンジンで最後まで実行して検証する。

Vitest は 3 プロジェクトに分かれている。

- `engine`: `src/engine/` と `src/puzzles/`。全ステージが模範解答でクリアできることもここで確かめる(模範解答はテストにだけ置き、配信しない)
- `client`: `src/client/`(happy-dom)
- `worker`: `src/worker/`(workerd。テストごとに D1 を作り直す)

## 開発

```sh
pnpm install
pnpm db:setup:local   # ローカルの D1 にスキーマとステージを入れる(初回とステージ変更時)
pnpm dev              # http://localhost:5173
```

| コマンド                | 内容                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `pnpm check`            | Biome(lint + format)                                         |
| `pnpm check:fix`        | Biome の自動修正                                             |
| `pnpm typecheck`        | `tsc -b`                                                     |
| `pnpm test`             | Vitest(engine / client / worker)                             |
| `pnpm test:coverage`    | カバレッジ付き                                               |
| `pnpm test:e2e`         | Playwright(初回は `pnpm exec playwright install chromium`)   |
| `pnpm verify`           | check + typecheck + test                                     |
| `pnpm db:generate-seed` | `catalog.ts` から `seeds/0001_puzzles.sql` を作り直す        |
| `pnpm cf-typegen`       | `wrangler.jsonc` から `worker-configuration.d.ts` を作り直す |

`pnpm ci` と `pnpm deploy` は pnpm 自体のコマンドと名前がぶつかるため、スクリプト名は `verify` と `cf:deploy` にしている。

### ステージを追加・変更する

1. `src/puzzles/catalog.ts` を編集する(公開済みステージの `id` は変えない)
2. `src/puzzles/catalog.test.ts` の `SOLUTIONS` に模範解答を書く
3. `pnpm db:generate-seed` でシード SQL を作り直す
4. `pnpm test` で全ステージが解けることを確認する

シード SQL は upsert なので、本番で流し直してもクリア人数は保たれる。`seeds/` が `catalog.ts` とずれていると、テストと CI が失敗する。

## CI

`.github/workflows/ci.yml` で、push(main)と pull request ごとに次を実行する。

- Biome、型チェック、シード SQL のずれ検知、Vitest(カバレッジ付き)
- Playwright(Chromium のデスクトップとモバイル)。失敗時はレポートを artifact に保存

## Cloudflare へのデプロイ

`wrangler.jsonc` の D1 には `database_id` を書いていない。初回の `wrangler deploy` で D1 が自動作成され、ID が `wrangler.jsonc` に書き戻される。

```sh
pnpm exec wrangler login
pnpm cf:deploy          # ビルドしてデプロイ(初回は D1 も作成される)
pnpm db:setup:remote    # 本番 D1 にスキーマとステージを入れる
```

初回デプロイ後に `wrangler.jsonc` に追記された `database_id` はコミットしておく。以降、スキーマやステージを変えたときは `pnpm db:setup:remote` を流してから `pnpm cf:deploy` する。

Cloudflare の Workers Builds(GitHub 連携)で自動デプロイする場合は、ビルドコマンドを `pnpm build`、デプロイコマンドを `pnpm exec wrangler deploy && pnpm db:setup:remote` にする。
