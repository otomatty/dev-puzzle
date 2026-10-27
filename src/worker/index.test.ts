import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgram, parseNotation } from "../engine";
import { CATALOG } from "../puzzles/catalog";
import type {
  ClearResponse,
  ErrorResponse,
  PuzzleListResponse,
  PuzzleResponse,
} from "../shared/api";
import { signedInHeaders } from "./test/fixtures";

const BASE = "http://example.com/api";
const SIGNED_OUT = new Headers();

/** ふだんはログイン中のユーザーとしてリクエストする */
let signedIn: Headers;

beforeEach(async () => {
  signedIn = await signedInHeaders();
});

function get(path: string, headers = signedIn) {
  return exports.default.fetch(`${BASE}${path}`, { headers });
}

function post(path: string, body: unknown, headers = signedIn) {
  return exports.default.fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...Object.fromEntries(headers), "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const first = CATALOG[0] as (typeof CATALOG)[number];
const solution = parseNotation(["F F F F"], first.definition);

describe("GET /api/health", () => {
  it("ログインしていなくても 200 と status: ok を返す", async () => {
    const res = await get("/health", SIGNED_OUT);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("GET /api/puzzles", () => {
  it("内蔵ステージを並び順どおりに返す", async () => {
    const res = await get("/puzzles");
    expect(res.status).toBe(200);
    const { puzzles } = await res.json<PuzzleListResponse>();
    expect(puzzles.map((p) => p.id)).toEqual(CATALOG.map((p) => p.id));
    expect(puzzles[0]).toEqual({
      id: first.id,
      title: first.title,
      difficulty: 1,
      solves: 0,
      definition: first.definition,
    });
  });
});

describe("GET /api/puzzles/:id", () => {
  it("定義・ヒント・次のステージを返す", async () => {
    const res = await get(`/puzzles/${first.id}`);
    expect(res.status).toBe(200);
    const { puzzle } = await res.json<PuzzleResponse>();
    expect(puzzle.definition).toEqual(first.definition);
    expect(puzzle.hint).toBe(first.hint);
    expect(puzzle.nextId).toBe(CATALOG[1]?.id);
  });

  it("最後のステージの次は null", async () => {
    const last = CATALOG.at(-1);
    const { puzzle } = await (await get(`/puzzles/${last?.id}`)).json<PuzzleResponse>();
    expect(puzzle.nextId).toBeNull();
  });

  it("存在しないステージは 404", async () => {
    const res = await get("/puzzles/no-such-puzzle");
    expect(res.status).toBe(404);
    expect(await res.json<ErrorResponse>()).toHaveProperty("error");
  });

  it("DB の定義が壊れていたら 500", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await env.DB.prepare("UPDATE puzzles SET definition = '{}' WHERE id = ?").bind(first.id).run();
    const res = await get(`/puzzles/${first.id}`);
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("POST /api/puzzles/:id/clears", () => {
  it("クリアできるプログラムならクリア人数を増やす", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, { program: solution });
    expect(res.status).toBe(200);
    expect(await res.json<ClearResponse>()).toEqual({ solves: 1 });

    const again = await post(`/puzzles/${first.id}/clears`, { program: solution });
    expect(await again.json<ClearResponse>()).toEqual({ solves: 2 });

    const { puzzle } = await (await get(`/puzzles/${first.id}`)).json<PuzzleResponse>();
    expect(puzzle.solves).toBe(2);
  });

  it("クリアできないプログラムは 422 で数えない", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, {
      program: emptyProgram(first.definition),
    });
    expect(res.status).toBe(422);
    const { puzzle } = await (await get(`/puzzles/${first.id}`)).json<PuzzleResponse>();
    expect(puzzle.solves).toBe(0);
  });

  it("ステージに合わないプログラムは 400", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, {
      program: parseNotation(["F F F F f2"]),
    });
    expect(res.status).toBe(400);
  });

  it("JSON でない本文は 400", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, "not json");
    expect(res.status).toBe(400);
  });

  it("大きすぎる本文は 413", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, { padding: "x".repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it("存在しないステージは 404", async () => {
    const res = await post("/puzzles/no-such-puzzle/clears", { program: solution });
    expect(res.status).toBe(404);
  });
});

describe("ログインしていないとき", () => {
  it("ステージの一覧と詳細は 401", async () => {
    for (const path of ["/puzzles", `/puzzles/${first.id}`, "/puzzles/no-such-puzzle"]) {
      const res = await get(path, SIGNED_OUT);
      expect(res.status, path).toBe(401);
      expect(await res.json<ErrorResponse>()).toEqual({ error: "ログインしてください" });
    }
  });

  it("クリア報告は 401 で、数えない", async () => {
    const res = await post(`/puzzles/${first.id}/clears`, { program: solution }, SIGNED_OUT);
    expect(res.status).toBe(401);
    const { puzzle } = await (await get(`/puzzles/${first.id}`)).json<PuzzleResponse>();
    expect(puzzle.solves).toBe(0);
  });

  it("署名の合わない Cookie は受け付けない", async () => {
    const [, token = ""] = /session_token=([^.;]+)/.exec(signedIn.get("cookie") ?? "") ?? [];
    expect(token).not.toBe("");
    const forged = new Headers({ cookie: `better-auth.session_token=${token}.forged` });
    expect((await get("/puzzles", forged)).status).toBe(401);
  });

  it("期限の切れたセッションは受け付けない", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    await env.DB.prepare("UPDATE session SET expiresAt = ?").bind(past).run();
    expect((await get("/puzzles")).status).toBe(401);
  });
});

describe("ステージの API でのログインの確認", () => {
  it("セッションの期限は延ばさない(延長は /api/auth/get-session に任せる)", async () => {
    // 前回の延長から 2 日たったことにする
    const expiresAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare("UPDATE session SET expiresAt = ?").bind(expiresAt).run();
    const current = () =>
      env.DB.prepare("SELECT expiresAt FROM session").first<string>("expiresAt");

    expect((await get("/puzzles")).status).toBe(200);
    expect(await current()).toBe(expiresAt);

    expect((await get("/auth/get-session")).status).toBe(200);
    expect(await current()).not.toBe(expiresAt);
  });
});

describe("未定義の API", () => {
  it("JSON の 404 を返す", async () => {
    const res = await get("/unknown");
    expect(res.status).toBe(404);
    expect(await res.json<ErrorResponse>()).toEqual({ error: "Not Found" });
  });
});
