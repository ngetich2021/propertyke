export function formatMoney(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Listing photos are uploaded at full camera resolution (often 1-2MB+), but
// most places we show them are small thumbnails. Ask Cloudinary to resize
// and compress on the fly instead of shipping the original to every card.
export function cloudinaryThumb(url: string, width: number): string {
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || i === -1) return url;
  return `${url.slice(0, i + marker.length)}w_${width},c_fill,q_auto,f_auto/${url.slice(i + marker.length)}`;
}
