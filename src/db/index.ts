import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

/**
 * Neon's serverless HTTP driver in production: no long-lived pool, so route
 * handlers cannot exhaust the connection limit. A plain postgres-js client for
 * local development, where the database is an ordinary Postgres.
 */
const isNeon = /neon\.tech|neon\.build/.test(url);

// Reuse one local client across hot reloads in dev.
const globalForDb = globalThis as unknown as {
  __bfClient?: ReturnType<typeof postgres>;
};

function createDb() {
  if (isNeon) return drizzleNeon(neon(url!), { schema });
  globalForDb.__bfClient ??= postgres(url!, { max: 5 });
  return drizzlePg(globalForDb.__bfClient, { schema });
}

type NeonDb = ReturnType<typeof drizzleNeon<typeof schema>>;
type PgDb = ReturnType<typeof drizzlePg<typeof schema>>;

export const db = createDb() as NeonDb & PgDb;
export { schema };
