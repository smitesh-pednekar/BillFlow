# BillFlow

Invoicing for people who work alone. Add a client, build an invoice with live
totals, send a link, and get paid — with overdue tracking that looks after
itself.

Built as a full-stack assessment project.

---

## Live demo

> **Deployment is not wired up yet.** The app runs locally against Postgres via
> the steps below. Once it is deployed, this section should carry the URL, the
> demo login, and a direct public invoice link.

**Demo account** (created by the seed script, and pre-filled on the sign-in
page so you never have to come back here):

```
demo@billflow.app
demo1234
```

The seed script prints a **public invoice link** when it finishes — open it in a
private window to see what a client sees, with no account.

---

## What is built

All twelve requirements, plus three of the bonus items.

| # | Requirement | Status | Where |
|---|---|---|---|
| 1 | Landing page | ✅ | [`src/app/page.tsx`](src/app/page.tsx) — hero invoice that fills itself in |
| 2 | Accounts (sign up, log in, log out) | ✅ | bcrypt + JWT in an httpOnly cookie |
| 3 | Client management | ✅ | Slide-over add/edit, archive instead of orphaning invoices |
| 4 | Invoice editor | ✅ | Line items, discount, tax, live paper preview |
| 5 | Invoice list | ✅ | Filter, search, sort and paginate **in Postgres**, driven by the URL |
| 6 | Invoice detail + PDF | ✅ | Detail page, real A4 PDF download, and a clean print stylesheet |
| 7 | Send to client | ✅ | Email via Resend when configured; the copy-link path always works |
| 8 | Public invoice page | ✅ | `/i/[token]` — no auth, sticky pay bar, pay button |
| 9 | Dashboard | ✅ | Four linked stat cards, 12-month income chart, recent invoices |
| 10 | Settings | ✅ | Business profile, logo upload, currency, prefix, tax and terms defaults |
| 11 | Overdue tracking | ✅ | **Derived**, never stored — see below |
| 12 | Loading / empty / error / mobile | ✅ | Skeletons, empty states, error boundaries, 375px layouts |

**Bonus:** AI invoice drafting (plain English to line items), activity timeline
with view tracking, Stripe Checkout (test mode) with an idempotent webhook, and
void/restore.

**Not built:** recurring invoices, partial payments, CSV export, and the command
palette.

---

## Three decisions worth explaining

### Overdue is computed, not stored

`status` is only ever `draft`, `sent`, `paid` or `void`. "Overdue" is derived
by comparing the due date to today, in a SQL view that every page reads:

```sql
CASE
  WHEN status = 'paid'  THEN 'paid'
  WHEN status = 'draft' THEN 'draft'
  WHEN status = 'void'  THEN 'void'
  WHEN due_date < CURRENT_DATE THEN 'overdue'
  ELSE 'sent'
END AS display_status
```

An invoice therefore becomes overdue at midnight with no cron job, no
background worker, and no chance of a stale flag. The seed data includes two
invoices whose due dates have passed and whose stored status is still `sent` —
they render as overdue without anything ever writing that word.

The same logic is mirrored in [`src/lib/invoice.ts`](src/lib/invoice.ts) for
client-side rendering, and the two are verified to agree.

### Money is integer pence, everywhere

No floats, ever. All arithmetic lives in
[`src/lib/money.ts`](src/lib/money.ts): discount applies **before** tax, tax is
a single rate on the discounted subtotal, and rounding happens once per line and
once per total so fractional pence cannot accumulate. Percentages are stored as
basis points (`2000` = 20%).

The server recomputes every total from the line items on each write and ignores
whatever the browser sent.

### Sent invoices stop changing

When an invoice is sent, both parties' details are copied into JSONB on the
invoice row. Editing a client's address next month does not silently rewrite an
invoice they already received. What the client got is the record.

---

## Running it locally

**Requirements:** Node 20+, pnpm, and a Postgres database.

```bash
pnpm install
cp .env.example .env.local     # then fill in DATABASE_URL and SESSION_SECRET
pnpm db:migrate                # builds the schema from empty
pnpm db:seed                   # demo business, 6 clients, 14 invoices
pnpm dev
```

Open http://localhost:3000 and sign in with the demo account above.

No Postgres to hand? One command:

```bash
docker run -d --name billflow-pg -e POSTGRES_PASSWORD=billflow \
  -e POSTGRES_DB=billflow -p 55432:5432 postgres:16
# DATABASE_URL=postgres://postgres:billflow@localhost:55432/billflow
```

