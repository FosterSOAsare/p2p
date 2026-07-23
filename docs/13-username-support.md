# 13 — Username Support (change spec)

> Status: **approved** (2026-07-23) · Owner: **[BE]** teammate, **[FE]** integration follows
> Decision recorded in `TODO.md` §14b: the client's username model wins over the server's email-only identity.

## 13.1 Summary

The web client (Signup, Login, NewEscrow) is built around usernames; the API is email-only. Rather than adding a new column, we **promote the existing `UserProfile.handle`** — already `@unique` (`apps/api/prisma/schema.prisma:297`) and auto-generated at signup (`auth.service.ts:76-80`) — to a user-chosen username used for signup, login, and escrow counterparty invites.

No new table, no new unique index. Three touchpoints change: signup, login, escrow create.

## 13.2 Username rules

- Format: `^[a-z0-9_]{3,20}$` — lowercase letters, digits, underscore; 3–20 chars.
- Normalisation: Zod `.toLowerCase()` transform at the schema boundary (mirrors how emails are handled, `packages/shared/src/schemas/auth.ts:14`). All storage and lookups are lowercase — this gives case-insensitive uniqueness without `citext`.
- Reserved list (reject at validation): `admin`, `administrator`, `support`, `help`, `taas`, `escrow`, `payments`, `api`, `root`, `system`, `moderator`, `arbitrator`, `driver`, `official`, `security`. Keep as a shared constant so FE can pre-validate.
- Usernames are **public** (they already appear as `profile.handle` in listings, escrow parties, reviews). No PII may be enforced, but signup UI should warn against using real phone numbers/emails as handles.
- Immutable for v1 (no rename endpoint). Rename + 30-day cooldown is Phase 2.

## 13.3 Schema changes (shared Zod — `packages/shared/src/schemas/`)

### auth.ts

```ts
export const usernameSchema = z
  .string()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 chars: a–z, 0–9, underscore")
  .refine((u) => !RESERVED_USERNAMES.includes(u), "This username is reserved");

// signupSchema: add
username: usernameSchema,

// loginSchema: replace `email` with
identifier: z.string().min(3).max(255).toLowerCase(), // email OR username
```

`verifyEmailSchema`, `resendOtpSchema`, `requestPasswordResetSchema` stay **email-keyed** — those flows deliver to an inbox; username adds nothing but resolution complexity. FE keeps passing the email it captured at signup.

### escrow.ts

```ts
// createEscrowSchema: add alongside counterpartyEmail
counterpartyUsername: usernameSchema.optional(),
```

Add a `.refine` rejecting both fields set at once (XOR-or-neither).

## 13.4 API changes

### 1. Signup — `POST /api/auth/signup`

- Accept `username` from the DTO; **delete the auto-generation block** (`auth.service.ts:76-80`).
- Create profile with `handle: input.username` (`auth.service.ts:86`).
- On handle collision: the `user.create` throws Prisma `P2002` on the nested profile — catch and return `409 { message: "Username is taken" }`. Unlike email, this is **not** an enumeration concern: handles are public by design.
- Keep the existing email-exists behaviour exactly as-is (generic response, no enumeration).

### 2. Username availability — `GET /api/auth/username-available?u=` (new, `@Public()`)

- Returns `{ available: boolean }` after format/reserved validation.
- Throttle tightly (reuse the auth controller's 10 req/60s bucket) — it's a scrape surface even if not a privacy one.
- FE uses it for the live "✓ available" check on the signup form.

### 3. Login — `POST /api/auth/login`

- DTO field `email` → `identifier`.
- Resolution: `identifier.includes("@")` → current email lookup (`auth.service.ts:145`); otherwise `prisma.userProfile.findUnique({ where: { handle: identifier }, include: { user: true } })`.
- **Security invariants to preserve** (both paths):
  - Same generic `Invalid credentials` error whether the identifier misses, the password misses, or the account is locked.
  - Timing equalization must run the dummy argon2 verify on the username-miss path too, not just the email-miss path.
  - Lockout counters, CAPTCHA-after-5 (when built), and new-device alerts key off the resolved `userId` — unchanged.
- `2fa_required` / `verify_email` response branches unchanged.

### 4. Escrow create — `POST /api/escrow`

- Extend invite resolution (`escrow.service.ts:84-90`): if `counterpartyUsername` present, resolve via `userProfile.findUnique({ where: { handle } })` → `userId`; else fall back to the existing `counterpartyEmail` path.
- Preserve current semantics: unresolved invite → `invitedUserId = null` (escrow still created, shareable by code). Do **not** error on unknown username — same behaviour as unknown email today.
- Optional nicety: echo `counterpartyResolved: boolean` in the create response so FE can hint "no account with that username yet — share the link instead".

### 5. Untouched

`/refresh`, `/logout`, 2FA endpoints, phone, sessions, password change/reset, and every non-auth module. `GET /api/users/me` already returns `profile.handle` — FE reads the username from there.

## 13.5 Migration

Existing rows already have generated handles (`{namebase}{4 digits}`, lowercase by construction — `auth.service.ts:77`). One defensive migration:

```sql
-- normalise any legacy mixed-case handles (should be none)
UPDATE "UserProfile" SET handle = lower(handle) WHERE handle <> lower(handle);
-- collisions after lowering are impossible today (already unique+lowercase), but guard in the migration transaction anyway
```

Add a DB `CHECK (handle ~ '^[a-z0-9_]{3,20}$')`? **No** — legacy generated handles from 20-char name bases can be 24 chars (16 base + 4 digits… actually ≤20, but don't risk it). Validate at the Zod boundary only; existing users keep their generated handles until rename ships in Phase 2.

## 13.6 Tests ([QA])

- Signup: taken username → 409; reserved → 400; uppercase input stored lowercase; format edge cases (2 chars, 21 chars, hyphen, unicode).
- Login: by email ✓, by username ✓, by uppercase username ✓ (normalised), unknown username → generic error with equalized timing (assert dummy-hash branch runs).
- Escrow: invite by username resolves to same `invitedUserId` as invite by that user's email; unknown username → escrow created, `invitedUserId` null; both fields set → 400.
- Availability endpoint: throttled, format-validated, reserved names report unavailable.

## 13.7 Client impact (tracked in TODO §14b)

- Signup: wire `username` field + availability check; drop Google OAuth button (no server support, separate decision).
- Login: send `identifier` as-is (client already captures email-or-username).
- NewEscrow: rename field to `counterpartyUsername`; keep an email fallback input.
- Display: use `profile.handle` everywhere the mock `username` appears today.
