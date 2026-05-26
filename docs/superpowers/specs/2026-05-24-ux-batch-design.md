# UX Batch — Design

**Owner:** Jegan (non-coding founder; directs, Claude builds).
**Date drafted:** 2026-05-24. **Finalized:** 2026-05-26.

> ✅ **STATUS: FINALIZED.** Open question resolved (Part 3 — owner picked the
> single tap-to-expand card). Awaiting owner's final review of this file before
> handoff to `superpowers:writing-plans`.

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
- Risk: trivial. `e2e/visual-audit.spec.ts:156` is already titled
  `"NewGame — default (Classic + hot-seat)"` and takes screenshots — its
  baseline images may or may not currently show Classic depending on the
  default `settings.variant`. Implementation step: after the change, re-run
  `npx playwright test` and update the baseline if it shifts.

### Part 2 — Phone difficulty tiles fit + sideways scroll
Shared `src/ui/components/DifficultyCards.tsx` lays the 5 tiers out in a rigid
`gridTemplateColumns: repeat(5, 1fr)` grid, which cramps "Easygoing" etc. on a
~390px phone. Change to a **flex row** where each card has a comfortable
`min-width` (~96px) and `flex: 1 0 <minwidth>`, wrapped in a container with
`overflow-x: auto`.
- Big screens (the 720px form): 5 × ~96px < 720 → cards grow to fill, **no
  scrollbar, visually unchanged**.
- Phone (~358px usable): 5 cards keep min-width → **horizontal scroll**.
- One shared change, no new prop needed.
- Scroll affordance (optional, only if the natural overflow looks cliff-like on
  phone): a 16-px right-edge cream-to-transparent mask-image on the scroller,
  faded out when the user has scrolled to the right. Skip if it looks gimmicky;
  the cards already visibly clipping the rightmost tier is its own hint.
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
`src/ui/components/`). Full UI contract is in the **Decision** block below.
Summary: collapsed header reads `"Best · <#1 score>"`; tap expands a scrollable
top-10 list (rank · name · date · score). Self-managed expand state. It
**replaces** the two separate cards on the large screens and is **added** to
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

**✅ DECISION (2026-05-26):** Single tap-to-expand card on all 4 screens.
The new `BestScoresCard` **replaces both** the always-visible `PersonalBestCard` /
`BeePersonalBestCard` AND the separate collapsible `TumblerTopScoresCard` /
`BeeTopScoresCard` on the large screens, and is **added** to both phone screens.
Net result: all 4 playing screens render an identical compact header that
expands on tap to the device-wide top 10.

**Resulting UI contract for `BestScoresCard`:**
- **Collapsed (default):** one row — `"Best · <#1 score>"` + chevron-down. Tap
  (or Enter/Space) toggles. If `entries.length === 0`, show `"Best · —"` and
  disable the toggle (no list to reveal).
- **Expanded:** the same header (chevron-up) + a vertically scrollable list of
  up to 10 entries: `rank · name · date · score`. Rows whose `name` matches the
  current player's name (case-insensitive trim) get a highlighted background.
- **Optional "new high — up X" sub-label** (small text under the header) when
  the caller passes `liveScore > entries[0]?.score`. Caller-driven; the card
  doesn't read game state itself.
- **Props (proposed):**
  ```ts
  interface BestScoresCardProps {
    readonly entries: ReadonlyArray<{ name: string; score: number; dateLabel: string }>;
    readonly currentPlayerName?: string;   // for row highlight
    readonly liveScore?: number;           // for "new high — up X" sub
    readonly emptyLabel?: string;          // default "Best · —"
  }
  ```
- **State:** self-managed `useState<boolean>` for expand/collapse. No props
  needed to control it externally.
- **Styling:** matches the existing card aesthetic (cream paper, `tokens.radius.card`,
  `tokens.shadow.card`). Compact on phone, same component on large screens.
- **Adapters per screen:** each screen normalizes its source data into the
  `{ name, score, dateLabel }` shape:
  - Tumbler → `getTumblerLeaderboard()` mapped with `timestamp → dd/MM/yyyy`.
  - Bee → `getBeeTopScores()` mapped with `dateKey (YYYY-MM-DD) → dd/MM/yyyy`.

### Part 4 — Tumbler END screen: one word list only
Files: `src/ui/screens/TumblerEndScreen.tsx`, `src/ui/phone/screens/PhoneTumblerEnd.tsx`.

Remove the **"Words you found"** `FoundList` from both. Keep only **"All possible
words"** (`src/ui/components/PossibleWordsCard.tsx`), which ALREADY tints +
✓-marks the words the player found and scrolls internally
(`gridTemplateColumns: repeat(auto-fill, minmax(104px,1fr))` at line 104,
`overflow-y:auto`). Freed of the competing list it fills the full height, so
90+ words stop looking cramped.
- Chip target tweak: bump `minmax(104px,1fr) → minmax(116px,1fr)` and gap from
  current value by ~2px. Final numbers locked at implementation time via a
  Preview-MCP check against a long-list scenario (90+ words). If the bump makes
  the laptop layout overflow horizontally, revert and document.
- Large: right column becomes just `PossibleWordsCard` (full height). Left column
  (score, CompareBar, Top scores, actions) unchanged. Note: the "Top scores"
  card in this left column is the **end-screen** top-scores card and is
  **out of scope** for Part 3 (which targets the **in-game playing** screens).
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
