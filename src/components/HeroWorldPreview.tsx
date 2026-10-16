import { Component, useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { prefersLightweightExperience, watchDeviceBudget } from "../portfolio/deviceBudget";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

interface HeroWorldPreviewProps {
  active: boolean;
  onEnter: (event: MouseEvent<HTMLElement>) => void;
  onIntent: () => void;
}

export default function HeroWorldPreview({ active, onEnter, onIntent }: HeroWorldPreviewProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [allow3D, setAllow3D] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback(() => { setReady(false); setFailed(true); }, []);

  useEffect(() => {
    const update = () => {
      const allowed = !prefersLightweightExperience();
      setAllow3D(allowed);
      if (!allowed) setReady(false);
    };
    update();
    return watchDeviceBudget(update);
  }, []);

  const showScene = active && allow3D && !failed;

  return (
    <div className="hero-world-preview" data-scene-ready={ready && showScene}>
      <button className="world-preview" onClick={onEnter} onPointerEnter={onIntent} onFocus={onIntent} aria-label="Explore the interactive 3D world">
        <div className="preview-header"><span><i /> AN INTERACTIVE LITTLE UNIVERSE</span><span>{ready && showScene ? "LIVE 3D" : "VOL. 01"}</span></div>
        <div className="hero-scene-stage" aria-hidden="true">
          <div className="mini-world hero-scene-fallback">
            <div className="world-orbit orbit-one" /><div className="world-orbit orbit-two" />
            <div className="map-island">
              <div className="map-road" /><div className="map-crosswalk" />
              <div className="map-building building-one"><span>STUDIO</span><i /><i /><i /></div>
              <div className="map-building building-two"><span>MAKE</span><i /><i /></div>
              <div className="map-building building-three"><span>PLAY</span><i /><i /></div>
              <div className="map-tree tree-one" /><div className="map-tree tree-two" /><div className="map-tree tree-three" />
              <div className="map-person"><i /></div><div className="map-marker">✦</div>
            </div>
          </div>
          {showScene && <SceneBoundary onError={handleError}><HeroScene running={!paused} onReady={handleReady} onError={handleError} /></SceneBoundary>}
          <span className="map-caption hero-scene-caption">01 / THE STUDIO</span>
          <span className="hero-scene-hint">{ready && showScene && !paused ? "SCROLL TO CHANGE YOUR PERSPECTIVE ↓" : "A LITTLE WORLD OF POSSIBILITIES"}</span>
        </div>
        <div className="preview-footer"><span>Small world.<br /><strong>Lots to discover.</strong></span><span className="preview-enter">↗</span></div>
      </button>
      {ready && showScene && <button
        type="button"
        className="hero-motion-toggle"
        aria-label={paused ? "Resume 3D hero animation" : "Pause 3D hero animation"}
        aria-pressed={paused}
        onClick={() => setPaused(value => !value)}
      ><span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{paused ? "Resume motion" : "Pause motion"}</button>}
    </div>
  );
}
