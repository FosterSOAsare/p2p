import asyncHandler from "express-async-handler";
import * as walletService from "./wallet.service";

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
