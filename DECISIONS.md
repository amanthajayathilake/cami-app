# Decisions

## Prioritisation

I went in roughly the order the tasks were listed, but the actual first thing I did was
just run the repo end to end (docker compose up db, migrate, seed, npm run dev:api /
dev:web) before touching anything, so I could see the planted issues with my own eyes
instead of guessing from the README.

1. **CI first.** A red pipeline makes everything after it harder to trust, and it turned
   out to be a two-line fix once I found it, so there was no reason to defer it.
2. **List performance (N+1).** This is the most "senior engineer" signal in the repo -
   it's the kind of bug that looks fine in a demo with 5 rows and falls over in
   production. Fixed it early because the repository-seam work (task 6) wanted to sit on
   top of the fixed query anyway, not the old N+1 one.
3. **Controller refactor + classification history + provider seam.** These three are
   genuinely one piece of work - you can't cleanly extract classification into a service
   without deciding where it persists history and how the provider is injected - so I did
   them together rather than pretending they're separate diffs.
4. **UI freshness.** Small, mechanical, but real - did it right after the API shape for
   classify/status was stable so I wasn't fixing the client against a moving target.
5. **Repository/port seam (stretch).** Did a scoped version of this (see below) because it
   was the natural home for the optimized list query, not as a separate refactor pass.
6. **Deeper history / sequencing notes.** Documented here rather than over-building UI
   nobody asked for.

## Assumptions

- The seeded data volume (1200 requests, ~4 notes each) is meant to be realistic-enough
  to expose N+1 behaviour, not a hint that the first pass needed server-side pagination
  right away. I fixed the query first so it's O(1) round trips regardless of row count,
  and added real `limit`/`offset` pagination, search, and sorting to `GET /requests` in a
  follow-up round once it was explicitly asked for - see "Search, sorting, and
  pagination" below.
- `requestId` on `POST /requests/classify` is optional by design (the endpoint clearly
  supports "classify this text ad-hoc" as well as "classify and attach to a request"), so
  I kept that behaviour and made sure ad-hoc classifications still land in history with
  `requestId: null`.
- No authentication/authorization exists anywhere in this app, so I didn't add any. It's
  out of scope for the task list and would need product input on who's allowed to see/edit
  what.
- I assumed "make /history useful" meant a real table with filtering and pagination, not
  just prettifying the JSON dump - the placeholder page explicitly said as much.
- I did not add `class-validator`/`class-transformer` even though that's the idiomatic
  NestJS way to do DTO validation with `ValidationPipe`. They weren't already a
  dependency, and pulling in a new validation library for a handful of small DTOs felt
  like more ceremony than the change warranted under a timebox. I wrote small
  `fromBody`/`fromQuery` static factory methods instead that throw `BadRequestException`
  with the same shape Nest would produce anyway, and pulled the genuinely shared bits
  (`clampInt`, `parseEnum`) into `dto-utils.ts` once a third and fourth DTO needed the same
  clamping/enum-checking logic. If this were a longer-lived project I'd add
  class-validator - the hand-rolled version is holding up fine at six DTOs but won't scale
  past that without turning into its own micro-framework.

## Trade-offs

- **List query**: single SQL query with a `GROUP BY` subquery for note counts and a
  `LEFT JOIN LATERAL` for the latest note, run through `DataSource.query()` rather than
  TypeORM's query builder. TypeORM's QueryBuilder doesn't have first-class support for
  `LATERAL JOIN`, and forcing it through would've meant fighting the ORM instead of
  writing straightforward SQL. The cost is that this one query is now raw SQL living
  inside the TypeORM adapter - I think that's the right place for it, since the whole
  point of the repository port is that "the ugly part" is allowed to live behind the
  interface.
- **Repository port**: I introduced `RequestsRepositoryPort` and
  `ClassificationHistoryRepositoryPort` rather than a single generic
  repository/unit-of-work abstraction. A generic abstraction would look more "enterprise"
  but these two entities have genuinely different access patterns (mutable single-row
  reads/writes vs. append-only paginated reads), so forcing them through one interface
  would've added indirection without adding safety.
- **Validation**: manual DTOs instead of class-validator (see Assumptions). This is the
  trade-off I'm least sure about - it's the right call for this diff's size, wrong call if
  the API grows past what's here.
- **Pagination was added in a follow-up pass** (see "Search, sorting, and pagination"
  below). The first cut deliberately left it out and called it a known gap rather than
  guessing at a contract change - once it was actually asked for, it slotted onto the
  already-fixed single-query list without needing to touch the N+1 fix itself.

## Classification history scope

**What I implemented:**

