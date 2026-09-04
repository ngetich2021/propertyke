import { DEV_CHARGE_MULTIPLIER } from "@/lib/devPricing";

// Self-serve paid "verified" badge (like a blue check) -- paid upfront for
// however many days via M-Pesa, same mechanic as the listing/ad paid-days
// fee used to be. See lib/actions/verification.ts, lib/paymentApply.ts.
export const VERIFICATION_DAILY_RATE = 25; // KES

// Never trust a client-submitted fee -- always recompute server-side from
// the number of days requested.
export function calculateVerificationFee(days: number): number {
  return VERIFICATION_DAILY_RATE * days * DEV_CHARGE_MULTIPLIER;
}
