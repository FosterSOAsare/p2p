import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";
import { MAX_PRIORITY, PRIORITY_STEP, PROMOTION_PLANS } from "./promotion-pricing";

const planIds = PROMOTION_PLANS.map((p) => p.id);

// The studio slider steps in fives, so the server accepts the same grid — a
// hand-rolled request shouldn't be able to buy rank 97.
const priority = Joi.number()
  .integer()
  .min(0)
  .max(MAX_PRIORITY)
  .multiple(PRIORITY_STEP)
  .required();

const planId = Joi.string()
  .valid(...planIds)
  .required();

export const listQuery: RequestSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    // "live" is the active-or-paused pair the hub manages; the individual
    // statuses are there for a history view. Omitted means everything.
    status: Joi.string().valid("live", "active", "paused", "expired", "cancelled"),
  }),
};

export const quote: RequestSchema = {
  query: Joi.object({
    listingId: Joi.string().guid().required(),
    planId,
    priority,
  }),
};

export const launch: RequestSchema = {
  body: Joi.object({
    listingId: Joi.string().guid().required(),
    planId,
    priority,
  }),
};

export const idParam: RequestSchema = {
  params: Joi.object({
    id: Joi.string().guid().required(),
  }),
};
