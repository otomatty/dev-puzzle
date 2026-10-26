import { expect, type Page, test } from "@playwright/test";

async function place(page: Page, ...ops: string[]) {
  for (const op of ops) {
    await page.getByRole("button", { name: op, exact: true }).click();
  }
}

test("命令を組んで実行し、クリアすると一覧に反映される", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /まっすぐ進もう/ }).click();
  await expect(page).toHaveURL(/\/puzzles\/first-steps$/);

  await place(page, "前進", "前進", "前進", "前進");
  await page.getByRole("radio", { name: "はやい" }).check({ force: true });
  await page.getByRole("button", { name: "実行" }).click();

  const result = page.getByRole("status");
  await expect(result.getByText("クリア", { exact: true })).toBeVisible();
  await expect(result.getByText("4 手、命令 4 個で星をすべて集めました。")).toBeVisible();
  await expect(page.getByText("クリア済み")).toBeVisible();

  await result.getByRole("link", { name: "次のステージへ" }).click();
  await expect(page.getByRole("heading", { name: "曲がり角" })).toBeVisible();

  await page.getByRole("link", { name: "ステージ一覧" }).click();
  await expect(page.getByText("14 ステージ中 1 ステージをクリア")).toBeVisible();
});

test("条件付きの命令と再帰でクリアできる", async ({ page }) => {
  await page.goto("/puzzles/red-corners");
  await place(page, "前進", "赤の床のときだけ", "右を向く", "F1 を呼ぶ");
  await expect(
    page.getByRole("button", { name: "F1 の 2 番目: 右を向く(赤のとき)" }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "はやい" }).check({ force: true });
  await page.getByRole("button", { name: "実行" }).click();
  await expect(page.getByRole("status").getByText("クリア", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
});

test("落ちると理由を表示し、最初に戻せる", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await place(page, "左を向く", "前進");
  await page.getByRole("button", { name: "1 手進める" }).click();
  await page.getByRole("button", { name: "1 手進める" }).click();

  const result = page.getByRole("status");
  await expect(result.getByText("失敗")).toBeVisible();
  await result.getByRole("button", { name: "最初に戻す" }).click();
  await expect(result.getByText("失敗")).toBeHidden();
});

test("組んだプログラムは再読み込みしても残る", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await place(page, "前進", "右を向く");
  await page.reload();
  await expect(page.getByRole("button", { name: "F1 の 1 番目: 前進" })).toBeVisible();
  await expect(page.getByRole("button", { name: "F1 の 2 番目: 右を向く" })).toBeVisible();
});
