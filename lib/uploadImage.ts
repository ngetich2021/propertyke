export async function uploadToCloudinary(file: File, folder = "listings"): Promise<string> {
  const signRes = await fetch("/api/cloudinary-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!signRes.ok) throw new Error("Could not get upload signature.");
  const { timestamp, signature, folder: signedFolder, cloudName, apiKey } = await signRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", signedFolder);

  // "auto" lets Cloudinary detect image vs video vs raw automatically.
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) throw new Error("Upload failed.");
  const data = await uploadRes.json();
  return data.secure_url as string;
}

// Kept for backwards compatibility with existing call sites.
export const uploadImageToCloudinary = uploadToCloudinary;
