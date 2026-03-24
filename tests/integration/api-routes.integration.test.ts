import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { DELETE, GET as getPostById, PUT } from "@/app/api/posts/[id]/route";
import { GET as listPosts, POST as createPost } from "@/app/api/posts/route";
import { getDb } from "@/db";
import { posts, users } from "@/db/schema";

function jsonRequest(path: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function authHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

const hasDatabaseEnv = Boolean(
  process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
);

const describeIntegration = hasDatabaseEnv ? describe : describe.skip;

describeIntegration("API integration tests (real database)", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const primaryEmail = `it-${runId}-primary@example.com`;
  const secondaryEmail = `it-${runId}-secondary@example.com`;
  const password = "Password123!";

  let ownedPostId: number | null = null;

  afterAll(async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const db = getDb();

    if (ownedPostId) {
      await db.delete(posts).where(inArray(posts.id, [ownedPostId]));
    }

    await db
      .delete(users)
      .where(inArray(users.email, [primaryEmail.toLowerCase(), secondaryEmail.toLowerCase()]));
  });

  it("registers and logs in with real auth and persistence", async () => {
    const registerResponse = await registerPost(
      jsonRequest("/api/auth/register", "POST", {
        email: primaryEmail,
        password,
      })
    );

    const registerBody = await registerResponse.json();
    expect(registerResponse.status).toBe(201);
    expect(registerBody.user.email).toBe(primaryEmail.toLowerCase());
    expect(registerBody.token).toBeTypeOf("string");

    const loginResponse = await loginPost(
      jsonRequest("/api/auth/login", "POST", {
        email: primaryEmail,
        password,
      })
    );

    const loginBody = await loginResponse.json();
    expect(loginResponse.status).toBe(200);
    expect(loginBody.user.email).toBe(primaryEmail.toLowerCase());
    expect(loginBody.token).toBeTypeOf("string");
  });

  it("creates, fetches, updates, and deletes a post using auth token", async () => {
    const registerResponse = await registerPost(
      jsonRequest("/api/auth/register", "POST", {
        email: secondaryEmail,
        password,
      })
    );
    const registerBody = await registerResponse.json();
    expect(registerResponse.status).toBe(201);

    const token = registerBody.token as string;

    const createResponse = await createPost(
      new NextRequest("http://localhost/api/posts", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          title: "Integration Test Post",
          text: "This is integration test post body text.",
          tags: ["integration", "api"],
        }),
      })
    );

    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createBody.post.title).toBe("Integration Test Post");

    ownedPostId = createBody.post.id as number;

    const listMineResponse = await listPosts(
      new NextRequest("http://localhost/api/posts?mine=true", {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
    );
    const listMineBody = await listMineResponse.json();
    expect(listMineResponse.status).toBe(200);
    expect(
      listMineBody.posts.some((post: { id: number }) => post.id === ownedPostId)
    ).toBe(true);

    const getByIdResponse = await getPostById(
      new NextRequest(`http://localhost/api/posts/${ownedPostId}`),
      {
        params: Promise.resolve({ id: String(ownedPostId) }),
      }
    );
    const getByIdBody = await getByIdResponse.json();
    expect(getByIdResponse.status).toBe(200);
    expect(getByIdBody.post.id).toBe(ownedPostId);

    const updateResponse = await PUT(
      new NextRequest(`http://localhost/api/posts/${ownedPostId}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({
          title: "Integration Test Post Updated",
        }),
      }),
      {
        params: Promise.resolve({ id: String(ownedPostId) }),
      }
    );

    const updateBody = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updateBody.post.title).toBe("Integration Test Post Updated");

    const deleteResponse = await DELETE(
      new NextRequest(`http://localhost/api/posts/${ownedPostId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
      {
        params: Promise.resolve({ id: String(ownedPostId) }),
      }
    );

    const deleteBody = await deleteResponse.json();
    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.success).toBe(true);

    const getAfterDeleteResponse = await getPostById(
      new NextRequest(`http://localhost/api/posts/${ownedPostId}`),
      {
        params: Promise.resolve({ id: String(ownedPostId) }),
      }
    );
    const getAfterDeleteBody = await getAfterDeleteResponse.json();

    expect(getAfterDeleteResponse.status).toBe(404);
    expect(getAfterDeleteBody.error).toBe("Post not found.");

    ownedPostId = null;
  });
});
