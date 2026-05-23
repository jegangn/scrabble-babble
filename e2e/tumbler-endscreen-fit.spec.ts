import { test, expect, Page } from "@playwright/test";

/**
 * Regression: the Tumbler round-complete screen must FIT inside the design
 * canvas so it never clips on the iPad Air (fixed 1366x880 canvas + an
 * overflow-hidden shell that cannot scroll). A heavy round (many found
 * words) used to push the "Restart / Play again" buttons below the fold —
 * reachable by scrolling on the Pro, but permanently clipped on the Air.
 *
 * We fix the rack via Playwright's clock (the rack is seeded from
 * `Date.now()`), play a heavy round, fast-forward to the end screen, and
 * assert the action buttons stay within the viewport at BOTH sizes.
 *
 * Run: npx playwright test e2e/tumbler-endscreen-fit.spec.ts --reporter=list
 */

const HOME_URL = "/";

// Seed 11896 → rack AERONDT → forms 60+ of these (all valid CSW21 words).
// The Tumbler rack is seeded from `Date.now() & 0x7fffffff`, so we freeze the
// clock at a FUTURE timestamp whose low 31 bits equal the seed. `pauseAt` needs
// a target >= the real clock, hence the 900 * 2^31 offset (lands ~year 2031);
// `n & 0x7fffffff` ignores the high bits, leaving exactly the seed.
const TUMBLER_SEED = 11896;
const TUMBLER_TIME = 900 * 2 ** 31 + TUMBLER_SEED;
const SUBMIT_LIMIT = 61; // all AERONDT-formable words in the list

const SHORT_WORDS: ReadonlyArray<string> = [
  "AA","AB","AD","AE","AG","AH","AI","AL","AM","AN","AR","AS","AT","AW","AX","AY",
  "BA","BE","BI","BO","BY","DA","DE","DO","ED","EF","EH","EL","EM","EN","ER","ES",
  "ET","EX","FA","FE","GO","HA","HE","HI","HM","HO","ID","IF","IN","IS","IT","JO",
  "KA","KI","LA","LI","LO","MA","ME","MI","MM","MO","MU","MY","NA","NE","NO","NU",
  "OD","OE","OF","OH","OI","OM","ON","OP","OR","OS","OW","OX","OY","PA","PE","PI",
  "QI","RE","SH","SI","SO","TA","TI","TO","UH","UM","UN","UP","US","UT","WE","WO",
  "XI","XU","YA","YE","YO","ZA",
  "ACE","ACT","ADD","ADO","AGE","AID","AIM","AIR","ALE","ALL","AND","ANT","APE",
  "ARC","ARE","ARK","ARM","ART","ASH","ASK","ATE","AWE","AXE","BAD","BAG","BAN",
  "BAR","BAT","BAY","BED","BEE","BEG","BET","BID","BIG","BIN","BIT","BOA","BOG",
  "BOO","BOW","BOX","BOY","BRA","BUD","BUG","BUN","BUS","BUT","BUY","CAB","CAD",
  "CAN","CAP","CAR","CAT","COB","COD","COG","CON","COO","COP","COT","COW","COX",
  "COY","CRY","CUB","CUD","CUE","CUP","CUR","CUT","DAB","DAD","DAM","DAY","DEN",
  "DEW","DID","DIE","DIG","DIM","DIN","DIP","DOE","DOG","DON","DOT","DRY","DUB",
  "DUE","DUG","DUN","DUO","DYE","EAR","EAT","EBB","EEL","EGG","EGO","ELF","ELK",
  "ELM","END","EON","ERA","ERR","EVE","EWE","EYE","FAD","FAN","FAR","FAT","FAX",
  "FED","FEE","FEN","FEW","FIB","FIG","FIN","FIR","FIT","FIX","FLU","FLY","FOE",
  "FOG","FOR","FOX","FRY","FUN","FUR","GAB","GAG","GAL","GAP","GAS","GEL","GEM",
  "GET","GIG","GIN","GNU","GOB","GOD","GOO","GOT","GUM","GUN","GUT","GUY","GYM",
  "HAD","HAG","HAM","HAS","HAT","HAY","HEM","HEN","HER","HEW","HEX","HID","HIM",
  "HIP","HIT","HOE","HOG","HOP","HOT","HOW","HOY","HUB","HUE","HUG","HUM","HUT",
  "ICE","ICY","ILK","ILL","IMP","INK","INN","ION","IRE","IVY","JAB","JAG","JAM",
  "JAR","JAW","JAY","JET","JIG","JOB","JOG","JOT","JOY","JUG","JUT","KEG","KEN",
  "KEY","KID","KIN","KIT","LAB","LAD","LAG","LAP","LAW","LAX","LAY","LEA","LED",
  "LEG","LET","LID","LIE","LIP","LIT","LOB","LOG","LOO","LOP","LOT","LOW","LUG",
  "LYE","MAD","MAN","MAP","MAR","MAT","MAW","MAX","MAY","MEN","MET","MEW","MID",
  "MIX","MOB","MOD","MOM","MOO","MOP","MOW","MUD","MUG","MUM","NAB","NAG","NAP",
  "NAY","NET","NEW","NIB","NIL","NIP","NIT","NOD","NOR","NOT","NOW","NUB","NUN",
  "NUT","OAF","OAK","OAR","OAT","ODD","ODE","OFF","OFT","OHM","OIL","OLD","ONE",
  "OPT","ORB","ORE","OUR","OUT","OVA","OWE","OWL","OWN","PAD","PAL","PAN","PAP",
  "PAR","PAT","PAW","PAX","PAY","PEA","PEG","PEN","PEP","PER","PET","PEW","PIE",
  "PIG","PIN","PIP","PIT","PLY","POD","POI","POP","POT","POW","POX","PRO","PRY",
  "PUB","PUG","PUN","PUP","PUS","PUT","RAG","RAM","RAN","RAP","RAT","RAW","RAY",
  "RED","REF","REV","RIB","RID","RIG","RIM","RIP","ROB","ROD","ROE","ROT","ROW",
  "RUB","RUE","RUG","RUM","RUN","RUT","RYE","SAC","SAD","SAG","SAP","SAT","SAW",
  "SAX","SAY","SEA","SEE","SET","SEW","SEX","SHE","SHY","SIN","SIP","SIR","SIT",
  "SIX","SKI","SKY","SLY","SOB","SOD","SON","SOP","SOT","SOW","SOX","SOY","SPA",
  "SPY","STY","SUB","SUE","SUM","SUN","SUP","TAB","TAD","TAG","TAN","TAP","TAR",
  "TAU","TAX","TEA","TED","TEE","TEN","THE","THY","TIC","TIE","TIN","TIP","TOD",
  "TOE","TOG","TOM","TON","TOO","TOP","TOT","TOW","TOY","TRY","TUB","TUG","TUI",
  "TUN","TUT","TWO","UDO","UGH","UKE","ULU","UMP","URN","USE","VAN","VAT","VET",
  "VIA","VIE","VIM","VOW","WAD","WAG","WAN","WAR","WAS","WAX","WAY","WEB","WED",
  "WEE","WET","WHO","WHY","WIG","WIN","WIT","WOE","WOK","WON","WOO","WOW","WRY",
  "YAK","YAM","YAP","YAW","YEA","YEP","YES","YET","YEW","YIP","YOU","YOW","ZAG",
  "ZAP","ZED","ZIG","ZIP","ZIT","ZOO",
];