- `classification_history` table + migration (`1720000000000-ClassificationHistory`):
  append-only, one row per classification run, storing the message/category/confidence
  as-is (not a foreign-key-only reference) so history stays meaningful even if the
  underlying request is edited later. `request_id` is a nullable FK with `ON DELETE
  SET NULL` - deleting a request shouldn't delete the audit trail of what was classified
  against it.
- `ClassifierProvider` port (`classifier-provider.ts`) with two implementations:
  - `KeywordClassifierProvider` - the original deterministic regex classifier, unchanged
    in behaviour, now just implements the interface and returns a `Promise`.
  - `SimulatedLlmClassifierProvider` - a sample stand-in for what a real LLM-backed
    provider would look like structurally: it "calls a model" (in reality just wraps the
    keyword classifier to keep it deterministic and dependency-free), parses/validates the
    response the way you'd have to with a real completion API, and falls back to the
    keyword provider if that parse/validation fails. No API key, no network call, no
    external dependency - but the shape of the code is what I'd actually write around a
    real provider.
  - Which one is active is an env var (`CLASSIFIER_PROVIDER=llm`), read in
    `requests.module.ts`. Both are always registered in the DI container so flipping the
    switch is a deploy-time config change, not a code change.
- `ClassificationHistoryRepositoryPort` + TypeORM adapter, with `findMany({ category,
  limit, offset })` returning `{ items, total, limit, offset }` for proper pagination.
- `GET /requests/history` - validates `category` against the known enum, clamps
  `limit`/`offset`, returns the page described above.
- `/history` in the web app - real table (message, category, confidence, provider,
  classified-at), a category filter dropdown, and prev/next pagination instead of a raw
  `JSON.stringify` dump.

**What I left out:**

