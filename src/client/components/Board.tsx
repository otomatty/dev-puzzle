import { useRef } from "react";
import {
  type Board as BoardData,
  DIRECTIONS,
  type Direction,
  type Robot,
  type Status,
} from "../../engine";
import { COLOR_LABEL, DIRECTION_LABEL } from "../labels";
import { GlyphShape } from "./icons";

const CELL = 40;
const GAP = 3;
const DEPTH = 4;
const PAD = CELL / 2;

const STAR_PATH = (() => {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 11 : 4.8;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

/** 向きの変化を累積角度にする(右→上で 270° 回るのを防ぐ) */
function useAccumulatedAngle(direction: Direction): number {
  const ref = useRef({ direction, angle: DIRECTIONS.indexOf(direction) * 90 });
  const prev = ref.current;
  if (prev.direction !== direction) {
    const diff = (DIRECTIONS.indexOf(direction) - DIRECTIONS.indexOf(prev.direction) + 4) % 4;
    const delta = diff === 3 ? -90 : diff * 90;
    ref.current = { direction, angle: prev.angle + delta };
  }
  return ref.current.angle;
}

interface BoardProps {
  board: BoardData;
  robot: Robot;
  status?: Status;
  /** 1 手のアニメーション時間(ミリ秒)。0 なら動かさない */
  duration?: number;
  colorAssist?: boolean;
  /** 一覧のサムネイル用。説明を読み上げない */
  thumbnail?: boolean;
  starsLeft?: number;
}

export function Board({
  board,
  robot,
  status = "running",
  duration = 0,
  colorAssist = false,
  thumbnail = false,
  starsLeft,
}: BoardProps) {
  const angle = useAccumulatedAngle(robot.direction);
  const width = board.width * CELL + PAD * 2;
  const height = board.height * CELL + PAD * 2 + DEPTH;
  const fell = status === "lost" && !board.cells[robot.y * board.width + robot.x];
  const inside = robot.x >= 0 && robot.y >= 0 && robot.x < board.width && robot.y < board.height;

  const label = thumbnail
    ? undefined
    : `盤面 ${board.width}×${board.height}。ロボットは左から ${robot.x + 1} 列目、上から ${
        robot.y + 1
      } 行目で${DIRECTION_LABEL[robot.direction]}向き${
        inside ? "" : "(盤面の外)"
      }。星は残り ${starsLeft ?? 0} 個。`;

  return (
    <svg
      className={thumbnail ? "board board--thumbnail" : "board"}
      viewBox={`0 0 ${width} ${height}`}
      role={thumbnail ? undefined : "img"}
      aria-label={label}
      aria-hidden={thumbnail ? true : undefined}
      style={{ "--step-ms": `${duration}ms` } as React.CSSProperties}
    >
      <g transform={`translate(${PAD} ${PAD})`}>
        {board.cells.map((cell, index) => {
          if (!cell) return null;
          const x = (index % board.width) * CELL + GAP / 2;
          const y = Math.floor(index / board.width) * CELL + GAP / 2;
          const size = CELL - GAP;
          const cx = x + size / 2;
          const cy = y + size / 2;
          const position = `${x},${y}`;
          return (
            <g
              key={position}
              data-testid={thumbnail ? undefined : `tile-${index}`}
              data-color={cell.color}
            >
              <rect
                className={`tile-edge tile-edge--${cell.color}`}
                x={x}
                y={y + DEPTH}
                width={size}
                height={size}
                rx={6}
              />
              <rect
                className={`tile tile--${cell.color}`}
                x={x}
                y={y}
                width={size}
                height={size}
                rx={6}
              >
                {!thumbnail && <title>{COLOR_LABEL[cell.color]}</title>}
              </rect>
              {colorAssist && (
                <GlyphShape className="tile-glyph" color={cell.color} cx={x + 8} cy={y + 8} r={4} />
              )}
              {cell.star && (
                <path
                  className="star"
                  data-testid={thumbnail ? undefined : "star"}
                  d={STAR_PATH}
                  transform={`translate(${cx} ${cy})`}
                />
              )}
            </g>
          );
        })}
        <g
          className={`robot${fell ? " robot--fell" : ""}${status === "won" ? " robot--won" : ""}`}
          style={{
            transform: `translate(${robot.x * CELL + CELL / 2}px, ${
              robot.y * CELL + CELL / 2
            }px) rotate(${angle}deg)`,
          }}
        >
          <g className="robot-body">
            <path d="M0 -14 L12 11 L0 5 L-12 11 Z" />
            <circle cx={0} cy={-1} r={2.6} className="robot-eye" />
          </g>
        </g>
      </g>
    </svg>
  );
}
