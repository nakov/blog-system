import "dotenv/config";
import { hashPassword } from "../src/lib/auth";
import { getDb } from "../src/db";
import { posts, users } from "../src/db/schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  await db.delete(posts);
  await db.delete(users);

  const password1 = await hashPassword("Password123!");
  const password2 = await hashPassword("Password456!");

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        email: "alice@example.com",
        passwordHash: password1,
      },
      {
        email: "bob@example.com",
        passwordHash: password2,
      },
    ])
    .returning({ id: users.id, email: users.email });

  const tagPool = [
    "nextjs",
    "drizzle",
    "postgres",
    "neon",
    "api",
    "jwt",
    "typescript",
    "webdev",
  ];

  const seededPosts = Array.from({ length: 20 }).map((_, index) => {
    const author = insertedUsers[index % insertedUsers.length];
    const tagA = tagPool[index % tagPool.length];
    const tagB = tagPool[(index + 3) % tagPool.length];

    return {
      userId: author.id,
      title: `Sample Post ${index + 1}`,
      text: `<p>This is sample post ${index + 1}. It contains HTML content for testing.</p>`,
      tags: [tagA, tagB],
      publishedAt: new Date(Date.now() - index * 3600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  await db.insert(posts).values(seededPosts);

  console.log("Seed completed.");
  console.log("Users created:", insertedUsers.map((u) => u.email).join(", "));
  console.log("Posts created:", seededPosts.length);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
