import asyncHandler from "express-async-handler";
import type { Request, Response } from "express";
import * as walletService from "./wallet.service";
import { verifyWebhookSignature } from "../../shared/lib/paystack";

export const getWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getWallet(req.user!.id);
  res.json(wallet);
});

export const deposit = asyncHandler(async (req, res) => {
  const wallet = await walletService.deposit(req.user!.id, req.body.amount);
  res.status(201).json(wallet);
});

export const withdraw = asyncHandler(async (req, res) => {
  const wallet = await walletService.withdraw(req.user!.id, req.body.amount, req.body.destination);
  res.json(wallet);
});

export const transactions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const result = await walletService.listTransactions(req.user!.id, page, limit);
  res.json(result);
});

// ---------- Paystack deposit ----------

export const initDeposit = asyncHandler(async (req, res) => {
  const result = await walletService.initDeposit(req.user!.id, req.body.amount);
  res.status(201).json(result);
});

export const verifyDeposit = asyncHandler(async (req, res) => {
  const result = await walletService.verifyDeposit(req.user!.id, req.params.reference as string);
  res.json(result);
});

/**
 * Paystack webhook. Mounted in app.ts with express.raw BEFORE the JSON parser
 * so req.body is the untouched bytes the HMAC signature was computed over.
 * Always answers 200 quickly (Paystack retries on non-2xx); auth is the
 * signature, not a JWT.
 */
export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
  const raw = req.body as Buffer;
  const signature = req.header("x-paystack-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    res.status(401).json({ message: "Invalid signature" });
    return;
  }
  // Process BEFORE acking, so a transient failure returns non-2xx and Paystack
  // retries the delivery. Settlement is idempotent, so retries are safe.
  try {
    const event = JSON.parse(raw.toString("utf8"));
    await walletService.handlePaystackWebhook(event);
    res.sendStatus(200);
  } catch (err) {
    console.error("[paystack:webhook] processing error —", (err as Error).message);
    res.sendStatus(500);
  }
};
