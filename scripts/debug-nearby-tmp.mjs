import { createClient } from "@libsql/client";
import { config } from "dotenv";
config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const res = await client.execute(
  "SELECT id, title, type, status, latitude, longitude FROM Listing"
);
for (const row of res.rows) console.log(JSON.stringify(row));

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const searchLat = -0.12421, searchLng = 36.32367;
console.log("\ndistances from search point:");
for (const row of res.rows) {
  if (row.latitude == null || row.longitude == null) {
    console.log(row.title, "-> no coordinates");
    continue;
  }
  const d = haversineDistanceKm(searchLat, searchLng, row.latitude, row.longitude);
  console.log(row.title, row.type, row.status, "-> ", d.toFixed(1), "km");
}
