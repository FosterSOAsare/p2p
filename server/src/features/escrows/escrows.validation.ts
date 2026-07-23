import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

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
    // Simulated payment method (recorded, not charged). TODO(payments): real charge.
    paymentMethod: Joi.string().valid("momo", "card").default("momo"),
  }),
};

export const createStandalone: RequestSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(120).required(),
    description: Joi.string().trim().max(2000).allow("", null),
    counterpartyUsername: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9_]{3,20}$/),
    role: Joi.string().valid("buyer", "seller").required(),
    amount: Joi.number().positive().max(10_000_000).required(),
    currency: Joi.string().valid("GHS", "TRX").required(),
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

export const list: RequestSchema = {
  query: Joi.object({
    role: Joi.string().valid("buyer", "seller"),
    status: Joi.string().valid("created", "funded", "delivered", "disbursed", "disputed"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};
