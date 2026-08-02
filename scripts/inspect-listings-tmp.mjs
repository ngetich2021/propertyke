import { createClient } from "@libsql/client";
import { config } from "dotenv";

config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const res = await client.execute(
  "SELECT id, title, status, images FROM Listing ORDER BY createdAt DESC"
);
for (const row of res.rows) {
  const imgs = JSON.parse(row.images || "[]");
  console.log(row.id, row.status, row.title, "images:", imgs.length);
}
