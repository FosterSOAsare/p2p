# Messaging — WebSocket Implementation Plan

Real-time 1:1 chat over **WebSockets (Socket.IO)**. Supersedes the earlier REST-polling plan — the client
will not call REST for messaging. Messages carry **text or files**, and **system notices** (deal started,
funded, delivered, released, disputed, resolved) are pushed **live** into the thread. Messages are still
**persisted to Postgres** — the socket is the transport, the DB is the source of truth (history survives,
offline users catch up, and the admin dispute evidence transcript keeps working).

Effort: **M** ≈ 2–3 days (infra + text + files + lifecycle notices + rewire).

## Decisions to confirm before building
1. **New deps**: `socket.io` (server) + `socket.io-client` (web). OK to add? (None are in `package.json` today.)
2. **History over the socket** (on joining a conversation) rather than a REST `GET` — honors "no APIs for
   messaging". The existing REST `/api/messages/*` endpoints stay mounted but unused (removable later).
3. **Schema migration** for typed + file messages (below). OK to migrate?
4. **File bytes still upload over HTTP** to Cloudinary (the existing `POST /api/upload/single`) — that's
   asset storage, not the messaging channel; only the resulting URL/metadata travels over the socket. (Streaming
   binaries over the socket is the wrong tool.) Confirm this split is fine.

---

## Architecture

### Server — Socket.IO on the existing HTTP server
- Attach `io` to the Node HTTP server in `src/index.ts` (share the port). Keep a single `io` singleton
  (`src/shared/realtime/io.ts`) so HTTP controllers (escrow transitions) can emit too.
- **Handshake auth**: client connects with the JWT **access token** in `socket.handshake.auth.token`.
  A socket middleware verifies it (same secret as the auth middleware) → attaches `socket.data.userId`.
  Reject the connection if missing/invalid. On token refresh the client reconnects with the new token.
- **Rooms**:
  - `user:<userId>` — every socket joins on connect. Used for cross-thread **notifications / unread bumps**
    even when the user isn't viewing that thread.
  - `convo:<conversationId>` — joined when a client opens a thread; left on close.

### Events
Client → server (with ack callbacks):
| Event | Payload | Server does |
| --- | --- | --- |
| `conversation:open` | `{ username, sinceId? }` | resolve/create the pair conversation, join `convo:<id>`, mark-read, **ack with history** (all messages, or those after `sinceId` for gap-fill) |
| `message:send` | `{ username, body?, attachment? }` | validate, **persist**, emit `message:new` to `convo:<id>` + `notify:message` to the recipient's `user:` room, ack the saved message |
| `message:read` | `{ username }` | mark counterparty's messages read, emit `message:read` to `convo:<id>` |
| `typing` | `{ username, isTyping }` | relay to `convo:<id>` (no persistence) |

Server → client:
| Event | Meaning |
| --- | --- |
| `message:new` | a new message (text \| file \| system) — append to the open thread |
| `message:read` | counterparty read up to now (update ticks) |
| `notify:message` | unread bump / toast for a thread you're not currently viewing |
| `typing` | show/hide the typing indicator |

### Message types + schema (migration)
`Message` today: `id, conversationId, senderId, body, escrowId?, readAt, createdAt`. Add:
- `enum MessageType { text file system }` + `type MessageType @default(text)`.
- `attachmentUrl String?`, `attachmentName String?`, `attachmentMime String?`, `attachmentSize Int?`.
- (system messages: `type: system`, `escrowId` set, `body` = the notice text.)

This lets the client render three message shapes cleanly (a bubble, a file card, a centered system chip)
instead of sniffing URLs out of the body.

### File flow
1. Client uploads the file via `POST /api/upload/single` (HTTP multipart → Cloudinary) — one HTTP call, asset only.
2. Client emits `message:send { username, attachment: { url, name, mime, size } }` over the socket.
3. Server persists a `type: file` message and broadcasts `message:new`. Renderer shows an image inline or a
   download card for other types.

---

