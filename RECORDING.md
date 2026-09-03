# BillFlow — recording script

Target 4:30. Hard ceiling 5:00.

**Between takes**

Paying an invoice or sending one changes live data. Run `pnpm demo:reset` to put
the demo account back to its seeded state — 8 paid, 3 sent, 2 overdue, 1 draft —
so take two starts where take one did.

**Before you hit record**

- Browser at 1440×900, OS zoom up one notch so text is readable in the export.
- Two windows ready: a normal one signed out, and an incognito one.
- Tabs pre-opened so you never watch a page load: landing, `/login`, and the
  public invoice link below.
- Close notifications, Slack, email. No music.
- Say the beats, don't read them. Read-aloud voice is obvious.

**Details you will need**

| | |
|---|---|
| App | https://billflow-flax.vercel.app |
| Demo login | `demo@billflow.app` / `demo1234` (pre-filled on the sign-in page) |
| Public invoice | https://billflow-flax.vercel.app/i/ldizLdArlFj-zzacC_LpLgEKT_4EsqUq |
| Overdue invoices | KS-0012 £3,900.00 (due 27 Jul) · KS-0013 £2,232.00 (due 10 Aug) |
| Email that actually delivers | `smiteshpednekar397@gmail.com` |

---

## 0:00–0:20 — Who and what

*Landing page on screen.*

> "I'm Smitesh. This is BillFlow — invoicing for people who work alone. You add
> a client, build an invoice, send a link, and get paid. I built it over the
> weekend for the full-stack intern assessment."

Scroll once so the hero invoice finishes filling itself in. Don't linger.

---

## 0:20–1:00 — Sign up as a stranger

*This proves it works for someone who isn't you. Do it for real.*

> "Signing up as a brand new user, so you can see what a first-time account
> looks like."

- Click **Start invoicing free**, fill in name / email / password, submit.
- Land on the empty dashboard.

> "Empty state, not a blank page — it tells you what to do next."

- Go to **Clients** → **Add client**, fill in a name and email, save.

> "The sheet keeps you on the list. Their details now fill in on every invoice."

---

## 1:00–2:20 — Build an invoice (your strongest 80 seconds)

*Go to New invoice. Lead with the AI, not the form.*

> "The part I'd point at first: instead of typing line items, describe the work."

Click **Describe the work instead** and paste:

```
Built a Shopify store: 30 hours dev at 85/hr, theme customisation 1200 flat,
and 3 months support at 400/month. 20% VAT
```

> "Three different pricing structures in one sentence — hourly, a flat fee, and
> a monthly retainer — plus a tax rate."

Let it return. Point at the preview.

> "It split them correctly and picked up the 20% VAT. Nothing is committed yet —
> I review it first."

Click **Use these items**.

> "Now they're editable line items like any others, and the total came to five
> thousand nine hundred and forty pounds."

Type in one rate to show the total recalculating live, then:

> "Every amount here is integer pence. Discount applies before tax, and rounding
> happens once per line — so the total can't drift by a penny. The server
> recalculates all of it on save and ignores whatever the browser sent."

Click **Save and send**.

---

## 2:20–3:05 — Be the client

*Switch to the incognito window with the public link already open.*

> "This is what the client gets. No account, no login — just a link."

Scroll the invoice once.

> "Their address and mine are snapshotted onto the invoice when it's sent. If I
> change a client's address next month, invoices they've already received don't
> silently change. That felt important for something that's a financial record."

Click **Pay**.

> "Stripe isn't configured on this deployment, so this settles the payment
> directly — the brief allows a test payment."

Back to the app tab, open the same invoice.

> "Status is paid, and the timeline shows the whole history: created, sent,
> opened by the client, paid."

---

## 3:05–3:50 — The seeded account

*Log in as the demo account.*

> "This is a seeded account so there's real data to look at."

- Dashboard: gesture at the four cards and the chart.

> "Every number links to a filtered view. Dead-end numbers annoy me."

- Click the **Overdue** card.

> "Two overdue invoices. Here's the thing — nothing in the database says
> 'overdue'. Their status is still 'sent'. Overdue is worked out by comparing
> the due date to today, in a SQL view every page reads. So an invoice goes
> overdue at midnight on its own; there's no cron job and no flag to go stale."

- Open KS-0012, click **Download PDF**, show the file.

> "Same layout as the screen, because the page, the print stylesheet and the PDF
> all render from one shared data structure. They can't drift apart."

---

## 3:50–4:20 — Settings and mobile

- Settings: change the invoice prefix, point at "Next invoice: …".

> "Business details, logo, currency, tax defaults. Change the prefix and the
> next invoice picks it up."

- Narrow the window to phone width, click through dashboard and invoices.

> "At phone width the tables become cards and the sidebar becomes a tab bar."

---

## 4:20–4:40 — One decision, then stop

*Pick ONE. Don't list all three.*

> "If I had to pick one decision I'm glad I made: overdue being computed rather
> than stored. It's a smaller schema, there's no background job, and there's no
> way for the flag to disagree with the due date — which is the kind of bug
> you'd find out about from an annoyed client."

> "Repo and live link are in the submission. Thanks for watching."

---

## Say this if it comes up

**Email** — worth mentioning briefly, it reads as awareness, not as a gap:

> "Email sends through Resend. I haven't verified a custom domain, so their
> shared sender only delivers to my own address — I'd demo it to my inbox. The
> shareable link is the primary path either way, and a failed email never blocks
> the send: the invoice is still marked sent and you still get the link."

**Stripe** — one line, no apology:

> "Stripe Checkout is wired up with a signature-verified, idempotent webhook.
> Without keys on this deployment the pay button settles directly instead."

---

## Cut these if you're running long

In this order:
1. The settings prefix change (2:20 of value in 10 seconds elsewhere)
2. Typing a rate to show live recalculation — the AI section already showed it
3. The mobile pass — mention it instead of showing it

## Do not cut

The AI drafting, the overdue explanation, and the public invoice. Those three
are the submission.
