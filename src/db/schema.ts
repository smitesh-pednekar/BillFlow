import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  date,
  char,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "void",
]);
export const discountType = pgEnum("discount_type", [
  "none",
  "percent",
  "fixed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    // business settings live here; a separate table buys nothing at this scale
    businessName: text("business_name"),
    businessEmail: text("business_email"),
    businessAddress: text("business_address"),
    businessPhone: text("business_phone"),
    logoUrl: text("logo_url"),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    invoicePrefix: text("invoice_prefix").notNull().default("INV-"),
    nextInvoiceNo: integer("next_invoice_no").notNull().default(1),
    defaultTaxBps: integer("default_tax_bps").notNull().default(0),
    defaultNetDays: integer("default_net_days").notNull().default(14),
    invoiceFooter: text("invoice_footer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    address: text("address"),
    phone: text("phone"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("clients_user_idx").on(t.userId, t.archivedAt)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    number: text("number").notNull(),
    status: invoiceStatus("status").notNull().default("draft"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    notes: text("notes"),
    terms: text("terms"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountKind: discountType("discount_kind").notNull().default("none"),
    // bps when percent, cents when fixed
    discountValue: integer("discount_value").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxBps: integer("tax_bps").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    // party details snapshotted at send time so later edits cannot rewrite history
    billTo: jsonb("bill_to").$type<PartySnapshot | null>(),
    billFrom: jsonb("bill_from").$type<PartySnapshot | null>(),
    publicToken: text("public_token").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    firstViewedAt: timestamp("first_viewed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_user_number_idx").on(t.userId, t.number),
    uniqueIndex("invoices_token_idx").on(t.publicToken),
    index("invoices_list_idx").on(t.userId, t.status, t.issueDate.desc()),
    index("invoices_client_idx").on(t.clientId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    // 1.5 hours is legal
    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .notNull()
      .default("1"),
    unitCents: integer("unit_cents").notNull().default(0),
    amountCents: integer("amount_cents").notNull().default(0),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId, t.position)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // stripe | manual
    providerRef: text("provider_ref"), // checkout session / payment intent id
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull(), // pending | succeeded | failed
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // webhook idempotency: a retried event cannot double-pay
    uniqueIndex("payments_provider_ref_idx")
      .on(t.provider, t.providerRef)
      .where(sql`${t.providerRef} IS NOT NULL`),
  ],
);

export const invoiceEvents = pgTable(
  "invoice_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // created | sent | viewed | paid | reminded | voided
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("invoice_events_invoice_idx").on(t.invoiceId, t.createdAt)],
);

export interface PartySnapshot {
  name: string;
  email?: string | null;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  invoices: many(invoices),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
  events: many(invoiceEvents),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoiceEventsRelations = relations(invoiceEvents, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceEvents.invoiceId],
    references: [invoices.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InvoiceEvent = typeof invoiceEvents.$inferSelect;
