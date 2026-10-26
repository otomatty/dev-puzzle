import { writeFileSync } from "node:fs";
import { CATALOG } from "../src/puzzles/catalog.ts";
import { buildSeedSql } from "../src/puzzles/seed.ts";

const output = new URL("../seeds/0001_puzzles.sql", import.meta.url);
writeFileSync(output, buildSeedSql(CATALOG));
console.log(`${CATALOG.length} 件のステージを ${output.pathname} に書き出しました`);
