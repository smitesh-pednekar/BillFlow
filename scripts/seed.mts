/**
 * Builds a convincing business from an empty database.
 *
 *   pnpm db:seed            add the demo data
 *   pnpm db:seed --reset    wipe first, so it can be re-run during a demo
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { computeTotals } from "../src/lib/money";
import { addDaysISO, todayISO, formatInvoiceNumber } from "../src/lib/invoice";

const DEMO_EMAIL = "demo@billflow.app";
const DEMO_PASSWORD = "demo1234";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

const CLIENTS = [
  {
    name: "Maya Rodriguez",
    company: "Northwind Studio",
    email: "maya@northwind.studio",
    address: "12 Wharf Road\nBristol BS1 4RN",
    phone: "+44 117 496 0142",
  },
  {
    name: "Daniel Okafor",
    company: "Okafor & Payne",
    email: "accounts@okaforpayne.com",
    address: "440 Rivington Street\nLondon EC2A 3LT",
    phone: "+44 20 7946 0388",
  },
  {
    name: "Priya Raman",
    company: "Lantern Labs",
    email: "priya@lanternlabs.io",
    address: "8 Curzon Place\nManchester M1 5QA",
    phone: "+44 161 496 0221",
  },
  {
    name: "Tomas Lindqvist",
    company: "Fika Coffee Roasters",
    email: "tomas@fikaroasters.se",
    address: "Storgatan 14\n111 51 Stockholm",
    phone: "+46 8 505 12 40",
  },
  {
    name: "Aisha Bello",
    company: "Meridian Health",
    email: "a.bello@meridianhealth.org",
    address: "5 Kingsway\nLeeds LS1 2HG",
    phone: "+44 113 496 0177",
  },
  {
    name: "Chen Wei",
    company: "Blue Harbour Ventures",
    email: "chen@blueharbour.vc",
    address: "22 Exchange Square\nEdinburgh EH1 3DG",
    phone: "+44 131 496 0512",
  },
];

type LineSpec = { description: string; quantity: number; unitCents: number };

interface InvoiceSpec {
  clientIdx: number;
  /** days before today the invoice was issued */
  issuedDaysAgo: number;
  netDays: number;
  status: "draft" | "sent" | "paid";
  items: LineSpec[];
  taxBps?: number;
  discountKind?: "none" | "percent" | "fixed";
  discountValue?: number;
  notes?: string;
}

