import type { Color, Direction, FailureReason, Op } from "../engine";

export const COLOR_LABEL: Record<Color, string> = {
  red: "赤",
  green: "緑",
  blue: "青",
};

export const DIRECTION_LABEL: Record<Direction, string> = {
  up: "上",
  right: "右",
  down: "下",
  left: "左",
};

export function opLabel(op: Op): string {
  switch (op) {
    case "forward":
      return "前進";
    case "turnLeft":
      return "左を向く";
    case "turnRight":
      return "右を向く";
    case "paintRed":
      return "赤に塗る";
    case "paintGreen":
      return "緑に塗る";
    case "paintBlue":
      return "青に塗る";
    default:
      return `F${op.slice("call".length)} を呼ぶ`;
  }
}

export const FAILURE_MESSAGE: Record<FailureReason, string> = {
  fell: "ロボットが床のないところに出てしまいました。",
  outOfInstructions: "星が残ったまま、命令を最後まで実行しました。",
  stepLimit: "1000 手を超えたので止めました。終わらないくり返しになっていないか確かめましょう。",
  stackOverflow: "関数の呼び出しが深くなりすぎました。呼び出しの位置を見直しましょう。",
};
