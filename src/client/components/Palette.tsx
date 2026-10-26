import { COLORS, type Color, type Op, type Slot } from "../../engine";
import { COLOR_LABEL, opLabel } from "../labels";
import type { Selection } from "../usePlayer";
import { ColorGlyph, EraseIcon, OpIcon } from "./icons";

interface PaletteProps {
  ops: Op[];
  selected: Selection | null;
  /** 選択中のスロットの中身 */
  slot: Slot;
  /** 選択中のスロットの条件色。空きスロットなら次に置く命令の条件色 */
  cond: Color | null;
  onOp: (op: Op) => void;
  onCond: (cond: Color | null) => void;
  onErase: () => void;
}

export function Palette({ ops, selected, slot, cond, onOp, onCond, onErase }: PaletteProps) {
  const disabled = selected === null;

  return (
    <div className="palette">
      <p className="palette-target" aria-live="polite">
        {selected
          ? slot
            ? `F${selected.fn + 1} の ${selected.slot + 1} 番目を変更します`
            : `F${selected.fn + 1} の ${selected.slot + 1} 番目に置く命令を選んでください。先に色を選ぶと条件付きの命令になります`
          : "命令を置くスロットを選んでください"}
      </p>
      <fieldset className="palette-group">
        <legend className="palette-legend">命令</legend>
        {ops.map((op) => (
          <button
            key={op}
            type="button"
            className="palette-op"
            onClick={() => onOp(op)}
            disabled={disabled}
            aria-label={opLabel(op)}
            title={opLabel(op)}
          >
            <OpIcon op={op} />
          </button>
        ))}
        <button
          type="button"
          className="palette-op palette-op--erase"
          onClick={onErase}
          disabled={disabled || slot === null}
          aria-label="スロットを空にする"
          title="スロットを空にする"
        >
          <EraseIcon />
        </button>
      </fieldset>
      <fieldset className="palette-group">
        <legend className="palette-legend">実行する条件</legend>
        <button
          type="button"
          className="palette-cond"
          aria-pressed={!disabled && cond === null}
          disabled={disabled}
          onClick={() => onCond(null)}
        >
          いつでも
        </button>
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`palette-cond palette-cond--${color}`}
            aria-pressed={cond === color}
            aria-label={`${COLOR_LABEL[color]}の床のときだけ`}
            disabled={disabled}
            onClick={() => onCond(color)}
          >
            <ColorGlyph color={color} size={10} />
            {COLOR_LABEL[color]}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
