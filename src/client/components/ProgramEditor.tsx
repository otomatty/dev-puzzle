import type { Program, SlotRef } from "../../engine";
import { COLOR_LABEL, opLabel } from "../labels";
import { useSettings } from "../settings";
import type { Selection } from "../usePlayer";
import { ColorGlyph, OpIcon } from "./icons";

interface ProgramEditorProps {
  program: Program;
  selected: Selection | null;
  /** 直前に実行した命令 */
  current: SlotRef | null;
  onSelect: (selection: Selection) => void;
}

export function ProgramEditor({ program, selected, current, onSelect }: ProgramEditorProps) {
  const { colorAssist } = useSettings();

  return (
    <div className="program">
      {program.map((slots, fn) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 関数の並びは固定
        <div className="program-row" key={fn}>
          <span className="program-name" aria-hidden="true">
            F{fn + 1}
          </span>
          <div className="program-slots">
            {slots.map((instruction, slot) => {
              const isSelected = selected?.fn === fn && selected.slot === slot;
              const isCurrent = current?.fn === fn && current.slot === slot;
              const description = instruction
                ? `${opLabel(instruction.op)}${
                    instruction.cond ? `(${COLOR_LABEL[instruction.cond]}のとき)` : ""
                  }`
                : "空き";
              const classes = [
                "slot",
                instruction ? "slot--filled" : "slot--empty",
                instruction?.cond ? `slot--cond-${instruction.cond}` : "",
                isSelected ? "slot--selected" : "",
                isCurrent ? "slot--current" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: スロットの並びは固定
                  key={slot}
                  type="button"
                  className={classes}
                  aria-label={`F${fn + 1} の ${slot + 1} 番目: ${description}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelect({ fn, slot })}
                >
                  {instruction && <OpIcon op={instruction.op} size={22} />}
                  {instruction?.cond && colorAssist && (
                    <span className="slot-glyph">
                      <ColorGlyph color={instruction.cond} size={9} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
