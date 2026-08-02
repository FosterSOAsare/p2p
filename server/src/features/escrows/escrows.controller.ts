import asyncHandler from "express-async-handler";
import type { EscrowStatus } from "../../generated/prisma/client";
import * as escrowsService from "./escrows.service";

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

export const getShareQr = asyncHandler(async (req, res) => {
  const qr = await escrowsService.getShareQr(req.user!, req.params.id as string);
  res.json(qr);
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

export const dispute = asyncHandler(async (req, res) => {
  await escrowsService.dispute(req.user!.id, req.params.id as string, req.body);
  const deal = await escrowsService.getDetail(req.user!, req.params.id as string);
  res.json({ deal });
});

export const review = asyncHandler(async (req, res) => {
  const deal = await escrowsService.leaveReview(req.user!.id, req.params.id as string, req.body);
  res.status(201).json({ deal });
});
