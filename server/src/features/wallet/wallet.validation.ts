import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const deposit: RequestSchema = {
  body: Joi.object({
    amount: Joi.number().positive().max(100_000).required().messages({
      "number.max": "Simulated deposits are capped at GH₵ 100,000",
    }),
  }),
};

export const initDeposit: RequestSchema = {
  body: Joi.object({
    amount: Joi.number().positive().max(100_000).required().messages({
      "number.max": "Deposits are capped at GH₵ 100,000",
    }),
    // Optional: preselects the method on the hosted payment page.
    method: Joi.string().valid("momo", "card"),
  }),
};

export const verifyDeposit: RequestSchema = {
  params: Joi.object({
    reference: Joi.string().max(120).required(),
  }),
};

export const withdraw: RequestSchema = {
  body: Joi.object({
    amount: Joi.number().positive().max(1_000_000).required(),
    // Defaulted, so an existing client that sends neither still cashes out GHS.
    currency: Joi.string().valid("GHS", "TRX").default("GHS"),
    // The destination means a different thing per rail — a momo number for GHS,
    // a base58 TRON address for TRX — so it is validated against whichever was
    // asked for rather than accepting either shape for both.
    destination: Joi.when("currency", {
      is: "TRX",
      then: Joi.string()
        .pattern(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)
        .required()
        .messages({ "string.pattern.base": "Enter a valid TRON (TRX) address" }),
      otherwise: Joi.string()
        .pattern(/^\+?[0-9\s-]{9,15}$/)
        .required()
        .messages({ "string.pattern.base": "Enter a valid mobile money number" }),
    }),
    /*
      Idempotency key, minted by the client and reused on every retry of the
      same payout.

      Optional, so a client that predates this still works — it just gets a
      server-generated reference and no protection against submitting twice.
      Bounded to a safe alphabet because it becomes the payout's public
      reference, which appears in ledger notes and emails.
    */
    reference: Joi.string()
      .trim()
      .pattern(/^[A-Za-z0-9_-]{8,64}$/)
      .messages({ "string.pattern.base": "Invalid payout reference" }),
  }),
};

export const transactions: RequestSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(15),
    currency: Joi.string().valid("GHS", "TRX").default("GHS"),
  }),
};

export const withdrawals: RequestSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(15),
    currency: Joi.string().valid("GHS", "TRX").default("GHS"),
    status: Joi.string().valid("pending", "completed", "rejected", "all").default("all"),
  }),
};
