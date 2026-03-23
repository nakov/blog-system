"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BlogNav } from "@/components/BlogNav";
import { loginUser } from "@/lib/api-client";
import { saveClientSession } from "@/lib/client-auth";
import styles from "@/app/app.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");

      const { token, user } = await loginUser(email, password);
      saveClientSession({
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      });

      router.push("/my-posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <BlogNav activePath="/login" />

        <section className={`${styles.panel} ${styles.authPanel}`}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.subtitle}>Use your account to manage your posts.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
              <Link href="/register" className={styles.buttonGhost}>
                Need an account?
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
