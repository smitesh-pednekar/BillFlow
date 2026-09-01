-- The single definition of derived status. List, dashboard, detail and the
-- public page all read display_status from here, so they cannot drift apart.
-- `overdue` is never stored: an invoice becomes overdue at midnight with no
-- cron job touching it.
CREATE VIEW invoice_view AS
SELECT
  i.*,
  c.name    AS client_name,
  c.company AS client_company,
  c.email   AS client_email,
  CASE
    WHEN i.status = 'paid'  THEN 'paid'
    WHEN i.status = 'draft' THEN 'draft'
    WHEN i.status = 'void'  THEN 'void'
    WHEN i.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'sent'
  END AS display_status,
  (i.total_cents - i.paid_cents) AS balance_cents
FROM invoices i
JOIN clients c ON c.id = i.client_id;
