import type { D1Migration } from "cloudflare:test";

declare global {
  namespace Cloudflare {
    interface Env {
      /** テスト専用: vitest.config.ts で読み込んだマイグレーション */
      TEST_MIGRATIONS: D1Migration[];
      /** テスト専用: seeds/ の SQL */
      TEST_SEEDS: D1Migration[];
    }
  }
}
