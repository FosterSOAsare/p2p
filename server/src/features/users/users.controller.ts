import asyncHandler from "express-async-handler";
import * as usersService from "./users.service";

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user!.id, req.body);
  res.json({ user });
});

export const updateNotificationPrefs = asyncHandler(async (req, res) => {
  const prefs = await usersService.updateNotificationPrefs(req.user!.id, req.body);
  res.json({ prefs });
});

export const getSavedListings = asyncHandler(async (req, res) => {
  const saved = await usersService.getSavedListings(req.user!.id);
  res.json({ saved });
});

export const saveListing = asyncHandler(async (req, res) => {
  await usersService.saveListing(req.user!.id, req.params.listingId as string);
  res.status(201).json({ ok: true });
});

export const unsaveListing = asyncHandler(async (req, res) => {
  await usersService.unsaveListing(req.user!.id, req.params.listingId as string);
  res.json({ ok: true });
});
