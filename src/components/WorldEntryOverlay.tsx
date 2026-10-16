import { useRef } from "react";
import { createPortal } from "react-dom";
import { InterfaceIcon } from "../portfolio/InterfaceIcon";
import { useOverlayFocus } from "../portfolio/useOverlayFocus";

/** Portal escapes the entrance scene's stacking context behind the portfolio. */
export function WorldEntryOverlay({ progress, error, onExit }: { progress: number; error: string | null; onExit: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayFocus(ref, onExit);
  if (typeof document === "undefined") return null;
  return createPortal(<div className={`world-experience world-entry-backdrop${error ? " has-error" : ""}`}>
    <div ref={ref} tabIndex={-1} className="world-entry-card" role={error ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby="world-entry-title" aria-describedby="world-entry-description">
      <p className="interface-kicker">THE SCENIC ROUTE</p>
      <h2 id="world-entry-title">{error ? "Take the simpler route." : "Opening your 3D world."}</h2>
      <p id="world-entry-description">{error ?? "Preparing the scene and your character. You can cancel and return to the work at any time."}</p>
      {!error && <progress max={100} value={progress} aria-label="World loading progress" />}
      <button className="interface-button" onClick={onExit}>{error ? "View portfolio" : "Cancel and view portfolio"}<InterfaceIcon name="arrow" /></button>
    </div>
  </div>, document.body);
}

