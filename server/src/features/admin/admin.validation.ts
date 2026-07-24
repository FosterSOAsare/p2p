import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const kycList: RequestSchema = {
  query: Joi.object({
    status: Joi.string().valid("pending", "verified", "rejected").default("pending"),
  }),
};

export const kycParam: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
};

export const kycReject: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(5).max(500).required().messages({
      "string.min": "Give the applicant a clear rejection reason (min 5 chars)",
    }),
  }),
};

export const disputeList: RequestSchema = {
  query: Joi.object({
    status: Joi.string().valid("open", "resolved", "all").default("open"),
  }),
};

export const disputeParam: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
};

export const disputeResolve: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
  body: Joi.object({
    outcome: Joi.string().valid("release", "refund", "split").required(),
    buyerRefund: Joi.number().min(0).optional(),
    rulingNote: Joi.string().trim().min(5).max(1000).required().messages({
      "string.min": "Provide a clear ruling explanation note (min 5 chars)",
    }),
  }),
};
