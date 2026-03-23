import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogNav } from "@/components/BlogNav";
import { getDb } from "@/db";
import { posts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import styles from "@/app/app.module.css";

export const revalidate = 60;

function parsePostId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatDate(dateText: string | Date): string {
  return new Date(dateText).toLocaleString();
}

export default async function PostDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = getDb();
  const resolvedParams = await params;
  const postId = parsePostId(resolvedParams.id);

  if (!postId) {
    notFound();
  }

  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      text: posts.text,
      tags: posts.tags,
      publishedAt: posts.publishedAt,
      userId: posts.userId,
      authorEmail: users.email,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const post = result[0];
  if (!post) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <BlogNav />

        <section className={styles.panel}>
          <article className={styles.card}>
            <p className={styles.cardMeta}>
              By {post.authorEmail} | {formatDate(post.publishedAt)}
            </p>
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.cardText} style={{ whiteSpace: "pre-wrap" }}>
              {post.text}
            </p>

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
              <Link href="/" className={styles.buttonGhost}>
                Back to posts
              </Link>
              <Link href="/my-posts" className={styles.button}>
                Manage your posts
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
