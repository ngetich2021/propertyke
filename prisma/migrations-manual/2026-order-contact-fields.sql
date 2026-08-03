-- Manual incremental migration: buyer contact phone + preferred contact
-- method captured on every order, so the seller always has a working way to
-- reach out (see InterestForm, expressInterest in lib/actions/orders.ts).
-- Also widens OrderStatus with UNDER_REVIEW/CONFIRMED (app-level enum only --
-- status is stored as plain TEXT, so no column change is needed for that).
ALTER TABLE "Order" ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "contactMethod" TEXT NOT NULL DEFAULT 'CALL';
