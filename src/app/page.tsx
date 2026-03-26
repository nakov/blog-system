import Link from "next/link";
import Image from "next/image";
import { BlogNav } from "@/components/BlogNav";
import { getDb } from "@/db";
import { posts, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { toPublicCoverImageUrl } from "@/lib/r2";
import styles from "./app.module.css";

const PAGE_SIZE = 6;
export const revalidate = 60;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function shorten(text: string): string {
  if (text.length <= 190) {
    return text;
  }
  return `${text.slice(0, 190).trimEnd()}...`;
}

function formatDate(dateText: string | Date): string {
  return new Date(dateText).toLocaleString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const db = getDb();
  const resolvedSearchParams = await searchParams;
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const offset = (page - 1) * PAGE_SIZE;

  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(posts);

  const total = Number(countResult[0]?.total ?? 0);
  const pageCount = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  const rawPagedPosts = await db
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
    .orderBy(desc(posts.publishedAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const pagedPosts = rawPagedPosts.map((post) => ({
    ...post,
    coverImageUrl: toPublicCoverImageUrl(post.coverImageUrl),
  }));

  const previousPageHref = page <= 2 ? "/" : `/?page=${page - 1}`;
  const nextPageHref = `/?page=${page + 1}`;

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <BlogNav activePath="/" />

        <section className={styles.panel}>
          <h1 className={styles.title}>Stories from the Mosaic Feed</h1>
          <p className={styles.subtitle}>
            Browse the latest posts in short form. Open any post to read the full
            version.
          </p>

          {pagedPosts.length === 0 ? <p>No posts yet.</p> : null}

          {pagedPosts.length > 0 ? (
            <>
              <div className={styles.grid}>
                {pagedPosts.map((post) => (
                  <article key={post.id} className={styles.card}>
                    {post.coverImageUrl ? (
                      <Image
                        src={post.coverImageUrl}
                        alt={`Cover image for ${post.title}`}
                        className={styles.coverImage}
                        width={1280}
                        height={720}
                      />
                    ) : null}
                    <p className={styles.cardMeta}>
                      By {post.authorEmail} | {formatDate(post.publishedAt)}
                    </p>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    <p className={styles.cardText}>{shorten(post.text)}</p>

                    {post.tags.length > 0 ? (
                      <div className={styles.tagList}>
                        {post.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className={styles.actions}>
                      <Link href={`/posts/${post.id}`} className={styles.buttonGhost}>
                        Read full post
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <div className={styles.pagination}>
                {page > 1 ? (
                  <Link className={styles.buttonGhost} href={previousPageHref}>
                    Previous
                  </Link>
                ) : (
                  <span className={styles.buttonGhost} aria-disabled="true">
                    Previous
                  </span>
                )}
                <p>
                  Page {page} of {pageCount}
                </p>
                {page < pageCount ? (
                  <Link className={styles.buttonGhost} href={nextPageHref}>
                    Next
                  </Link>
                ) : (
                  <span className={styles.buttonGhost} aria-disabled="true">
                    Next
                  </span>
                )}
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