const INVOICES: InvoiceSpec[] = [
  // --- paid, spread across the last 10 months so the chart has shape ---
  {
    clientIdx: 0,
    issuedDaysAgo: 300,
    netDays: 14,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Brand identity — logo, palette, type system", quantity: 1, unitCents: 320000 },
      { description: "Brand guidelines document", quantity: 1, unitCents: 95000 },
    ],
  },
  {
    clientIdx: 1,
    issuedDaysAgo: 268,
    netDays: 30,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Website audit and recommendations", quantity: 1, unitCents: 145000 },
      { description: "Strategy workshop, 6 hrs", quantity: 6, unitCents: 18500 },
    ],
  },
  {
    clientIdx: 2,
    issuedDaysAgo: 232,
    netDays: 14,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Landing page design — 3 concepts", quantity: 3, unitCents: 68000 },
      { description: "Frontend implementation, 24 hrs", quantity: 24, unitCents: 9500 },
    ],
  },
  {
    clientIdx: 3,
    issuedDaysAgo: 196,
    netDays: 14,
    status: "paid",
    taxBps: 2500,
    discountKind: "percent",
    discountValue: 1000,
    items: [
      { description: "Packaging design — 4 SKUs", quantity: 4, unitCents: 74000 },
      { description: "Print-ready artwork preparation", quantity: 1, unitCents: 42000 },
    ],
    notes: "Thanks for the repeat work — 10% returning-client discount applied.",
  },
  {
    clientIdx: 0,
    issuedDaysAgo: 150,
    netDays: 14,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Campaign artwork — social and display", quantity: 12, unitCents: 14500 },
    ],
  },
  {
    clientIdx: 4,
    issuedDaysAgo: 118,
    netDays: 30,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Patient portal UX review", quantity: 1, unitCents: 210000 },
      { description: "Accessibility audit — WCAG 2.2 AA", quantity: 1, unitCents: 165000 },
    ],
  },
  {
    clientIdx: 5,
    issuedDaysAgo: 84,
    netDays: 14,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Pitch deck design, 18 slides", quantity: 18, unitCents: 8500 },
      { description: "Data visualisation, 5 charts", quantity: 5, unitCents: 22000 },
    ],
  },
  {
    clientIdx: 2,
    issuedDaysAgo: 46,
    netDays: 14,
    status: "paid",
    taxBps: 2000,
    items: [
      { description: "Design system components — 24 items", quantity: 24, unitCents: 11500 },
    ],
  },

  // --- sent and not yet due ---
  {
    clientIdx: 1,
    issuedDaysAgo: 6,
    netDays: 30,
    status: "sent",
    taxBps: 2000,
    items: [
      { description: "Quarterly retainer — design support", quantity: 1, unitCents: 450000 },
    ],
    notes: "Covers July to September.",
  },
  {
    clientIdx: 4,
    issuedDaysAgo: 3,
    netDays: 14,
    status: "sent",
    taxBps: 2000,
    items: [
      { description: "Onboarding flow redesign", quantity: 1, unitCents: 275000 },
      { description: "Usability testing, 5 sessions", quantity: 5, unitCents: 32000 },
    ],
  },
  {
    clientIdx: 5,
    issuedDaysAgo: 1,
    netDays: 21,
    status: "sent",
    taxBps: 2000,
    items: [
      { description: "Investor one-pager", quantity: 1, unitCents: 88000 },
    ],
  },

  // --- past due, still marked 'sent': these must render as overdue with
  //     nobody ever writing that status ---
  {
    clientIdx: 3,
    issuedDaysAgo: 52,
    netDays: 14,
    status: "sent",
    taxBps: 2500,
    items: [
      { description: "Seasonal packaging refresh", quantity: 2, unitCents: 96000 },
      { description: "Photography art direction, 1 day", quantity: 1, unitCents: 120000 },
    ],
  },
  {
    clientIdx: 0,
    issuedDaysAgo: 38,
    netDays: 14,
    status: "sent",
    taxBps: 2000,
    items: [
      { description: "Motion graphics — 3 short loops", quantity: 3, unitCents: 62000 },
    ],
  },

  // --- draft ---
  {
    clientIdx: 2,
    issuedDaysAgo: 0,
    netDays: 14,
    status: "draft",
    taxBps: 2000,
    items: [
      { description: "Mobile app icon set", quantity: 1, unitCents: 58000 },
      { description: "App store screenshots", quantity: 6, unitCents: 9500 },
    ],
  },
];

