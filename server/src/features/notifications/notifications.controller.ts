import asyncHandler from "express-async-handler";
import * as notificationsService from "./notifications.service";

export const list = asyncHandler(async (req, res) => {
  const page = await notificationsService.list(req.user!.id, {
    page: Number(req.query.page),
    limit: Number(req.query.limit),
  });
  res.json(page);
});

export const markRead = asyncHandler(async (req, res) => {
  const updated = await notificationsService.markRead(req.user!.id, req.params.id as string);
  res.json({ ok: true, updated });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const updated = await notificationsService.markAllRead(req.user!.id);
  res.json({ ok: true, updated });
});
