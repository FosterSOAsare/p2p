import { prisma } from "../../shared/lib/prisma";
import { ApiError } from "../../shared/lib/errors";
import { emitToConversation, emitToUser } from "../../shared/realtime/io";
import type { MessageType, Prisma } from "../../generated/prisma/client";

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

// ---------- Wire shapes ----------

/** Cloudinary metadata for a `file` message — the bytes went over HTTP, not the socket. */
export interface Attachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

/**
 * The one message shape sent over the socket. Note there is no `mine` flag:
 * a single payload is broadcast to both parties, so the client derives it by
 * comparing senderId against the signed-in user.
 */
export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  type: MessageType;
  body: string;
  attachment: Attachment | null;
  escrowId: string | null;
  readAt: string | null;
  createdAt: string;
}

const withSender = { sender: { select: { id: true, username: true } } } satisfies Prisma.MessageInclude;
type MessageWithSender = Prisma.MessageGetPayload<{ include: typeof withSender }>;

function toMessageDto(m: MessageWithSender): MessageDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderUsername: m.sender.username,
    type: m.type,
    body: m.body,
    attachment: m.attachmentUrl
      ? {
          url: m.attachmentUrl,
          name: m.attachmentName ?? "attachment",
          mime: m.attachmentMime ?? "application/octet-stream",
          size: m.attachmentSize ?? 0,
        }
      : null,
    escrowId: m.escrowId,
    readAt: m.readAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

// ---------- Core write path ----------

/**
 * The pair's conversation, created on first open or first send. Ordering
 * timestamps are bumped only when a message is actually sent (see createMessage),
 * so merely opening an empty thread doesn't jump it to the top of the inbox.
 */
async function ensureConversation(a: string, b: string): Promise<string> {
  const key = pairKey(a, b);
  const existing = await prisma.conversation.findUnique({
    where: { userAId_userBId: key },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.conversation.create({ data: key, select: { id: true } });
    return created.id;
  } catch {
    // Both parties opened the thread at the same instant — the loser of the
    // unique-constraint race just re-reads the row the winner created.
    const found = await prisma.conversation.findUniqueOrThrow({
      where: { userAId_userBId: key },
      select: { id: true },
    });
    return found.id;
  }
}

interface CreateMessageInput {
  senderId: string;
  recipientId: string;
  body: string;
  type?: MessageType;
  attachment?: Attachment | null;
  escrowId?: string | null;
}

/**
 * The single write path for every message — typed chat, file cards and escrow
 * system notices all land here.
 *
 * Persist first, then emit: a party who is offline when the event fires still
 * sees it on their next conversation:open (it's in the DB), and a party who is
 * online sees it appear with no reload.
 */
async function createMessage(input: CreateMessageInput): Promise<MessageDto> {
  const conversationId = await ensureConversation(input.senderId, input.recipientId);

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: input.senderId,
      type: input.type ?? "text",
      body: input.body,
      attachmentUrl: input.attachment?.url ?? null,
      attachmentName: input.attachment?.name ?? null,
      attachmentMime: input.attachment?.mime ?? null,
      attachmentSize: input.attachment?.size ?? null,
      escrowId: input.escrowId ?? null,
    },
    include: withSender,
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

  const dto = toMessageDto(message);

  // View-scoped: whoever has this thread on screen renders it immediately.
  emitToConversation(conversationId, "message:new", dto);
  // Identity-scoped: unread bump for anyone not currently in the thread. Sent to
  // the sender too, so their *other* devices update the thread list rather than
  // sitting on a stale preview and unread count.
  emitToUser(input.recipientId, "notify:message", dto);
  emitToUser(input.senderId, "notify:message", dto);

  return dto;
}

// ---------- Socket-facing operations ----------

export interface OpenConversationResult {
  conversationId: string;
  counterparty: ReturnType<typeof publicCounterparty>;
  messages: MessageDto[];
  /**
   * True when `messages` is a gap-fill to append to what the client already
   * holds. False means a stale/unknown sinceId, so the client should replace
   * its list with this full history rather than appending to it.
   */
  incremental: boolean;
}

