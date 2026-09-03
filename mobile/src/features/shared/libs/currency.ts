/**
 * Money formatting for the app's two rails.
 *
 * Mirrors `web/src/features/shared/libs/currency.ts` exactly, so the same
 * balance reads the same on both clients: `GH₵ 1,200.00` and `120 TRX`.
 *
 * The two are formatted differently on purpose. Cedis are a fiat amount and
 * carry a leading symbol and two fixed decimals; TRX is a token count, trails
 * its ticker, and is not padded — `120 TRX` rather than `TRX 120.00`, which
 * would read as a currency it isn't.
 *
 * Screens here each grew their own `formatMoney`, and they disagree: several
 * take a *symbol* defaulting to `'GH₵'` while their callers pass the *code*
 * `'GHS'`, which renders `GHS1,234.00`. This takes the code, which is what the
 * API actually returns, so there is nothing to convert at the call site and
 * nothing to get backwards.
 */

export type Currency = 'GHS' | 'TRX';

export function formatMoney(amount: number, currency: Currency = 'GHS'): string {
  if (currency === 'TRX') {
    return `${amount.toLocaleString()} TRX`;
  }
  return `GH₵ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
