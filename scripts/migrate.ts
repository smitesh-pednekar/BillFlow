import { config } from "dotenv";

// Local dev reads .env.local; on a deploy the variables are already in the
// environment and this call is a silent no-op.
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Locally, copy .env.example to .env.local. " +
        "On a deploy, add it to the project's environment variables.",
    );
  }
  const sql = postgres(url, { max: 1 });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
