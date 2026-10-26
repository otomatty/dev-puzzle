import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsProvider } from "../settings";
import { colored, straightLine } from "../test/fixtures";
import { Player } from "./Player";

function renderPlayer(puzzle = straightLine, onWin = vi.fn()) {
  const user = userEvent.setup();
  render(
    <SettingsProvider>
      <Player puzzle={puzzle} onWin={onWin} />
    </SettingsProvider>,
  );
  return { user, onWin };
}

const slot = (fn: number, index: number) =>
  screen.getByRole("button", { name: new RegExp(`^F${fn} の ${index} 番目`) });

describe("Player", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("命令を置くと次のスロットへ進む", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(screen.getByRole("button", { name: "前進" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 前進");
    expect(slot(1, 2)).toHaveAccessibleName("F1 の 2 番目: 前進");
    expect(slot(1, 3)).toHaveAttribute("aria-pressed", "true");
  });

  it("1 手ずつ進めてクリアすると結果と次のステージへのリンクを出す", async () => {
    const { user, onWin } = renderPlayer();
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole("button", { name: "前進" }));
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "1 手進める" }));
    }
    const result = screen.getByRole("status");
    expect(within(result).getByText("クリア")).toBeInTheDocument();
    expect(within(result).getByText(/4 手、命令 4 個/)).toBeInTheDocument();
    expect(within(result).getByRole("link", { name: "次のステージへ" })).toHaveAttribute(
      "href",
      "/puzzles/corners",
    );
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  it("実行ボタンで自動的に進む", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(screen.getByRole("button", { name: "F1 を呼ぶ" }));
    await user.click(screen.getByRole("radio", { name: "はやい" }));
    await user.click(screen.getByRole("button", { name: "実行" }));
    expect(screen.getByRole("button", { name: "一時停止" })).toBeInTheDocument();
    expect(
      await within(screen.getByRole("status")).findByText("クリア", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "実行" })).toBeInTheDocument();
  });

  it("失敗すると理由を表示し、最初に戻せる", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "左を向く" }));
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(screen.getByRole("button", { name: "1 手進める" }));
    await user.click(screen.getByRole("button", { name: "1 手進める" }));
    const result = screen.getByRole("status");
    expect(within(result).getByText("失敗")).toBeInTheDocument();
    expect(within(result).getByText(/床のないところ/)).toBeInTheDocument();

    await user.click(within(result).getByRole("button", { name: "最初に戻す" }));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("img", { name: /星は残り 1 個/ })).toBeInTheDocument();
  });

  it("空きスロットで先に色を選ぶと、置いた命令に条件が付く", async () => {
    const { user } = renderPlayer(colored);
    await user.click(screen.getByRole("button", { name: "赤の床のときだけ" }));
    expect(screen.getByRole("button", { name: "赤の床のときだけ" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "右を向く" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 右を向く(赤のとき)");
    // 次の命令には条件は引き継がない
    await user.click(screen.getByRole("button", { name: "前進" }));
    expect(slot(1, 2)).toHaveAccessibleName("F1 の 2 番目: 前進");
  });

  it("命令が入ったスロットは条件だけ変えられる", async () => {
    const { user } = renderPlayer(colored);
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(slot(1, 1));
    await user.click(screen.getByRole("button", { name: "緑の床のときだけ" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 前進(緑のとき)");
    await user.click(screen.getByRole("button", { name: "いつでも" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 前進");
  });

  it("ステージで使える命令だけをパレットに出す", () => {
    renderPlayer(colored);
    expect(screen.getByRole("button", { name: "F2 を呼ぶ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "F3 を呼ぶ" })).toBeNull();
    expect(screen.getByRole("button", { name: "緑に塗る" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "赤に塗る" })).toBeNull();
  });

  it("スロットを空にでき、すべて消すと F1 の先頭に戻る", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(slot(1, 1));
    await user.click(screen.getByRole("button", { name: "スロットを空にする" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 空き");

    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(screen.getByRole("button", { name: "前進" }));
    await user.click(screen.getByRole("button", { name: "すべて消す" }));
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 空き");
    expect(slot(1, 2)).toHaveAccessibleName("F1 の 2 番目: 空き");
    expect(slot(1, 1)).toHaveAttribute("aria-pressed", "true");
  });

  it("組んだプログラムはブラウザに保存され、開き直すと復元される", async () => {
    const { user } = renderPlayer();
    await user.click(screen.getByRole("button", { name: "前進" }));
    cleanup();
    renderPlayer();
    expect(slot(1, 1)).toHaveAccessibleName("F1 の 1 番目: 前進");
  });

  it("色を形でも表示する設定で盤面に形を重ねる", () => {
    window.localStorage.setItem("robozzle:color-assist", "true");
    const { container } = render(
      <SettingsProvider>
        <Player puzzle={colored} />
      </SettingsProvider>,
    );
    expect(container.querySelectorAll(".tile-glyph")).toHaveLength(3);
  });
});
