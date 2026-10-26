import { expect, test } from "@playwright/test";

test("ステージ一覧に内蔵ステージが並ぶ", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ステージを選ぶ" })).toBeVisible();
  await expect(page.locator(".stage-list > li")).toHaveCount(14);
  await expect(page.getByText("14 ステージ中 0 ステージをクリア")).toBeVisible();
});

test("API が Worker から応答する", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("ステージの URL を直接開ける", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await expect(page.getByRole("heading", { name: "曲がり角" })).toBeVisible();
});

test("存在しないステージはエラーを表示する", async ({ page }) => {
  await page.goto("/puzzles/no-such-stage");
  await expect(page.getByText("ステージが見つかりません")).toBeVisible();
});
