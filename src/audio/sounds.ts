/**
 * Tiny Web Audio synth for in-app feedback sounds. No external sample files,
 * no bundle bloat — each sound is generated on-the-fly from oscillators with
 * short ADSR envelopes. The total cost is a few hundred bytes of code.
 *
 * Five sound categories — each with several presets the user can pick from
 * in the in-app Sound settings modal:
 *   - uiTap   : the quiet "tick" on most buttons
 *   - place   : warm thud when a tile lands on a board cell
 *   - recall  : reverse-thud when a tile lifts off the board
 *   - success : valid-word arpeggio
 *   - error   : invalid / duplicate-word cue
 *
 * Lifecycle: the AudioContext is created lazily on first play call. Some
 * browsers (iOS Safari especially) block context creation until the first
 * user gesture; that's fine — every place this is called from IS a user
 * gesture (drag-drop, tap, submit). All errors are swallowed: sound is a
 * nice-to-have, never a blocker.
 *
 * Volume model: each sound has a per-key master multiplier (0 → silent,
 * 1 → default, up to 1.5 → boosted). Final per-tone gain is capped at 0.9
 * to keep aggressive presets from clipping.
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      // Safari still ships the webkit-prefixed constructor on some builds.
      type CtxCtor = typeof AudioContext;
      const Ctor: CtxCtor | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: CtxCtor }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // CRITICAL: AudioContext often starts (or becomes) "suspended" — iOS Safari
  // does this by default; Chrome may do it after a tab is backgrounded. If
  // we don't resume it, every play* call silently runs through a muted
  // graph and the user hears nothing. Resume is a no-op when already
  // running, so calling it on every getCtx() is cheap and bulletproof.
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
  return ctx;
}

/**
 * Schedule one ADSR-shaped oscillator note. Returns nothing — fire and
 * forget. The `gainPeak` multiplier is clamped to 0.9 so very loud presets
 * combined with the user's max-volume setting don't push past the
 * clipping threshold.
 */
