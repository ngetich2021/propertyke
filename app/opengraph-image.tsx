import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "EstateFinderHub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public", "logo.png"),
    "base64"
  );
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: "linear-gradient(135deg, #d1fae5 0%, #e0f2fe 100%)",
        }}
      >
        <img src={logoSrc} width={220} height={220} style={{ borderRadius: "50%" }} />
        <div style={{ fontSize: 72, fontWeight: 700, color: "#064e3b" }}>
          EstateFinderHub
        </div>
        <div style={{ fontSize: 32, color: "#0c4a6e" }}>
          Find and list lands, properties, and rentals.
        </div>
      </div>
    ),
    { ...size }
  );
}
