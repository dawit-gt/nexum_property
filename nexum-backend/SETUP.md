# Nexum Backend — Local Setup

## 1. Install dependencies

```bash
cd nexum-backend
npm install
```

`postinstall` runs `prisma generate` automatically. If it fails because you
don't have a `.env` yet, that's fine — just run `npx prisma generate` again
after step 2.

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in:
- `DATABASE_URL` — from your Supabase project: Project Settings → Database →
  Connection string (URI). Use the **pooled** connection string if offered.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate two different random
  strings: `openssl rand -hex 32` (run it twice).
- `FRONTEND_URL` — `http://localhost:3000` for local dev.

Everything below `FRONTEND_URL` in `.env.example` is for later phases —
leave blank for now.

## 3. Generate the Prisma Client and run the first migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

This creates every table in `prisma/schema.prisma` in your Supabase Postgres
database and generates the typed client the code imports from
`@prisma/client`.

## 4. Run it

```bash
npm run start:dev
```

- API base: `http://localhost:3001/api/v1`
- Swagger docs: `http://localhost:3001/api/docs`
- Health check: `http://localhost:3001/api/v1/health`

## 5. Try Phase 1 end to end

In Swagger (`/api/docs`):
1. `POST /api/v1/auth/register` — create an account.
2. `POST /api/v1/auth/login` — get back `{ accessToken, refreshToken }`.
3. Click **Authorize** in Swagger, paste the `accessToken`.
4. `GET /api/v1/auth/me` — should return your id/email/role.
5. `GET /api/v1/users/me` — should return your full profile.
6. `GET /api/v1/users` — should return `403 Forbidden` (you're a `USER`,
   this endpoint is `@Roles(ADMIN)`). That's correct — RBAC is working.

To test the admin path, open Prisma Studio (`npm run prisma:studio`) and
manually set your user's `role` to `ADMIN` and `registrationStatus` to
`APPROVED` — the real approval flow arrives in Phase 2.

## Troubleshooting

- **`Environment validation failed`** on boot — check the error message
  against `.env.example`; it names exactly which variable is missing or
  too short.
- **Prisma engine download errors** — Prisma needs to download a query
  engine binary on first `generate`/`migrate`. This requires normal
  internet access; it will not work behind a restrictive proxy/firewall.
- **`P1001: Can't reach database server`** — double check the
  `DATABASE_URL` password and that your Supabase project isn't paused
  (Master Plan Section 4B — free projects pause after 7 days idle; open
  the Supabase dashboard once to wake it).
