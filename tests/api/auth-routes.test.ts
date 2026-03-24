import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createToken: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { getDb } from "@/db";
import { createToken, hashPassword, verifyPassword } from "@/lib/auth";

function makeJsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("auth route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/auth/register returns 400 for invalid payload", async () => {
    const db = {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
    };
    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await registerPost(
      makeJsonRequest("/api/auth/register", {
        email: "bad-email",
        password: "short",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBeTypeOf("string");
  });

  it("POST /api/auth/register returns 409 for duplicate email", async () => {
    const db = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({ id: 1 }),
        },
      },
    };
    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await registerPost(
      makeJsonRequest("/api/auth/register", {
        email: "alice@example.com",
        password: "Password123!",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toBe("Email already registered.");
  });

  it("POST /api/auth/register returns 201 and token for valid payload", async () => {
    const newUser = {
      id: 2,
      email: "alice@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const returning = vi.fn().mockResolvedValue([newUser]);
    const values = vi.fn().mockReturnValue({ returning });

    const db = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
      insert: vi.fn().mockReturnValue({ values }),
    };

    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(createToken).mockReturnValue("token-123");

    const response = await registerPost(
      makeJsonRequest("/api/auth/register", {
        email: "Alice@Example.com",
        password: "Password123!",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.token).toBe("token-123");
    expect(body.user.email).toBe("alice@example.com");
    expect(hashPassword).toHaveBeenCalledWith("Password123!");
  });

  it("POST /api/auth/login returns 401 when user does not exist", async () => {
    const db = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    vi.mocked(getDb).mockReturnValue(db as never);

    const response = await loginPost(
      makeJsonRequest("/api/auth/login", {
        email: "nobody@example.com",
        password: "Password123!",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid credentials.");
  });

  it("POST /api/auth/login returns 401 when password is invalid", async () => {
    const db = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue({
            id: 5,
            email: "alice@example.com",
            passwordHash: "stored-hash",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          }),
        },
      },
    };

    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const response = await loginPost(
      makeJsonRequest("/api/auth/login", {
        email: "alice@example.com",
        password: "WrongPassword123!",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid credentials.");
  });

  it("POST /api/auth/login returns token and user for valid credentials", async () => {
    const user = {
      id: 7,
      email: "alice@example.com",
      passwordHash: "stored-hash",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const db = {
      query: {
        users: {
          findFirst: vi.fn().mockResolvedValue(user),
        },
      },
    };

    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(createToken).mockReturnValue("token-456");

    const response = await loginPost(
      makeJsonRequest("/api/auth/login", {
        email: "alice@example.com",
        password: "Password123!",
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.token).toBe("token-456");
    expect(body.user.id).toBe(7);
  });
});
