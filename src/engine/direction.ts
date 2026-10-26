/** ロボットの向き。時計回りの順に並べている */
export const DIRECTIONS = ["up", "right", "down", "left"] as const;
export type Direction = (typeof DIRECTIONS)[number];

const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};

function rotate(direction: Direction, steps: number): Direction {
  const index = DIRECTIONS.indexOf(direction);
  const next = (index + steps + DIRECTIONS.length) % DIRECTIONS.length;
  return DIRECTIONS[next] as Direction;
}

export function turnLeft(direction: Direction): Direction {
  return rotate(direction, -1);
}

export function turnRight(direction: Direction): Direction {
  return rotate(direction, 1);
}

/** 向いている方向に 1 マス進んだ座標の差分 */
export function delta(direction: Direction): { dx: number; dy: number } {
  return DELTAS[direction];
}
