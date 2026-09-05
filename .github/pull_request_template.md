<!-- Thanks for contributing to VeriTrust. Keep PRs focused: one logical change. -->

## What & why

<!-- What does this PR change, and why? Link the flow in FLOWS.md if relevant. -->

Closes #

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behaviour change
- [ ] `chore` / `ci` — tooling, build, config
- [ ] `test` — tests

## Affected areas

- [ ] `server` (API)
- [ ] `web`
- [ ] `mobile`
- [ ] docs

## Checklist

- [ ] I branched from an up-to-date `main` and used a Conventional Commit style.
- [ ] `cd server && npx prisma generate && npm run typecheck` passes.
- [ ] `cd web && npm run build && npm run lint` passes.
- [ ] `cd mobile && npm run lint` passes (if mobile is touched).
- [ ] No secrets, `.env` files, or the `.neon` file are committed.
- [ ] If I changed the Prisma schema, I committed the migration and noted it below.

## Money / auth / escrow impact

<!-- REQUIRED if this touches auth, escrow transitions, the wallet/ledger, or disputes.
     Describe the effect on money movement or access control, and how you verified it.
     Delete this section if not applicable. -->

## How I tested

<!-- Steps, screenshots, or notes. -->
