import { createClient } from "@libsql/client";
import { config } from "dotenv";
config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const res = await client.execute(
  "SELECT id, title, type, status, bedrooms, bathrooms, acreage, rentPerMonth FROM Listing ORDER BY createdAt DESC"
);
for (const row of res.rows) console.log(JSON.stringify(row));

const res2 = await client.execute("SELECT id, title, latitude, longitude FROM Listing WHERE title='manyata house'");
console.log("\ncoords:", JSON.stringify(res2.rows[0]));
