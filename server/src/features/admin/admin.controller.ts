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
