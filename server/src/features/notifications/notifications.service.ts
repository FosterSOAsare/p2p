import { prisma } from "../../shared/lib/prisma";
import { emitToUser } from "../../shared/realtime/io";
import type { NotificationCategory } from "../../generated/prisma/client";

/**
 * In-app notifications.
 *
 * Broadcast-only by design: a notification has no sender and no reply path. It
 * exists so platform-originated events (a takedown, a ruling, a payout) reach a
 * user without being posted into a 1:1 Conversation — which is dispute evidence
 * and shouldn't carry unrelated moderation traffic.
 *
 * Delivery is REST + socket: the row is the source of truth and the `notify:new`
 * emit is only the live nudge, exactly as messages work.
 */

export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotifyInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Client route the row opens, e.g. `/deals/<id>`. */
  link?: string | null;
}

const select = {
  id: true,
  category: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} as const;

function toDto(n: {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: n.id,
    category: n.category,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

/**
 * Create and deliver one notification.
 *
 * Never throws. A notification is always secondary to the action that produced
 * it — a takedown, a payout, a ruling must not fail because this insert did.
 * Same best-effort contract the socket emits already carry (see io.ts), except
 * here the failure is logged rather than silently dropped.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const created = await prisma.notification.create({
      data: {
        userId: input.userId,
        category: input.category,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
      select,
    });
    emitToUser(input.userId, "notify:new", toDto(created));
  } catch (err) {
    console.error("[notifications] failed to notify", input.userId, input.category, err);
  }
}

/** Same notice to several users (both sides of a deal). Each one is independent. */
export async function notifyMany(userIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })));
}

/**
 * Fan a queue item out to every admin.
 *
 * Deliberately everyone rather than one owner: a review queue must not stall
 * because the one admin who touched it is away. At a larger admin headcount
 * this wants claiming/assignment instead — see the audit-log work.
 */
export async function notifyAdmins(input: Omit<NotifyInput, "userId">): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { id: true },
    });
    await notifyMany(
      admins.map((a) => a.id),
      input,
    );
  } catch (err) {
    console.error("[notifications] failed to notify admins", input.category, err);
  }
}

export interface NotificationPage {
  notifications: NotificationDto[];
  /** Unread across *all* pages — the badge, so it never needs a second request. */
  unread: number;
  page: number;
  pages: number;
  total: number;
}

export async function list(
  userId: string,
  opts: { page: number; limit: number },
): Promise<NotificationPage> {
  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
      select,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    notifications: rows.map(toDto),
    unread,
    page: opts.page,
    pages: Math.max(1, Math.ceil(total / opts.limit)),
    total,
  };
}

/**
 * Mark one as read. Scoped by userId in the WHERE rather than fetched-then-
 * checked, so another user's id simply matches nothing — no 404 probe, and no
 * separate ownership query.
 */
export async function markRead(userId: string, id: string): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count > 0) emitToUser(userId, "notify:read", { id });
  return count;
}

export async function markAllRead(userId: string): Promise<number> {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  // Emitted even at count 0 so a second device clears its badge regardless.
  emitToUser(userId, "notify:read", { all: true });
  return count;
}
