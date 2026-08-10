# ApneNews — Automated Hindi News Publishing Platform

A production-oriented, SEO-optimized **Hindi news portal** with an end-to-end
**automated publishing pipeline**: it discovers, deduplicates, prioritizes,
rewrites into original Hindi, fact-checks, illustrates, quality-scores, and
publishes ~50–60 articles per day with minimal human intervention — while
enforcing strong factual, copyright, and content-safety safeguards.

> **Runs with zero API keys.** Deterministic fallback providers generate
> original Hindi articles and editorial images without any external service,
> so you can demo the full flow immediately. Add keys to swap in real LLM /
> image / social providers.

Built with **Next.js 14 (App Router) · TypeScript · Prisma · Tailwind CSS**.

---

## The automated workflow

```
NEWS SOURCES → FETCH → VALIDATE → DEDUPE → IMPORT → AI FACT/SUMMARY
  → ORIGINAL HINDI ARTICLE → CATEGORY + TAGS → SEO → IMAGE
  → QUALITY & SAFETY → CONFIDENCE ROUTING → PUBLISH QUEUE → AUTO PUBLISH
  → SITEMAP → RSS → INTERNAL LINKS → SOCIAL → ANALYTICS
```

Every stage is a small, independently-retryable service; one failure never
stops the pipeline. Confidence-based routing decides **auto-publish /
review / reject** per the configured mode (auto, review, or hybrid).

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (keyless defaults work out of the box)
cp .env.example .env
#   generate secrets:  openssl rand -hex 32   -> AUTH_SECRET / CRON_SECRET

# 3. Create the database schema (SQLite by default)
npm run prisma:push

# 4. Seed demo data AND run it through the real pipeline
#    (creates admin, 25 categories, sources, ~130 items -> ~58 published)
npm run db:seed

# 5. Start
npm run dev            # http://localhost:3000
```

Admin panel: **http://localhost:3000/admin** — login with the seeded
credentials (default `admin@apnenews.local` / `ChangeMe123!`, from `.env`).

Trigger the automation loop manually any time:

```bash
curl -X POST "http://localhost:3000/api/cron/pipeline?secret=$CRON_SECRET"
```

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Key ones:

| Variable | Purpose | Default |
|---|---|---|
| `APP_URL` | Canonical base URL (sitemaps/RSS/OG) | `http://localhost:3000` |
| `DATABASE_URL` | Prisma connection string | `file:./dev.db` (SQLite) |
| `AUTH_SECRET` | Signs admin session cookies | — (set this) |
| `CRON_SECRET` | Bearer token for `/api/cron/*` | — (set this) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded super-admin | demo values |
| `AI_PROVIDER` | `mock` \| `anthropic` | `mock` |
| `AI_API_KEY` / `AI_MODEL` | Real LLM (optional) | — |
| `IMAGE_PROVIDER` | `placeholder` \| … | `placeholder` |
| `TELEGRAM_*` | Telegram channel auto-post (optional) | disabled |

Never expose keys to the client — all providers run server-side only.

---

## Database setup

Default is **SQLite** for zero-config development. For production **PostgreSQL**:

1. In `prisma/schema.prisma` change the datasource provider:
   ```prisma
   datasource db { provider = "postgresql"  url = env("DATABASE_URL") }
   ```
2. Set `DATABASE_URL="postgresql://user:pass@host:5432/apnenews"` and
   `DATABASE_PROVIDER="postgresql"` in `.env`.
3. Run `npm run prisma:migrate` (or `prisma:push`) then `npm run db:seed`.

The schema (30+ normalized models) covers users/roles, taxonomy, sources +
fetch logs, news items/articles/versions, images, dedupe/fact/quality checks,
SEO, queue, publish logs, AI jobs/usage, social posts, settings, notifications,
analytics, error logs, and sitemap logs.

---

## Cron / queue configuration

The pipeline is driven by scheduled hits to secured endpoints under
`/api/cron/*`. Each is independently retryable.

**Vercel** — [`vercel.json`](./vercel.json) already declares the schedule;
set `CRON_SECRET` in project env and Vercel injects the Bearer token.

**Self-hosted** — use [`crontab.example`](./crontab.example):

