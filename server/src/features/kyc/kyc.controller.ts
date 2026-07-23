import asyncHandler from "express-async-handler";
import * as kycService from "./kyc.service";

export const submit = asyncHandler(async (req, res) => {
  const kyc = await kycService.submit(req.user!.id, req.body);
  res.status(201).json(kyc);
});

export const getMine = asyncHandler(async (req, res) => {
  const kyc = await kycService.getMine(req.user!.id);
  res.json(kyc);
});
