// Keeps only characters a phone number can legitimately contain, typed live.
export function sanitizePhoneInput(value: string): string {
  let cleaned = value.replace(/[^\d\s\-+]/g, "");
  // A leading "+" is fine; any other "+" isn't.
  cleaned = cleaned[0] === "+" ? "+" + cleaned.slice(1).replace(/\+/g, "") : cleaned.replace(/\+/g, "");
  return cleaned.slice(0, 20);
}
