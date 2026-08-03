// TEMPORARY, for development/testing only: scales every fee (listing fees,
// ad fees, and their extensions) down to this fraction of the real price,
// so testing the M-Pesa flow doesn't spend real money at full price.
// Applied inside calculateListingFee / calculateAdDailyRate, so it cascades
// everywhere a fee is shown or charged. Set back to 1 before going live.
export const DEV_CHARGE_MULTIPLIER = 0.1;
