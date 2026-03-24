import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getRequestUser: vi.fn(),
}));

import { DELETE, GET as getPostById, PUT } from "@/app/api/posts/[id]/route";
import { GET as listPosts, POST as createPost } from "@/app/api/posts/route";
import { getDb } from "@/db";
import { getRequestUser } from "@/lib/auth";

function makeJsonRequest(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("posts route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/posts returns 401 for mine=true without auth", async () => {
    vi.mocked(getRequestUser).mockReturnValue(null);
    vi.mocked(getDb).mockReturnValue({} as never);

    const request = new NextRequest("http://localhost/api/posts?mine=true");
    const response = await listPosts(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required for mine=true.");
  });

  it("GET /api/posts returns posts and pagination", async () => {
    vi.mocked(getRequestUser).mockReturnValue(null);

    const countWhere = vi.fn().mockResolvedValue([{ total: 2 }]);
    const countFrom = vi.fn().mockReturnValue({ where: countWhere });

    const rows = [
      {
        id: 10,
        title: "First post",
        text: "This is the first post text.",
        tags: ["news"],
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
        userId: 1,
        authorEmail: "alice@example.com",
      },
      {
        id: 11,
        title: "Second post",
        text: "This is the second post text.",
        tags: ["tech"],
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
        userId: 2,
        authorEmail: "bob@example.com",
      },
    ];

    const offset = vi.fn().mockResolvedValue(rows);
    const limit = vi.fn().mockReturnValue({ offset });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const whereRows = vi.fn().mockReturnValue({ orderBy });
    const innerJoin = vi.fn().mockReturnValue({ where: whereRows });
    const fromRows = vi.fn().mockReturnValue({ innerJoin });

    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce({ from: countFrom })
        .mockReturnValueOnce({ from: fromRows }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);

    const request = new NextRequest(
      "http://localhost/api/posts?page=1&pageSize=2&tag=tech"
    );
    const response = await listPosts(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.pageSize).toBe(2);
    expect(body.pagination.hasNext).toBe(false);
  });

  it("POST /api/posts returns 401 when unauthenticated", async () => {
    vi.mocked(getRequestUser).mockReturnValue(null);
    vi.mocked(getDb).mockReturnValue({} as never);

    const response = await createPost(
      makeJsonRequest("/api/posts", "POST", {
        title: "Post title",
        text: "This is a valid post body.",
        tags: ["news"],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
  });

  it("POST /api/posts returns 201 and created post", async () => {
    vi.mocked(getRequestUser).mockReturnValue({
      userId: 42,
      email: "author@example.com",
    });

    const createdPost = {
      id: 100,
      userId: 42,
      title: "A new post",
      text: "This is a valid body for a blog post.",
      tags: ["tech"],
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const returning = vi.fn().mockResolvedValue([createdPost]);
    const values = vi.fn().mockReturnValue({ returning });

    const db = {
      insert: vi.fn().mockReturnValue({ values }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await createPost(
      makeJsonRequest("/api/posts", "POST", {
        title: "A new post",
        text: "This is a valid body for a blog post.",
        tags: ["tech"],
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.post.id).toBe(100);
    expect(body.post.userId).toBe(42);
  });

  it("GET /api/posts/[id] returns 400 for invalid id", async () => {
    vi.mocked(getDb).mockReturnValue({} as never);

    const response = await getPostById(
      new NextRequest("http://localhost/api/posts/not-a-number"),
      { params: Promise.resolve({ id: "not-a-number" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid post ID.");
  });

  it("GET /api/posts/[id] returns 404 when post is missing", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });

    const db = {
      select: vi.fn().mockReturnValue({ from }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await getPostById(
      new NextRequest("http://localhost/api/posts/999"),
      { params: Promise.resolve({ id: "999" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Post not found.");
  });

  it("PUT /api/posts/[id] returns 401 when unauthenticated", async () => {
    vi.mocked(getRequestUser).mockReturnValue(null);
    vi.mocked(getDb).mockReturnValue({} as never);

    const response = await PUT(
      makeJsonRequest("/api/posts/1", "PUT", { title: "Updated title" }),
      { params: Promise.resolve({ id: "1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Authentication required.");
  });

  it("PUT /api/posts/[id] returns 404 when user does not own post", async () => {
    vi.mocked(getRequestUser).mockReturnValue({
      userId: 42,
      email: "owner@example.com",
    });

    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });

    const db = {
      update: vi.fn().mockReturnValue({ set }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await PUT(
      makeJsonRequest("/api/posts/123", "PUT", {
        title: "Updated title",
      }),
      { params: Promise.resolve({ id: "123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Post not found or not owned by user.");
  });

  it("DELETE /api/posts/[id] returns success for owned post", async () => {
    vi.mocked(getRequestUser).mockReturnValue({
      userId: 42,
      email: "owner@example.com",
    });

    const returning = vi.fn().mockResolvedValue([{ id: 123 }]);
    const where = vi.fn().mockReturnValue({ returning });

    const db = {
      delete: vi.fn().mockReturnValue({ where }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await DELETE(
      makeJsonRequest("/api/posts/123", "DELETE"),
      { params: Promise.resolve({ id: "123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
