import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";

/**
 * Mail rendering + delivery. Templates live in /server/templates (outside src,
 * as the team agreed) and survive the tsc build because we resolve them from the
 * repo — not from dist. Delivery is SIMULATED by default: every send logs
 *   [mail:simulated] To <email>: <subject>
 * matching the existing verify/reset console pattern. Set MAIL_DRIVER=smtp
 * (and SMTP_*) plus `npm i nodemailer` to send for real — no other code changes.
 */

// src/shared/mail -> ../../../templates == server/templates (dist mirrors this depth)
const TEMPLATES_DIR = path.resolve(__dirname, "../../../templates");
const fileCache = new Map<string, string>();

function readTemplate(name: string): string {
  const cached = fileCache.get(name);
  if (cached !== undefined) return cached;
  const html = fs.readFileSync(path.join(TEMPLATES_DIR, `${name}.html`), "utf8");
  if (env.NODE_ENV === "production") fileCache.set(name, html);
  return html;
}

type Vars = Record<string, string | number>;

function interpolate(template: string, vars: Vars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    key in vars ? String(vars[key]) : "",
  );
}

/** Render a named template inside layout.html. */
export function renderTemplate(name: string, vars: Vars): string {
  const base: Vars = {
    appName: "P2P Market",
    webOrigin: env.WEB_ORIGIN,
    year: new Date().getFullYear(),
    ...vars,
  };
  const body = interpolate(readTemplate(name), base);
  const layout = readTemplate("layout");
  // Function replacer: inserts `body` literally so any `$`-patterns in user data
  // (e.g. a deal title) aren't treated as replacement specials ($&, $1, …).
  return interpolate(layout.replace("{{content}}", () => body), base);
}

/** Deliver (or simulate) one message. Never throws — mail is best-effort. */
export async function sendMail(to: string, subject: string, template: string, vars: Vars): Promise<void> {
  try {
    const html = renderTemplate(template, vars);
    if (env.MAIL_DRIVER === "smtp") {
      await sendSmtp(to, subject, html);
      console.log(`[mail:sent] To ${to}: ${subject}`);
    } else {
      console.log(`[mail:simulated] To ${to}: ${subject}`);
    }
  } catch (err) {
    console.error(`[mail:error] To ${to}: ${subject} —`, (err as Error).message);
  }
}

async function sendSmtp(to: string, subject: string, html: string): Promise<void> {
  // Optional dependency: resolved only when MAIL_DRIVER=smtp so the default
  // build needs no nodemailer. The variable specifier keeps tsc from requiring
  // its types when the package isn't installed.
  const moduleName = "nodemailer";
  const mod: any = await import(moduleName);
  const nodemailer = mod.default ?? mod; // CJS/ESM interop
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

/**
 * Typed helpers — one per lifecycle event. Centralizes copy so call sites stay
 * one line and subjects/templates never drift. All fire-and-forget.
 */
export const mailer = {
  verifyAccount: (to: string, name: string, link: string) =>
    sendMail(to, "Verify your P2P Market account", "verify-account", { name, link }),

  forgotPassword: (to: string, name: string, link: string) =>
    sendMail(to, "Reset your P2P Market password", "forgot-password", { name, link }),

  loginAlert: (to: string, name: string, when: string, ip: string) =>
    sendMail(to, "New sign-in to your account", "login", { name, when, ip }),

  newOrder: (to: string, sellerName: string, title: string, amount: string, code: string) =>
    sendMail(to, `New order: ${title}`, "new-order", { name: sellerName, title, amount, code }),

  fundsRelease: (to: string, sellerName: string, title: string, payout: string, code: string) =>
    sendMail(to, `Payout released: ${title}`, "funds-release", { name: sellerName, title, payout, code }),

  disputeCreated: (to: string, name: string, title: string, code: string) =>
    sendMail(to, `Dispute opened: ${title}`, "dispute-created", { name, title, code }),

  disputeResolved: (to: string, name: string, title: string, outcome: string, code: string) =>
    sendMail(to, `Dispute resolved: ${title}`, "dispute-resolved", { name, title, outcome, code }),

  withdrawal: (to: string, name: string, amount: string, destination: string) =>
    sendMail(to, "Withdrawal processed", "withdrawal", { name, amount, destination }),
};
