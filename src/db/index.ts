import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

/**
 * Neon's serverless HTTP driver in production: no long-lived pool, so route
 * handlers cannot exhaust the connection limit. A plain postgres-js client
 * for local development, where the database is an ordinary Postgres.
 */
const isNeon = /neon\.tech|neon\.build/.test(url);

function createDb() {
  if (isNeon) {
    const { drizzle } = require("drizzle-orm/neon-http");
    const { neon } = require("@neondatabase/serverless");
    return drizzle(neon(url!), { schema });
  }
  const { drizzle } = require("drizzle-orm/postgres-js");
  const postgres = require("postgres");
  // Reuse one client across hot reloads in dev.
  const g = globalThis as unknown as { __bfClient?: ReturnType<typeof postgres> };
  g.__bfClient ??= postgres(url!, { max: 5 });
  return drizzle(g.__bfClient, { schema });
}

type NeonDb = ReturnType<typeof import("drizzle-orm/neon-http").drizzle<typeof schema>>;
type PgDb = ReturnType<typeof import("drizzle-orm/postgres-js").drizzle<typeof schema>>;

export const db = createDb() as NeonDb & PgDb;
export { schema };
