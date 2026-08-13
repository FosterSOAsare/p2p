import crypto from "node:crypto";
import { env, nowpaymentsEnabled } from "../config/env";
import { ApiError } from "./errors";

/**
 * Thin NOWPayments (sandbox) client — the crypto counterpart to paystack.ts,
 * and deliberately the same shape: create a hosted charge, read back the
 * authoritative status of one, authenticate the callback.
 *
 * Only the deposit half of the provider is used. Payouts (release to the
 * seller, refund to the buyer) are a separately gated API needing a funded
 * custody balance and a 2FA code per batch, so they are settled out of band —
 * see server/TODO.md.
 */

const authHeaders = () => {
  if (!nowpaymentsEnabled()) throw ApiError.notImplemented("NOWPayments is not configured");
  return { "x-api-key": env.NOWPAYMENTS_API_KEY, "Content-Type": "application/json" };
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = authHeaders(); // throws 501 if unconfigured — must not be masked as 502
  let res: Response;
  try {
    res = await fetch(`${env.NOWPAYMENTS_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw ApiError.badGateway("Could not reach NOWPayments");
  }
  const body = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok || !body) {
    throw ApiError.badRequest(body?.message || `NOWPayments error (${res.status})`);
  }
  return body;
}

/**
 * Payment lifecycle, verbatim from the provider. `confirmed` means the coins
 * are on-chain and irreversible but not yet swept to the merchant account;
 * `finished` means swept. Both are good enough to call a deposit received —
 * the buyer cannot claw either one back.
 */
export type PayStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "expired"
  | "refunded";

const SETTLED: PayStatus[] = ["confirmed", "finished"];
const DEAD: PayStatus[] = ["failed", "expired", "refunded"];

export const isSettled = (status: string) => SETTLED.includes(status as PayStatus);
export const isDead = (status: string) => DEAD.includes(status as PayStatus);

export interface InvoiceResult {
  invoiceId: string;
  invoiceUrl: string;
}

/**
 * Create a hosted invoice. Priced in the same coin it is paid in (see
 * NOWPAYMENTS_PRICE_CURRENCY), so the amount owed cannot drift between the
 * moment the invoice opens and the moment the buyer pays.
 */
export async function createInvoice(params: {
  amount: number;
  orderId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<InvoiceResult> {
  const data = await call<{ id: number | string; invoice_url?: string }>("/invoice", {
    method: "POST",
    body: JSON.stringify({
      price_amount: params.amount,
      price_currency: env.NOWPAYMENTS_PRICE_CURRENCY,
      pay_currency: env.NOWPAYMENTS_PAY_CURRENCY,
      order_id: params.orderId,
      order_description: params.description,
      ipn_callback_url: `${env.SERVER_ORIGIN}/api/escrows/webhook/nowpayments`,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    }),
  });
  if (!data.invoice_url) throw ApiError.badGateway("NOWPayments did not return an invoice URL");
  return { invoiceId: String(data.id), invoiceUrl: data.invoice_url };
}

export interface PaymentSnapshot {
  paymentId: string;
  orderId: string;
  status: PayStatus;
  /** What the invoice asked for, in `payCurrency`. */
  payAmount: number;
  /** What actually landed. 0 until the buyer sends. */
  actuallyPaid: number;
  payCurrency: string;
  payAddress: string | null;
  payinHash: string | null;
}

/** Normalise either an IPN body or a GET /payment/:id response into one shape. */
export function toSnapshot(raw: Record<string, unknown>): PaymentSnapshot {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);
  return {
    paymentId: String(raw.payment_id ?? raw.paymentid ?? ""),
    orderId: String(raw.order_id ?? raw.orderid ?? ""),
    status: String(raw.payment_status ?? raw.paymentstatus ?? "waiting") as PayStatus,
    payAmount: num(raw.pay_amount ?? raw.payamount),
    actuallyPaid: num(raw.actually_paid ?? raw.actuallypaid),
    payCurrency: String(raw.pay_currency ?? raw.paycurrency ?? env.NOWPAYMENTS_PAY_CURRENCY),
    payAddress: str(raw.pay_address ?? raw.payaddress),
    payinHash: str(raw.payin_hash ?? raw.payinhash),
  };
}

/** The authoritative outcome of one payment (IPN fallback / poll). */
export async function getPayment(paymentId: string): Promise<PaymentSnapshot> {
  const data = await call<Record<string, unknown>>(`/payment/${encodeURIComponent(paymentId)}`);
  return toSnapshot(data);
}

/**
 * Verify an IPN. NOWPayments signs the payload — not the raw bytes, but the
 * JSON re-serialised with its keys sorted — using HMAC-SHA512 keyed by the IPN
 * secret, and sends the digest in `x-nowpayments-sig`.
 *
 * Re-serialising is the provider's own documented scheme, so it is what we
 * implement, but note what it costs: the digest is computed over OUR rendering
 * of the parsed body, not theirs. The sort is recursive on purpose — sorting
 * only the top level (the obvious shortcut) silently mis-signs any payload
 * carrying a nested object.
 */
export function verifyIpnSignature(body: unknown, signature: string | undefined): boolean {
  if (!signature || !env.NOWPAYMENTS_IPN_SECRET) return false;
  const expected = crypto
    .createHmac("sha512", env.NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(sortDeep(body)))
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(source[key]);
        return acc;
      }, {});
  }
  return value;
}

/** A unique, human-legible deposit reference — our `order_id`. */
export function newOrderRef(escrowCode: string): string {
  return `p2p_esc_${escrowCode}_${crypto.randomBytes(4).toString("hex")}`;
}
