import asyncHandler from "express-async-handler";
import type { Request, Response } from "express";
import type { EscrowStatus } from "../../generated/prisma/client";
import * as escrowsService from "./escrows.service";
import * as cryptoService from "./crypto.service";
import { verifyIpnSignature } from "../../shared/lib/nowpayments";

export const checkout = asyncHandler(async (req, res) => {
  const deal = await escrowsService.checkoutFromListing(req.user!.id, req.body);
  res.status(201).json({ deal });
});

export const createStandalone = asyncHandler(async (req, res) => {
  const deal = await escrowsService.createStandalone(req.user!.id, req.body);
  res.status(201).json({ deal });
});

export const updateDeal = asyncHandler(async (req, res) => {
  const deal = await escrowsService.updateDeal(req.user!.id, req.params.id as string, req.body);
  res.json({ deal });
});

export const list = asyncHandler(async (req, res) => {
  const result = await escrowsService.list(
    req.user!.id,
    req.query as unknown as { role?: "buyer" | "seller"; status?: EscrowStatus; page: number; limit: number },
  );
  res.json(result);
});

export const getDetail = asyncHandler(async (req, res) => {
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const getPublicByCode = asyncHandler(async (req, res) => {
  const preview = await escrowsService.getPublicByCode(req.params.code as string);
  res.json(preview);
});

export const acceptByCode = asyncHandler(async (req, res) => {
  const deal = await escrowsService.acceptByCode(req.user!.id, req.params.code as string);
  res.json({ deal });
});

export const fund = asyncHandler(async (req, res) => {
  await escrowsService.fund(req.user!.id, req.params.id as string);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const deliver = asyncHandler(async (req, res) => {
  await escrowsService.deliver(req.user!.id, req.params.id as string, req.body);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const release = asyncHandler(async (req, res) => {
  await escrowsService.release(req.user!.id, req.params.id as string);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const cancel = asyncHandler(async (req, res) => {
  await escrowsService.cancel(req.user!.id, req.params.id as string, req.body);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const dispute = asyncHandler(async (req, res) => {
  await escrowsService.dispute(req.user!.id, req.params.id as string, req.body);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const review = asyncHandler(async (req, res) => {
  const deal = await escrowsService.leaveReview(req.user!.id, req.params.id as string, req.body);
  res.status(201).json({ deal });
});

// ---------- Crypto rail (NOWPayments) ----------

/** Buyer opens (or re-opens) the hosted invoice; responds with the URL to send them to. */
export const cryptoStart = asyncHandler(async (req, res) => {
  const deposit = await cryptoService.startDeposit(req.user!.id, req.params.id as string);
  res.status(201).json({ deposit });
});

/** Cheap read of what we already know — what the funding screen polls. */
export const cryptoStatus = asyncHandler(async (req, res) => {
  const deposit = await cryptoService.getDeposit(req.user!.id, req.params.id as string);
  res.json({ deposit });
});

/** Ask the provider directly. The fallback for a server the IPN cannot reach. */
export const cryptoCheck = asyncHandler(async (req, res) => {
  const deposit = await cryptoService.checkDeposit(
    req.user!.id,
    req.params.id as string,
    (req.body?.paymentId as string) || undefined,
  );
  res.json({ deposit });
});

/**
 * NOWPayments IPN. Unauthenticated by nature — the signature IS the auth, so it
 * is checked before the body is trusted for anything.
 *
 * Unlike the Paystack webhook this reads the PARSED body: NOWPayments signs a
 * re-serialisation of the payload with its keys sorted, not the bytes on the
 * wire, so the raw buffer buys us nothing (see verifyIpnSignature).
 *
 * Processing happens before the ack so a transient failure returns non-2xx and
 * the provider retries; settlement is idempotent, so retries are safe.
 */
export const nowpaymentsWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!verifyIpnSignature(req.body, req.header("x-nowpayments-sig"))) {
    res.status(401).json({ message: "Invalid signature" });
    return;
  }
  try {
    await cryptoService.handleIpn(req.body as Record<string, unknown>);
    res.sendStatus(200);
  } catch (err) {
    console.error("[nowpayments:ipn] processing error —", (err as Error).message);
    res.sendStatus(500);
  }
};
