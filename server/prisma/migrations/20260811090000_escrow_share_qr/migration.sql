-- The share QR is a pure function of the escrow's code, but it was re-encoded
-- from scratch on every open of the deal page. Store it on first render.
--
-- `shareQrOrigin` records the WEB_ORIGIN baked into the stored image: a deploy
-- onto a new domain would otherwise serve a QR pointing at the old host
-- forever, so the two are compared on read and a mismatch re-renders.
ALTER TABLE "escrows" ADD COLUMN "shareQrDataUrl" TEXT;
ALTER TABLE "escrows" ADD COLUMN "shareQrOrigin" TEXT;
