import asyncHandler from "express-async-handler";
import * as usersService from "./users.service";

export const getPublicProfile = asyncHandler(async (req, res) => {
  const profile = await usersService.getPublicProfile(req.params.username as string);
  res.json(profile);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user!.id, req.body);
  res.json({ user });
});

export const updateNotificationPrefs = asyncHandler(async (req, res) => {
  const prefs = await usersService.updateNotificationPrefs(req.user!.id, req.body);
  res.json({ prefs });
});

export const blockVendor = asyncHandler(async (req, res) => {
  await usersService.blockVendor(req.user!.id, req.params.username as string, req.body.reason);
  res.status(201).json({ ok: true });
});

export const unblockVendor = asyncHandler(async (req, res) => {
  await usersService.unblockVendor(req.user!.id, req.params.username as string);
  res.json({ ok: true });
});

export const listBlockedVendors = asyncHandler(async (req, res) => {
  const blocked = await usersService.listBlockedVendors(req.user!.id);
  res.json({ blocked });
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
