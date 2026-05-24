# UX Batch — Design (DRAFT — PENDING APPROVAL)

> ⚠️ **STATUS: DRAFT, NOT YET APPROVED.** This was captured mid-brainstorm
> before a context clear. Do NOT start implementing. Resume flow:
> 1. Confirm the **one open question** (bottom of "Part 3").
> 2. Make any edits the owner requests; get explicit design approval.
> 3. Re-run the brainstorming spec self-review, then ask the owner to review
>    this file.
> 4. Invoke `superpowers:writing-plans` → owner approves plan → execute
>    (TDD, conventional commits, push per CLAUDE.md).

**Owner:** Jegan (non-coding founder; directs, Claude builds).
**Date drafted:** 2026-05-24.

---

## Context — what shipped just before this (all on `main`, HEAD `f4387b0`)

These are DONE and live; this batch builds on top of them.

| Commit | What |
|---|---|
| `d7a75f8` | Resignation decides the winner, not score. Pure `getGameResult(state)` in `src/engine/game.ts` is the single source of truth (resign → non-resigner wins, never a tie; else highest score, equal = tie). Consumed by `GameEndScreen`, `PhoneGameEnd`, `ScoresScreen`, `PhoneScores`. See GOTCHAS "Post-launch (who won)". |
| `6d9be82` | Desktop resign e2e assertion in `e2e/visual-audit.spec.ts`. |
| `d8a6139` | Shared animated tile wordmark `src/ui/components/TileHero.tsx`; used by `HomeScreen` (tile 60) and `PhoneHome` (tile 36). |
| `f4387b0` | `LoadingScreen` scales on phone — now takes `tileSize`/`tileGap` props (default 66/6 = laptop/iPad unchanged); `PhoneApp` passes 36/4. |

Verified green at that point: typecheck 0 · 303 unit · engine-purity clean · 53 e2e.

---

## Scope — four independent UI changes

### Part 1 — Big-screen New Game default = Classic
`src/ui/screens/NewGameScreen.tsx` (~line 41) initialises the board variant from
`settings.variant` (last-picked). Change to a hardcoded default of **`"classic"`**,
mirroring how `PhoneNewGame.tsx` (line 38) hardcodes `"mini"`. Phone stays Mini.
All three boards remain selectable; only the initial selection changes.

- Files: `src/ui/screens/NewGameScreen.tsx`.
- Risk: trivial. Big-screen e2e (`visual-audit` NewGame) should still pass —
  but note it may assert "Classic + hot-seat" as default already; verify.

### Part 2 — Phone difficulty tiles fit + sideways scroll
Shared `src/ui/components/DifficultyCards.tsx` lays the 5 tiers out in a rigid
`gridTemplateColumns: repeat(5, 1fr)` grid, which cramps "Easygoing" etc. on a
~390px phone. Change to a **flex row** where each card has a comfortable
`min-width` (~96px) and `flex: 1 0 <minwidth>`, wrapped in a container with
`overflow-x: auto`.
- Big screens (the 720px form): 5 × ~96px < 720 → cards grow to fill, **no
  scrollbar, visually unchanged**.
- Phone (~358px usable): 5 cards keep min-width → **horizontal scroll**.
- One shared change, no new prop needed. Add a subtle scroll affordance if easy.
- Files: `src/ui/components/DifficultyCards.tsx` (shared by `NewGameScreen` +
  `PhoneNewGame`).

### Part 3 — Personal best → tap to expand top scores (all 4 playing screens)
**DECIDED with owner: scope = device-wide, top 10, showing `name · date · score`.**

Target screens (must be consistent large + phone):
`src/ui/screens/TumblerScreen.tsx`, `src/ui/screens/SpellingBeeScreen.tsx`,
`src/ui/phone/screens/PhoneTumbler.tsx`, `src/ui/phone/screens/PhoneSpellingBee.tsx`.

Current state:
- **Large Tumbler & Bee** ALREADY have an always-visible "Personal best" card
  (`PersonalBestCard` / `BeePersonalBestCard`) PLUS a *separate* collapsible
  "Top scores" card (`TumblerTopScoresCard` / `BeeTopScoresCard`) — both defined
  inline in those files.
