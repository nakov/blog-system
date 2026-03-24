import { expect, test } from "@playwright/test";

const SESSION_STORAGE_KEY = "blog-system-session";

type MockPost = {
  id: number;
  title: string;
  text: string;
  tags: string[];
  publishedAt: string;
  userId: number;
  authorEmail: string;
};

function buildSession(email: string) {
  return JSON.stringify({
    token: "token-my-posts",
    user: {
      id: 77,
      email,
    },
  });
}

test.describe("My Posts page", () => {
  test("shows login prompt when unauthenticated", async ({ page }) => {
    await page.goto("/my-posts");

    await expect(page.getByText("You need to login first.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();
  });

  test("creates, edits, and deletes a post", async ({ page }) => {
    const now = new Date("2026-02-01T09:00:00.000Z").toISOString();
    let nextId = 900;
    const posts: MockPost[] = [];

    await page.addInitScript(
      ([storageKey, rawSession]) => {
        window.localStorage.setItem(storageKey, rawSession);
      },
      [SESSION_STORAGE_KEY, buildSession("author@example.com")]
    );

    await page.route(/\/api\/posts\?(.+&)?mine=true(&.+)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ posts }),
      });
    });

    await page.route("**/api/posts", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      const payload = route.request().postDataJSON() as {
        title?: string;
        text?: string;
        tags?: string[];
      };

      const created: MockPost = {
        id: nextId,
        title: payload.title ?? "",
        text: payload.text ?? "",
        tags: payload.tags ?? [],
        publishedAt: now,
        userId: 77,
        authorEmail: "author@example.com",
      };
      nextId += 1;
      posts.unshift(created);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ post: created }),
      });
    });

    await page.route(/\/api\/posts\/\d+$/, async (route) => {
      const method = route.request().method();
      const pathParts = new URL(route.request().url()).pathname.split("/");
      const postId = Number(pathParts[pathParts.length - 1]);
      const index = posts.findIndex((post) => post.id === postId);

      if (index < 0) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Post not found." }),
        });
        return;
      }

      if (method === "PUT") {
        const payload = route.request().postDataJSON() as {
          title?: string;
          text?: string;
          tags?: string[];
        };

        posts[index] = {
          ...posts[index],
          title: payload.title ?? posts[index].title,
          text: payload.text ?? posts[index].text,
          tags: payload.tags ?? posts[index].tags,
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ post: posts[index] }),
        });
        return;
      }

      if (method === "DELETE") {
        posts.splice(index, 1);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/my-posts");

    await expect(page.getByText("Signed in as author@example.com")).toBeVisible();
    await expect(page.getByText("No posts yet.")).toBeVisible();

    await page.locator("#create-title").fill("My first web test post");
    await page
      .locator("#create-text")
      .fill("This post is created through Playwright to validate the client workflow.");
    await page.locator("#create-tags").fill("playwright, web");
    await page.getByRole("button", { name: "Create post" }).click();

    await expect(page.getByText("Post created.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "My first web test post" })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#edit-title").fill("Updated web test post");
    await page
      .locator("#edit-text")
      .fill("Updated text from Playwright to verify edit behavior.");
    await page.locator("#edit-tags").fill("updated, e2e");
    await page.getByRole("button", { name: "Update post" }).click();

    await expect(page.getByText("Post updated.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Updated web test post" })).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Post deleted.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Updated web test post" })).toHaveCount(0);
  });
});