- No UI for browsing history by request (e.g. "show me every past classification for this
  request"). The schema supports it (`requestId` is indexed) but it wasn't asked for and
  would need its own UI real estate.
- No retry/backoff logic on the simulated LLM provider - see "failure modes" below for
  what I'd actually build there.
- No caching of classification results for identical messages. Given the classifier is
  cheap (regex) this doesn't matter today, but it would matter a lot with a real LLM
  provider on the cost/latency side.

## Search, sorting, and pagination

`GET /requests` was extended to accept `search`, `sortBy`, `sortDir`, `limit`, and
`offset` query params, all optional with sane defaults (no search filter, sort by
`createdAt` descending, `limit=25`).

- **Total count without a second round trip.** Rather than running the page query and
  then a separate `SELECT COUNT(*)`, the single SQL query uses `COUNT(*) OVER()` so the
  total row count comes back as a column on every row of the page. That preserves the
  "one query" shape from the N+1 fix - adding pagination shouldn't mean adding a second
  query. If the page has zero rows (offset past the end, or no matches), the total is
  read as `0` since the window function has nothing to sit on top of.
- **Search is scoped to the message text only**, not note bodies. `ILIKE '%term%'`
  against `r.message`. Searching note content too is a reasonable ask but changes the
  join shape (a request could match because of a note that isn't even shown on the
  card), so I left it out rather than quietly widening what "search" means. Noted here so
  it reads as a decision, not an oversight.
- **Sort fields are an explicit allow-list** (`createdAt`, `status`, `noteCount`), both in
  the DTO and in a `SORT_COLUMN` lookup table in the TypeORM adapter that maps the
  validated field name to the real SQL column/alias. The column is never built from raw
  user input, it's always a lookup against a fixed map, so there's no SQL injection
  surface even though `ORDER BY` can't be parameterised the normal way.
- **Tiebreakers on every sort.** `ORDER BY <chosen column> <dir>, created_at DESC, id ASC`
  always. Sorting 1200 rows by `status` alone would otherwise give a different, unstable
  order across pages since hundreds of rows share the same status value.
- **Frontend**: the requests table now has a search box (submits on button click, not
  on every keystroke, to avoid firing a query per character), a sort-by dropdown with a
  direction toggle, and Previous/Next buttons driven by `total`/`limit`/`offset` from the
  response rather than a client-side slice.

## Request notes (view and add)

Notes already existed as a table feeding `noteCount`/`latestNotePreview` on the list, but
there was no way to see or add them from the UI. Added `GET /requests/:id/notes` and
`POST /requests/:id/notes`.

- **Existence check before touching notes.** Both `listNotes()` and `addNote()` on
  `RequestsService` call `getById()` first, which throws a 404 if the request doesn't
  exist. Without that, a bad id would either return a silently empty note list (looks
  like "no notes yet" instead of "this request doesn't exist") or, on `addNote`, hit a
  foreign key violation that surfaces as an ugly 500. Neither is what a client should have
  to handle.
- **Notes default to oldest-first**, the opposite of the main list's newest-first
  default. A note list reads like a conversation thread, so oldest-first is the sensible
  default; the requests table is triage-oriented, so newest-first makes more sense there.
  Both are still sortable either direction.
- **No pagination on the notes list.** It returns every note for a request in one call.
  Given the seed data averages a handful of notes per request, this is fine today, but
  it's a scale assumption I'm flagging rather than hiding - if a request could realistically
  accumulate hundreds of notes, this endpoint would need the same `limit`/`offset`
  treatment as the main list.
- **Two separate DTOs** (`NotesQueryDto` for the GET, `CreateNoteDto` for the POST)
  instead of one shared shape, because a query string and a JSON body validate
  differently in practice (query params are always strings that need coercing; a POST
  body already arrives typed) and conflating them just to save a file wasn't worth the
  confusion of one DTO doing two jobs.

## Stretch

### Persistence boundary (task 6)

Did this, scoped to where it actually pays for itself: `RequestsRepositoryPort` and
`ClassificationHistoryRepositoryPort`, each with a single TypeORM adapter. `RequestsService`
and `ClassificationService` depend only on the port interfaces (injected via DI tokens),
not on TypeORM's `Repository<T>` type or on the entity classes' persistence details. That
means:

- The optimized (raw-SQL) list query is isolated to one file
  (`typeorm-requests.repository.ts`) instead of leaking into the service.
- Both services are tested against in-memory fakes implementing the same ports (see
  `apps/api/test/fakes.ts`) - no real Postgres needed to exercise the business logic.
- Swapping persistence tech later (or adding a second implementation, e.g. a cached
  read-repository) doesn't touch business logic.

I stopped short of a full "clean architecture" layering (use-case objects, mappers,
generic `Repository<Entity>` base class) because the app is small enough that it would be
indirection for its own sake right now.

### Migration vs. deploy ordering

Both migrations here are additive (`CREATE TABLE IF NOT EXISTS`, new indexes) and don't
touch existing columns, so they're safe to run before, during, or after a rolling
deploy - old app code simply doesn't know the new table/columns exist yet. The pattern I'd
enforce on a team:

- **Expand/contract** for anything that isn't purely additive: add the new column/table
  nullable or defaulted first (a migration that ships *before* the code that uses it),
  deploy the code that writes to both old and new shape, backfill, then in a *later*
  deploy drop the old column/table. Never ship a migration that removes something the
  currently-running code still reads.
- **Migrations run before the new app version starts serving traffic**, not after - the
  CI pipeline here already does `migrate` before `build`/`deploy` for that reason. The
  risk case is the reverse order: new code assumes a column exists that the migration
  hasn't created yet.
- **Migrations should be backward-compatible with the previous app version** for the
  duration of a rolling deploy, since old and new instances run side by side briefly.
  That's exactly why `classification_history.request_id` is nullable and `ON DELETE SET
  NULL` rather than `NOT NULL` / `CASCADE` - it has to tolerate rows written by code that
  doesn't always have a request to link to.

### Failure modes for a future LLM provider

None of this is implemented (the task said a real model/API key isn't needed), but it's
what I'd build before `SimulatedLlmClassifierProvider` became a real HTTP call to
somewhere:

- **Timeouts** - an LLM call can hang far longer than a regex ever would. Needs a hard
  timeout (a few seconds) with fallback to the keyword classifier, not an indefinite wait
  blocking the classify request.
- **Rate limits / 429s** - retry with backoff for transient failures, but cap retries hard
  and fall back rather than let one slow provider back up the whole classify endpoint.
- **Malformed/unexpected responses** - a real completion API can return prose instead of
  JSON, an unexpected category string, or a confidence outside `[0, 1]`. The sample
  provider already demonstrates the shape of this: parse, validate against the known
  category enum, throw and fall back on anything that doesn't match. That's not
  optional - it's the difference between "degraded but functioning" and an unhandled
  exception in production.
- **Cost/latency** - every classify call becomes a paid, non-trivial-latency network
  call. I'd want per-message caching (hash of the trimmed message -> cached result, with a
  TTL) and probably a "only call the LLM if the keyword classifier isn't confident" hybrid
  strategy rather than always paying for the expensive path.
- **PII / data handling** - customer messages would be leaving our infrastructure to a
  third party. That needs a decision from whoever owns data-handling policy before this
  is real, not something to bake in silently.
- **Non-determinism** - unlike the keyword classifier, a real LLM won't give identical
  output for identical input every time. That has test implications (can't assert exact
  category in an integration test against a live model) and product implications (the
  same message classified twice could get a different answer, which needs to be
  communicated in the UI, not hidden).

### Team AI workflow standards

Kept this brief since it's genuinely a "stance," not a spec: I'd want AI-assisted changes
to go through the same review bar as anything else - no separate lighter-touch review path
just because a tool wrote the first draft - and I'd want the PR description to say what
was AI-generated vs. hand-written where it's non-obvious, mostly so reviewers know where to
look harder (generated code is good at looking confidently correct while being subtly
wrong in edge cases and error handling - exactly the kind of thing this challenge plants on
purpose).

## Local environment setup

Added a root `.env` (gitignored, `.env.example` committed) plus `apps/api/src/load-env.ts`
so `process.env.DATABASE_URL` etc. resolve consistently for `main.ts`, migrations, and
seeding without needing vars exported by hand. `apps/web` gets its own `.env.local` since
Next.js only auto-loads env files from its own project directory, not the monorepo root.

One thing worth flagging: `dotenv@17` prints a random self-promotional "tip" line to the
console on every load (pointing at the maintainer's other products, including one oddly
worded as `auth for agents [www.vestauth.com]`). It's genuinely part of the published
package - not a compromised dependency - but it's noise in migration/seed output, so
`load-env.ts` passes `quiet: true` to suppress it.

## Testing

Added a full unit-test layer on top of the one classifier test that was there before:
`RequestsService`, `ClassificationService`, `RequestsController`, both TypeORM repository
adapters, all DTOs, and both classifier providers are covered, using in-memory fakes
for the repository ports (`apps/api/test/fakes.ts`) so none of it needs a real database.
109 API tests and 11 web tests pass as of the pagination/search/notes round. A handful of
these are specifically regression tests for the planted bugs:

- `typeorm-requests.repository.test.ts` asserts `findAllWithStats()` issues exactly one
  `DataSource.query()` call no matter how many rows come back - that's the actual N+1 fix
  locked in place, not just "the query looks right." It also asserts the returned `total`
  matches the seeded row count, so the pagination work can't silently regress the fix
  it was built on top of.
- `ci-workflow.test.ts` reads `ci.yml` as plain text and fails if the `cami_app`/`cami`
  database name mismatch (or an equivalent override inside the Migrate step) is ever
  reintroduced.
- `requests.service.test.ts` asserts `list()` never calls `findById`, guarding against
  someone "fixing" a future bug by quietly reintroducing per-row lookups.
- `requests.controller.test.ts` asserts `classify()`/`updateStatus()` do nothing but parse
  and delegate, guarding against calibration logic creeping back into the controller.

Search, sort, pagination, and the notes view/add endpoints all have their own coverage
too: the fake repository's `SORT_COMPARATORS` mirror the real SQL ordering so service and
controller tests can assert sort/search params pass through correctly without a real
Postgres, and `typeorm-requests.repository.test.ts` checks the actual SQL params sent for
search and sort. Notes are covered for the happy path, the empty-list case, and the 404
case when the request id doesn't exist. On the web side, `page.test.tsx` covers the new
search box, sort dropdown, pagination buttons, and the notes panel (open, list, add), on
top of the existing staleness regression tests.

I did not use a validation library or generator for the DTO test cases - each one is a
direct assertion against the documented allow-lists (`REQUESTS_SORT_FIELDS`,
`SORT_DIRECTIONS`) so a future change to the allow-list has to touch the test too.

Left out: end-to-end tests that hit a running API against a real Postgres through actual
HTTP (see below) - I did verify pagination, search, sort, and notes manually against a
real running Postgres with `curl` (window function total counts, `ILIKE` search, notes
add/list, the 404 case), but that verification isn't captured as an automated test.

## What you would do with more time

- Pagination on the notes list itself, if a request could realistically accumulate a
  large number of notes (see "Request notes" above) - not needed for the seed data, but
  the honest next step if usage grew.
- Debounced search-as-you-type instead of a submit button, once there's a product
  opinion on whether firing a query per keystroke is worth the UX gain.
- Optimistic updates for the status dropdown (instant UI feedback, roll back on error)
  instead of the current invalidate-and-refetch, which is correct but has a visible round
  trip.
- An index on `request_notes(request_id, created_at DESC)` to make the `LATERAL` join in
  the list query use an index-only scan instead of a per-partition sort; at 1200
  requests/4800 notes it's already fast (see PR description for the measured number), but
  it's the next thing I'd tune if the seed volume grew by another order of magnitude.
- A short e2e test hitting the running API (supertest against a real Postgres in CI) - the
  current suite is thorough at the unit level but nothing exercises a real HTTP request
  through the whole stack, which is the remaining test gap in this submission.
- Implement Swagger for documentation and easily test the endpoints.
