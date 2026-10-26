import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";

// ストレージはテストファイル単位で分離されるので、ファイルごとにスキーマを作る
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// テストごとにステージを入れ直し、クリア人数も 0 に戻す
beforeEach(async () => {
  const seeds = env.TEST_SEEDS.flatMap((seed) => seed.queries);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM puzzles"),
    ...seeds.map((query) => env.DB.prepare(query)),
  ]);
});
