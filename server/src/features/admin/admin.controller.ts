import asyncHandler from "express-async-handler";
import type { KycStatus } from "../../generated/prisma/client";
import * as adminService from "./admin.service";

export const listKyc = asyncHandler(async (req, res) => {
  const submissions = await adminService.listKyc(req.query.status as KycStatus);
  res.json({ submissions });
});

export const getKyc = asyncHandler(async (req, res) => {
  const submission = await adminService.getKyc(req.params.id as string);
  res.json(submission);
});

export const approveKyc = asyncHandler(async (req, res) => {
  const submission = await adminService.approveKyc(req.user!.id, req.params.id as string);
  res.json(submission);
});

export const rejectKyc = asyncHandler(async (req, res) => {
  const submission = await adminService.rejectKyc(req.user!.id, req.params.id as string, req.body.reason);
  res.json(submission);
});

export const listDisputes = asyncHandler(async (req, res) => {
  const disputes = await adminService.listDisputes((req.query.status as any) || "open");
  res.json({ disputes });
});

export const getDispute = asyncHandler(async (req, res) => {
  const dispute = await adminService.getDispute(req.params.id as string);
  res.json(dispute);
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const dispute = await adminService.resolveDispute(req.user!.id, req.params.id as string, req.body);
  res.json(dispute);
});

export const listUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsers(req.query as any);
  res.json(result);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await adminService.getUser(req.params.id as string);
  res.json({ user });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.setUserStatus(req.user!.id, req.params.id as string, req.body.status);
  res.json({ user });
});

export const listEscrows = asyncHandler(async (req, res) => {
  const result = await adminService.listEscrows(req.query as any);
  res.json(result);
});

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  res.json(stats);
});

export const listListings = asyncHandler(async (req, res) => {
  const result = await adminService.listListings(req.query as any);
  res.json(result);
});

export const removeListing = asyncHandler(async (req, res) => {
  const listing = await adminService.removeListing(req.user!.id, req.params.id as string, req.body);
  res.json({ listing });
});

export const listListingDisputes = asyncHandler(async (req, res) => {
  const result = await adminService.listListingDisputes((req.query as any).status);
  res.json(result);
});

export const resolveListingDispute = asyncHandler(async (req, res) => {
  const dispute = await adminService.resolveListingDispute(req.user!.id, req.params.id as string, req.body);
  res.json({ dispute });
});
