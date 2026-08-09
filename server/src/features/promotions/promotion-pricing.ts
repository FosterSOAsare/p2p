/**
 * What a spotlight costs. The server is the authority — the studio mirrors this
 * for a live preview the way Checkout mirrors the escrow fee, but every charge
 * is priced here from the plan and priority the client asked for, never from a
 * number the client sent.
 *
 * Pesewa integers throughout, same reason as money.ts: GH₵ 45 × 1.35 in floats
 * is 60.750000000000006, and that lands in a Decimal column.
 */

import { fromPesewas } from "../escrows/money";
import type { PromotionPlan } from "../../generated/prisma/client";

export interface PromotionPlanSpec {
  /** DB enum member. The wire/DB value is the mapped "7d" | "14d" | "30d". */
  plan: PromotionPlan;
  id: "7d" | "14d" | "30d";
  label: string;
  days: number;
  priceP: number;
  description: string;
}

export const PROMOTION_PLANS: readonly PromotionPlanSpec[] = [
  {
    plan: "d7",
    id: "7d",
    label: "7 days spotlight",
    days: 7,
    priceP: 2_500,
    description: "Short burst for fresh stock or a quick push.",
  },
  {
    plan: "d14",
    id: "14d",
    label: "14 days spotlight",
    days: 14,
    priceP: 4_500,
    description: "Best balance for steady traffic and visibility.",
  },
  {
    plan: "d30",
    id: "30d",
    label: "30 days spotlight",
    days: 30,
    priceP: 7_900,
    description: "Longer placement for flagship listings.",
  },
] as const;

export const MAX_PRIORITY = 100;
/** The studio slider steps in fives; the server holds the same grid so a hand-rolled request can't buy an off-grid rank. */
export const PRIORITY_STEP = 5;

export function planSpec(plan: PromotionPlan): PromotionPlanSpec {
  const spec = PROMOTION_PLANS.find((p) => p.plan === plan);
  if (!spec) throw new Error(`Unknown promotion plan: ${plan}`);
  return spec;
}

/** Wire id ("14d") → DB enum member ("d14"). */
export function planFromId(id: string): PromotionPlan | null {
  return PROMOTION_PLANS.find((p) => p.id === id)?.plan ?? null;
}

/**
 * Cost in pesewas. Priority is a surcharge on the base, not a multiplier of it:
 * priority 0 pays the list price and priority 100 pays double. A flat multiply
 * would bill GH₵ 4,500 for a two-week spotlight.
 */
export function priceP(plan: PromotionPlan, priority: number): number {
  const base = planSpec(plan).priceP;
  const clamped = Math.min(MAX_PRIORITY, Math.max(0, priority));
  return Math.round(base * (1 + clamped / MAX_PRIORITY));
}

export function price(plan: PromotionPlan, priority: number): number {
  return fromPesewas(priceP(plan, priority));
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** A plan's full term in milliseconds. */
export function planMs(plan: PromotionPlan): number {
  return planSpec(plan).days * DAY_MS;
}

export function endDate(plan: PromotionPlan, from: Date): Date {
  return new Date(from.getTime() + planMs(plan));
}

/** The price list the studio renders, with the priority surcharge spelled out. */
export function priceList() {
  return PROMOTION_PLANS.map((p) => ({
    id: p.id,
    label: p.label,
    days: p.days,
    price: fromPesewas(p.priceP),
    description: p.description,
  }));
}
