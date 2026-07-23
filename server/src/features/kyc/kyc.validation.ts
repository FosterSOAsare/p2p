import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const ID_TYPES = ["Passport", "National ID", "Drivers License"] as const;

/** TRON base58 address: starts with T, 34 chars total. */
export const TRON_ADDRESS_PATTERN = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export const submit: RequestSchema = {
  body: Joi.object({
    legalName: Joi.string().trim().min(2).max(100).required(),
    storeName: Joi.string().trim().min(2).max(100).required(),
    taxId: Joi.string().trim().max(50).allow("", null),
    country: Joi.string().trim().min(2).max(60).required(),
    address: Joi.string().trim().min(5).max(200).required(),
    idType: Joi.string()
      .valid(...ID_TYPES)
      .required(),
    idNumber: Joi.string().trim().min(4).max(50).required(),
    momoNumber: Joi.string()
      .pattern(/^\+?[0-9\s-]{9,15}$/)
      .allow("", null)
      .messages({ "string.pattern.base": "Enter a valid mobile money number" }),
    trxAddress: Joi.string()
      .pattern(TRON_ADDRESS_PATTERN)
      .allow("", null)
      .messages({ "string.pattern.base": "Enter a valid TRX address (starts with T)" }),
  })
    .or("momoNumber", "trxAddress")
    .messages({ "object.missing": "Provide at least one payout account (mobile money or TRX address)" }),
};