function tone(
  ac: AudioContext,
  options: {
    readonly freq: number;
    readonly type?: OscillatorType;
    readonly startOffset?: number;
    readonly duration?: number;
    readonly gainPeak?: number;
    readonly attack?: number;
  },
): void {
  const {
    freq,
    type = "sine",
    startOffset = 0,
    duration = 0.18,
    gainPeak = 0.2,
    attack = 0.005,
  } = options;
  const peak = Math.max(0.0001, Math.min(0.9, gainPeak));
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// ─── Preset catalogue ──────────────────────────────────────────────

/** The five sound categories the app fires. */
export type SoundKey = "uiTap" | "place" | "recall" | "success" | "error";

/** Implementation: schedule oscillator(s) on the given AudioContext, scaled
    by the per-sound master volume. */
type PresetImpl = (ac: AudioContext, master: number) => void;

export interface PresetMeta {
  /** Stable ID — persisted to IndexedDB. Never rename without a migration. */
  readonly id: string;
  /** UI label shown in the Sound settings picker. */
  readonly label: string;
  /** Short description shown under the label. */
  readonly description: string;
  readonly impl: PresetImpl;
}

/** Four presets per sound — see {@link PresetMeta}. */
export const PRESETS: Record<SoundKey, ReadonlyArray<PresetMeta>> = {
  uiTap: [
    {
      id: "tick",
      label: "Tick",
      description: "Quick high sine — the original",
      impl: (ac, m) =>
        tone(ac, { freq: 720, type: "sine", duration: 0.06, gainPeak: 0.12 * m }),
    },
    {
      id: "pop",
      label: "Pop",
      description: "Punchy mid triangle",
      impl: (ac, m) =>
        tone(ac, { freq: 440, type: "triangle", duration: 0.05, gainPeak: 0.18 * m }),
    },
    {
      id: "chime",
      label: "Chime",
      description: "Bell-bright sine",
      impl: (ac, m) =>
        tone(ac, { freq: 1500, type: "sine", duration: 0.12, gainPeak: 0.1 * m }),
    },
    {
      id: "soft",
      label: "Soft",
      description: "Warm low confirm",
      impl: (ac, m) =>
        tone(ac, { freq: 280, type: "sine", duration: 0.1, gainPeak: 0.14 * m }),
    },
  ],

  place: [
    {
      id: "thud",
      label: "Thud",
      description: "Two-layer warm bass — the original",
      impl: (ac, m) => {
        tone(ac, { freq: 180, type: "sine", duration: 0.08, gainPeak: 0.45 * m });
        tone(ac, { freq: 80, type: "sine", duration: 0.12, gainPeak: 0.36 * m });
      },
    },
    {
      id: "wood",
      label: "Wood",
      description: "Single low triangle — wood-block feel",
      impl: (ac, m) =>
        tone(ac, { freq: 140, type: "triangle", duration: 0.1, gainPeak: 0.4 * m }),
    },
    {
      id: "tap",
      label: "Tap",
      description: "Soft mid sine",
      impl: (ac, m) =>
        tone(ac, { freq: 280, type: "sine", duration: 0.06, gainPeak: 0.3 * m }),
    },
    {
      id: "click",
      label: "Click",
      description: "Crisp short square",
      impl: (ac, m) =>
        tone(ac, { freq: 600, type: "square", duration: 0.03, gainPeak: 0.18 * m }),
    },
  ],

  recall: [
    {
      id: "sweep",
      label: "Sweep",
      description: "Upward sweep — the original (subtle lift)",
      impl: (ac, m) => {
        // Per-tone defaults nudged up from 0.22/0.20 to 0.26/0.23 so recall
        // sits at roughly −11.7 / −12.8 dB instead of −13.2 / −14.0 dB —
        // still the quieter of the place/recall pair but closer in weight.
        tone(ac, { freq: 220, type: "sine", duration: 0.06, gainPeak: 0.26 * m });
        tone(ac, {
          freq: 360,
          type: "sine",
          startOffset: 0.04,
          duration: 0.08,
          gainPeak: 0.23 * m,
        });
      },
    },
    {
      id: "whoosh",
      label: "Whoosh",
      description: "Downward sweep — lifted away",
      impl: (ac, m) => {
        tone(ac, { freq: 400, type: "sine", duration: 0.07, gainPeak: 0.22 * m });
        tone(ac, {
          freq: 200,
          type: "sine",
          startOffset: 0.04,
          duration: 0.08,
          gainPeak: 0.2 * m,
        });
      },
    },
    {
      id: "lift",
      label: "Lift",
      description: "Two-tone perfect fifth",
      impl: (ac, m) => {
        tone(ac, { freq: 300, type: "triangle", duration: 0.07, gainPeak: 0.2 * m });
        tone(ac, {
          freq: 450,
          type: "triangle",
          startOffset: 0.07,
          duration: 0.09,
          gainPeak: 0.18 * m,
        });
      },
    },
    {
      id: "pop-back",
      label: "Pop back",
      description: "Single quick low tone",
      impl: (ac, m) =>
        tone(ac, { freq: 180, type: "sine", duration: 0.05, gainPeak: 0.28 * m }),
    },
  ],

  success: [
    {
      id: "arpeggio",
      label: "Arpeggio",
      description: "C5 → E5 → G5 — the original",
      impl: (ac, m) => {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) =>
          tone(ac, {
            freq,
            type: "triangle",
            startOffset: i * 0.08,
            duration: 0.22,
            gainPeak: 0.18 * m,
          }),
        );
      },
    },
    {
      id: "chord",
      label: "Chord",
      description: "C-major triad, played together",
      impl: (ac, m) => {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq) =>
          tone(ac, { freq, type: "triangle", duration: 0.35, gainPeak: 0.13 * m }),
        );
      },
    },
    {
      id: "ascend",
      label: "Ascend",
      description: "C5 → G5 ascending fifth",
      impl: (ac, m) => {
        tone(ac, { freq: 523.25, type: "triangle", duration: 0.16, gainPeak: 0.18 * m });
        tone(ac, {
          freq: 783.99,
          type: "triangle",
          startOffset: 0.12,
          duration: 0.26,
          gainPeak: 0.18 * m,
        });
      },
    },
    {
      id: "bell",
      label: "Bell",
      description: "Long G5 with E5 overtone — chime",
      impl: (ac, m) => {
        tone(ac, { freq: 783.99, type: "sine", duration: 0.4, gainPeak: 0.18 * m });
        tone(ac, { freq: 1567.98, type: "sine", duration: 0.35, gainPeak: 0.08 * m });
      },
    },
  ],

  error: [
    {
      id: "minor",
      label: "Minor third",
      description: "G4 → E♭4 — the original",
      impl: (ac, m) => {
        tone(ac, {
          freq: 392,
          type: "triangle",
          attack: 0.015,
          duration: 0.16,
          gainPeak: 0.18 * m,
        });
        tone(ac, {
          freq: 311,
          type: "triangle",
          startOffset: 0.11,
          attack: 0.015,
          duration: 0.26,
          gainPeak: 0.2 * m,
        });
      },
    },
    {
      id: "descend",
      label: "Descend",
      description: "G4 → D4 perfect fourth",
      impl: (ac, m) => {
        tone(ac, {
          freq: 392,
          type: "triangle",
          attack: 0.015,
          duration: 0.14,
          gainPeak: 0.18 * m,
        });
        tone(ac, {
          freq: 293.66,
          type: "triangle",
          startOffset: 0.1,
          attack: 0.015,
          duration: 0.24,
          gainPeak: 0.2 * m,
        });
      },
    },
    {
      id: "buzz",
      label: "Buzz",
      description: "Soft low sawtooth",
      impl: (ac, m) =>
        tone(ac, {
          freq: 200,
          type: "sawtooth",
          attack: 0.02,
          duration: 0.2,
          gainPeak: 0.12 * m,
        }),
    },
    {
      id: "low",
      label: "Low note",
      description: "Single muted C4",
      impl: (ac, m) =>
        tone(ac, {
          freq: 261.63,
          type: "triangle",
          attack: 0.02,
          duration: 0.24,
          gainPeak: 0.2 * m,
        }),
    },
  ],
};

