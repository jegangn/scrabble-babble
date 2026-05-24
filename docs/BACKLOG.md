# Backlog

Ideas noted during build but deferred. Each line tagged with the phase it could land in, or "post-launch".

- (post-launch) Long-press on placed tile → word definition popup. CSW21 ships definitions (currently stripped in `scripts/fetch-csw21.mjs`); retain a defs file to power this offline.
- (post-launch) Replay viewer: scrub through any saved game move-by-move using stored move list + seed.
- (post-launch) Per-player rack-leave heuristics tuning for AI Hard difficulty.
- (post-launch) Cloud sync via user-owned Google Drive folder (no server cost).
- (post-launch) Custom themed tile sets (visual reskin only).
- (post-launch) Spelling Bee score tiers ("Beginner / Good / Genius") derived from total possible score for the day — motivating but not essential.
- (post-launch) Tumbler "show missed words" on the end screen (list of words from `enumerateBeeWords`-style enumeration he could have found).
- (post-launch) Phone: pinch-zoom on the 15×15 board (tap-to-place suffices for now; Mini is the phone default, so cells are comfortable).
- (post-launch) Phone: a bespoke phone-landscape layout (landscape currently reuses the scaled-down desktop canvas).
- (post-launch) Phone: show the Tumbler personal-best on the in-game phone screen (dropped for portrait compactness; the end screen still shows best-vs-this-round).
