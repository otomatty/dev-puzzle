# RoboZZle

RoboZZle 型のプログラミングパズルを Web アプリとして Cloudflare Workers 上で動かす。

## 技術スタック

| 役割                      | 採用                                    | バージョン                |
| ------------------------- | --------------------------------------- | ------------------------- |
| ランタイム / ホスティング | Cloudflare Workers(静的アセット + API)  | wrangler 4.152.0          |
| フロントエンド            | React + Vite(`@cloudflare/vite-plugin`) | React 19.3.1 / Vite 8.3.5 |
| API                       | Hono                                    | 4.13.14                   |
| 言語 / 型チェック         | TypeScript(ネイティブ版 `tsc`)          | 7.0.2                     |
| パッケージマネージャ      | pnpm                                    | 12.15.0                   |

## Lint・テスト(確定)

| 役割                                   | 採用                        | バージョン      |
| -------------------------------------- | --------------------------- | --------------- |
| Lint + Format                          | Biome                       | 2.6.3           |
| ユニット / コンポーネント / API テスト | Vitest                      | 5.0.5           |
| Workers ランタイム上のテスト           | `@cloudflare/vitest-plugin` | 1.4.7           |
| DOM 環境                               | happy-dom + Testing Library | 21.0.4 / 16.3.3 |
| E2E                                    | Playwright                  | 1.64.1          |

選定理由:

- **Biome**: Lint と Format が 1 ツールで完結し、TypeScript 本体に依存しない。typescript-eslint は TypeScript 6.1 未満のみ対応で TS 7 と組み合わせられないため ESLint は採らない。
- **Vitest**: Vite と設定を共有でき、Cloudflare 公式プラグインで Worker を本番と同じ workerd 上でテストできる。旧 `@cloudflare/vitest-pool-workers` は非推奨になったため後継の `@cloudflare/vitest-plugin` を使う。
- **Playwright**: `vite preview`(workerd 上で動作)に対して、デスクトップとモバイルの両方で E2E を回す。

Vitest は 3 プロジェクトに分けている。

- `engine` — `src/engine/` ゲームロジック(純粋な TS、Node で実行)
- `client` — `src/client/` React UI(happy-dom)
- `worker` — `src/worker/` Hono API(workerd)

すべての依存は完全一致でバージョン固定し、pnpm の `minimumReleaseAge`(公開から 1 日未満の版を拒否)を有効のままにしている。

## コマンド

```sh
pnpm install
pnpm dev            # 開発サーバー
pnpm check          # Biome(lint + format チェック)
pnpm check:fix      # 自動修正
pnpm typecheck      # tsc -b
pnpm test           # Vitest(engine / client / worker)
pnpm test:coverage
pnpm test:e2e       # Playwright(初回は `pnpm exec playwright install chromium`)
pnpm ci             # check + typecheck + test
pnpm deploy         # ビルドして Cloudflare にデプロイ
```

`wrangler.jsonc` を変更したら `pnpm cf-typegen` で `worker-configuration.d.ts` を再生成する。
