"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  clearClientSession,
  getClientSession,
  getClientSessionServerSnapshot,
  subscribeClientSession,
} from "@/lib/client-auth";
import styles from "@/app/app.module.css";

type BlogNavProps = {
  activePath?: string;
};

export function BlogNav({ activePath }: BlogNavProps) {
  const session = useSyncExternalStore(
    subscribeClientSession,
    getClientSession,
    getClientSessionServerSnapshot
  );

  const isLoggedIn = Boolean(session);
  const email = session?.user.email ?? "";

  const linkClass = (path: string) =>
    activePath === path
      ? `${styles["blog-nav__link"]} ${styles["blog-nav__linkActive"]}`
      : styles["blog-nav__link"];

  const handleLogout = () => {
    clearClientSession();
    window.location.href = "/";
  };

  return (
    <header className={styles["blog-nav"]}>
      <Link href="/" className={styles["blog-nav__brand"]}>
        Mosaic Blog
      </Link>

      <nav className={styles["blog-nav__links"]} aria-label="Main navigation">
        <Link href="/" className={linkClass("/")}>
          Posts
        </Link>
        {isLoggedIn ? (
          <Link href="/my-posts" className={linkClass("/my-posts")}>
            My Posts
          </Link>
        ) : null}
        {!isLoggedIn ? (
          <>
            <Link href="/login" className={linkClass("/login")}>
              Login
            </Link>
            <Link href="/register" className={linkClass("/register")}>
              Register
            </Link>
          </>
        ) : (
          <button
            type="button"
            className={styles["blog-nav__logout"]}
            onClick={handleLogout}
          >
            Logout
          </button>
        )}
      </nav>

      <p className={styles["blog-nav__user"]}>
        {isLoggedIn ? `Signed in as ${email}` : "Guest mode"}
      </p>
    </header>
  );
}
