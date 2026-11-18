# Coy Discover

A mobile-first discovery and swipe-matching application for Part B of the Coy SDE Intern assignment.

The project currently includes the frontend/backend foundation, SQLite schema, deterministic demo seed, and database tests. Discover screens, swipe interactions, and matching APIs are still under development.

## Stack and structure

- **Frontend:** Next.js App Router, React, strict TypeScript, Tailwind CSS, Motion for React.
- **Backend:** Node.js, Express 5, strict TypeScript, Zod.
- **Persistence:** SQLite through libSQL, Drizzle ORM, versioned SQL migrations.
- **Testing and quality:** Vitest unit/integration tests, ESLint, Prettier.

```text
frontend/            Next.js application and public assets
backend/src/         Express application, configuration, database modules
backend/scripts/     Migration/seed entry points and synthetic fixtures
backend/drizzle/     SQL migrations and Drizzle metadata
tests/               Unit tests, integration tests, isolated database helpers
```

The frontend and backend are separate pnpm workspace packages. Backend data and dependencies stay outside the frontend; lint prevents frontend imports from the backend. Development uses ports 3000 (frontend) and 4000 (backend).

## Getting started

Use **Node 24.22.3** and **pnpm 11.28.12**. Node is recorded in `.nvmrc` and `.node-version`; pnpm is pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [localhost:3000](http://localhost:3000). The current frontend shows a minimal heading. Express starts independently, but application API routes are not implemented yet and return 404.

No environment file is required. Database commands run in `backend/` and create `backend/coy.sqlite` by default. Repeat `pnpm db:seed` safely without resetting existing progress. Stop the development servers with Ctrl+C.

To run either application independently:

```sh
pnpm dev:frontend
pnpm dev:backend
```

To build both applications and run production servers in separate terminals:

```sh
pnpm build
pnpm start:backend
# In another terminal:
pnpm start:frontend
```

## Configuration

Zod validates backend configuration. Validation failures do not include supplied values or credentials.

| Variable       | Default             | Purpose                                                                                            |
| -------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `BACKEND_HOST` | `127.0.0.1`         | Express listen address; `0.0.0.0` is also accepted.                                                |
| `BACKEND_PORT` | `4000`              | Express listen port, integer 1-65535.                                                              |
| `DATABASE_URL` | `file:./coy.sqlite` | Persistent local SQLite file; parent directory must exist. Relative paths resolve from `backend/`. |
| `DEMO_USER_ID` | `1`                 | Server-controlled positive safe integer. IDs 1001-1030 are reserved for candidates.                |

For an isolated database, prefix each database command with the same non-secret override:

```sh
DATABASE_URL=file:/tmp/coy-demo.sqlite pnpm db:migrate
DATABASE_URL=file:/tmp/coy-demo.sqlite pnpm db:seed
```

Configuration parsing recognizes remote libSQL URLs and requires `DATABASE_AUTH_TOKEN` for them, but the connection factory rejects remote access until its guarantees are verified. Only local SQLite is currently supported. Keep credentials out of source control, shell history, public documentation, and frontend variables.

## Database and seed behavior

- `profiles` stores all required profile fields: name, age, photo, bio, city or college, and interests.
- `swipes` has a composite key for actor/target, foreign keys, valid-decision checks, non-self checks, and timestamp constraints.
- `matches` enforces a unique canonical profile pair, foreign keys, and valid timestamps.
- Seeding inserts **30 synthetic adult candidates**, one separate demo profile, and three incoming likes. Photos use a local placeholder; no external image service is required.
- Seed validation happens before writes. Profiles and incoming likes are inserted atomically, preserving existing profiles, decisions, timestamps, and matches on repeated runs.
- The seed creates no initial matches or outgoing demo swipes. Mutual-like business logic will be implemented in the backend.

Each local libSQL client owns one connection with foreign keys enabled and verified. Drizzle write transactions use `BEGIN IMMEDIATE`; integration tests verify locking across independent connections, rollback, and persistence after reopening. Close owned connections in `finally`. After a failed BEGIN, discard the client and use a fresh connection for any whole-transaction retry.

Use committed migrations through `pnpm db:migrate`. Generate future changes with `pnpm db:generate` and review the SQL. Do not edit an already-applied migration or use schema push as a substitute for migration history.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The current suites contain **25 unit tests** and **47 integration tests** covering configuration, seed completeness/validation, idempotence, constraints, migrations, rollback, write contention, and file-backed persistence. Integration scenarios create and remove isolated temporary databases; they do not use the development database. Run suites separately with `pnpm test:unit` or `pnpm test:integration`.

Database files/journals, environment files, dependencies, compiled output, and test artifacts are excluded from Git. Direct dependency versions and transitive resolutions are pinned in the manifests and lockfile.

## Remaining implementation

- Exact Express endpoints: `GET /feed`, `POST /swipe`, `GET /matches`.
- Backend-controlled mutual matching and privacy-safe response contracts.
- Blank Home tab, responsive Discover cards, swipe gestures, match feedback, and Matches view.
- Same-origin frontend forwarding to Express, application-level tests, and CI.

Incoming likes must remain private until mutual. Database constraints alone do not enforce reciprocity; backend transaction logic will enforce it when the APIs are implemented. Remote persistence and deployment durability have not been verified. Drizzle Kit currently includes two deprecated development-only transitive packages.
