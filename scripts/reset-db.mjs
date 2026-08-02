// Wipes all application data from the live Turso database (users, listings,
// orders, ads, reports, sessions, accounts). Used to reset to a clean slate
// so the next Google sign-in becomes the bootstrap admin.
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ quiet: true });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

// Children before parents to respect foreign keys.
const tables = [
  "Report",
  "Order",
  "Ad",
  "Listing",
  "Session",
  "Account",
  "VerificationToken",
  "User",
];

for (const table of tables) {
  await client.execute(`DELETE FROM "${table}"`);
  console.log(`Cleared ${table}`);
}

console.log("Database reset complete.");
client.close();
