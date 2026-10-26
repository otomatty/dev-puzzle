import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Color,
  compileProgram,
  createGame,
  emptyProgram,
  type GameState,
  type Op,
  type Program,
  type PuzzleDefinition,
  step,
} from "../engine";
import { loadProgram, saveProgram } from "./storage";

export type Speed = "slow" | "normal" | "fast";

/** 1 手あたりの待ち時間(ミリ秒) */
export const SPEED_MS: Record<Speed, number> = { slow: 520, normal: 240, fast: 70 };

export interface Selection {
  fn: number;
  slot: number;
}

interface Options {
  onWin?: (program: Program) => void;
}

/** プログラムの編集と実行をまとめて管理する */
export function usePlayer(puzzleId: string, def: PuzzleDefinition, { onWin }: Options = {}) {
  const [program, setProgram] = useState<Program>(
    () => loadProgram(puzzleId, def) ?? emptyProgram(def),
  );
  const [selected, setSelected] = useState<Selection | null>({ fn: 0, slot: 0 });
  /** 空きスロットを選んでいるときに先に選んだ条件色。次に置く命令に付く */
  const [pendingCond, setPendingCond] = useState<Color | null>(null);
  const [game, setGame] = useState<GameState>(() => createGame(def));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const compiled = useMemo(() => compileProgram(program), [program]);

  useEffect(() => saveProgram(puzzleId, program), [puzzleId, program]);

  // 実行中は一定間隔で 1 手ずつ進める
  useEffect(() => {
    if (!running) return;
    if (game.status !== "running") {
      setRunning(false);
      return;
    }
    const timer = setTimeout(() => setGame((g) => step(g, compiled)), SPEED_MS[speed]);
    return () => clearTimeout(timer);
  }, [running, game, compiled, speed]);

  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  const programRef = useRef(program);
  programRef.current = program;
  useEffect(() => {
    if (game.status === "won") onWinRef.current?.(programRef.current);
  }, [game.status]);

  /** プログラムを変えたら実行は最初からやり直す */
  const edit = useCallback(
    (update: (draft: Program) => void) => {
      setProgram((current) => {
        const draft = current.map((fn) => [...fn]);
        update(draft);
        return draft;
      });
      setRunning(false);
      setGame(createGame(def));
    },
    [def],
  );

  const select = useCallback((selection: Selection | null) => {
    setSelected(selection);
    setPendingCond(null);
  }, []);

  const placeOp = useCallback(
    (op: Op) => {
      if (!selected) return;
      const { fn, slot } = selected;
      // 置き換えのときは元の条件を引き継ぎ、空きなら先に選んだ条件を付ける
      const cond = program[fn]?.[slot]?.cond ?? pendingCond;
      edit((draft) => {
        const row = draft[fn];
        if (row) row[slot] = { op, cond };
      });
      setPendingCond(null);
      // 次のスロットへ進めると、命令を続けて並べやすい
      const size = def.functions[fn] ?? 0;
      if (slot + 1 < size) setSelected({ fn, slot: slot + 1 });
    },
    [selected, program, pendingCond, edit, def],
  );

  /** 命令が入っていればその条件を変え、空きなら次に置く命令の条件として覚えておく */
  const setCond = useCallback(
    (cond: Color | null) => {
      if (!selected) return;
      const { fn, slot } = selected;
      if (!program[fn]?.[slot]) {
        setPendingCond(cond);
        return;
      }
      edit((draft) => {
        const row = draft[fn];
        const current = row?.[slot];
        if (row && current) row[slot] = { ...current, cond };
      });
    },
    [selected, program, edit],
  );

  const clearSlot = useCallback(() => {
    if (!selected) return;
    edit((draft) => {
      const row = draft[selected.fn];
      if (row) row[selected.slot] = null;
    });
  }, [selected, edit]);

  const clearProgram = useCallback(() => {
    edit((draft) => {
      draft.splice(0, draft.length, ...emptyProgram(def));
    });
    select({ fn: 0, slot: 0 });
  }, [edit, def, select]);

  const run = useCallback(() => {
    if (game.status !== "running") setGame(createGame(def));
    setRunning(true);
  }, [game.status, def]);

  const pause = useCallback(() => setRunning(false), []);

  const stepOnce = useCallback(() => {
    setRunning(false);
    setGame((g) => step(g.status === "running" ? g : createGame(def), compiled));
  }, [compiled, def]);

  const reset = useCallback(() => {
    setRunning(false);
    setGame(createGame(def));
  }, [def]);

  return {
    program,
    selected,
    select,
    /** 選択中のスロットに対応する条件色(パレットの表示用) */
    selectedCond: selected ? (program[selected.fn]?.[selected.slot]?.cond ?? pendingCond) : null,
    placeOp,
    setCond,
    clearSlot,
    clearProgram,
    game,
    /** 決着がついた瞬間も「実行中」と表示しないよう、状態と合わせて判定する */
    running: running && game.status === "running",
    speed,
    setSpeed,
    run,
    pause,
    stepOnce,
    reset,
  };
}
