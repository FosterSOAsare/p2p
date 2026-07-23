export type EscrowCurrency = 'GHS' | 'TRX'

/**
 * Formats a mock amount for display.
 * GHS (simulated fiat / mobile money) renders as `GH₵ 1,200.00`.
 * TRX (TRON Shasta testnet) renders as `120 TRX`.
 */
export function formatMoney(amount: number, currency: EscrowCurrency = 'GHS'): string {
  if (currency === 'TRX') {
    return `${amount.toLocaleString()} TRX`
  }
  return `GH₵ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