## System notices → live into the chat (the "how it's checked" hook)
The escrow service already calls **`postDealMessage()`** on every transition. The change: that helper (and the
admin ruling path) now **persist a `type: system` message *and* emit `message:new`** to the pair's
`convo:<id>` room + `notify:message` to both `user:` rooms. Because the escrow HTTP controllers run in the same
process as `io`, they emit through the shared singleton.

The lifecycle events that fire a notice (each is a checkpoint to verify):
- **Order placed** (checkout → escrow `funded`) — "New order placed"
- **Funded** (standalone `fund`) — "Escrow funded"
- **Delivered** (`deliver`) — "Marked as delivered" (+ carrier/tracking)
- **Released** (`release` → `disbursed`) — "Buyer released — funds paid out"
- **Dispute opened** (`dispute`) — "Dispute opened"
- **Dispute resolved** (admin `resolve`) — "⚖️ Official Admin Ruling: …"

Persist-then-emit means a party who's offline when the event fires still sees the notice on their next
`conversation:open` (it's in the DB), and a party who's online sees it appear instantly — no reload.

---

## Client
- **`web/src/features/messages/realtime/socket.ts`** — a singleton socket (connect with the access token,
  auto-reconnect, reconnect with a fresh token after a 401/refresh).
- **`useChat(username)`** hook — on mount emits `conversation:open` (loads history), subscribes to
  `message:new` / `message:read` / `typing`; exposes `messages`, `sendText`, `sendFile`, `markRead`,
  `setTyping`, `counterparty`, connection status.
- **Rewire `MessageThread.tsx`** — replace local state with `useChat`; render text / file / system distinctly;
  file button → upload → `sendFile`; typing indicator; mark-read on focus; scroll-to-bottom; drop the
  "local until WebSocket" note.
- **Guard** the "Message" entry points against messaging yourself.
- **P2**: unread badge on the deal "Message" button / header from `notify:message`; optional conversations
  inbox; deal-notice chips link to `/escrow/:escrowId`.

---

## How it will be checked (verification)
**Live chat**
- Two accounts in two browsers, both with the thread open → A sends text → appears on B **instantly, no reload**; reload B → still there (persisted).
- A sends a file (image) → thumbnail renders live for B and survives reload; a PDF → download card.
- Typing indicator shows/hides; read ticks flip when B opens the thread.

**System notices (the key check)**
- Both parties in the thread → run each transition through the app (deliver, release, open dispute, admin resolve) → the matching **system line appears live in both chats**, persists on reload, and shows up in the **admin dispute evidence transcript** for that deal (`getDispute` reads `escrow.messages`).
- Do the same with one party **offline** → the notice is not seen live, but is present on their next open (persist-then-emit).

**Auth & authorization**
- Connect with no/invalid token → rejected. Try `conversation:open` for a pair you're not part of → rejected.
- Token expires mid-session → client refreshes and reconnects; chat resumes.

**Reliability**
- Kill the network briefly → socket auto-reconnects → on rejoin, `conversation:open { sinceId }` gap-fills any messages missed while disconnected (no lost messages even though transport is live).

**Automated (optional)**
- A `socket.io-client` integration test: connect two authed sockets, assert `message:send` → the other receives `message:new`; trigger an escrow `release` over HTTP and assert both sockets receive the system `message:new`.

---

## Phases
- **P1 — infra + text**: `io` + handshake auth + rooms + `conversation:open` (history) + `message:send`/`message:new` + persist; client socket + `useChat` + rewire `MessageThread` for text. Reload-safe, live.
- **P2 — files + notices**: schema migration (type + attachment); file send/render; wire `postDealMessage` + admin ruling to emit; typing + read receipts.
- **P3 — scale/polish**: unread badges + inbox; Redis adapter if the server ever runs multi-instance; scam-pattern warning banner.

## Definition of done
Live 1:1 chat over WebSockets with text + files; deal lifecycle notices appear in the thread in real time and
persist; offline parties catch up on reconnect; admin dispute evidence populates automatically. Flips the
"deal messaging" ⚠️ items in `web/TODO.md` / `server/TODO.md` / `FLOWS.md §9` to done and retires the "Live/
realtime messaging via WebSocket" parked item.
