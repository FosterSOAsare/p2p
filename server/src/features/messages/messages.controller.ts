import asyncHandler from "express-async-handler";
import * as messagesService from "./messages.service";

export const listConversations = asyncHandler(async (req, res) => {
  const conversations = await messagesService.listConversations(req.user!.id);
  res.json({ conversations });
});

export const getThread = asyncHandler(async (req, res) => {
  const thread = await messagesService.getThread(req.user!.id, req.params.username as string);
  res.json(thread);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await messagesService.sendMessage(req.user!.id, req.params.username as string, req.body.body);
  res.status(201).json({ message });
});

export const markRead = asyncHandler(async (req, res) => {
  await messagesService.markRead(req.user!.id, req.params.username as string);
  res.json({ ok: true });
});
