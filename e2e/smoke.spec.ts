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

test("Google でログインを押すと、PKCE 付きで Google の認可画面に移る", async ({
  page,
  baseURL,
}) => {
  // 本物の Google には接続せず、移動先の URL だけを確かめる
  await page.route("https://accounts.google.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<title>Google</title>" }),
  );
  await page.goto("/puzzles/corners");
  await page.getByRole("button", { name: "Google でログイン" }).click();
  await page.waitForURL(/^https:\/\/accounts\.google\.com\//);

  const params = new URL(page.url()).searchParams;
  expect(params.get("redirect_uri")).toBe(new URL("/api/auth/callback/google", baseURL).href);
  expect(params.get("code_challenge_method")).toBe("S256");
  expect(params.get("state")).toBeTruthy();
});

test("ログインしていなければセッションは null", async ({ request }) => {
  const res = await request.get("/api/auth/get-session");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toBeNull();
});

test("ステージの URL を直接開ける", async ({ page }) => {
  await page.goto("/puzzles/corners");
  await expect(page.getByRole("heading", { name: "曲がり角" })).toBeVisible();
});

test("存在しないステージはエラーを表示する", async ({ page }) => {
  await page.goto("/puzzles/no-such-stage");
  await expect(page.getByText("ステージが見つかりません")).toBeVisible();
});
