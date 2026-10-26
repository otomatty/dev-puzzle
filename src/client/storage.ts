import { type Program, type PuzzleDefinition, parseProgram } from "../engine";

/**
 * 進捗と組んだプログラムはブラウザに保存する。
 * プライベートモードなどで localStorage が使えなくても遊べるよう、失敗は握りつぶす。
 */

const PREFIX = "robozzle:";
const CLEARED_KEY = `${PREFIX}cleared`;
const COLOR_ASSIST_KEY = `${PREFIX}color-assist`;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくてもゲームは続けられる
  }
}

export function loadCleared(): Set<string> {
  const value = read(CLEARED_KEY);
  return new Set(Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);
}

export function markCleared(id: string): void {
  const cleared = loadCleared();
  cleared.add(id);
  write(CLEARED_KEY, [...cleared]);
}

/** 保存済みのプログラムを読む。ステージの形と合わなければ null */
export function loadProgram(id: string, def: PuzzleDefinition): Program | null {
  const result = parseProgram(read(`${PREFIX}program:${id}`), def);
  return result.ok ? result.program : null;
}

export function saveProgram(id: string, program: Program): void {
  write(`${PREFIX}program:${id}`, program);
}

export function loadColorAssist(): boolean {
  return read(COLOR_ASSIST_KEY) === true;
}

export function saveColorAssist(enabled: boolean): void {
  write(COLOR_ASSIST_KEY, enabled);
}
