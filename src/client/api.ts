import type { Program } from "../engine";
import type {
  ClearRequest,
  ClearResponse,
  ErrorResponse,
  PuzzleDetail,
  PuzzleListResponse,
  PuzzleResponse,
  PuzzleSummary,
} from "../shared/api";

export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorResponse | null;
    throw new ApiError(body?.error ?? `通信に失敗しました (${res.status})`, res.status);
  }
  return (await res.json()) as T;
}

export async function fetchPuzzles(signal?: AbortSignal): Promise<PuzzleSummary[]> {
  const { puzzles } = await request<PuzzleListResponse>("/api/puzzles", { signal });
  return puzzles;
}

export async function fetchPuzzle(id: string, signal?: AbortSignal): Promise<PuzzleDetail> {
  const { puzzle } = await request<PuzzleResponse>(`/api/puzzles/${id}`, { signal });
  return puzzle;
}

export async function reportClear(id: string, program: Program): Promise<number> {
  const body: ClearRequest = { program };
  const { solves } = await request<ClearResponse>(`/api/puzzles/${id}/clears`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return solves;
}
