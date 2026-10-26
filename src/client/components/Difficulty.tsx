/** 難しさを 5 段階のマスで表す */
export function Difficulty({ level }: { level: number }) {
  return (
    <span className="difficulty" role="img" aria-label={`難しさ ${level} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= level ? "difficulty-pip difficulty-pip--on" : "difficulty-pip"}
        />
      ))}
    </span>
  );
}
