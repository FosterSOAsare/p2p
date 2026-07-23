import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import type { Prisma, User } from "../../generated/prisma/client";

/** One conversation per user pair — normalize so userAId < userBId. */
function pairKey(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

const counterpartySelect = {
  id: true,
  username: true,
  avatarUrl: true,
  kyc: { select: { status: true, storeName: true } },
} satisfies Prisma.UserSelect;

type Counterparty = Prisma.UserGetPayload<{ select: typeof counterpartySelect }>;

function publicCounterparty(user: Counterparty) {
  return {
    username: user.username,
    avatarUrl: user.avatarUrl,
    storeName: user.kyc?.status === "verified" ? user.kyc.storeName : null,
    verified: user.kyc?.status === "verified",
  };
}

async function resolveCounterparty(me: string, username: string): Promise<Counterparty> {
  const user = await prisma.user.findUnique({ where: { username }, select: counterpartySelect });
  if (!user) throw ApiError.notFound("User not found");
  if (user.id === me) throw ApiError.badRequest("You can't message yourself");
  return user;
}

/** All my conversations, most recent activity first, with unread counts. */
export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { updatedAt: "desc" },
    include: {
      userA: { select: counterpartySelect },
      userB: { select: counterpartySelect },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const unread = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadByConvo = new Map(unread.map((u) => [u.conversationId, u._count._all]));

  return conversations.map((c) => {
    const other = c.userAId === userId ? c.userB : c.userA;
    const last = c.messages[0];
    return {
      id: c.id,
      counterparty: publicCounterparty(other),
      lastMessage: last
        ? { body: last.body, mine: last.senderId === userId, createdAt: last.createdAt.toISOString() }
        : null,
      unreadCount: unreadByConvo.get(c.id) ?? 0,
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

/** The full thread with one user (empty if you've never talked). */
export async function getThread(userId: string, username: string) {
  const other = await resolveCounterparty(userId, username);
  const conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: pairKey(userId, other.id) },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return {
    counterparty: publicCounterparty(other),
    messages: (conversation?.messages ?? []).map((m) => ({
      id: m.id,
      body: m.body,
      mine: m.senderId === userId,
      escrowId: m.escrowId,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Send a message — creates the pair's conversation on first contact. */
export async function sendMessage(userId: string, username: string, body: string) {
  const other = await resolveCounterparty(userId, username);
  const key = pairKey(userId, other.id);

  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: key },
    create: key,
    update: { updatedAt: new Date() },
  });

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: userId, body },
  });

  return {
    id: message.id,
    body: message.body,
    mine: true,
    escrowId: message.escrowId,
    createdAt: message.createdAt.toISOString(),
  };
}

/** Mark everything the counterparty sent as read. */
export async function markRead(userId: string, username: string) {
  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!other) throw ApiError.notFound("User not found");
  const conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: pairKey(userId, other.id) },
  });
  if (!conversation) return;
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Posts a deal-linked system line into the pair's conversation — the escrow
 * module calls this on state transitions so all orders live in the one thread.
 */
export async function postDealMessage(fromUserId: string, toUserId: string, body: string, escrowId: string) {
  const key = pairKey(fromUserId, toUserId);
  const conversation = await prisma.conversation.upsert({
    where: { userAId_userBId: key },
    create: key,
    update: { updatedAt: new Date() },
  });
  await prisma.message.create({
    data: { conversationId: conversation.id, senderId: fromUserId, body, escrowId },
  });
}
