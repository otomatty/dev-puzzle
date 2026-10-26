import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * テストは 3 つのプロジェクトに分ける。
 * - engine: ゲームロジックと内蔵ステージ(純粋な TS)。Node 上で高速に回す
 * - client: React コンポーネント。happy-dom + Testing Library
 * - worker: Hono API + D1。Cloudflare Workers ランタイム(workerd)上で実行
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/client/main.tsx",
        "src/client/test/**",
      ],
    },
    projects: [
      {
        test: {
          name: "engine",
          environment: "node",
          include: ["src/engine/**/*.test.ts", "src/puzzles/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "client",
          environment: "happy-dom",
          include: ["src/client/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/client/test-setup.ts"],
        },
      },
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations("./migrations"),
                TEST_SEEDS: await readD1Migrations("./seeds"),
              },
            },
          })),
        ],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
          setupFiles: ["./src/worker/test-setup.ts"],
        },
      },
    ],
  },
});
