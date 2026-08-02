import Joi from "joi";
import type { RequestSchema } from "../../shared/middleware/validate.middleware";

const username = Joi.string()
  .lowercase()
  .pattern(/^[a-z0-9_]{3,20}$/)
  .required();

const usernameParam = Joi.object({ username });

/** Cloudinary metadata only — the bytes were uploaded over HTTP beforehand.
 *  The size ceiling mirrors the multer limit on POST /api/upload/single. */
const attachment = Joi.object({
  url: Joi.string().uri().max(2048).required(),
  name: Joi.string().trim().max(255).required(),
  mime: Joi.string().trim().max(150).required(),
  size: Joi.number()
    .integer()
    .min(1)
    .max(10 * 1024 * 1024)
    .required(),
});

const body = Joi.string().trim().max(2000).allow("");

// ---------- REST ----------

export const thread: RequestSchema = {
  params: usernameParam,
};

export const send: RequestSchema = {
  params: usernameParam,
  body: Joi.object({
    body: body.required(),
  }),
};

// ---------- Socket payloads (validated in messages.gateway.ts) ----------

export const socketConversationOpen = Joi.object({
  username,
  // Last message the client holds, for gap-fill after a reconnect. Kept as a
  // loose string rather than .uuid() — ids are UUIDv7, and an unrecognised id
  // is already handled by falling back to full history.
  sinceId: Joi.string().trim().max(64).optional(),
});

export const socketMessageSend = Joi.object({
  username,
  body: body.optional(),
  attachment: attachment.optional(),
}).or("body", "attachment");

export const socketMessageRead = Joi.object({ username });

export const socketTyping = Joi.object({
  isTyping: Joi.boolean().required(),
});
