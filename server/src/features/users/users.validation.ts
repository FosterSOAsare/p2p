import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const counterpartySearch: RequestSchema = {
  query: Joi.object({
    // A leading "@" is accepted because people type it; the service strips it.
    q: Joi.string().trim().max(40).allow("").default(""),
  }),
};

export const updateMe: RequestSchema = {
  body: Joi.object({
    fullName: Joi.string().trim().min(2).max(100),
    phone: Joi.string()
      .pattern(/^\+?[0-9\s-]{9,15}$/)
      .allow(null)
      .messages({ "string.pattern.base": "Enter a valid phone number" }),
    avatarUrl: Joi.string().uri().max(500).allow(null),
  }).min(1), // at least one field to update
};

export const notificationPrefs: RequestSchema = {
  body: Joi.object({
    emailShipmentUpdates: Joi.boolean().required(),
    smsReleaseAlerts: Joi.boolean().required(),
  }),
};

export const usernameParam: RequestSchema = {
  params: Joi.object({
    username: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9_]{3,20}$/)
      .required(),
  }),
};

export const blockVendor: RequestSchema = {
  params: Joi.object({
    username: Joi.string()
      .lowercase()
      .pattern(/^[a-z0-9_]{3,20}$/)
      .required(),
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(3).max(300).required().messages({
      "string.min": "Give a short reason for the block (min 3 chars)",
      "any.required": "A reason for the block is required",
    }),
  }),
};

export const savedListingParam: RequestSchema = {
  params: Joi.object({
    listingId: Joi.string().guid().required(),
  }),
};
