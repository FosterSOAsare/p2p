/**
 * Fee quote preview — a port of `web/src/features/escrow/data/fees.ts`, itself
 * a mirror of `server/src/features/escrows/money.ts`. Keep all three in sync:
 * the server recomputes and stores the real numbers at creation, this only
 * pre-fills what the form shows.
 *
 * Integer pesewas throughout, same as the server, so the preview matches the
 * charge to the pesewa (a flat percentage would drift on the min/cap and on
 * the odd-pesewa rounding of a 50/50 split).
 */

/** Lowercase because that is what the server's Joi schema accepts. */
export type FeeSplit = 'buyer' | 'seller' | 'split';

const FIAT_FEE = { bps: 150, minP: 200, capP: 15_000 }; // 1.5%, min GH₵2, cap GH₵150
const CRYPTO_FEE = { bps: 100, minP: 0, capP: 0 }; // 1.0%, no min/cap

export interface FeeQuote {
  fee: number;
  buyerFee: number;
  sellerFee: number;
  /** What the buyer locks: amount + their share of the fee. */
  buyerTotal: number;
  /** What the seller receives on release: amount − their share. */
  sellerPayout: number;
}

export function quoteFee(amount: number, currency: 'GHS' | 'TRX', split: FeeSplit): FeeQuote {
  const amountP = Math.round(amount * 100);
  const cfg = currency === 'TRX' ? CRYPTO_FEE : FIAT_FEE;

  let feeP = Math.floor((amountP * cfg.bps) / 10_000);
  if (feeP < cfg.minP) feeP = cfg.minP;
  if (cfg.capP > 0 && feeP > cfg.capP) feeP = cfg.capP;

  const buyerShareP = split === 'buyer' ? feeP : split === 'seller' ? 0 : Math.floor(feeP / 2);
  const sellerShareP = feeP - buyerShareP;

  return {
    fee: feeP / 100,
    buyerFee: buyerShareP / 100,
    sellerFee: sellerShareP / 100,
    buyerTotal: (amountP + buyerShareP) / 100,
    sellerPayout: (amountP - sellerShareP) / 100,
  };
}