// ─── Active config ─────────────────────────────────────────────────

export interface AudioConfig {
  readonly presets: Readonly<Record<SoundKey, string>>;
  readonly volumes: Readonly<Record<SoundKey, number>>;
}

/** Factory defaults — each key picks the first preset (the originals). */
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  presets: {
    uiTap: "tick",
    place: "thud",
    recall: "sweep",
    success: "arpeggio",
    error: "minor",
  },
  volumes: { uiTap: 1, place: 1, recall: 1, success: 1, error: 1 },
};

let activeConfig: AudioConfig = DEFAULT_AUDIO_CONFIG;

/** Replace the live audio config. Persisting is the caller's job. */
export function setAudioConfig(next: AudioConfig): void {
  activeConfig = {
    presets: { ...next.presets },
    volumes: { ...next.volumes },
  };
}

/** Get a snapshot of the live audio config. */
export function getAudioConfig(): AudioConfig {
  return {
    presets: { ...activeConfig.presets },
    volumes: { ...activeConfig.volumes },
  };
}

/** All sound keys in display order, for the Settings modal to iterate. */
export const SOUND_KEYS: ReadonlyArray<SoundKey> = [
  "uiTap",
  "place",
  "recall",
  "success",
  "error",
];

/** Friendly human labels for the Settings modal. */
export const SOUND_LABELS: Readonly<Record<SoundKey, string>> = {
  uiTap: "Button tap",
  place: "Tile place",
  recall: "Tile recall",
  success: "Word found",
  error: "Word invalid",
};

function play(key: SoundKey): void {
  const ac = getCtx();
  if (!ac) return;
  const master = Math.max(0, activeConfig.volumes[key] ?? 1);
  if (master === 0) return;
  const presetId = activeConfig.presets[key];
  const preset =
    PRESETS[key].find((p) => p.id === presetId) ?? PRESETS[key][0]!;
  preset.impl(ac, master);
}

/** Preview a specific preset/volume without changing the active config —
    used by the Settings modal so the user can try presets before committing. */
export function previewPreset(key: SoundKey, presetId: string, volume = 1): void {
  const ac = getCtx();
  if (!ac) return;
  const m = Math.max(0, volume);
  if (m === 0) return;
  const preset = PRESETS[key].find((p) => p.id === presetId) ?? PRESETS[key][0]!;
  preset.impl(ac, m);
}

/**
 * Soft warm thud — tile on board (Scrabble) / letter selected
 * (Tumbler, Bee). Active preset + master volume come from {@link activeConfig}.
 */
export const playPlace = (): void => play("place");

/** Soft brief tick on plain UI buttons (Button component fires this). */
export const playUiTap = (): void => play("uiTap");

/** Reverse-thud / sweep when a tile is pulled back to the rack. */
export const playRecall = (): void => play("recall");

/** Rising arpeggio on a valid submitted word. */
export const playSuccess = (): void => play("success");

/** Descending minor third when a submitted word fails validation. */
export const playError = (): void => play("error");

/** Test/escape hatch: globally disable audio (no-op the play* functions). */
export function setMuted(value: boolean): void {
  muted = value;
  if (muted && ctx) {
    void ctx.close().catch(() => undefined);
    ctx = null;
  }
}