function multisetSubset(pool: string[], word: string): boolean {
  const counts = new Map<string, number>();
  for (const l of pool) counts.set(l, (counts.get(l) ?? 0) + 1);
  for (const ch of word) {
    const c = counts.get(ch) ?? 0;
    if (c === 0) return false;
    counts.set(ch, c - 1);
  }
  return true;
}

function indicesForWord(rack: string[], word: string): number[] {
  const used = new Set<number>();
  const out: number[] = [];
  for (const ch of word) {
    const idx = rack.findIndex((l, i) => l === ch && !used.has(i));
    if (idx < 0) return [];
    used.add(idx);
    out.push(idx);
  }
  return out;
}

async function readRack(page: Page): Promise<string[]> {
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  const rack: string[] = [];
  for (let i = 0; i < 7; i++) {
    const label = (await pills.nth(i).getAttribute("aria-label")) ?? "";
    rack.push(label.replace("Letter ", "").trim());
  }
  return rack;
}

async function freshHome(page: Page): Promise<void> {
  await page.goto(HOME_URL);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("scrabble-babble");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open("scrabble-babble", 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("in_progress")) db.createObjectStore("in_progress");
        if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id" });
        if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      };
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction("settings", "readwrite");
        tx.objectStore("settings").put({ key: "current_user", value: "Tester" });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Scrabble Babble/ })).toBeVisible({ timeout: 10_000 });
}

/** Play a Tumbler round on the fixed seed, submitting up to `limit` words,
 *  end it, return the submitted count. */
