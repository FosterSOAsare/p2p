import type { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { ApiError } from "../lib/errors";

export interface RequestSchema {
  body?: Joi.Schema | Record<string, Joi.Schema>;
  query?: Joi.Schema | Record<string, Joi.Schema>;
  params?: Joi.Schema | Record<string, Joi.Schema>;
}

const SEGMENTS = ["params", "query", "body"] as const;

/**
 * Validates req.body / req.query / req.params against a feature's Joi schema.
 * Unknown keys are stripped; validated (and coerced) values replace the originals.
 */
export function validate(schema: RequestSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const details: string[] = [];

    for (const segment of SEGMENTS) {
      const segmentSchema = schema[segment];
      if (!segmentSchema) continue;

      const { value, error } = Joi.compile(segmentSchema)
        .prefs({ errors: { label: "key" }, abortEarly: false, stripUnknown: true })
        .validate(req[segment]);

      if (error) {
        details.push(...error.details.map((d) => d.message));
        continue;
      }

      // Express 5 exposes req.query via a read-only prototype getter — shadow it on the instance.
      if (segment === "query") Object.defineProperty(req, "query", { value });
      else req[segment] = value;
    }

    if (details.length > 0) return next(ApiError.badRequest("Validation failed", details));
    next();
  };
}
