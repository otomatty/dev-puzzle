import { useEffect, useRef, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: T };

/** key が変わるたびに load を呼び直す。古いリクエストは中断する */
export function useAsync<T>(key: string, load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const loadRef = useRef(load);
  loadRef.current = load;

  // key が変わったときだけ読み込み直したいので、意図的に key を依存に入れている
  // biome-ignore lint/correctness/useExhaustiveDependencies: key は再読み込みのきっかけ
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );
    return () => controller.abort();
  }, [key]);

  return state;
}
