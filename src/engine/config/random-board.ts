import type { Prng } from "../prng.js";
import type { BoardConfig, PremiumType } from "../types.js";

/**
 * 15×15 randomized premium layout generator.
 *
 * Produces a fresh symmetric layout per call while preserving Classic's
 * counts (8 TW, 9 DW, 16 TL, 24 DL) and rotational symmetry.
 *
 * Algorithm: under (r,c) → (c, 14-r) the center (7,7) is the only fixed
 * point; every other cell lives in an orbit of size 4. The 224 non-center
 * cells form 56 four-orbits. We assign one orbit's worth of cells to each
 * "premium slot" so symmetry is invariant by construction.
 *
 * Cosmetic / play-balance constraints baked in:
 *   - Center is always DW (the starting star).
 *   - The corner orbit `{(0,0),(0,14),(14,14),(14,0)}` is pinned to TW so
 *     openings feel Classic-shaped.
 *   - TW orbits next to the center (orthogonal + diagonal neighbours) are
 *     ineligible — a 2-tile opener combining TW × DW would be over-powered.
 */

const SIZE = 15;
const CENTER = 7;

/** A set of 4 cell coordinates closed under (r,c) → (c, 14-r). */
type Orbit = ReadonlyArray<readonly [number, number]>;

/** Pre-compute the 56 four-orbits of the 15×15 grid (centre excluded). */
function computeOrbits(): Orbit[] {
  const seen = new Set<number>();
  const orbits: Orbit[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (r === CENTER && c === CENTER) continue;
      const key = r * SIZE + c;
      if (seen.has(key)) continue;
      // Walk the orbit.
      const cells: Array<readonly [number, number]> = [];
      let cr = r;
      let cc = c;
      for (let i = 0; i < 4; i++) {
        cells.push([cr, cc]);
        seen.add(cr * SIZE + cc);
        const nr = cc;
        const nc = SIZE - 1 - cr;
        cr = nr;
        cc = nc;
      }
      orbits.push(cells);
    }
  }
  return orbits;
}

const ORBITS: ReadonlyArray<Orbit> = computeOrbits();

function orbitContains(orbit: Orbit, r: number, c: number): boolean {
  return orbit.some(([or, oc]) => or === r && oc === c);
}

/** The corner orbit — always pinned to TW. */
const CORNER_ORBIT_INDEX = ORBITS.findIndex((o) => orbitContains(o, 0, 0));

/**
 * Orbits whose cells are orthogonally or diagonally adjacent to the centre.
 * A TW here lets a 2-tile opener exploit TW + DW for a 6× word multiplier,
 * so we forbid TW assignments to these orbits.
 */
const CENTER_ADJACENT_ORBIT_INDICES: ReadonlySet<number> = new Set([
  ORBITS.findIndex((o) => orbitContains(o, CENTER - 1, CENTER)), // orthogonal
  ORBITS.findIndex((o) => orbitContains(o, CENTER - 1, CENTER - 1)), // diagonal
]);

/**
 * Generate a fresh symmetric 15×15 board layout. Determined entirely by `prng`,
 * so tests can reproduce the same board by passing the same seeded PRNG.
 */
export function generateRandomBoard(prng: Prng): BoardConfig {
  // 1) Choose the second TW orbit (corner is already TW). Must not be adjacent to centre.
  const eligibleForTw = ORBITS.map((_, i) => i).filter(
    (i) => i !== CORNER_ORBIT_INDEX && !CENTER_ADJACENT_ORBIT_INDICES.has(i),
  );
  const shuffledTwPool = prng.shuffle(eligibleForTw);
  const secondTwOrbitIndex = shuffledTwPool[0]!;

  // 2) Pool of remaining orbits to fill DW (2), TL (4), DL (6) = 12 orbits.
  const used = new Set<number>([CORNER_ORBIT_INDEX, secondTwOrbitIndex]);
  const remaining = ORBITS.map((_, i) => i).filter((i) => !used.has(i));
  const shuffledRest = prng.shuffle(remaining);

  const orbitType = new Map<number, PremiumType>();
  orbitType.set(CORNER_ORBIT_INDEX, "TW");
  orbitType.set(secondTwOrbitIndex, "TW");
  let cursor = 0;
  for (let i = 0; i < 2; i++) orbitType.set(shuffledRest[cursor++]!, "DW");
  for (let i = 0; i < 4; i++) orbitType.set(shuffledRest[cursor++]!, "TL");
  for (let i = 0; i < 6; i++) orbitType.set(shuffledRest[cursor++]!, "DL");

  // 3) Stamp premiums onto a fresh grid.
  const premiums: PremiumType[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row: PremiumType[] = [];
    for (let c = 0; c < SIZE; c++) row.push("NONE");
    premiums.push(row);
  }
  for (let i = 0; i < ORBITS.length; i++) {
    const type = orbitType.get(i);
    if (!type) continue;
    for (const [r, c] of ORBITS[i]!) premiums[r]![c] = type;
  }
  premiums[CENTER]![CENTER] = "DW";

  return { size: SIZE, premiums };
}
