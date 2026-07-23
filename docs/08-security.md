# 08 — Security Design (target: OWASP ASVS Level 2)

## 8.1 Authentication & sessions

- Passwords: **argon2id** (memory 64 MB, iterations 3), zxcvbn strength gate, breach check against HIBP k-anonymity API, no composition rules beyond length ≥8 (NIST 800-63B).
- Sessions: 15-min JWT access token (in memory) + 30-day **rotating refresh token** in httpOnly/Secure/SameSite=Lax cookie; refresh reuse detection → revoke whole family + alert (token-theft canary).
- 2FA: TOTP primary, SMS fallback, 10 single-use backup codes (hashed at rest). **Required** for: withdrawals, credential-vault reveal, destination changes, admin login (mandatory).
- Step-up auth: sensitive actions re-prompt password/2FA if last auth > 10 min.
- Device management: fingerprint + UA + IP stored per session; "sessions" screen with revoke; new-device login → email alert with revoke link.
- Suspicious-login detection: impossible travel, new country, TOR/VPN exit list, credential-stuffing velocity → challenge (email OTP) or block + alert.

## 8.2 Authorization

- RBAC (user, driver, support, kyc_reviewer, arbitrator, admin) enforced by Nest guards + **object-level checks on every fetch** (escrow visible only to its parties/arbitrator — IDOR is the #1 marketplace vuln; UUIDs are not access control).
- Admin panel: separate route group, IP allowlist option, mandatory 2FA, every action audit-logged with reason field for overrides.

## 8.3 Data protection & encryption

- TLS 1.3 everywhere; HSTS.
- At rest: DB encryption (provider-level) + **field-level AES-256-GCM** via a key service for: credential vault, KYC doc metadata, phone numbers. Keys in provider KMS/secret manager, rotated; envelope encryption (per-record data keys).
- KYC/evidence files: private bucket, presigned GETs (60 s TTL), access logged, EXIF-stripped on upload except delivery-proof photos (where EXIF GPS/time is evidence — stored separately, verified server-side).
- PII minimization: public profiles never expose email/phone/legal name; logs scrub PII (pino redact paths).

## 8.4 API & application security

- Zod validation on every input (shared schemas = client/server parity); Prisma parameterization (SQLi); output encoding + React defaults + CSP (nonce-based, no unsafe-inline) for XSS; CSRF covered by SameSite cookies + custom-header requirement for state-changing calls.
- Rate limiting (Redis sliding window): global per-IP, tight buckets on login/OTP/withdraw/code-verify endpoints; OTP endpoints also per-account.
- Idempotency keys on all money POSTs; optimistic locking (`version` column) on escrow rows; DB row-locks inside transitions (no double-release even under race).
- Webhooks: signature verification (Paystack HMAC), replay protection (event-id dedupe + 5-min timestamp window).
- File uploads: type sniffing (magic bytes, not extension), size caps, image re-encode (kills polyglot payloads), AV scan hook (ClamAV container).
- Dependency hygiene: lockfiles, `pnpm audit` + Dependabot in CI; secrets never in repo (dotenv-vault / platform secrets).
- Security headers: CSP, X-Frame-Options DENY (except QR embed page), Referrer-Policy, Permissions-Policy.

## 8.5 Escrow-specific fraud controls

- Release requires: state = INSPECTION, actor = buyer, 2FA-fresh session for amounts > GH₵2,000.
- Social-engineering guard: chat scans for "pay outside / send to my MoMo directly" patterns → warning interstitial ("payments outside escrow are not protected").
- Arbitrator actions are dual-logged (audit + dispute record); partial-refund amounts require typed confirmation of the exact figure.
- Platform release key for TRON contract kept in KMS; contract has owner-only release/refund + emergency pause; Hardhat test suite covers reentrancy/overflow (report artifact).

## 8.6 Audit logging

`audit_logs`: append-only (no UPDATE/DELETE grants), actor, role, action, entity type/id, before/after JSONB, IP, UA, request id, timestamp. Admin UI is read-only with filters + export. Monthly hash-chain checkpoint (SHA-256 over the period) stored separately — cheap tamper-evidence, nice report section.

## 8.7 Ops security

- CI: lint, typecheck, tests, `semgrep` SAST, dependency audit — merge-blocking.
- Backups: daily Postgres snapshots + PITR (Neon built-in); restore drill documented.
- Incident runbook: freeze switches (global withdrawals-off, escrow-creation-off) in platform settings — one click in admin.
