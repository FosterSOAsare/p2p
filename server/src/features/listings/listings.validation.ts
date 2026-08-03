import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

export const list: RequestSchema = {
  query: Joi.object({
    search: Joi.string().trim().max(100).allow(""),
    category: Joi.string().trim().max(60),
    condition: Joi.string().trim().max(30),
    maxPrice: Joi.number().positive(),
    sort: Joi.string().valid("featured", "newest", "price_asc", "price_desc", "rating").default("featured"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(48).default(12),
  }),
};

export const idParam: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
};

export const mineQuery: RequestSchema = {
  query: Joi.object({
    status: Joi.string().valid("draft", "active", "out_of_stock"),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(48).default(10),
  }),
};

// Marketplace listings are GHS/fiat only — currency is never accepted from the client.
const listingFields = {
  title: Joi.string().trim().min(3).max(120),
  description: Joi.string().trim().max(4000).allow("", null),
  price: Joi.number().positive().max(10_000_000),
  category: Joi.string().trim().max(60),
  condition: Joi.string().trim().max(30).allow("", null),
  quantity: Joi.number().integer().min(1).max(10_000),
  images: Joi.array().items(Joi.string().uri().max(500)).max(8),
  location: Joi.string().trim().max(120).allow("", null),
};

export const create: RequestSchema = {
  body: Joi.object({
    ...listingFields,
    title: listingFields.title.required(),
    price: listingFields.price.required(),
    category: listingFields.category.required(),
    quantity: listingFields.quantity.default(1),
    images: listingFields.images.default([]),
    status: Joi.string().valid("draft", "active").default("active"),
  }),
};

export const update: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
  body: Joi.object({
    ...listingFields,
    status: Joi.string().valid("draft", "active", "out_of_stock"),
  }).min(1),
};

export const dispute: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
  body: Joi.object({
    explanation: Joi.string().trim().min(10).max(2000).required().messages({
      "string.min": "Explain in a little more detail (at least 10 characters)",
    }),
    corrections: Joi.string().trim().max(2000).allow("", null),
  }),
};
