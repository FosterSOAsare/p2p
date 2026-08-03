import type { Server, Socket } from "socket.io";

/**
 * The Socket.IO singleton and its room vocabulary.
 *
 * Deliberately a leaf module — it imports nothing from features, so services
 * (messages, escrows, admin) can emit without creating an import cycle with the
 * gateway that consumes them. realtime.ts is what wires the two together.
 */

export interface SocketData {
  userId: string;
  username: string;
  /** The convo room this socket currently has open, if any (see the gateway). */
  openConversationId?: string;
}

export type AppServer = Server<any, any, any, SocketData>;
export type AppSocket = Socket<any, any, any, SocketData>;

let io: AppServer | null = null;

/** Identity-scoped: every socket of one user, on every device. Notifications. */
export const userRoom = (userId: string) => `user:${userId}`;
/** View-scoped: the sockets with this thread on screen. Messages, ticks, typing. */
export const conversationRoom = (conversationId: string) => `convo:${conversationId}`;

export function setIo(server: AppServer) {
  io = server;
}

export function getIo(): AppServer | null {
  return io;
}

/**
 * Emits are best-effort by design: seed scripts, tests and any future worker
 * process run the services with no socket server attached, and must not crash
 * because nobody is listening. The DB write already happened — that's the
 * source of truth; the emit is only the live delivery.
 */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(conversationRoom(conversationId)).emit(event, payload);
}
