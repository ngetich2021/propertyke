// Support "business hours" used to decide whether a new chat message gets
// the out-of-hours auto-acknowledgment (see lib/actions/support.ts). Kenya
// (EAT, UTC+3, no DST) real estate demand runs into weekends, so this is
// every day of the week rather than Mon-Fri -- adjust here if that changes.
const BUSINESS_HOURS_START = 7; // 7am EAT
const BUSINESS_HOURS_END = 19; // 7pm EAT
const EAT_OFFSET_HOURS = 3;

export function isWithinBusinessHours(date: Date = new Date()): boolean {
  const eatHour = (date.getUTCHours() + EAT_OFFSET_HOURS) % 24;
  return eatHour >= BUSINESS_HOURS_START && eatHour < BUSINESS_HOURS_END;
}
