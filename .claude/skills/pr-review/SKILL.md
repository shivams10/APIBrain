---
name: pr-review
description: Review a PR, branch, or diff in this repo (APIBrain engine) for correctness, security, and consistency with our Express/Prisma/auth conventions. Use when the user asks to review a PR, review a branch, or review code changes.
---

# PR Review — APIBrain

Review the diff against these repo-specific conventions, in addition to general
correctness/readability review. Reference concrete file/line evidence for every
finding — don't flag style preferences that aren't actually established here.

## 1. Format & consistency

Conventions already established in the codebase — flag deviation:

- **Error responses**: always `{ error: string }` JSON, with an early `return`
  immediately after `res.status(...).json(...)`. No inconsistent shapes
  (`{ message }`, bare strings, etc.). See `apps/engine/src/routes/auth.route.ts`.
- **Validation**: Zod schemas for all request bodies, using `safeParse` (never
  `parse`, which throws) with an explicit success check before touching `.data`.
- **Naming**: camelCase in TypeScript; snake_case DB columns via `@@map`/`@map`
  in Prisma; `id` fields are `String @id @default(uuid())`.
- **Layering**: routes → `lib/` (pure functions) → `prisma`. No business logic
  embedded directly in `index.ts`. No direct `prisma` calls from anywhere other
  than routes/services — not from arbitrary helpers.
- **Config over magic numbers**: TTLs, thresholds, and limits belong in
  `config/` or `constants/`, not hardcoded inline in routes.

## 2. Security checks (auth is the highest-risk surface currently)

- Cookies set with `httpOnly: true`, `secure` gated on
  `NODE_ENV === "production"`, and an explicit `sameSite`.
- Refresh tokens are stored only as a hash (never the raw token) and rotated
  on every use. Reuse of an already-rotated (revoked) refresh token must revoke
  *all* of that user's active sessions, not just the one token — this is the
  existing theft-detection behavior and must be preserved by any auth changes.
- Password hashing stays bcrypt with cost factor ≥ 12 — flag any PR that lowers
  it or swaps hashing schemes without discussion.
- Any new public-facing auth-adjacent route has rate limiting applied.
- Any new protected route is wrapped in `requireAuth`.
- No user-enumeration leaks: auth failure messages stay generic ("Invalid
  email or password"), never distinguishing "no such user" from "wrong password".
- `process.env.X!` non-null assertions are only acceptable for env vars
  guaranteed present at boot — flag new ones added without that guarantee.
- No secrets, tokens, or credentials hardcoded or logged.

## 3. Production-quality bar

- No dead code, unused imports/vars, leftover `console.log`/debug statements.
- No speculative abstractions or scope creep beyond what the PR claims to do.
- No unwanted/unrelated changes bundled into the diff.
- Proper typing — no unjustified `any`; exported functions have explicit
  return types, matching existing style (e.g. `lib/tokens.ts`).
- Error handling only where errors can actually occur — don't flag missing
  guards for states that can't arise, and don't add speculative ones either.

## 4. Architecture & scope alignment

Cross-check against `PROJECT_SPEC.md`:

- Flag anything that pulls in out-of-scope MVP work (§4): multi-agent
  orchestration beyond the single Debug Assistant, teams/roles/orgs,
  non-Node.js code generation targets, a pre-curated API catalog.
- Flag anything that jumps ahead of the intended build order (§7) — e.g.
  ingestion/RAG code landing in a way that assumes auth isn't solid yet, or
  skipping the Prisma → S3 → BullMQ pipeline shape once ingestion work starts.
- New Prisma models follow the existing shape: `uuid()` id, `createdAt` /
  `updatedAt` timestamps, `@@index` on foreign-key columns, `onDelete: Cascade`
  where child rows shouldn't outlive their parent.
- Any migration file matches the corresponding `schema.prisma` change exactly
  — no drift between the two.

## 5. When the PR's intent is unclear

Per `PROJECT_SPEC.md` §8 ("ask in any confusion, don't assume"): if a change's
purpose or correctness can't be determined from the diff, list it under an
**Open questions** section instead of guessing or silently approving/flagging it.

## Output format

Structure findings as:

1. **Blocking** — correctness bugs, security issues, broken conventions above.
2. **Non-blocking** — style/consistency nits, minor simplifications.
3. **Open questions** — anything requiring author clarification.

For each finding: file:line reference, what's wrong, why it matters, and (if
obvious) the fix.
