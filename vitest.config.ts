import { cloudflareTest } from "@cloudflare/vitest-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * テストは 3 つのプロジェクトに分ける。
 * - engine: ゲームロジック(純粋な TS)。Node 上で高速に回す
 * - client: React コンポーネント。happy-dom + Testing Library
 * - worker: Hono API。Cloudflare Workers ランタイム(workerd)上で実行
 */
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/client/main.tsx"],
    },
    projects: [
      {
        test: {
          name: "engine",
          environment: "node",
          include: ["src/engine/**/*.test.ts"],
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
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
        },
      },
    ],
  },
});
