import asyncHandler from "express-async-handler";
import * as promotionsService from "./promotions.service";

export const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await promotionsService.getPromotionMetrics(req.user!.id);
  res.json(metrics);
});

export const mine = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };
  const result = await promotionsService.listMine(req.user!.id, page, limit, status);
  res.json(result);
});

export const quote = asyncHandler(async (req, res) => {
  const { listingId, planId, priority } = req.query as unknown as {
    listingId: string;
    planId: string;
    priority: number;
  };
  res.json(await promotionsService.quote(req.user!.id, listingId, planId, priority));
});

export const launch = asyncHandler(async (req, res) => {
  const { listingId, planId, priority } = req.body as {
    listingId: string;
    planId: string;
    priority: number;
  };
  const result = await promotionsService.launch(req.user!.id, listingId, planId, priority);
  res.status(201).json(result);
});

export const pause = asyncHandler(async (req, res) => {
  const promotion = await promotionsService.pause(req.user!.id, req.params.id as string);
  res.json({ promotion });
});

export const resume = asyncHandler(async (req, res) => {
  const promotion = await promotionsService.resume(req.user!.id, req.params.id as string);
  res.json({ promotion });
});

export const cancel = asyncHandler(async (req, res) => {
  const promotion = await promotionsService.cancel(req.user!.id, req.params.id as string);
  res.json({ promotion });
});