- **Phone Tumbler** has neither (just `FoundList`).
- **Phone Bee** has a tiny non-expandable "Best" readout next to Score; no
  top-scores list (it loads `topScores` but never renders them).

Plan: build **one shared collapsible component** (proposed `BestScoresCard` in
`src/ui/components/`):
- Collapsed: clickable header "Personal best · N" (device-wide top score) + chevron.
- Expanded: scrollable top-10 list (rank · name · date · score), current user's
  rows highlighted; optional "new high — up X" sub when live score > best.
- Self-managed expand state (useState) for easy reuse.
- It **replaces** the two separate cards on the large screens and is **added** to
  the phone screens — so all four read identically.

Data already exists — this is UI-only (`src/storage/solo-storage.ts`):
- `getTumblerLeaderboard()` → `LeaderboardEntry[]` (name, score, timestamp), top 10.
- `getTumblerBest()` → number (device-wide).
- `getBeeTopScores(limit=10)` → `BeeTopEntry[]` (name, score, timestamp, dateKey).
- `getBeePersonalBest(name)` → number (per-user; **not used** under device-wide scope).
- Tumbler dates come from `timestamp` (→ dd/MM/yyyy); Bee dates from `dateKey`
  (YYYY-MM-DD → dd/MM/yyyy). The shared card should accept a normalized entry
  shape like `{ name, score, dateLabel }` so both games feed it.
- "Best" value under device-wide scope = the #1 entry's score (entries are sorted
  desc), so `entries[0]?.score`. (For Tumbler that equals `getTumblerBest()`.)

**⚠️ OPEN QUESTION — answer before building:**
Merge the large screens' always-visible "Personal best" card AND the separate
"Top scores" card into a *single tap-to-expand* card (recommended — matches the
owner's "click best to expand top scores" wording and makes all 4 screens
identical)? **OR** keep personal-best always-visible and only the top-scores
collapsible? → **Owner's answer: __________**

### Part 4 — Tumbler END screen: one word list only
Files: `src/ui/screens/TumblerEndScreen.tsx`, `src/ui/phone/screens/PhoneTumblerEnd.tsx`.

Remove the **"Words you found"** `FoundList` from both. Keep only **"All possible
words"** (`src/ui/components/PossibleWordsCard.tsx`), which ALREADY tints +
✓-marks the words the player found and scrolls internally
(`gridTemplateColumns: repeat(auto-fill, minmax(104px,1fr))`, `overflow-y:auto`).
Freed of the competing list it fills the full height, so 90+ words stop looking
cramped. Loosen chip spacing/min-width a touch for readability.
- Large: right column becomes just `PossibleWordsCard` (full height). Left column
  (score, CompareBar, Top scores, actions) unchanged.
- Phone: drop the `FoundList` block; let `PossibleWordsCard` take the height.
- No engine change — `PossibleWordsCard` already does highlight + scroll.

---

## Workflow + environment reminders (from CLAUDE.md / MEMORY)
- bun NOT on bash PATH → `npm run <script>`, `npx playwright test`.
- Gates: `npm run typecheck` (0), `npm run test` (303), `npm run lint:engine-purity`,
  `npx playwright test` (53). Engine is untouched here, so unit/purity won't move;
  the real gates are typecheck + e2e.
- Dev preview: Preview MCP, `.claude/launch.json` name `"dev"`, port 5173.
- e2e webServer is port 4173 with `reuseExistingServer:true` — if e2e shows stale
  output, kill 4173 (`powershell Get-NetTCPConnection -LocalPort 4173 ... Stop-Process`)
  so it rebuilds.
- `preview_screenshot` TIMES OUT on `position:fixed` full-viewport overlays (e.g.
  `LoadingScreen`) — verify those via `preview_eval` measurement, not screenshots.
- Commit + push to `main` without asking (Vercel deploys). Conventional commits
  ending with: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- TDD for any logic; one commit per logical chunk; this batch is UI-only so most
  verification is typecheck + e2e + Preview-MCP visual checks.
