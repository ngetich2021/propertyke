export type AdMedia = { type: "youtube" | "cloudinary"; url: string };

export function parseAdMedia(media: string): AdMedia[] {
  try {
    const parsed = JSON.parse(media);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
