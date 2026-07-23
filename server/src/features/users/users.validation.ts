import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

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

export const savedListingParam: RequestSchema = {
  params: Joi.object({
    listingId: Joi.string().guid().required(),
  }),
};
