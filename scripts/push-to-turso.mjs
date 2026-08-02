// Applies the SQL diff produced by `prisma migrate diff --script` to the live
// Turso database. The Prisma CLI's schema engine can't connect to libsql://
// directly, so this is the workaround documented for Prisma + Turso: diff the
// schema into SQL locally, then execute it against Turso with @libsql/client.
//
// Usage:
//   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/turso-init.sql
//   node scripts/push-to-turso.mjs prisma/turso-init.sql
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config();

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/push-to-turso.mjs <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = createClient({ url, authToken });

await client.executeMultiple(sql);
console.log(`Applied ${file} to ${url}`);
client.close();