```cron
*/15 * * * *  curl -H "Authorization: Bearer $SECRET" $HOST/api/cron/fetch-news
*/5  * * * *  curl -H "Authorization: Bearer $SECRET" $HOST/api/cron/process-news
*/10 * * * *  curl -H "Authorization: Bearer $SECRET" $HOST/api/cron/publish-queue
0    * * * *  curl -H "Authorization: Bearer $SECRET" $HOST/api/cron/update-trending
0    3 * * *  curl -H "Authorization: Bearer $SECRET" $HOST/api/cron/cleanup-old-data
```

Available jobs: `fetch-news`, `process-news`, `publish-queue`, `breaking-news`,
`update-trending`, `update-sitemap`, `daily-report`, `cleanup-old-data`,
`pipeline` (runs the whole loop). Admins can also click **Run now** in the
dashboard.

---

## AI setup

- **Keyless (default):** `AI_PROVIDER=mock` — a deterministic Hindi generator
  that extracts entities/dates/numbers from the source text, rephrases into an
  original editorial structure, and **never invents facts**.
- **Real LLM:** `AI_PROVIDER=anthropic`, set `AI_API_KEY` + `AI_MODEL`. The
  prompt strictly forbids fabrication and requires source attribution. On any
  API error it falls back to the mock provider so the pipeline never stalls.

Add another provider (e.g. OpenAI) by implementing `AiProvider` in
`src/server/providers/ai/` and wiring it in `src/server/providers/index.ts`.

AI usage + estimated INR cost are tracked per call (dashboard → AI cost).

---

## News source setup

Admin → **Sources** to add RSS/API/GOV/PRESS/YouTube feeds with priority,
trust score, category, and official flag. The fetcher reads **feed metadata
only** — it never scrapes full article bodies or bypasses paywalls/anti-bot
systems, and it attributes every story to its source.

Official/government sources get a higher trust score; the platform never
fabricates government announcements.

---

## Image setup

Default `IMAGE_PROVIDER=placeholder` renders a neutral, copyright-safe
editorial SVG banner (category-coloured, titled) as a data-URI — no real
photos, no fake logos, no misleading imagery. Sensitive topics automatically
use neutral illustrations. Implement `ImageProvider` to plug in a licensed
stock API or AI image generation.

---

## Admin login setup

The seed creates a `SUPER_ADMIN` from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Roles: Super Admin, Editor, Reviewer, Author, SEO Manager — each mapped to a
configurable permission set (`src/lib/constants.ts`). Sessions are bcrypt +
signed httpOnly cookies; `/admin/*` is gated by middleware.

**Change the default password immediately in production.**

---

## Production deployment

```bash
npm run build      # prisma generate + next build
npm start          # start the server
```

Checklist: set a strong `AUTH_SECRET` and `CRON_SECRET`; switch to Postgres;
set `APP_URL` to your domain; configure cron (Vercel or crontab); rotate the
admin password; add provider keys as needed. Security headers, compression,
and long-cache for static assets are preconfigured in `next.config.mjs`.

---

## Backup

- `sqlite3 prisma/dev.db ".backup backup.db"` (SQLite) or `pg_dump` (Postgres).
- Content/settings live in the DB; nightly `pg_dump`/`.backup` on a cron is the
  recommended backup (see `cleanup-old-data` for retention of logs/analytics).

---

## Testing

```bash
npm test          # vitest — dedupe, priority, AI generation, fact-check,
                  # quality, SEO, slug/url utils
npm run typecheck # tsc --noEmit
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Homepage shows "no published news" | Run `npm run db:seed`, or hit `/api/cron/pipeline?secret=…` |
| `/api/cron/*` returns 401 | Send `Authorization: Bearer $CRON_SECRET`, or log in as an admin |
| Prisma "table does not exist" | `npm run prisma:push` |
| Fonts look plain offline | Hind webfont loads from Google Fonts at runtime; system Devanagari fallback is used offline |
| Switched to Postgres, seed fails | Update the `provider` in `schema.prisma` and run `prisma:push` first |

---

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — module map, data model,
  pipeline internals, provider abstraction, and how requirements map to code.

## Content & copyright policy

AI output is original editorial content built from **verified source facts**;
the platform does not reproduce copyrighted articles, invent quotes/statistics/
government orders, or misrepresent third-party reporting as original. When
source information is insufficient, the article is routed to review rather than
published. AI-assisted authorship is disclosed via the byline/attribution.

## License

Provided as a reference implementation. Review source terms of use and local
regulations before operating a live news service.
