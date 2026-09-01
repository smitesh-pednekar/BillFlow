import { z } from "zod";
import { INVOICE_STATUSES } from "./invoice";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("That does not look like an email address")
  .toLowerCase();

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(120),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200, "That password is too long"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(200),
  email: z.union([emailSchema, z.literal("")]).optional(),
  company: z.string().trim().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(1000).optional().or(z.literal("")),
  phone: z.string().trim().max(60).optional().or(z.literal("")),
});

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Describe the work").max(1000),
  quantity: z.coerce
    .number()
    .min(0, "Quantity cannot be negative")
    .max(1_000_000),
  unitCents: z.coerce
    .number()
    .int("Rate must be a whole number of cents")
    .min(0, "Rate cannot be negative")
    .max(1_000_000_000),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");

export const invoiceSchema = z
  .object({
    clientId: z.string().uuid("Pick a client"),
    issueDate: isoDate,
    dueDate: isoDate,
    items: z
      .array(lineItemSchema)
      .min(1, "Add at least one line item")
      .max(100, "That is a lot of line items"),
    discountKind: z.enum(["none", "percent", "fixed"]).default("none"),
    discountValue: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
    taxBps: z.coerce
      .number()
      .int()
      .min(0)
      .max(100_000, "That tax rate is not plausible")
      .default(0),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
    terms: z.string().trim().max(5000).optional().or(z.literal("")),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: "The due date cannot be before the issue date",
    path: ["dueDate"],
  })
  .refine(
    (v) => v.discountKind !== "percent" || v.discountValue <= 10_000,
    { message: "A percentage discount cannot exceed 100%", path: ["discountValue"] },
  );

export const statusChangeSchema = z.object({
  status: z.enum(INVOICE_STATUSES),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessName: z.string().trim().max(200).optional().or(z.literal("")),
  businessEmail: z.union([emailSchema, z.literal("")]).optional(),
  businessAddress: z.string().trim().max(1000).optional().or(z.literal("")),
  businessPhone: z.string().trim().max(60).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  currency: z.string().length(3).toUpperCase(),
  invoicePrefix: z.string().trim().min(1).max(12),
  defaultTaxBps: z.coerce.number().int().min(0).max(100_000),
  defaultNetDays: z.coerce.number().int().min(0).max(365),
  invoiceFooter: z.string().trim().max(2000).optional().or(z.literal("")),
});

/** Whitelisted sort keys. Never interpolate a raw column name. */
export const SORT_KEYS = ["date", "due", "amount", "number", "client"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z
    .enum(["draft", "sent", "paid", "overdue", "void"])
    .optional(),
  client: z.string().uuid().optional(),
  sort: z.enum(SORT_KEYS).default("date"),
  dir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
