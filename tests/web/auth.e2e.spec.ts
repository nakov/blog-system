import { expect, test } from "@playwright/test";

const SESSION_STORAGE_KEY = "blog-system-session";

test.describe("Auth flows", () => {
  test("registers and redirects to My Posts", async ({ page }) => {
    await page.route("**/api/auth/register", async (route) => {
      const payload = route.request().postDataJSON() as {
        email?: string;
        password?: string;
      };

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          token: "token-register",
          user: {
            id: 101,
            email: payload.email,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      });
    });

    await page.route(/\/api\/posts\?(.+&)?mine=true(&.+)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ posts: [] }),
      });
    });

    await page.goto("/register");

    await page.getByLabel("Email").fill("web-user@example.com");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page).toHaveURL(/\/my-posts$/);
    await expect(page.getByText("Signed in as web-user@example.com")).toBeVisible();

    const session = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_STORAGE_KEY);
    expect(session).toContain("token-register");
  });

  test("shows API error on failed login", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid email or password." }),
      });
    });

    await page.goto("/login");

    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("WrongPass123!");
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});