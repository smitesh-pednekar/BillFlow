/**
 * Puts the demo account back to its just-seeded state.
 *
 *   pnpm demo:reset
 *
 * Use it between recording takes: paying an invoice or sending one changes
 * live data, and a second take should start from the same place as the first.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const [user] = await sql`
    SELECT id FROM users WHERE lower(email) = 'demo@billflow.app'
  `;
  if (!user) {
    console.log("No demo user. Run `pnpm db:seed` first.");
    return;
  }

  // Invoices the seed creates as sent-and-unpaid, in case a take paid one.
  const unpaid = ["KS-0009", "KS-0010", "KS-0011"];
  const restored = await sql`
    UPDATE invoices SET status = 'sent', paid_at = NULL, paid_cents = 0
    WHERE user_id = ${user.id} AND number IN ${sql(unpaid)} AND status <> 'sent'
    RETURNING number
  `;

  // Drop payments and paid events belonging to those invoices.
  await sql`
    DELETE FROM payments WHERE invoice_id IN (
      SELECT id FROM invoices WHERE user_id = ${user.id} AND number IN ${sql(unpaid)}
    )
  `;
  await sql`
    DELETE FROM invoice_events WHERE kind = 'paid' AND invoice_id IN (
      SELECT id FROM invoices WHERE user_id = ${user.id} AND number IN ${sql(unpaid)}
    )
  `;

  // Anything created during a take.
  const extra = await sql`
    DELETE FROM invoices
    WHERE user_id = ${user.id} AND number NOT IN ${sql([
      "KS-0001","KS-0002","KS-0003","KS-0004","KS-0005","KS-0006","KS-0007",
      "KS-0008","KS-0009","KS-0010","KS-0011","KS-0012","KS-0013","KS-0014",
    ])}
    RETURNING number
  `;
  await sql`
    DELETE FROM clients c
    WHERE c.user_id = ${user.id}
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.client_id = c.id)
      AND c.name NOT IN ('Maya Rodriguez','Daniel Okafor','Priya Raman',
                         'Tomas Lindqvist','Aisha Bello','Chen Wei')
  `;
  await sql`UPDATE users SET next_invoice_no = 15 WHERE id = ${user.id}`;

  const counts = await sql`
    SELECT display_status, count(*)::int AS n
    FROM invoice_view WHERE user_id = ${user.id}
    GROUP BY display_status ORDER BY display_status
  `;

  console.log(
    `Reset. Restored ${restored.length} paid-back-to-sent, removed ${extra.length} extra.`,
  );
  console.log(
    "  " + counts.map((c) => `${c.display_status}=${c.n}`).join("  "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
