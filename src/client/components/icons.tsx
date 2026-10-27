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

/** Google のロゴ。ブランドガイドラインに沿って、色や形は変えない */
export function GoogleLogo({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
