-- The TRX rail moves from "we hold the keys" to a hosted NOWPayments invoice.
--
-- That deletes two columns outright. `depositKeyEnc` held the encrypted private
-- key of a platform-generated deposit address — with the provider owning the
-- address, the platform never takes custody of key material at all. And
-- `confirmations` was a TronGrid block count; NOWPayments reports a status
-- string (waiting → confirming → confirmed → sending → finished) instead, so
-- the count has nothing to fill it.
--
-- `depositAddress` becomes nullable for the same reason the new columns are:
-- a hosted invoice exists before the buyer has picked a coin, so the address,
-- the payment id and the txid are all only known once the IPN lands.
--
-- The table is documented as unused (see server/TODO.md), so the drops are not
-- guarded — nothing has ever written a row.
ALTER TABLE "crypto_escrows" DROP COLUMN "depositKeyEnc";
ALTER TABLE "crypto_escrows" DROP COLUMN "confirmations";
ALTER TABLE "crypto_escrows" ALTER COLUMN "depositAddress" DROP NOT NULL;

ALTER TABLE "crypto_escrows" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'nowpayments';
ALTER TABLE "crypto_escrows" ADD COLUMN "orderRef" TEXT NOT NULL;
ALTER TABLE "crypto_escrows" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "crypto_escrows" ADD COLUMN "invoiceUrl" TEXT;
ALTER TABLE "crypto_escrows" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "crypto_escrows" ADD COLUMN "payStatus" TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE "crypto_escrows" ADD COLUMN "payCurrency" TEXT NOT NULL DEFAULT 'trx';
ALTER TABLE "crypto_escrows" ADD COLUMN "settledAt" TIMESTAMP(3);

-- `orderRef` is what the IPN is matched on, so a duplicate would let one
-- provider callback address two deposits.
CREATE UNIQUE INDEX "crypto_escrows_orderRef_key" ON "crypto_escrows"("orderRef");
