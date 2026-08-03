import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { isAllowedOrigin } from "../config/cors";
import { prisma } from "../lib/prisma";
import { setIo, userRoom, type AppServer, type AppSocket } from "./io";
import { registerMessageHandlers } from "../../features/messages/messages.gateway";
import type { JwtPayload } from "../../features/auth/auth.model";

/**
 * Attaches Socket.IO to the existing HTTP server (same port as the REST API),
 * authenticates the handshake, and registers the feature gateways.
 */
export function initRealtime(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => cb(null, isAllowedOrigin(origin ?? undefined)),
      credentials: true,
    },
  });

  io.use(handshakeAuth);

  io.on("connection", (socket: AppSocket) => {
    // Joined for the life of the connection: this is how a user is reached when they aren't looking at the thread an event belongs to.
    socket.join(userRoom(socket.data.userId));

    // This  is what registers all conversations and message events for the socket. Each feature gateway is responsible
    registerMessageHandlers(socket);
  });

  setIo(io);
  return io;
}

/**
 * Same contract as shared/middleware/auth.middleware.ts — verify the access
 * token, then re-read the user so a suspended/deleted account can't keep a
 * live socket on a still-valid token. The token arrives in the handshake
 * payload rather than an Authorization header; on refresh the client
 * reconnects with the new one.
 */
async function handshakeAuth(socket: AppSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Authentication required"));

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      return next(new Error("Invalid or expired token"));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, status: true },
    });
    if (!user) return next(new Error("Account no longer exists"));
    if (user.status === "suspended") return next(new Error("Account suspended"));

    socket.data.userId = user.id;
    socket.data.username = user.username;
    next();
  } catch (err) {
    console.error("[socket] handshake failed:", err);
    next(new Error("Authentication failed"));
  }
}