async function playRound(page: Page, limit = SUBMIT_LIMIT): Promise<number> {
  await page.getByRole("button", { name: /Tumbler/ }).click();
  const pills = page.getByRole("button", { name: /^Letter [A-Z]$/ });
  await expect(pills).toHaveCount(7);
  const rack = await readRack(page);

  const submit = page.getByRole("button", { name: /^Submit$/ });
  let submitted = 0;
  for (const w of SHORT_WORDS) {
    if (submitted >= limit) break;
    if (!multisetSubset(rack, w)) continue;
    const idx = indicesForWord(rack, w);
    if (idx.length !== w.length) continue;
    for (const i of idx) await pills.nth(i).click();
    await submit.click();
    submitted++;
  }

  await page.clock.fastForward(61_000);
  await expect(page.getByText(/Round complete/i)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(900); // let the "All possible words" shimmer resolve
  return submitted;
}

/** Height of the "Words you found" card (px). */
async function foundCardHeight(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll("*")).find(
      (el) => el.textContent?.trim() === "Words you found",
    ) as HTMLElement | undefined;
    if (!label) return -1;
    let card: HTMLElement | null = label;
    while (card && Math.round(parseFloat(getComputedStyle(card).borderTopLeftRadius)) !== 14) {
      card = card.parentElement;
    }
    return card ? Math.round(card.getBoundingClientRect().height) : -1;
  });
}

/** Count the rendered word pills in the "Words you found" card. */
async function foundWordCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll("*")).find(
      (el) => el.textContent?.trim() === "Words you found",
    ) as HTMLElement | undefined;
    if (!label) return 0;
    let card: HTMLElement | null = label;
    while (card && Math.round(parseFloat(getComputedStyle(card).borderTopLeftRadius)) !== 14) {
      card = card.parentElement;
    }
    if (!card) return 0;
    const grid = Array.from(card.querySelectorAll("div")).find(
      (d) => getComputedStyle(d).display === "grid",
    ) as HTMLElement | undefined;
    return grid ? grid.childElementCount : 0;
  });
}

async function assertActionsWithinViewport(page: Page, label: string): Promise<void> {
  const innerH = await page.evaluate(() => window.innerHeight);
  for (const name of [/^Restart$/, /Play again/]) {
    const btn = page.getByRole("button", { name });
    await expect(btn, `${label}: "${name}" must exist`).toBeVisible();
    const box = await btn.boundingBox();
    expect(box, `${label}: "${name}" needs a box`).not.toBeNull();
    // The button's bottom edge must sit within the viewport — no clip, no
    // off-screen scroll required. (CSS `zoom` makes boundingBox visual px.)
    expect(
      Math.round(box!.y + box!.height),
      `${label}: "${name}" bottom (${Math.round(box!.y + box!.height)}) must be <= viewport (${innerH})`,
    ).toBeLessThanOrEqual(innerH + 4);
  }
}

test.describe("Tumbler end-screen fits the canvas (no clip)", () => {
  test("Pro 1366x880 — heavy round keeps actions on-screen", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 880 }, hasTouch: false });
    const page = await context.newPage();
    test.setTimeout(90_000);
    await freshHome(page);
    await page.clock.install();
    await page.clock.pauseAt(TUMBLER_TIME);
    await playRound(page);

    expect(await foundWordCount(page)).toBeGreaterThanOrEqual(40);
    await assertActionsWithinViewport(page, "Pro");
    await context.close();
  });

  test("Air 1180x820 touch — heavy round keeps actions on-screen", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
    const page = await context.newPage();
    test.setTimeout(90_000);
    await freshHome(page);
    await page.clock.install();
    await page.clock.pauseAt(TUMBLER_TIME);
    await playRound(page);

    // FitToViewport must be active (the Air path we're protecting).
    const hasCanvas = await page.evaluate(() => !!document.querySelector("[data-fit-canvas]"));
    expect(hasCanvas, "FitToViewport canvas should be active on the Air").toBe(true);

    // The screen content must not exceed the 880px design canvas.
    const screenScrollH = await page.evaluate(() => {
      const canvas = document.querySelector("[data-fit-canvas]") as HTMLElement | null;
      const el = canvas?.firstElementChild as HTMLElement | null;
      return el ? el.scrollHeight : null;
    });
    expect(screenScrollH, "end-screen content must fit the 880px canvas").not.toBeNull();
    expect(screenScrollH!).toBeLessThanOrEqual(882);

    expect(await foundWordCount(page)).toBeGreaterThanOrEqual(40);
    await assertActionsWithinViewport(page, "Air");
    await context.close();
  });

  test("Air 1180x820 touch — small round stays compact (no empty found-list)", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
    const page = await context.newPage();
    test.setTimeout(90_000);
    await freshHome(page);
    await page.clock.install();
    await page.clock.pauseAt(TUMBLER_TIME);
    await playRound(page, 4); // only a few words found

    // With few words the found-list card must size to its content, not stretch
    // to fill the column (the empty-space regression). 4 words ≈ 2 rows.
    const cardH = await foundCardHeight(page);
    expect(cardH, "found-list card should exist").toBeGreaterThan(0);
    expect(cardH, `found-list card (${cardH}px) should be compact for ~4 words`).toBeLessThan(260);

    await assertActionsWithinViewport(page, "Air small");
    await context.close();
  });
});