/**
 * Resolve (or create) the pair conversation and load its history — the socket
 * equivalent of `GET /api/messages/:username`.
 *
 * The caller identifies the thread by counterparty *username*, never by
 * conversationId, so the room a socket ends up joining is always derived from
 * its own authenticated identity. That's the authorization boundary: there is
 * no reachable conversation you aren't a member of.
 */
export async function openConversation(
  userId: string,
  username: string,
  sinceId?: string,
): Promise<OpenConversationResult> {
  const other = await resolveCounterparty(userId, username);
  const conversationId = await ensureConversation(userId, other.id);

  // Gap-fill after a reconnect: everything newer than the last message the
  // client holds. Resolved to a createdAt cursor so the read rides the existing
  // [conversationId, createdAt] index, and scoped to this conversation so an
  // id from another thread can't be used to probe it.
  let after: Date | undefined;
  if (sinceId) {
    const since = await prisma.message.findFirst({
      where: { id: sinceId, conversationId },
      select: { createdAt: true },
    });
    after = since?.createdAt;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    include: withSender,
  });

  return {
    conversationId,
    counterparty: publicCounterparty(other),
    messages: messages.map(toMessageDto),
    incremental: Boolean(after),
  };
}

export interface SendMessageInput {
  body?: string;
  attachment?: Attachment | null;
}

/** Send a text or file message — creates the pair's conversation on first contact. */
export async function sendMessage(
  userId: string,
  username: string,
  input: SendMessageInput,
): Promise<MessageDto> {
  const other = await resolveCounterparty(userId, username);

  const attachment = input.attachment ?? null;
  const body = input.body?.trim() ?? "";
  if (!attachment && !body) throw ApiError.badRequest("Message cannot be empty");

  return createMessage({
    senderId: userId,
    recipientId: other.id,
    // For a file message the body is an optional caption; the client renders
    // the card from `attachment`.
    body,
    type: attachment ? "file" : "text",
    attachment,
  });
}

/** Mark everything the counterparty sent as read, and flip their ticks live. */
export async function markRead(userId: string, username: string): Promise<{ count: number }> {
  const other = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!other) throw ApiError.notFound("User not found");
  const conversation = await prisma.conversation.findUnique({
    where: { userAId_userBId: pairKey(userId, other.id) },
    select: { id: true },
  });
  if (!conversation) return { count: 0 };

  const readAt = new Date();
  const { count } = await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null },
    data: { readAt },
  });

  if (count > 0) {
    const payload = {
      conversationId: conversation.id,
      readerId: userId,
      readAt: readAt.toISOString(),
      count,
    };
    // The sender's open thread flips its ticks.
    emitToConversation(conversation.id, "message:read", payload);
    // ...and the reader's *other* devices drop the unread badge, which they'd
    // otherwise keep showing (they aren't in the convo room).
    emitToUser(userId, "message:read", payload);
  }

  return { count };
}

/**
 * Posts a deal-linked system line into the pair's conversation — the escrow and
 * admin modules call this on every state transition, so all orders live in the
 * one thread and the dispute evidence transcript populates itself.
 *
 * Goes through createMessage, so the notice is persisted *and* pushed live to
 * both parties in the same step.
 */
export async function postDealMessage(fromUserId: string, toUserId: string, body: string, escrowId: string) {
  await createMessage({
    senderId: fromUserId,
    recipientId: toUserId,
    body,
    type: "system",
    escrowId,
  });
}

// ---------- REST (legacy; the web client now uses the socket) ----------

/** All my conversations, most recent activity first, with unread counts. */
export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    // `messages: { some: {} }` hides pair rows created by merely opening an
    // empty thread — they have nothing to show until someone actually writes.
    where: { OR: [{ userAId: userId }, { userBId: userId }], messages: { some: {} } },
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
        ? {
            body: last.body,
            // Lets the list preview a file/system line instead of rendering an
            // empty body (a file message's body is just an optional caption).
            type: last.type,
            mine: last.senderId === userId,
            createdAt: last.createdAt.toISOString(),
          }
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
    include: { messages: { orderBy: { createdAt: "asc" }, include: withSender } },
  });

  return {
    counterparty: publicCounterparty(other),
    messages: (conversation?.messages ?? []).map((m) => ({
      ...toMessageDto(m),
      mine: m.senderId === userId,
    })),
  };
}