async function main() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    await sql`TRUNCATE users CASCADE`;
    console.log("Truncated existing data.");
  }

  const existing =
    await sql`SELECT id FROM users WHERE lower(email) = ${DEMO_EMAIL}`;
  if (existing.length > 0) {
    console.log(
      `The demo user already exists. Re-run with --reset to rebuild it.`,
    );
    await sql.end();
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [user] = await sql`
    INSERT INTO users (
      email, password_hash, name, business_name, business_email,
      business_address, business_phone, currency, invoice_prefix,
      next_invoice_no, default_tax_bps, default_net_days, invoice_footer
    ) VALUES (
      ${DEMO_EMAIL}, ${passwordHash}, 'Sam Okonkwo', 'Kestrel Studio',
      'billing@kestrel.studio',
      ${"Unit 4, The Foundry\n18 Bell Lane\nBristol BS2 9XT"},
      '+44 117 496 0100', 'GBP', 'KS-', 1, 2000, 14,
      'Kestrel Studio · VAT GB 412 8827 04 · Thank you for your business.'
    ) RETURNING id, invoice_prefix
  `;

  const clientIds: string[] = [];
  for (const c of CLIENTS) {
    const [row] = await sql`
      INSERT INTO clients (user_id, name, email, company, address, phone)
      VALUES (${user.id}, ${c.name}, ${c.email}, ${c.company}, ${c.address}, ${c.phone})
      RETURNING id
    `;
    clientIds.push(row.id);
  }

  const today = todayISO();
  let seq = 1;
  let sampleToken = "";
  let sampleNumber = "";

  for (const spec of INVOICES) {
    const issueDate = addDaysISO(today, -spec.issuedDaysAgo);
    const dueDate = addDaysISO(issueDate, spec.netDays);

    const totals = computeTotals({
      items: spec.items,
      discountKind: spec.discountKind ?? "none",
      discountValue: spec.discountValue ?? 0,
      taxBps: spec.taxBps ?? 0,
    });

    const number = formatInvoiceNumber(user.invoice_prefix, seq++);
    const token = nanoid(32);

    // Paid invoices settle a few days after issue, so the chart has shape.
    const paidAt =
      spec.status === "paid"
        ? new Date(`${addDaysISO(issueDate, Math.min(spec.netDays, 9))}T11:20:00Z`)
        : null;
    const sentAt =
      spec.status === "draft" ? null : new Date(`${issueDate}T09:15:00Z`);

    const client = CLIENTS[spec.clientIdx];
    const billTo =
      spec.status === "draft"
        ? null
        : JSON.stringify({
            name: client.name,
            email: client.email,
            company: client.company,
            address: client.address,
            phone: client.phone,
          });
    const billFrom =
      spec.status === "draft"
        ? null
        : JSON.stringify({
            name: "Kestrel Studio",
            email: "billing@kestrel.studio",
            address: "Unit 4, The Foundry\n18 Bell Lane\nBristol BS2 9XT",
            phone: "+44 117 496 0100",
            logoUrl: null,
          });

    const [invoice] = await sql`
      INSERT INTO invoices (
        user_id, client_id, number, status, issue_date, due_date, currency,
        notes, terms, subtotal_cents, discount_kind, discount_value,
        discount_cents, tax_bps, tax_cents, total_cents, paid_cents,
        bill_to, bill_from, public_token, sent_at, paid_at, created_at
      ) VALUES (
        ${user.id}, ${clientIds[spec.clientIdx]}, ${number}, ${spec.status},
        ${issueDate}, ${dueDate}, 'GBP',
        ${spec.notes ?? null}, ${"Payment due within " + spec.netDays + " days."},
        ${totals.subtotal}, ${spec.discountKind ?? "none"},
        ${spec.discountValue ?? 0}, ${totals.discount},
        ${spec.taxBps ?? 0}, ${totals.tax}, ${totals.total},
        ${spec.status === "paid" ? totals.total : 0},
        ${billTo}, ${billFrom}, ${token}, ${sentAt}, ${paidAt},
        ${new Date(`${issueDate}T09:00:00Z`)}
      ) RETURNING id
    `;

    for (const [i, item] of spec.items.entries()) {
      await sql`
        INSERT INTO invoice_items (invoice_id, position, description, quantity, unit_cents, amount_cents)
        VALUES (${invoice.id}, ${i}, ${item.description}, ${String(item.quantity)},
                ${item.unitCents}, ${totals.lines[i]})
      `;
    }

    await sql`INSERT INTO invoice_events (invoice_id, kind, created_at)
              VALUES (${invoice.id}, 'created', ${new Date(`${issueDate}T09:00:00Z`)})`;

    if (sentAt) {
      await sql`INSERT INTO invoice_events (invoice_id, kind, created_at)
                VALUES (${invoice.id}, 'sent', ${sentAt})`;
      const viewedAt = new Date(sentAt.getTime() + 5 * 3600_000);
      await sql`UPDATE invoices SET first_viewed_at = ${viewedAt} WHERE id = ${invoice.id}`;
      await sql`INSERT INTO invoice_events (invoice_id, kind, created_at)
                VALUES (${invoice.id}, 'viewed', ${viewedAt})`;
    }

    if (paidAt) {
      await sql`
        INSERT INTO payments (invoice_id, provider, provider_ref, amount_cents, status, created_at)
        VALUES (${invoice.id}, 'stripe', ${"pi_seed_" + invoice.id}, ${totals.total}, 'succeeded', ${paidAt})
      `;
      await sql`INSERT INTO invoice_events (invoice_id, kind, created_at)
                VALUES (${invoice.id}, 'paid', ${paidAt})`;
    }

    // Surface one sent-and-unpaid invoice for the README and the demo.
    if (!sampleToken && spec.status === "sent" && spec.issuedDaysAgo <= 6) {
      sampleToken = token;
      sampleNumber = number;
    }
  }

  await sql`UPDATE users SET next_invoice_no = ${seq} WHERE id = ${user.id}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(`
Seeded Kestrel Studio.

  Login          ${DEMO_EMAIL} / ${DEMO_PASSWORD}
  Clients        ${CLIENTS.length}
  Invoices       ${INVOICES.length}
  Public invoice ${appUrl}/i/${sampleToken}   (${sampleNumber})
`);

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