`pnpm db:seed --reset` wipes and rebuilds the demo data, so it can be re-run
during a demo.

To start completely over, drop **both** schemas — the migration journal lives in
a separate `drizzle` schema, and dropping only `public` leaves the migrator
believing it has already run:

```sql
DROP SCHEMA public CASCADE; CREATE SCHEMA public;
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm db:migrate` | Applies `drizzle/*.sql` to the database |
| `pnpm db:generate` | Generates a new migration from the schema |
| `pnpm db:seed` | Seeds the demo business (`--reset` to wipe first) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm vercel-build` | Migrations then build. Vercel runs this automatically, so the schema is applied on every deploy without configuring a custom build command. |

---

## Environment variables

Only the first two are required. Every other feature degrades gracefully when
its key is missing, so nothing 500s on a fresh clone.

| Variable | Required | Where to get it | If unset |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | [Neon](https://neon.tech) free tier, or local Postgres | App will not start |
| `SESSION_SECRET` | **Yes** | `openssl rand -base64 32` — use a **different** value in production | App will not start |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your deployed URL | On Vercel, falls back to the deployment domain; elsewhere to `http://localhost:3000`, which would make shared links wrong |
| `RESEND_API_KEY` | No | [Resend](https://resend.com) | Sending still succeeds and returns the shareable link, flagged as not emailed |
| `EMAIL_FROM` | No | Your verified sender, or Resend's shared one | Defaults to `BillFlow <onboarding@resend.dev>` |
| `STRIPE_SECRET_KEY` | No | Stripe test-mode keys | The pay button settles the invoice directly, as a simulated payment |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe dashboard | Webhook returns 501 |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob | Logos are stored inline as data URLs, capped at 512 KB |
| `GROQ_API_KEY` | No | [Groq](https://console.groq.com) — free tier | The drafting box returns worked examples and says so in the UI |
| `GROQ_MODEL` | No | A current Groq model id | Defaults to `openai/gpt-oss-20b` |

**A note on email.** Until a custom domain is verified, Resend sends only from
its shared `onboarding@resend.dev` sender, and that sender will **only deliver to
the address the Resend account is registered to** — any other recipient comes
back as a 403. Free accounts are also capped at 100 emails a day.

The brief allows "email the client **or** generate a shareable link", so the link
is the primary path here and email is the bonus:

- **Copy link** always works, with or without email configured.
- A failed email never breaks the send. The invoice is still marked sent, the
  link is still returned, and the failure — including the provider's reason — is
  recorded on the invoice timeline rather than swallowed.
- Verified end to end: a send to the account address returns `emailed: true`, a
  send to any other address degrades gracefully with the invoice still sent.

---

## Deploying

The app runs on any Node host with a Postgres database. On Vercel:

1. Import the repository. Leave the build command alone — `vercel-build` is
   picked up automatically and applies migrations before building, so the
   schema is never out of step with the deployed code.
2. Set `DATABASE_URL` and a **freshly generated** `SESSION_SECRET` (do not
   reuse the local one). Add `RESEND_API_KEY`, `EMAIL_FROM` and `GROQ_API_KEY`
   if you want email and AI drafting live; everything else is optional and
   degrades as described above.
3. After the first deploy, set `NEXT_PUBLIC_APP_URL` to the real domain. It is
   read at runtime on the server, so it is not baked into the client bundle.
4. Run `pnpm db:seed` once against the deployed database if you want the demo
   business.

Put the serverless functions in a region near the database — every page reads
from Postgres on each request, so the round trip between them is what governs
page latency.

---

## Schema

```
users ──┬── clients ──┐
        │             │
        └── invoices ─┘   (client_id ON DELETE RESTRICT)
             ├── invoice_items    (position-ordered, cascade)
             ├── payments         (unique on provider+ref → webhook idempotency)
             └── invoice_events   (created | sent | viewed | paid | voided)

invoice_view = invoices ⨝ clients + display_status + balance_cents
```

Details worth noting:

- `users_email_lower_idx` is unique on `lower(email)`, so sign-up is
  case-insensitive.
- `invoices_user_number_idx` is unique on `(user_id, number)`. Numbers are
  allocated with `UPDATE users SET next_invoice_no = next_invoice_no + 1 …
  RETURNING`, which takes a row lock, so concurrent creates cannot collide.
- `payments_provider_ref_idx` is a **partial** unique index, so a retried Stripe
  webhook cannot record a second payment.
- `public_token` is a 32-character nanoid, not the invoice UUID — public links
  are unguessable and can be revoked.
- Dates are `date`, not `timestamptz`, and compared with `CURRENT_DATE` in SQL,
  so a server in another timezone cannot shift what counts as overdue.

Migrations in [`drizzle/`](drizzle/) build the database from empty and are
committed to the repo.

---

## Tenancy

Every query touching `clients`, `invoices`, `invoice_items` and `payments`
includes `user_id` in the `WHERE` clause — never a lookup by id followed by a
comparison in JavaScript. A request for someone else's record returns **404**,
not 403, so the API never confirms that a record exists.

This is verified: signing in as a second user and requesting another user's
client by id returns 404 on `GET`, `PATCH` and `DELETE`, and their list stays
empty.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | One codebase, one deploy, one env file. Route handlers avoid a second service and CORS. |
| Database | PostgreSQL | The derived-status view and the aggregate dashboard queries are the reason this is not SQLite. |
| ORM | Drizzle + drizzle-kit | Generates real SQL migration files you can read. |
| Auth | bcrypt + `jose` JWT in an httpOnly cookie | About 80 lines, no provider config. |
| Validation | Zod | One schema shared by the client form and the server handler. |
| Forms | react-hook-form | `useFieldArray` for line items. |
| Styling | Tailwind v4 | CSS-first `@theme` makes the token system trivial. |
| Charts | Recharts | Area chart for income over time. |

The app selects its database driver by URL: Neon's serverless HTTP driver when
`DATABASE_URL` points at Neon (no connection-pool exhaustion in serverless
handlers), plain postgres-js otherwise. Both paths are exercised — note that the
HTTP driver returns `bigint` columns as strings where postgres-js returns
numbers, which is why aggregates go through a single coercion helper
([`src/db/rows.ts`](src/db/rows.ts)) rather than being read directly.

---

## What I would build next

1. **Attach the PDF to the invoice email.** The PDF endpoint and the email
   template both exist; wiring the attachment is a small step.
2. **Partial payments.** `paid_cents` already exists and the view already
   computes `balance_cents` — the UI is the only missing piece.
3. **Reminders.** A "Send reminder" action on overdue invoices, with its own
   template.
4. **CSV export** of the filtered invoice list, reusing the list query.
5. **Recurring invoices.** The largest remaining piece of real work.

---

## AI invoice drafting

Describe the work in plain English and the line items fill themselves in:

> *3 days of brand design at 400/day, plus 5 hours of revisions at 40/hr, 20% VAT*

The draft is shown for review before it touches the form, and every field stays
editable afterwards — it is a starting point, not an authority.

Implementation notes:

- Runs on Groq's free tier (`openai/gpt-oss-20b` by default, `GROQ_MODEL`
  overrides it) through their OpenAI-compatible endpoint. Groq retires models
  periodically, so a 404 from them reports itself as a configuration problem
  rather than as a failed draft.
- The key is **server-side only** and the route sits behind authentication, so
  the endpoint cannot be called anonymously. Drafting is limited to 10 requests
  per user per hour — a public endpoint proxying an LLM on someone else's key is
  a bill waiting to happen.
- The reply is validated with Zod, and markdown fences are stripped before
  parsing, so a chatty model degrades to a clear error rather than a 500.
- **With no key set, the box returns worked examples and labels them as such in
  the UI.** A reviewer cloning this repo sees the whole flow without needing a
  key of their own.
- The model is asked for major units; conversion to integer pence happens in one
  place, so drafted amounts obey the same money rules as typed ones.

---

## Performance notes

Measured against Neon's free tier (US East 2) from a development machine:

- **Warm page render: 8-14 ms.** Once a route is compiled, the dashboard's three
  aggregate queries run in parallel and the page is not the bottleneck.
- **Neon round trip: ~305 ms** from a machine on another continent, and
  effectively nothing from a Vercel function in a nearby region. Set Vercel's
  function region close to the Neon region.
- **Cold start: 1-2 s.** Neon's compute suspends after five minutes idle and
  wakes on the first query. The first page load after a quiet period pays this
  once; everything after it is warm.

---

## Known limitations

- **Not deployed.** Everything runs locally; the migration and seed steps above
  are verified end to end against a real Postgres.
- **Email needs a verified domain** to reach arbitrary inboxes — see the note
  above.
- **The login throttle is in memory**, so it resets on redeploy and is
  per-instance. Fine for this scale; a shared store is the real answer.
