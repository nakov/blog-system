# Mosaic Blog

A full-stack blog application built with Next.js, PostgreSQL (Neon), and Drizzle ORM. It exposes a RESTful API and a React-based client — users can browse posts publicly, and authenticated users can create, edit, and delete their own posts.

## Features

- **Public feed** — browse all posts with pagination and tag filtering
- **Post detail view** — read individual posts with author info
- **User authentication** — register and log in with email and password (JWT-based)
- **Post management** — create, edit, and delete your own posts
- **Tag system** — attach up to 10 tags per post for organisation
- **My Posts dashboard** — view and manage all posts you have authored

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19, TypeScript) |
| Database | [PostgreSQL](https://www.postgresql.org/) via [Neon](https://neon.tech/) serverless |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Authentication | JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)), passwords hashed with [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| Validation | [Zod](https://zod.dev/) |
| Styling | CSS Modules, [Google Fonts](https://fonts.google.com/) (Space Grotesk, Space Mono) |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A PostgreSQL database (local or a [Neon](https://neon.tech/) serverless project)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/neondb
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
R2_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET=blog-covers
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
```

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) | — |
| `JWT_SECRET` | Secret used to sign JWT tokens (required) | — |
| `JWT_EXPIRES_IN` | JWT token lifetime | `7d` |
| `R2_URL` | Cloudflare R2 account endpoint | — |
| `R2_ACCESS_KEY_ID` | R2 S3 access key id (recommended) | — |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret access key (recommended) | — |
| `R2_BUCKET` | R2 bucket name that stores post cover images | — |
| `R2_PUBLIC_URL` | Public base URL used to build cover image URLs (for example `https://pub-xxxx.r2.dev`) | — |

### 3. Run database migrations

```bash
npm run drizzle:migrate
```

### 4. (Optional) Seed the database

Populates the database with two sample users and 20 sample posts:

```bash
npm run db:seed
```

Sample credentials after seeding (for local development only — do not use in production):

| Email | Password |
|---|---|
| alice@example.com | Password123! |
| bob@example.com | Password456! |

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the application for production |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run API unit tests in watch mode (Vitest) |
| `npm run test:run` | Run API unit tests once (Vitest) |
| `npm run test:integration` | Run integration tests in watch mode (Vitest) |
| `npm run test:integration:run` | Run integration tests once (Vitest) |
| `npm run test:web:install` | Install Chromium for Playwright |
| `npm run test:web` | Run browser-based web tests (Playwright) |
| `npm run test:web:ui` | Run Playwright with the interactive UI |
| `npm run drizzle:generate` | Generate Drizzle migration files from schema changes |
| `npm run drizzle:migrate` | Apply pending migrations to the database |
| `npm run db:seed` | Seed the database with sample users and posts |

## Web Testing (Playwright)

Install browser binaries the first time:

```bash
npm run test:web:install
```

Run the browser test suite:

```bash
npm run test:web
```

The Playwright config automatically starts the Next.js app and runs tests under `tests/web`.

## API Endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Log in and receive a JWT |
| `GET` | `/api/posts` | No | List posts (supports `page`, `limit`, `tag` query params) |
| `GET` | `/api/posts/[id]` | No | Get a single post by ID |
| `POST` | `/api/posts` | Yes | Create a new post |
| `POST` | `/api/posts/upload-image` | Yes | Upload a cover image to Cloudflare R2 |
| `PUT` | `/api/posts/[id]` | Yes | Update your own post |
| `DELETE` | `/api/posts/[id]` | Yes | Delete your own post |

Authenticated requests must include an `Authorization: Bearer <token>` header.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/   # POST /api/auth/register
│   │   │   └── login/      # POST /api/auth/login
│   │   └── posts/          # GET/POST /api/posts, GET/PUT/DELETE /api/posts/[id]
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── my-posts/           # Authenticated user's post dashboard
│   └── posts/[id]/         # Post detail page
├── components/             # Shared React components (e.g. BlogNav)
├── db/                     # Drizzle ORM setup and schema
├── lib/                    # Utilities: auth helpers, validators, HTTP helpers
└── types/                  # Shared TypeScript type definitions
scripts/
└── seed.ts                 # Database seeding script
drizzle/                    # Auto-generated migration files
```

## Database Schema

**`users`** — `id`, `email` (unique), `passwordHash`, `createdAt`, `updatedAt`

**`posts`** — `id`, `userId` (FK → users, cascade delete), `title`, `text`, `tags[]`, `publishedAt`, `createdAt`, `updatedAt`
