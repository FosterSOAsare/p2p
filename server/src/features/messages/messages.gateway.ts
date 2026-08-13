import type Joi from "joi";
import { ApiError } from "../../shared/lib/errors";
import { conversationRoom, type AppSocket } from "../../shared/realtime/io";
import * as messagesService from "./messages.service";
import * as validation from "./messages.validation";

/**
 * Socket handlers for 1:1 chat. The client talks to these instead of
 * /api/messages/* — the socket is the transport, Postgres is still the source
 * of truth (see messages.service.createMessage).
 */

type Ack = (response: unknown) => void;

/** Acks mirror the REST error shape so the client can share one error path. */
async function respond<T>(ack: unknown, work: () => Promise<T>) {
  const reply: Ack = typeof ack === "function" ? (ack as Ack) : () => {};
  try {
    reply({ ok: true, data: await work() });
  } catch (err) {
    const isApi = err instanceof ApiError;
    if (!isApi) console.error("[socket] handler failed:", err);
    reply({
      ok: false,
      error: {
        status: isApi ? err.status : 500,
        message: isApi ? err.message : "Something went wrong",
        details: isApi ? err.details : undefined,
      },
    });
  }
}

function parse<T>(schema: Joi.Schema, payload: unknown): T {
  const { value, error } = schema
    .prefs({ errors: { label: "key" }, abortEarly: false, stripUnknown: true })
    .validate(payload);
  if (error) {
    throw ApiError.badRequest(
      "Validation failed",
      error.details.map((d) => d.message),
    );
  }
  return value as T;
}

export function registerMessageHandlers(socket: AppSocket) {
  const userId = socket.data.userId;

  /** Open a thread: join its room, ack with history (or a gap-fill), mark read. */
  socket.on("conversation:open", (payload: unknown, ack: unknown) =>
    respond(ack, async () => {
      const input = parse<{ username: string; sinceId?: string }>(
        validation.socketConversationOpen,
        payload,
      );
      const thread = await messagesService.openConversation(userId, input.username, input.sinceId);

      // A socket views one thread at a time — leave the previous one so a user
      // navigating between chats doesn't accumulate rooms.
      const previous = socket.data.openConversationId;
      if (previous && previous !== thread.conversationId) socket.leave(conversationRoom(previous));

      // The room id comes from openConversation, which derived it from this
      // socket's own identity — the client never supplies a conversationId, so
      // there is no room here you could ask to join that isn't yours.
      socket.join(conversationRoom(thread.conversationId));
      socket.data.openConversationId = thread.conversationId;

      await messagesService.markRead(userId, input.username);
      return thread;
    }),
  );

  /** Older history, for a thread scrolled up past what the client holds. */
  socket.on("conversation:history", (payload: unknown, ack: unknown) =>
    respond(ack, async () => {
      const input = parse<{ username: string; beforeId: string }>(
        validation.socketConversationHistory,
        payload,
      );
      // No room join and no markRead here — this only reaches backwards through
      // a thread the client already has open.
      return messagesService.loadOlderMessages(userId, input.username, input.beforeId);
    }),
  );

  /** Closing/navigating away from a thread — stop receiving its live traffic. */
  socket.on("conversation:leave", () => {
    const open = socket.data.openConversationId;
    if (!open) return;
    socket.leave(conversationRoom(open));
    socket.data.openConversationId = undefined;
  });

  socket.on("message:send", (payload: unknown, ack: unknown) =>
    respond(ack, async () => {
      const input = parse<{ username: string; body?: string; attachment?: messagesService.Attachment }>(
        validation.socketMessageSend,
        payload,
      );
      // Persists and broadcasts; the ack returns the saved message so the
      // sender renders the server's copy rather than an optimistic guess.
      return messagesService.sendMessage(userId, input.username, {
        body: input.body,
        attachment: input.attachment ?? null,
      });
    }),
  );

  socket.on("message:read", (payload: unknown, ack: unknown) =>
    respond(ack, async () => {
      const input = parse<{ username: string }>(validation.socketMessageRead, payload);
      return messagesService.markRead(userId, input.username);
    }),
  );

  /** Ephemeral — never persisted, and scoped to the thread already open. */
  socket.on("typing", (payload: unknown) => {
    const open = socket.data.openConversationId;
    if (!open) return;

    let input: { isTyping: boolean };
    try {
      input = parse<{ isTyping: boolean }>(validation.socketTyping, payload);
    } catch {
      return; // no ack on this event — a malformed payload is simply ignored
    }

    socket.to(conversationRoom(open)).emit("typing", {
      conversationId: open,
      userId,
      username: socket.data.username,
      isTyping: input.isTyping,
    });
  });
}
