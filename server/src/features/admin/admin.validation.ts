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
