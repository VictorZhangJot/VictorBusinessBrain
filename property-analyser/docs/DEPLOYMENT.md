# Deployment guide

## 1. Local development (default)

SQLite — zero external services.

```bash
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts   # optional fictional demo data
npm run dev              # port 4850
```

Environment lives in `.env` (copy `.env.example`). Set a long random `SESSION_SECRET`.

## 2. Vercel + Supabase (or any managed Postgres)

1. In `prisma/schema.prisma`, change the datasource provider from `sqlite` to `postgresql`.
2. Delete `prisma/migrations` (they are SQLite-flavoured) and regenerate against Postgres:
   `npx prisma migrate dev --name init` with `DATABASE_URL` pointing at your database.
3. Push the repo to GitHub and import it into Vercel (framework preset: Next.js).
4. Vercel → Project → Environment variables: `DATABASE_URL` (use the *pooled* connection
   string on Supabase), `SESSION_SECRET`, optional `URA_ACCESS_KEY`, `URA_COMM_SERVICE`,
   `DATAGOVSG_DATASET_ID`.
5. Add `prisma generate && prisma migrate deploy` to the build command
   (`prisma generate && prisma migrate deploy && next build`).
6. Seed once from your machine: `DATABASE_URL=... npx tsx prisma/seed.ts` (skip if you want a
   clean production database).

**PostGIS (recommended for production):** enable the extension
(`create extension if not exists postgis;`), then add a geometry column and index:

```sql
alter table "Building" add column geom geometry(Point, 4326);
update "Building" set geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326) where lat is not null;
create index building_geom_idx on "Building" using gist (geom);
```

Radius queries can then move from the in-app haversine to
`ST_DWithin(geom::geography, ST_MakePoint($lng,$lat)::geography, $metres)` via
`prisma.$queryRaw`. The app works correctly without this — it is an optimisation.

## 3. Docker

```bash
docker compose up --build            # SQLite in a named volume, port 4850
docker compose --profile postgres up # additionally starts a PostGIS container
```

For the Postgres profile, switch the Prisma provider (step 2 above) and set
`DATABASE_URL=postgresql://analyser:<password>@db:5432/property_analyser`.

## 4. Conventional VPS / cPanel-style Node hosting

Requirements: Node 18.17+ (Node 20 recommended), ability to run a persistent process.

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start   # serves on port 4850; front with nginx/Apache reverse proxy
```

Keep it alive with pm2 (`pm2 start npm --name analyser -- run start`) or a systemd unit.
On cPanel, use "Setup Node.js App" with the startup file `node_modules/next/dist/bin/next`
and args `start -p 4850`, or a custom `server.js` wrapper if the panel requires one.

## Security notes

- All source credentials stay in server-side environment variables; nothing is exposed to
  the browser (no `NEXT_PUBLIC_` secrets).
- Session cookies are httpOnly, SameSite=Lax, and `secure` in production — serve over HTTPS.
- The in-memory rate limiter is per-instance; multi-instance deployments should move it to a
  shared store (e.g. Redis) — noted in `lib/rateLimit.ts`.
