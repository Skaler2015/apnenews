# ApneNews — Architecture

Modular, service-oriented design over Next.js App Router. Clear separation of
providers (swappable external integrations), services (pipeline business
logic), data access, and presentation (public site + admin).

## Layers

```
src/
  app/                     Routing (App Router)
    (site)/                Public reader pages + chrome (Header/Ticker/Footer)
      page.tsx             Homepage (hero, latest, category sections, trending)
      [category]/          Category listing + /[category]/[slug] article page
      search/ latest/ trending/
    admin/                 Admin panel
      login/               Bare login (server action auth)
      (panel)/             Guarded chrome: dashboard, queue, published, sources,
                           categories, automation, health, analytics, logs
    api/cron/[job]/        Secured automation endpoints (spec §54)
    api/analytics/view/    View beacon
    sitemap.xml/ news-sitemap.xml/ robots.txt/ feed/  SEO route handlers
  components/              UI (public + admin kit: cards, badges, charts)
  lib/                     db, auth, settings, constants, utils, similarity, rss
  server/
    providers/             Provider abstraction (spec §76)
      ai/  news/  image/  social/
    services/              Pipeline services (the automation core)
    queries.ts             Read helpers for the frontend
  middleware.ts            Cheap /admin cookie gate
prisma/
  schema.prisma            30+ normalized models
  seed.ts + demo-data.ts   Demo data run through the REAL pipeline
```

## Provider abstraction (§76)

Interfaces in `server/providers/types.ts`; concrete implementations selected by
env in `server/providers/index.ts`. Every provider has a keyless default and
degrades gracefully.

| Interface | Default (keyless) | Optional |
|---|---|---|
| `AiProvider` | `mock` — rule-based Hindi generator, no fabrication | `anthropic` |
| `NewsProvider` | `rss` — metadata-only feed reader | NewsAPI, … |
| `ImageProvider` | `placeholder` — editorial SVG data-URI | licensed / AI |
| `SocialProvider` | `telegram` (off without creds) | FB/X/WA |

## Pipeline services (`server/services`)

| Service | Responsibility | Spec |
|---|---|---|
| `fetcher` | fetch active sources → normalize → validate → dedupe → prioritize → store; per-source isolation, retry logs, notifications | §4 |
| `dedupe` | URL-hash + title/text/fingerprint (SimHash) → 0-100 score & verdict | §5 |
| `priority` | 0-100 score from trust/breaking/official/freshness/category/dup; length targeting | §6, §9 |
| `processor` | item → AI article → SEO → image → fact-check → quality → confidence routing → queue/review/reject | §7–§21, §43 |
| `seo` | SEO title/meta/slug/keywords/OG/Twitter/alt; slug stability | §13, §14 |
| `quality` | fact traceability + confidence; composite quality (accuracy/originality/seo/readability/trust) | §10, §44 |
| `internal-linking` | related-article discovery + `InternalLink` rows; related feed | §15 |
| `publisher` | daily min/max, category balancing, smart mode, breaking fast-path; never fabricates to hit target | §18–§20, §81 |
| `social` | per-platform post generation + dispatch to configured providers | §37, §38 |
| `trending` | freshness-decayed view score | §28 |
| `sitemap` | eligible-URL sets + news-window logic | §33–§35 |
| `analytics` | view/search recording + dashboard aggregations | §52 |
| `pipeline` | orchestrates the full loop + daily report | §80, §57 |

## Confidence routing (§43)

`processor.routeByConfidence` uses the configured `publishMode`:

- **AUTO** — publishable if confidence ≥ review threshold.
- **REVIEW** — everything goes to human review.
- **HYBRID** — `≥ autoPublishConfidence` → approved/queued; `≥ reviewConfidence`
  → review; otherwise reject/hold. Likely duplicates (`≥ duplicateBlockScore`)
  are never auto-published.

## Data model highlights

- `NewsItem` (raw, metadata-only) → `NewsArticle` (generated original) 1:1.
- Scores live both denormalized on `NewsArticle` (fast lists) and in dedicated
  `DuplicateCheck` / `FactCheck` / `QualityScore` rows (audit trail).
- `NewsQueue` drives publishing; `PublishLog` records actions.
- `Setting` (JSON values) makes automation fully configurable at runtime with
  env fallbacks (`lib/settings.ts`, 30s cache).
- `NewsVersion` supports live/developing-story timelines (§22).

## Safety & correctness guarantees

- Facts are extracted from source text only; unverifiable claims lower
  confidence and route to review — never invented (§64).
- Images are neutral editorial illustrations by default; no fake photos/logos
  (§16/§17).
- Sources are attributed; feeds are read as metadata, no scraping/paywall
  bypass (§11/§65).
- Every automation action is logged (`ErrorLog`) and surfaced in the admin
  timeline; failures raise `Notification`s (§46/§56/§79).

## Scalability (§77)

Queue-oriented, index-backed reads, pagination, background cron workers, 30s
settings cache, and long-cache static assets. Batch sizes and daily limits are
configuration, not code — the same design serves 60 or 500+ articles/day.
