import type { PuzzleDetail, PuzzleSummary } from "../../shared/api";

export const straightLine: PuzzleDetail = {
  id: "first-steps",
  title: "まっすぐ進もう",
  difficulty: 1,
  solves: 3,
  hint: "前進を並べましょう。",
  nextId: "corners",
  definition: {
    board: ["bbbbB"],
    start: { x: 0, y: 0, direction: "right" },
    functions: [5],
    paints: [],
  },
};

export const colored: PuzzleDetail = {
  id: "colored",
  title: "色つき",
  difficulty: 2,
  solves: 0,
  hint: "",
  nextId: null,
  definition: {
    board: ["brB"],
    start: { x: 0, y: 0, direction: "right" },
    functions: [3, 2],
    paints: ["green"],
  },
};

export const summaries: PuzzleSummary[] = [straightLine, colored].map(
  ({ id, title, difficulty, solves, definition }) => ({
    id,
    title,
    difficulty,
    solves,
    definition,
  }),
);

/** fetch をパスごとの JSON 応答に差し替える。キーは「メソッド パス」 */
export function mockFetch(routes: Record<string, unknown>) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = input instanceof Request ? input.url : input.toString();
    const url = new URL(raw, window.location.origin);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const key = `${method} ${url.pathname}${url.search}`;
    if (!(key in routes)) {
      return new Response(JSON.stringify({ error: "見つかりません" }), { status: 404 });
    }
    return new Response(JSON.stringify(routes[key]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}
