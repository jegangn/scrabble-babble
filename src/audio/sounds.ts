/**
 * Tiny Web Audio synth for in-app feedback sounds. No external sample files,
 * no bundle bloat — each sound is generated on-the-fly from oscillators with
 * short ADSR envelopes. The total cost is a few hundred bytes of code.
 *
 * Three sounds:
 *   - playPlace  : soft warm thud when a tile lands on a board cell
 *   - playSuccess: rising 3-note arpeggio for a valid word
 *   - playError  : descending 2-note buzz for an invalid word
 *
 * Lifecycle: the AudioContext is created lazily on first play call. Some
 * browsers (iOS Safari especially) block context creation until the first
 * user gesture; that's fine — every place this is called from IS a user
 * gesture (drag-drop, tap, submit). All errors are swallowed: sound is a
 * nice-to-have, never a blocker.
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (muted) return null;
  if (typeof window === "undefined") return null;
  try {
    // Safari still ships the webkit-prefixed constructor on some builds.
    type CtxCtor = typeof AudioContext;
    const Ctor: CtxCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: CtxCtor }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Schedule one ADSR-shaped oscillator note. Returns when nothing — fire and
 * forget. `gainPeak` is intentionally conservative (≤0.3) so the cues are
 * soft, not jarring, on a quiet room iPad.
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
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + attack);
  // Exponential decay reads more "natural" to the ear than linear.
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/**
 * Soft warm thud — a low sine wave with a quick decay. Plays when a tile is
 * successfully placed on a board cell (tap-to-place or drag-drop).
 */
export function playPlace(): void {
  const ac = getCtx();
  if (!ac) return;
  // Two stacked sines (180 Hz + 80 Hz) approximate a wood-on-wood click
  // without sounding like a generic synthesizer ping.
  tone(ac, { freq: 180, type: "sine", duration: 0.08, gainPeak: 0.22 });
  tone(ac, { freq: 80, type: "sine", duration: 0.12, gainPeak: 0.18 });
}

/**
 * Pleasant rising 3-note arpeggio (C5 → E5 → G5, a major triad) — plays on
 * a successfully submitted word. Triangle waves give a soft music-box feel
 * rather than a harsh sine beep.
 */
export function playSuccess(): void {
  const ac = getCtx();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    tone(ac, {
      freq,
      type: "triangle",
      startOffset: i * 0.08,
      duration: 0.22,
      gainPeak: 0.18,
    });
  });
}

/**
 * Soft descending 2-tone buzz — plays on an invalid / rejected submission.
 * Sawtooth gives it just enough harmonic edge to read as "wrong" without
 * being abrasive. Two short notes are softer than one long honk.
 */
export function playError(): void {
  const ac = getCtx();
  if (!ac) return;
  tone(ac, {
    freq: 330,
    type: "sawtooth",
    duration: 0.1,
    gainPeak: 0.12,
  });
  tone(ac, {
    freq: 210,
    type: "sawtooth",
    startOffset: 0.08,
    duration: 0.16,
    gainPeak: 0.14,
  });
}

/** Test/escape hatch: globally disable audio (no-op the play* functions). */
export function setMuted(value: boolean): void {
  muted = value;
  if (muted && ctx) {
    void ctx.close().catch(() => undefined);
    ctx = null;
  }
}
