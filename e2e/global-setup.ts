import { execFileSync } from "node:child_process";
import { seedSessionSql } from "./session.ts";

/** webServer の起動(マイグレーションの適用)のあとに、テスト用のセッションをローカルの D1 に入れる */
export default function globalSetup() {
  execFileSync(
    "bunx",
    ["wrangler", "d1", "execute", "robozzle", "--local", "--command", seedSessionSql()],
    {
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
}
