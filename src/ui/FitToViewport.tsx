import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { tokens } from "./tokens.js";
import { computeAirFit, DESIGN_W, DESIGN_H, type ViewportInfo } from "./airFit.js";

// `zoom` and the `--app-h` custom property aren't in React's CSSProperties;
// extend the type rather than reaching for `any` (engine/repo bans `any`).
type CanvasStyle = CSSProperties & { zoom?: number; "--app-h"?: string };

function readViewport(): ViewportInfo {
  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(any-pointer: coarse)").matches;
  return { vw: window.innerWidth, vh: window.innerHeight, isTouch };
}

/**
 * Wraps the whole app. On the iPad Pro and laptop this returns its children
 * untouched (no wrapper element, no transform) — identical to not existing.
 * On a small touch landscape screen (the iPad Air) it renders the children
 * inside a fixed 1366x880 canvas scaled down with CSS `zoom`, so the Air
 * shows the exact Pro layout, just smaller. `zoom` (not `transform`) is used
 * because WebKit keeps pointer/drag coordinates correct under `zoom`.
 */
export function FitToViewport({ children }: { readonly children: ReactNode }): JSX.Element {
  const [viewport, setViewport] = useState<ViewportInfo>(() => readViewport());

  useEffect(() => {
    const onChange = (): void => setViewport(readViewport());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  const { active, scale } = computeAirFit(viewport);
  if (!active) return <>{children}</>;

  const shellStyle: CSSProperties = {
    width: "100%",
    height: "100dvh",
    background: tokens.color.cream,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };
  const canvasStyle: CanvasStyle = {
    width: DESIGN_W,
    height: DESIGN_H,
    flex: "none",
    zoom: scale,
    "--app-h": `${DESIGN_H}px`,
  };

  return (
    <div data-fit-shell style={shellStyle}>
      <div data-fit-canvas style={canvasStyle}>
        {children}
      </div>
    </div>
  );
}
