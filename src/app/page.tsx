import Link from "next/link";
import type { Metadata } from "next";
import { HeroInvoice } from "@/components/marketing/HeroInvoice";

export const metadata: Metadata = {
  title: "BillFlow — invoices your clients can pay in one click",
  description:
    "Send professional invoices, track what you are owed, and get paid faster. Built for freelancers and small studios.",
};

const STEPS = [
  {
    n: "01",
    title: "Add a client",
    body: "Their details fill in on every invoice from then on, so you never retype an address.",
  },
  {
    n: "02",
    title: "Build the invoice",
    body: "Line items, discounts and tax total themselves as you type. Save a draft or send it straight away.",
  },
  {
    n: "03",
    title: "Get paid",
    body: "Your client opens a link, sees a proper invoice, and pays in one click. You see the moment they open it.",
  },
];

const FAQ = [
  {
    q: "Do my clients need an account?",
    a: "No. They open a link, view the invoice, and pay. Nothing to sign up for.",
  },
  {
    q: "How does BillFlow know an invoice is overdue?",
    a: "It compares the due date to today, so an invoice becomes overdue on its own at midnight. You never mark it.",
  },
  {
    q: "What happens if I edit a client after sending?",
    a: "Nothing changes on invoices you already sent. Each one keeps the details it was sent with, so your records stay honest.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-4 py-4 sm:px-8">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            BillFlow
          </span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-[6px] px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-[6px] bg-pine-700 px-4 text-sm font-medium text-white transition-colors hover:bg-pine-900"
            >
              Start invoicing free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------------------------------- hero --- */}
        <section className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[5fr_6fr]">
            <div>
              <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
                Invoices your clients can pay in one click.
              </h1>
              <p className="mt-4 max-w-md text-base text-ink-2">
                BillFlow is invoicing for people who work alone. Build an
                invoice in about a minute, send a link, and watch the money
                land.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center rounded-[6px] bg-pine-700 px-6 text-base font-medium text-white transition-colors hover:bg-pine-900"
                >
                  Start invoicing free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center rounded-[6px] border border-line bg-surface px-6 text-base font-medium text-ink transition-colors hover:bg-sunken"
                >
                  Try the demo account
                </Link>
              </div>
              <p className="mt-3 text-[0.8125rem] text-ink-3">
                No card required. The demo account is already filled in on the
                sign-in page.
              </p>
            </div>

            <HeroInvoice />
          </div>
        </section>

        {/* ------------------------------------------------- how it works --- */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Three steps, start to paid
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <p className="tnum text-[0.8125rem] font-medium text-pine-500">
                    {s.n}
                  </p>
                  <h3 className="mt-2 text-base font-medium text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-ink-2">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- features --- */}
        <section className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Built around the awkward parts
              </h2>
              <p className="mt-3 text-sm text-ink-2">
                The details that make invoicing annoying are the ones BillFlow
                takes seriously.
              </p>
            </div>
            <dl className="space-y-5">
              {[
                [
                  "Overdue is worked out, not remembered",
                  "An invoice goes overdue by comparing its due date to today. Nothing to tick, nothing to forget.",
                ],
                [
                  "Sent invoices stop changing",
                  "Editing a client next month does not rewrite what you already sent them.",
                ],
                [
                  "Money is counted in whole pence",
                  "Totals are integer arithmetic end to end, so rounding never drifts by a penny.",
                ],
                [
                  "You can see when it was opened",
                  "Each invoice keeps a timeline: sent, opened, paid.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="border-l-2 border-pine-100 pl-4">
                  <dt className="text-sm font-medium text-ink">{title}</dt>
                  <dd className="mt-0.5 text-sm text-ink-2">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------- faq --- */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1120px] px-4 py-14 sm:px-8">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Questions
            </h2>
            <dl className="mt-8 grid gap-8 sm:grid-cols-3">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="text-sm font-medium text-ink">{f.q}</dt>
                  <dd className="mt-1.5 text-sm text-ink-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------- cta --- */}
        <section className="mx-auto max-w-[1120px] px-4 py-16 text-center sm:px-8">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Send your first invoice today
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
            It takes about a minute, and your client can pay it without signing
            up for anything.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-12 items-center rounded-[6px] bg-pine-700 px-6 text-base font-medium text-white transition-colors hover:bg-pine-900"
          >
            Start invoicing free
          </Link>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-8">
          <span className="font-display text-sm font-semibold text-ink">
            BillFlow
          </span>
          <p className="text-[0.75rem] text-ink-3">
            Built as a full-stack assessment project.
          </p>
        </div>
      </footer>
    </div>
  );
}
