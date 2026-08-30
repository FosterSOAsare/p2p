import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";
import { APP_SCHEME } from "./return-url";

export const idParam: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
};

export const codeParam: RequestSchema = {
  params: Joi.object({
    code: Joi.string()
      .uppercase()
      .pattern(/^[A-HJ-NP-Z2-9]{8}$/)
      .required()
      .messages({ "string.pattern.base": "Share codes are 8 characters" }),
  }),
};

export const checkout: RequestSchema = {
  body: Joi.object({
    listingId: Joi.string().guid().required(),
    quantity: Joi.number().integer().min(1).max(100).default(1),
    // Recorded on the `funded` event for the receipt only — checkout always
    // debits the buyer's wallet, and this says what filled it. `wallet` means
    // an existing balance covered the order with no fresh top-up, so it's also
    // the honest default when a client omits the field.
    paymentMethod: Joi.string().valid("momo", "card", "wallet").default("wallet"),
  }),
};

export const createStandalone: RequestSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(120).required(),
    description: Joi.string().trim().max(2000).allow("", null),
    counterpartyUsername: Joi.string().trim().allow("", null),
    invitedUsername: Joi.string().trim().allow("", null),
    role: Joi.string().valid("buyer", "seller").required(),
    amount: Joi.number().positive().max(10_000_000).required(),
    // No rail/type here on purpose: rail is derived from currency
    // (see escrows.service.createStandalone).
    currency: Joi.string().valid("GHS", "TRX").required(),
    feeSplit: Joi.string().valid("buyer", "seller", "split").default("split"),
  }),
};

export const updateDeal: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    title: Joi.string().trim().min(3).max(120).optional(),
    description: Joi.string().trim().max(2000).allow("", null).optional(),
    counterpartyUsername: Joi.string().trim().allow("", null).optional(),
    invitedUsername: Joi.string().trim().allow("", null).optional(),
    role: Joi.string().valid("buyer", "seller").optional(),
    amount: Joi.number().positive().max(10_000_000).optional(),
    currency: Joi.string().valid("GHS", "TRX").optional(),
  }),
};

export const deliver: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    carrier: Joi.string().trim().max(40).allow("", null),
    trackingNumber: Joi.string().trim().max(60).allow("", null),
    note: Joi.string().trim().max(500).allow("", null),
  }),
};

export const cancel: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    // Optional — relayed to the buyer in the deal thread and nothing else.
    reason: Joi.string().trim().max(300).allow("", null),
  }),
};

export const dispute: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    reason: Joi.string()
      .valid("not_delivered", "not_as_described", "wrong_item", "service_not_done", "other")
      .required(),
    description: Joi.string().trim().min(10).max(1000).required().messages({
      "string.min": "Describe the problem in at least 10 characters",
    }),
  }),
};

export const review: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000).allow("", null),
  }),
};

export const cryptoStart: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    // Where to send the buyer back to after the hosted invoice. Optional — the
    // web omits it and gets its own callback route. The *value* is checked
    // against an allowlist in return-url.ts; this only bounds its shape.
    //
    // The scheme is imported rather than repeated: this ran ahead of the
    // allowlist with a stale `p2pm` and returned 400 for the exact URL
    // return-url.ts was written to accept, which no test covered because Expo
    // Go emits `exp://` and never exercised the app scheme at all.
    returnUrl: Joi.string()
      .uri({ scheme: [/https?/, APP_SCHEME, "exp"] })
      .max(512)
      .allow("", null),
  }),
};

export const cryptoCheck: RequestSchema = {
  params: Joi.object({ id: Joi.string().guid().required() }),
  body: Joi.object({
    // NOWPayments' payment id, read off `NP_id` on the success redirect. Absent
    // on a plain poll, where the id already on file is used instead.
    paymentId: Joi.string().trim().max(64).allow("", null),
  }),
};

export const list: RequestSchema = {
  query: Joi.object({
    role: Joi.string().valid("buyer", "seller"),
    status: Joi.string().valid("created", "funded", "delivered", "disbursed", "disputed", "cancelled"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};
