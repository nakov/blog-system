import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { posts, users } from "@/db/schema";
import { getRequestUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { toPublicCoverImageUrl } from "@/lib/r2";
import { updatePostSchema } from "@/lib/validators";

function parseId(idParam: string): number | null {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const { id: idParam } = await context.params;
    const id = parseId(idParam);

    if (!id) {
      return jsonError("Invalid post ID.", 400);
    }

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
      .where(eq(posts.id, id))
      .limit(1);

    const post = result[0];
    if (!post) {
      return jsonError("Post not found.", 404);
    }

    return NextResponse.json({
      post: {
        ...post,
        coverImageUrl: toPublicCoverImageUrl(post.coverImageUrl),
      },
    });
  } catch {
    return jsonError("Failed to fetch post.", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const authUser = getRequestUser(request);
    if (!authUser) {
      return jsonError("Authentication required.", 401);
    }

    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (!id) {
      return jsonError("Invalid post ID.", 400);
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const [updated] = await db
      .update(posts)
      .set({
        ...parsed.data,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, id), eq(posts.userId, authUser.userId)))
      .returning();

    if (!updated) {
      return jsonError("Post not found or not owned by user.", 404);
    }

    return NextResponse.json({ post: updated });
  } catch {
    return jsonError("Failed to update post.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = getDb();
    const authUser = getRequestUser(request);
    if (!authUser) {
      return jsonError("Authentication required.", 401);
    }

    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (!id) {
      return jsonError("Invalid post ID.", 400);
    }

    const [deleted] = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, authUser.userId)))
      .returning({ id: posts.id });

    if (!deleted) {
      return jsonError("Post not found or not owned by user.", 404);
    }

    return NextResponse.json({ success: true });
  } catch {
    return jsonError("Failed to delete post.", 500);
  }
}
