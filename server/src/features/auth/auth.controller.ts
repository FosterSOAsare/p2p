import type { Request } from "express";
import asyncHandler from "express-async-handler";
import * as authService from "./auth.service";
import type { RequestContext } from "./auth.model";

function ctx(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, ctx(req));
  res.json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken, ctx(req));
  res.json({ tokens });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.json({ ok: true });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.json({ ok: true });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user!.id);
  res.json({ ok: true });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  // Always the same response — never reveal whether the email exists.
  res.json({ ok: true });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.json({ ok: true });
});

export const changePassword = asyncHandler(async (req, res) => {
  const tokens = await authService.changePassword(req.user!.id, req.body, ctx(req));
  res.json({ tokens });
});

export const usernameAvailable = asyncHandler(async (req, res) => {
  const available = await authService.isUsernameAvailable(String(req.query.u));
  res.json({ available });
});

export const me = asyncHandler(async (req, res) => {
  const result = await authService.me(req.user!.id);
  res.json(result);
});
