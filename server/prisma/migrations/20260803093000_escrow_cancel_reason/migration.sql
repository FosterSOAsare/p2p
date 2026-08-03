-- AlterTable
-- Promoted out of the escrow_events.detail JSON so the deal page can show it,
-- mirroring how DELIVER stores carrier/trackingNumber/deliveryNote as columns.
ALTER TABLE "escrows" ADD COLUMN "cancelReason" TEXT;
