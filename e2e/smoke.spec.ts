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

test("ログインしていなければ、ヘッダーに Google ログインのリンクを出す", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await expect(page.getByRole("link", { name: "Google でログイン" })).toHaveAttribute(
    "href",
    "/api/auth/google?returnTo=%2Fpuzzles%2Fcorners",
  );
});

test("ログイン状態の API が応答する", async ({ request }) => {
  const res = await request.get("/api/me");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ user: null });
});

test("画面からのログアウトは CSRF 対策に止められない", async ({ page }) => {
  await page.goto("/");
  const status = await page.evaluate(async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    return res.status;
  });
  expect(status).toBe(204);
});

test("ステージの URL を直接開ける", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await expect(page.getByRole("heading", { name: "曲がり角" })).toBeVisible();
});

test("存在しないステージはエラーを表示する", async ({ page }) => {
  await page.goto("/puzzles/no-such-stage");
  await expect(page.getByText("ステージが見つかりません")).toBeVisible();
});
