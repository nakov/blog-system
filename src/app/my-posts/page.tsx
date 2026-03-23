"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BlogNav } from "@/components/BlogNav";
import {
  createPost,
  deletePost,
  fetchPosts,
  updatePost,
} from "@/lib/api-client";
import { getClientSession } from "@/lib/client-auth";
import { ApiPost, ClientSession } from "@/types/blog";
import styles from "@/app/app.module.css";

type PostFormValues = {
  title: string;
  text: string;
  tags: string;
};

const initialFormValues: PostFormValues = {
  title: "",
  text: "",
  tags: "",
};

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    )
  );
}

function formatDate(dateText: string | Date): string {
  return new Date(dateText).toLocaleString();
}

export default function MyPostsPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createValues, setCreateValues] = useState<PostFormValues>(
    initialFormValues
  );
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<PostFormValues>(initialFormValues);

  useEffect(() => {
    const nextSession = getClientSession();
    setSession(nextSession);

    if (!nextSession) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setError("");
        const nextPosts = await fetchPosts({
          mine: true,
          token: nextSession.token,
        });
        setPosts(nextPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const reloadMine = async (token: string) => {
    const nextPosts = await fetchPosts({ mine: true, token });
    setPosts(nextPosts);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    try {
      setIsMutating(true);
      setError("");
      setSuccess("");

      await createPost(
        {
          title: createValues.title,
          text: createValues.text,
          tags: parseTags(createValues.tags),
        },
        session.token
      );

      await reloadMine(session.token);
      setCreateValues(initialFormValues);
      setSuccess("Post created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post.");
    } finally {
      setIsMutating(false);
    }
  };

  const startEditing = (post: ApiPost) => {
    setEditingPostId(post.id);
    setEditValues({
      title: post.title,
      text: post.text,
      tags: post.tags.join(", "),
    });
    setError("");
    setSuccess("");
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditValues(initialFormValues);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session || !editingPostId) {
      return;
    }

    try {
      setIsMutating(true);
      setError("");
      setSuccess("");

      await updatePost(
        editingPostId,
        {
          title: editValues.title,
          text: editValues.text,
          tags: parseTags(editValues.tags),
        },
        session.token
      );

      await reloadMine(session.token);
      cancelEditing();
      setSuccess("Post updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!session) {
      return;
    }

    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) {
      return;
    }

    try {
      setIsMutating(true);
      setError("");
      setSuccess("");

      await deletePost(postId, session.token);
      await reloadMine(session.token);
      if (editingPostId === postId) {
        cancelEditing();
      }
      setSuccess("Post deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <BlogNav activePath="/my-posts" />

        <section className={styles.panel}>
          <h1 className={styles.title}>My Posts</h1>

          {!session ? (
            <p>
              You need to login first. <Link href="/login">Go to login</Link>
            </p>
          ) : null}

          {session ? (
            <>
              <p className={styles.subtitle}>
                Create new posts, or edit and delete the ones you own.
              </p>

              <form className={styles.form} onSubmit={handleCreate}>
                <label className={styles.label} htmlFor="create-title">
                  Title
                </label>
                <input
                  id="create-title"
                  className={styles.input}
                  value={createValues.title}
                  onChange={(event) =>
                    setCreateValues((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                  required
                  minLength={3}
                  maxLength={180}
                />

                <label className={styles.label} htmlFor="create-text">
                  Text
                </label>
                <textarea
                  id="create-text"
                  className={styles.textarea}
                  value={createValues.text}
                  onChange={(event) =>
                    setCreateValues((value) => ({
                      ...value,
                      text: event.target.value,
                    }))
                  }
                  required
                  minLength={10}
                />

                <label className={styles.label} htmlFor="create-tags">
                  Tags (comma separated)
                </label>
                <input
                  id="create-tags"
                  className={styles.input}
                  value={createValues.tags}
                  onChange={(event) =>
                    setCreateValues((value) => ({
                      ...value,
                      tags: event.target.value,
                    }))
                  }
                  placeholder="react, nextjs, testing"
                />

                <div className={styles.actions}>
                  <button className={styles.button} disabled={isMutating} type="submit">
                    {isMutating ? "Saving..." : "Create post"}
                  </button>
                </div>
              </form>

              {isLoading ? <p>Loading your posts...</p> : null}
              {error ? <p className={styles.error}>{error}</p> : null}
              {success ? <p className={styles.success}>{success}</p> : null}

              {!isLoading && posts.length === 0 ? <p>No posts yet.</p> : null}

              <div className={styles.grid}>
                {posts.map((post) => (
                  <article key={post.id} className={styles.card}>
                    <p className={styles.cardMeta}>{formatDate(post.publishedAt)}</p>
                    <h2 className={styles.cardTitle}>{post.title}</h2>
                    <p className={styles.cardText}>{post.text.slice(0, 180)}...</p>

                    <div className={styles.tagList}>
                      {post.tags.map((tag) => (
                        <span key={tag} className={styles.tag}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className={styles.actions}>
                      <Link href={`/posts/${post.id}`} className={styles.buttonGhost}>
                        View
                      </Link>
                      <button
                        type="button"
                        className={styles.buttonGhost}
                        onClick={() => startEditing(post)}
                        disabled={isMutating}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.buttonDanger}
                        onClick={() => handleDelete(post.id)}
                        disabled={isMutating}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {editingPostId ? (
                <form className={styles.form} onSubmit={handleUpdate}>
                  <h2 className={styles.cardTitle}>Editing post #{editingPostId}</h2>

                  <label className={styles.label} htmlFor="edit-title">
                    Title
                  </label>
                  <input
                    id="edit-title"
                    className={styles.input}
                    value={editValues.title}
                    onChange={(event) =>
                      setEditValues((value) => ({
                        ...value,
                        title: event.target.value,
                      }))
                    }
                    required
                    minLength={3}
                    maxLength={180}
                  />

                  <label className={styles.label} htmlFor="edit-text">
                    Text
                  </label>
                  <textarea
                    id="edit-text"
                    className={styles.textarea}
                    value={editValues.text}
                    onChange={(event) =>
                      setEditValues((value) => ({
                        ...value,
                        text: event.target.value,
                      }))
                    }
                    required
                    minLength={10}
                  />

                  <label className={styles.label} htmlFor="edit-tags">
                    Tags (comma separated)
                  </label>
                  <input
                    id="edit-tags"
                    className={styles.input}
                    value={editValues.tags}
                    onChange={(event) =>
                      setEditValues((value) => ({
                        ...value,
                        tags: event.target.value,
                      }))
                    }
                  />

                  <div className={styles.actions}>
                    <button type="submit" className={styles.button} disabled={isMutating}>
                      {isMutating ? "Updating..." : "Update post"}
                    </button>
                    <button
                      type="button"
                      className={styles.buttonGhost}
                      onClick={cancelEditing}
                      disabled={isMutating}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
