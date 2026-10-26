import type { Color, Op } from "../../engine";

/** 命令やボタンのアイコン。色は currentColor を使う */

interface IconProps {
  size?: number;
}

function Svg({ size = 24, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20V5" />
      <path d="M6 10l6-6 6 6" />
    </Svg>
  );
}

export function TurnLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 20v-7a5 5 0 0 0-5-5H5" />
      <path d="M9 4L5 8l4 4" />
    </Svg>
  );
}

export function TurnRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 20v-7a5 5 0 0 1 5-5h8" />
      <path d="M15 4l4 4-4 4" />
    </Svg>
  );
}

export function PaintIcon({ color, ...props }: IconProps & { color: Color }) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.5c3.2 4.2 5.5 7.4 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.8 2.3-6 5.5-10.2z"
        fill={`var(--tile-${color})`}
        stroke="currentColor"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </Svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 5v14M16 5v14" strokeWidth={3.2} />
    </Svg>
  );
}

export function StepIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5.5v13l9-6.5z" fill="currentColor" />
      <path d="M18 5v14" strokeWidth={3} />
    </Svg>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </Svg>
  );
}

export function EraseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

/** 命令ごとのアイコン。関数呼び出しは F1〜F5 の文字で表す */
export function OpIcon({ op, size = 24 }: { op: Op; size?: number }) {
  switch (op) {
    case "forward":
      return <ForwardIcon size={size} />;
    case "turnLeft":
      return <TurnLeftIcon size={size} />;
    case "turnRight":
      return <TurnRightIcon size={size} />;
    case "paintRed":
      return <PaintIcon color="red" size={size} />;
    case "paintGreen":
      return <PaintIcon color="green" size={size} />;
    case "paintBlue":
      return <PaintIcon color="blue" size={size} />;
    default:
      return (
        <span className="op-call" aria-hidden="true">
          F{op.slice("call".length)}
        </span>
      );
  }
}

/** 色覚サポート用の形。赤 ▲ / 緑 ● / 青 ■ */
export function ColorGlyph({ color, size = 12 }: { color: Color; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <GlyphShape color={color} cx={6} cy={6} r={5} />
    </svg>
  );
}

export function GlyphShape({
  color,
  cx,
  cy,
  r,
  className,
}: {
  color: Color;
  cx: number;
  cy: number;
  r: number;
  className?: string;
}) {
  if (color === "red") {
    const h = r * 1.7;
    return (
      <path
        className={className}
        d={`M${cx} ${cy - h / 2}L${cx + r} ${cy + h / 2}H${cx - r}Z`}
        fill="currentColor"
      />
    );
  }
  if (color === "green") {
    return <circle className={className} cx={cx} cy={cy} r={r * 0.9} fill="currentColor" />;
  }
  const s = r * 0.85;
  return (
    <rect
      className={className}
      x={cx - s}
      y={cy - s}
      width={s * 2}
      height={s * 2}
      fill="currentColor"
    />
  );
}
