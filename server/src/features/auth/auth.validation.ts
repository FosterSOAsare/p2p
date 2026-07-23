import Joi from "joi";
import { RESERVED_USERNAMES } from "../../shared/constants/reserved-usernames";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

/** 3-20 chars: a-z, 0-9, underscore; lowercased; reserved names rejected (docs/13 §13.2) */
export const usernameSchema = Joi.string()
  .lowercase()
  .pattern(/^[a-z0-9_]{3,20}$/)
  .invalid(...RESERVED_USERNAMES)
  .messages({
    "string.pattern.base": "Username must be 3-20 chars: a-z, 0-9, underscore",
    "any.invalid": "This username is reserved",
  });

const passwordSchema = Joi.string().min(8).max(128);

export const signup: RequestSchema = {
  body: Joi.object({
    username: usernameSchema.required(),
    email: Joi.string().email().lowercase().required(),
    password: passwordSchema.required(),
    fullName: Joi.string().trim().min(2).max(100).required(),
  }),
};

export const login: RequestSchema = {
  body: Joi.object({
    identifier: Joi.string().min(3).max(255).lowercase().required(), // email OR username
    password: Joi.string().required(),
  }),
};

export const refresh: RequestSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const logout: RequestSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

export const verifyEmail: RequestSchema = {
  body: Joi.object({
    token: Joi.string().required(),
  }),
};

export const forgotPassword: RequestSchema = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),
};

export const resetPassword: RequestSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    newPassword: passwordSchema.required(),
  }),
};

export const changePassword: RequestSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema.required(),
  }),
};

export const usernameAvailable: RequestSchema = {
  query: Joi.object({
    u: usernameSchema.required(),
  }),
};
