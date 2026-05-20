import { useState } from "react";
import {
  DEFAULT_AUDIO_CONFIG,
  PRESETS,
  SOUND_KEYS,
  SOUND_LABELS,
  getAudioConfig,
  previewPreset,
  setAudioConfig,
  type AudioConfig,
  type SoundKey,
} from "../../audio/sounds.js";
import { setAudioSettings } from "../../storage/settings-storage.js";
import { tokens } from "../tokens.js";
import { Button } from "./Button.js";
import { ModalFrame } from "./ModalFrame.js";
import { SectionLabel } from "./SectionLabel.js";

export interface SettingsModalProps {
  readonly onClose: () => void;
  /** Trigger the Export-data flow. Modal closes via its own dismiss. */
  readonly onExport: () => void;
  /** Trigger the Import-data flow (opens the file picker). */
  readonly onImport: () => void;
  /** Disable the Export action — true when there's no in-progress game to export. */
  readonly exportDisabled: boolean;
}

/**
 * Settings modal — three stacked sections, opened from the home menu:
 *
 *   1. Sounds — per-sound preset picker and 0–150 % volume slider with a
 *      dB readout. Changes apply live and persist to IndexedDB.
 *   2. Export — write the in-progress game to a JSON file.
 *   3. Import — replace state from a JSON file.
 *
 * Persists via {@link setAudioSettings} so the choices survive reloads.
 * The preview button on each sound row plays the *currently selected*
 * preset at the *currently selected* volume so the user can hear the
 * effect of their slider without leaving the modal.
 */
export function SettingsModal({
  onClose,
  onExport,
  onImport,
  exportDisabled,
}: SettingsModalProps): JSX.Element {
  const { color, space, size, weight, font, radius, shadow } = tokens;
  const [config, setConfig] = useState<AudioConfig>(() => getAudioConfig());

  // Apply changes live so the modal's preview button + every other Button
  // in the app picks up the new sound immediately. Persist on every change
  // — IDB writes are async and tiny; slider drags fire a handful of writes
  // which is fine.
  const apply = (next: AudioConfig): void => {
    setConfig(next);
    setAudioConfig(next);
    void setAudioSettings(next);
  };

  const setPreset = (key: SoundKey, presetId: string): void => {
    const next: AudioConfig = {
      presets: { ...config.presets, [key]: presetId },
      volumes: config.volumes,
    };
    apply(next);
    previewPreset(key, presetId, config.volumes[key]);
  };

  const setVolume = (key: SoundKey, volume: number): void => {
    const next: AudioConfig = {
      presets: config.presets,
      volumes: { ...config.volumes, [key]: volume },
    };
    apply(next);
  };

  const reset = (): void => apply(DEFAULT_AUDIO_CONFIG);

  return (
    <ModalFrame
      title="Settings"
      sub="Sounds, export, and import. Changes save automatically."
      width={620}
      onClose={onClose}
      footer={
        <>
          <Button kind="ghost" onClick={reset}>
            Reset defaults
          </Button>
          <Button kind="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.x8 }}>
        {/* ─── Sounds ──────────────────────────────────────────── */}
        <section>
          <SectionLabel>Sounds</SectionLabel>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: space.x4,
              marginTop: space.x3,
            }}
          >
            {SOUND_KEYS.map((key) => {
              const presets = PRESETS[key];
              const activePreset = config.presets[key];
              const volume = config.volumes[key];
              return (
                <div
                  key={key}
                  style={{
                    background: color.paper,
                    border: `1.5px solid ${color.stroke}`,
                    borderRadius: radius.card,
                    padding: `${space.x3}px ${space.x4}px`,
                    boxShadow: shadow.card,
                    display: "flex",
                    flexDirection: "column",
                    gap: space.x3,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: space.x3,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: font.serif,
                        fontWeight: weight.bold,
                        fontSize: size.h4,
                        color: color.brown,
                      }}
                    >
                      {SOUND_LABELS[key]}
                    </div>
                    <Button
                      kind="ghost"
                      size="sm"
                      muted
                      ariaLabel={`Preview ${SOUND_LABELS[key]} sound`}
                      onClick={() => previewPreset(key, activePreset, volume)}
                    >
                      ▶ Preview
                    </Button>
                  </div>

                  {/* Preset chips — one chip per option, current selection highlighted. */}
                  <div style={{ display: "flex", gap: space.x2, flexWrap: "wrap" }}>
                    {presets.map((p) => {
                      const selected = p.id === activePreset;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreset(key, p.id)}
                          title={p.description}
                          style={{
                            appearance: "none",
                            font: "inherit",
                            cursor: "pointer",
                            padding: `${space.x2}px ${space.x3}px`,
                            background: selected ? color.brown : color.cream,
                            color: selected ? color.cream : color.ink,
                            border: `1.5px solid ${
                              selected ? color.brownDark : color.strokeSoft
                            }`,
                            borderRadius: radius.pill,
                            fontSize: size.caption,
                            fontWeight: weight.med,
                            transition: "all 120ms ease",
                            touchAction: "manipulation",
                          }}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume slider — 0 to 1.5 multiplier in 5 % steps. */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space.x3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: size.caption,
                        color: color.inkSoft,
                        minWidth: 56,
                      }}
                    >
                      Volume
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={volume}
                      onChange={(e) => setVolume(key, Number(e.target.value))}
                      aria-label={`${SOUND_LABELS[key]} volume`}
                      style={{
                        flex: 1,
                        accentColor: color.brown,
                        height: 4,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: font.sans,
                        fontWeight: weight.bold,
                        fontSize: size.caption,
                        color: color.brown,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 88,
                        textAlign: "right",
                      }}
                    >
                      {formatVolume(volume)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Data ────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Data</SectionLabel>
          <p
            style={{
              margin: `${space.x2}px 0 ${space.x3}px`,
              fontSize: size.caption,
              color: color.inkSoft,
              lineHeight: 1.55,
            }}
          >
            Export saves your in-progress game + settings to a JSON file you
            can back up or move between devices. Import replaces them with a
            file you've saved before.
          </p>
          <div style={{ display: "flex", gap: space.x3, flexWrap: "wrap" }}>
            <Button
              kind="secondary"
              icon={<span>↑</span>}
              disabled={exportDisabled}
              onClick={() => {
                onClose();
                onExport();
              }}
            >
              Export data
            </Button>
            <Button
              kind="secondary"
              icon={<span>↓</span>}
              onClick={() => {
                onClose();
                onImport();
              }}
            >
              Import data
            </Button>
          </div>
        </section>
      </div>
    </ModalFrame>
  );
}

/**
 * Format the volume multiplier as a percentage with a small dB readout.
 * 0 reads as "Mute" since −∞ dB isn't a useful number to show.
 */
function formatVolume(v: number): string {
  if (v <= 0.001) return "Mute";
  const pct = Math.round(v * 100);
  const db = (20 * Math.log10(v)).toFixed(1);
  const sign = parseFloat(db) >= 0 ? "+" : "";
  return `${pct}% · ${sign}${db} dB`;
}

