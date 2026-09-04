// TEMPORARY, for development/testing only: scales every fee (ad fees and
// their extensions, verification) down to this fraction of the real price,
// so testing the M-Pesa flow doesn't spend real money at full price.
// Applied inside calculateAdDailyRate / calculateVerificationFee, so it
// cascades everywhere a fee is shown or charged. Set back to 1 before going
// live. (Listings themselves are free -- no fee to scale there.)
export const DEV_CHARGE_MULTIPLIER = 0.1;
