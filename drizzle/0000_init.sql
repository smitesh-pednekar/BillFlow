CREATE TYPE "public"."discount_type" AS ENUM('none', 'percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid', 'void');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"company" text,
	"address" text,
	"phone" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_cents" integer DEFAULT 0 NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" char(3) NOT NULL,
	"notes" text,
	"terms" text,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_kind" "discount_type" DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"tax_bps" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"bill_to" jsonb,
	"bill_from" jsonb,
	"public_token" text NOT NULL,
	"sent_at" timestamp with time zone,
	"first_viewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"amount_cents" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"business_name" text,
	"business_email" text,
	"business_address" text,
	"business_phone" text,
	"logo_url" text,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"invoice_prefix" text DEFAULT 'INV-' NOT NULL,
	"next_invoice_no" integer DEFAULT 1 NOT NULL,
	"default_tax_bps" integer DEFAULT 0 NOT NULL,
	"default_net_days" integer DEFAULT 14 NOT NULL,
	"invoice_footer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_events" ADD CONSTRAINT "invoice_events_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_user_idx" ON "clients" USING btree ("user_id","archived_at");--> statement-breakpoint
CREATE INDEX "invoice_events_invoice_idx" ON "invoice_events" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_idx" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_user_number_idx" ON "invoices" USING btree ("user_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_token_idx" ON "invoices" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "invoices_list_idx" ON "invoices" USING btree ("user_id","status","issue_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "invoices_client_idx" ON "invoices" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider","provider_ref") WHERE "payments"."provider_ref" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));