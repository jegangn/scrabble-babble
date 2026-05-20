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

export interface SettingsModalProps {
  readonly onClose: () => void;
  /** Trigger the Export-data flow. */
  readonly onExport: () => void;
  /** Trigger the Import-data flow (opens the file picker). */
  readonly onImport: () => void;
  /** Disable Export when there's no in-progress game to export. */
  readonly exportDisabled: boolean;
}

type Page = "sounds" | "export" | "import";

const MENU: ReadonlyArray<{ id: Page; icon: string; label: string }> = [
  { id: "sounds", icon: "♪", label: "Sounds" },
  { id: "export", icon: "↑", label: "Export data" },
  { id: "import", icon: "↓", label: "Import data" },
];

/**
 * Settings modal — left-rail menu (Sounds · Export · Import) with a
 * matching pane on the right. Each menu item swaps the visible content
 * without unmounting the modal, so the user can sample several sounds
 * and then export their progress in the same session.
 *
 * Audio changes apply live and persist to IndexedDB on every interaction.
 * Export / Import close the modal and hand off to the parent's handlers
 * (HomeScreen) so the file picker and download flows aren't trapped
 * behind a dialog.
 */
export function SettingsModal({
  onClose,
  onExport,
  onImport,
  exportDisabled,
}: SettingsModalProps): JSX.Element {
  const [page, setPage] = useState<Page>("sounds");
  const { color, space, font, size, weight, radius, shadow } = tokens;

  return (
    <ModalFrame
      title="Settings"
      width={760}
      onClose={onClose}
      // Pin the panel to the viewport so the Done footer never slips off
      // the bottom on iPad-height screens. Modal uses display:flex column
      // so header + body + footer stack and the body can scroll inside.
      style={{
        maxHeight: "calc(100dvh - 24px)",
        display: "flex",
        flexDirection: "column",
      }}
      footer={
        <Button kind="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div
        style={{
          display: "flex",
          gap: space.x6,
          // Stretch to fill nearly the full viewport height. Modal chrome
          // (header + footer + body padding + backdrop padding) eats ~200 px,
          // so the inner area gets the rest. Falls back gracefully on short
          // viewports because `calc` clamps via min.
          minHeight: "min(580px, calc(100dvh - 240px))",
        }}
      >
        {/* Left rail — menu */}
        <nav
          aria-label="Settings sections"
          style={{
            width: 180,
            display: "flex",
            flexDirection: "column",
            gap: space.x2,
            flexShrink: 0,
          }}
        >
          {MENU.map((m) => {
            const active = m.id === page;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPage(m.id)}
                aria-current={active ? "page" : undefined}
                style={{
                  appearance: "none",
                  font: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: space.x3,
                  padding: `${space.x3}px ${space.x4}px`,
                  background: active ? color.brown : "transparent",
                  color: active ? color.cream : color.ink,
                  border: `1.5px solid ${active ? color.brownDark : color.strokeSoft}`,
                  borderRadius: radius.card,
                  fontSize: size.body,
                  fontWeight: active ? weight.bold : weight.med,
                  boxShadow: active ? shadow.card : "none",
                  transition: "all 120ms ease",
                  touchAction: "manipulation",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontFamily: font.serif,
                    fontSize: size.h4,
                    width: 24,
                    textAlign: "center",
                    opacity: active ? 1 : 0.7,
                  }}
                >
                  {m.icon}
                </span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right pane — content swap */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {page === "sounds" && <SoundsPanel />}
          {page === "export" && (
            <ExportPanel
              disabled={exportDisabled}
              onExport={() => {
                onClose();
                onExport();
              }}
            />
          )}
          {page === "import" && (
            <ImportPanel
              onImport={() => {
                onClose();
                onImport();
              }}
            />
          )}
        </div>
      </div>
    </ModalFrame>
  );
}

// ─── Sounds pane ──────────────────────────────────────────────────

function SoundsPanel(): JSX.Element {
  const [config, setConfig] = useState<AudioConfig>(() => getAudioConfig());
  const { color, space, size, weight, font, radius, shadow } = tokens;

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.x2,
        // Match the modal's inner min-height — keeps the sounds list as
        // tall as the modal grows, so a 820 px viewport gives ~580 px of
        // scroll space. Tightened row gap (x2 not x4) so the five sound
        // rows fit without much scroll on iPad-height screens.
        maxHeight: "min(580px, calc(100dvh - 240px))",
        overflowY: "auto",
        paddingRight: space.x2,
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
              padding: `${space.x2}px ${space.x4}px`,
              boxShadow: shadow.card,
              display: "flex",
              flexDirection: "column",
              gap: space.x2,
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
                ariaLabel={`Preview ${SOUND_LABELS[key]}`}
                onClick={() => previewPreset(key, activePreset, volume)}
              >
                ▶ Preview
              </Button>
            </div>

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
                  minWidth: 92,
                  textAlign: "right",
                }}
              >
                {formatVolume(volume)}
              </span>
            </div>
          </div>
        );
      })}

      {/* Reset link — only visible inside the Sounds pane. */}
      <div style={{ alignSelf: "flex-end", marginTop: space.x1 }}>
        <Button kind="ghost" size="sm" onClick={() => apply(DEFAULT_AUDIO_CONFIG)}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}

// ─── Export pane ──────────────────────────────────────────────────

interface ExportPanelProps {
  readonly disabled: boolean;
  readonly onExport: () => void;
}

function ExportPanel({ disabled, onExport }: ExportPanelProps): JSX.Element {
  const { color, space, font, size, weight } = tokens;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.x4,
        padding: `${space.x2}px ${space.x1}px`,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: size.h3,
          color: color.brown,
          letterSpacing: "-0.01em",
        }}
      >
        Export progress
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: size.body,
          color: color.inkSoft,
          lineHeight: 1.55,
        }}
      >
        Save your current game and settings to a small JSON file. Useful
        as a backup, or to move your progress to another device. Daily
        Spelling Bee history and leaderboard scores are included.
      </p>
      {disabled && (
        <p
          style={{
            margin: 0,
            fontSize: size.caption,
            color: color.inkSoft,
            fontStyle: "italic",
          }}
        >
          You don't have an in-progress game to export right now — start a
          new game first.
        </p>
      )}
      <div>
        <Button
          kind="primary"
          icon={<span>↑</span>}
          disabled={disabled}
          onClick={onExport}
        >
          Export to file
        </Button>
      </div>
    </div>
  );
}

// ─── Import pane ──────────────────────────────────────────────────

interface ImportPanelProps {
  readonly onImport: () => void;
}

function ImportPanel({ onImport }: ImportPanelProps): JSX.Element {
  const { color, space, font, size, weight } = tokens;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space.x4,
        padding: `${space.x2}px ${space.x1}px`,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontFamily: font.serif,
          fontWeight: weight.bold,
          fontSize: size.h3,
          color: color.brown,
          letterSpacing: "-0.01em",
        }}
      >
        Import progress
      </h4>
      <p
        style={{
          margin: 0,
          fontSize: size.body,
          color: color.inkSoft,
          lineHeight: 1.55,
        }}
      >
        Restore an in-progress game from a previously exported JSON file.
        This replaces your current saved game — back it up first if you
        want to keep it.
      </p>
      <div>
        <Button kind="primary" icon={<span>↓</span>} onClick={onImport}>
          Choose a file
        </Button>
      </div>
    </div>
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
