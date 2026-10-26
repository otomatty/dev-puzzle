import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { parseProgram, runToEnd } from "../engine";
import type {
  ClearResponse,
  ErrorResponse,
  PuzzleListResponse,
  PuzzleResponse,
} from "../shared/api";
import { findPuzzle, incrementSolves, listPuzzles } from "./db";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/puzzles", async (c) => {
  const puzzles = await listPuzzles(c.env.DB);
  return c.json<PuzzleListResponse>({ puzzles });
});

app.get("/puzzles/:id", async (c) => {
  const puzzle = await findPuzzle(c.env.DB, c.req.param("id"));
  if (!puzzle) return c.json<ErrorResponse>({ error: "ステージが見つかりません" }, 404);
  return c.json<PuzzleResponse>({ puzzle });
});

/**
 * クリア報告。送られたプログラムをサーバー側でも実行し、本当にクリアできる場合だけ数える。
 */
app.post(
  "/puzzles/:id/clears",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: (c) => c.json<ErrorResponse>({ error: "リクエストが大きすぎます" }, 413),
  }),
  async (c) => {
    const puzzle = await findPuzzle(c.env.DB, c.req.param("id"));
    if (!puzzle) return c.json<ErrorResponse>({ error: "ステージが見つかりません" }, 404);

    const body: unknown = await c.req.json().catch(() => null);
    const input = typeof body === "object" && body !== null ? Reflect.get(body, "program") : null;
    const parsed = parseProgram(input, puzzle.definition);
    if (!parsed.ok) return c.json<ErrorResponse>({ error: parsed.error }, 400);

    const result = runToEnd(puzzle.definition, parsed.program);
    if (result.status !== "won") {
      return c.json<ErrorResponse>({ error: "このプログラムではクリアできません" }, 422);
    }

    const solves = await incrementSolves(c.env.DB, puzzle.id);
    if (solves === null) return c.json<ErrorResponse>({ error: "ステージが見つかりません" }, 404);
    return c.json<ClearResponse>({ solves });
  },
);

app.notFound((c) => c.json<ErrorResponse>({ error: "Not Found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json<ErrorResponse>({ error: "サーバーでエラーが発生しました" }, 500);
});

export default app;
