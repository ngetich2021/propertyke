-- Manual incremental migration: the Payment table was already pushed to
-- Turso without mpesaReceipt (added to schema.prisma afterwards). Additive
-- only -- existing rows get NULL until a future callback fills them in.
ALTER TABLE "Payment" ADD COLUMN "mpesaReceipt" TEXT;
