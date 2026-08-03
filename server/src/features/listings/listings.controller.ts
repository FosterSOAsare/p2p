import asyncHandler from "express-async-handler";
import * as listingsService from "./listings.service";
import type { ListQuery } from "./listings.service";

export const list = asyncHandler(async (req, res) => {
  const result = await listingsService.list(req.query as unknown as ListQuery);
  res.json(result);
});

export const getById = asyncHandler(async (req, res) => {
  const listing = await listingsService.getById(req.params.id as string, req.user);
  res.json(listing);
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await listingsService.listCategories();
  res.json({ categories });
});

export const create = asyncHandler(async (req, res) => {
  const listing = await listingsService.create(req.user!.id, req.body);
  res.status(201).json({ listing });
});

export const update = asyncHandler(async (req, res) => {
  const listing = await listingsService.update(req.user!, req.params.id as string, req.body);
  res.json({ listing });
});

export const remove = asyncHandler(async (req, res) => {
  await listingsService.remove(req.user!, req.params.id as string);
  res.json({ ok: true });
});

export const mine = asyncHandler(async (req, res) => {
  const result = await listingsService.mine(
    req.user!.id,
    req.query as unknown as { status?: "draft" | "active" | "out_of_stock"; page: number; limit: number },
  );
  res.json(result);
});

export const submitDispute = asyncHandler(async (req, res) => {
  const dispute = await listingsService.submitDispute(req.user!.id, req.params.id as string, req.body);
  res.status(201).json({ dispute });
});
