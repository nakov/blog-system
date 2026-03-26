import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, users } from "@/db/schema";
import { getRequestUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { toPublicCoverImageUrl } from "@/lib/r2";
import { createPostSchema } from "@/lib/validators";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get("tag")?.trim();
    const mine = searchParams.get("mine") === "true";
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get("pageSize"), 10),
      50
    );
    const offset = (page - 1) * pageSize;
    const authUser = getRequestUser(request);

    const filters = [];

    if (mine) {
      if (!authUser) {
        return jsonError("Authentication required for mine=true.", 401);
      }
      filters.push(eq(posts.userId, authUser.userId));
    }

    if (tag) {
      filters.push(sql`${tag} = ANY(${posts.tags})`);
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const countResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(posts)
      .where(whereClause);
    const total = Number(countResult[0]?.total ?? 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        coverImageUrl: posts.coverImageUrl,
        text: posts.text,
        tags: posts.tags,
        publishedAt: posts.publishedAt,
        userId: posts.userId,
        authorEmail: users.email,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(whereClause)
      .orderBy(desc(posts.publishedAt))
      .limit(pageSize)
      .offset(offset);

    const normalizedPosts = result.map((post) => ({
      ...post,
      coverImageUrl: toPublicCoverImageUrl(post.coverImageUrl),
    }));

    return NextResponse.json({
      posts: normalizedPosts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch {
    return jsonError("Failed to fetch posts.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const authUser = getRequestUser(request);
    if (!authUser) {
      return jsonError("Authentication required.", 401);
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const { title, text, tags, coverImageUrl } = parsed.data;

    const [newPost] = await db
      .insert(posts)
      .values({
        userId: authUser.userId,
        title,
        text,
        tags,
        coverImageUrl: coverImageUrl ?? null,
      })
      .returning();

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch {
    return jsonError("Failed to create post.", 500);
  }
}
