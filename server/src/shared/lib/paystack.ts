import crypto from "node:crypto";
import { env } from "../config/env";
import { ApiError } from "./errors";

/**
 * Thin Paystack (test-mode) client. GHS amounts cross the wire in pesewas
 * (Paystack's minor unit), matching money.ts. Only the pieces the deposit flow
 * needs: initialize a charge, verify one by reference, and authenticate webhooks.
 */

const BASE = "https://api.paystack.co";

function authHeaders() {
  if (!env.PAYSTACK_SECRET_KEY) throw ApiError.notImplemented("Paystack is not configured");
  return {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const headers = authHeaders(); // throws 501 if unconfigured — must not be masked as 502
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw ApiError.badGateway("Could not reach Paystack");
  }
  const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !body?.status) {
    throw ApiError.badRequest(body?.message || `Paystack error (${res.status})`);
  }
  return body.data;
}

export interface InitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Start a charge. `amountPesewas` is an integer (GH₵1 = 100). */
export async function initTransaction(params: {
  email: string;
  amountPesewas: number;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<InitResult> {
  const data = await call<{ authorization_url: string; access_code: string; reference: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountPesewas,
        currency: "GHS",
        reference: params.reference,
        metadata: params.metadata ?? {},
        callback_url: env.PAYSTACK_CALLBACK_URL || undefined,
      }),
    },
  );
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export interface VerifyResult {
  status: string; // "success" | "failed" | "abandoned" | ...
  reference: string;
  amountPesewas: number;
  currency: string;
}

/** Ask Paystack the authoritative outcome of a reference (webhook fallback / poll). */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const data = await call<{ status: string; reference: string; amount: number; currency: string }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
  return {
    status: data.status,
    reference: data.reference,
    amountPesewas: data.amount,
    currency: data.currency,
  };
}

/**
 * Verify an incoming webhook. Paystack signs the raw request body with
 * HMAC-SHA512 keyed by the secret; the digest arrives in `x-paystack-signature`.
 * Compare in constant time against the untouched raw bytes.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string | undefined): boolean {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** A unique, human-legible deposit reference. */
export function newReference(): string {
  return `p2p_dep_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}
