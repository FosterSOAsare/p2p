/**
 * Fee math — ported from TaaS (packages/shared/money.ts), adapted from BigInt
 * minor units to integer pesewas so the payout invariant survives Decimal storage:
 *   fundingTotal === sellerPayout + fee   (always, on any amount and any split)
 * The fee is computed ONCE at creation and stored — never recomputed.
 */

export interface FeeConfig {
  bps: number; // basis points (150 = 1.5%)
  minP: number; // minimum fee, pesewas
  capP: number; // cap, pesewas (0 = no cap)
}

export const FIAT_FEE: FeeConfig = { bps: 150, minP: 200, capP: 15_000 }; // 1.5%, min GH₵2, cap GH₵150
export const CRYPTO_FEE: FeeConfig = { bps: 100, minP: 0, capP: 0 }; // 1.0%, no min/cap

export function toPesewas(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPesewas(p: number): number {
  return p / 100;
}

export function computeFeeP(amountP: number, cfg: FeeConfig): number {
  let raw = Math.floor((amountP * cfg.bps) / 10_000);
  if (raw < cfg.minP) raw = cfg.minP;
  if (cfg.capP > 0 && raw > cfg.capP) raw = cfg.capP;
  return raw;
}

/** Who absorbs the fee — mirrors the FeeSplit enum in schema.prisma. */
export type FeeSplit = "buyer" | "seller" | "split";

/**
 * Divides the fee between the two sides. The buyer's share is always the part
 * that gets added to what they lock; the seller's share is deducted from their
 * payout. `split` floors the buyer's half so the seller absorbs an odd pesewa.
 *
 * The invariant `fundingTotal === sellerPayout + fee` holds in all three modes,
 * which is what keeps the ledger balanced no matter who pays.
 */
export function feeMathP(amountP: number, feeP: number, split: FeeSplit = "split") {
  const buyerShareP = split === "buyer" ? feeP : split === "seller" ? 0 : Math.floor(feeP / 2);
  const sellerShareP = feeP - buyerShareP;
  return {
    buyerShareP,
    sellerShareP,
    fundingTotalP: amountP + buyerShareP, // what the buyer pays/locks
    sellerPayoutP: amountP - sellerShareP, // what the seller receives on release
  };
}

/** Convenience: full breakdown in GH₵ floats for a Decimal-stored escrow row. */
export function breakdown(amount: number, fee: number, split: FeeSplit = "split") {
  const m = feeMathP(toPesewas(amount), toPesewas(fee), split);
  return {
    buyerFee: fromPesewas(m.buyerShareP),
    sellerFee: fromPesewas(m.sellerShareP),
    fundingTotal: fromPesewas(m.fundingTotalP),
    sellerPayout: fromPesewas(m.sellerPayoutP),
  };
}
