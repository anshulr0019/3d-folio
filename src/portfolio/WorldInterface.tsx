import { useCallback, useEffect, useRef, useState } from "react";
import type { Zone } from "./World";
import type { AvatarStatus } from "./Character";
import { sound } from "./Audio";
import { InterfaceIcon } from "./InterfaceIcon";
import { useOverlayFocus } from "./useOverlayFocus";
import type { RenderQuality } from "./quality";

import { IslandMap } from "./IslandMap";
import type { IslandDestination } from "./islandLayout";
import type { IslandProgress } from "./Island";

const CHAPTERS = [["about", "About me", "The person behind the work"], ["projects", "Projects", "Three things I've built"], ["skills", "Skills", "My tools & technologies"], ["experience", "Education", "What I'm learning"], ["contact", "Contact", "Start a conversation"]] as const;
interface Props {
  location: "room" | "street";
  nearestZone: Zone | null;
  gemsCount: { collected: number; total: number };
  visited: string[];
  quality: RenderQuality;
  avatarStatus: AvatarStatus;
  isTouchDevice: boolean;
  onExit: () => void;
  onPhoto: () => void;
  onInteract: () => void;
  onSection: (id: string) => void;
  islandPosition: { x: number; z: number };
  islandProgress: IslandProgress;
  onTravel: (destination: IslandDestination) => void;
  onRespawn: () => void;
  onQuality: (quality: RenderQuality) => void;
  onMenuChange: (open: boolean) => void;
}
export function WorldInterface(props: Props) {
  const [open, setOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [muted, setMuted] = useState(sound.isMuted());
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); setMapOpen(false); }, []);
  useOverlayFocus(menuRef, close, open);
  useEffect(() => {
    props.onMenuChange(open);
    return () => props.onMenuChange(false);
  }, [open, props.onMenuChange]);
  const act = (callback: () => void) => { setOpen(false); setMapOpen(false); props.onMenuChange(false); callback(); };
  const visitedCount = CHAPTERS.filter(([id]) => props.visited.includes(id)).length;
  const room = props.location === "room";
  const zone = props.nearestZone;
  const interaction = zone?.id === "arcade" ? "Play arcade" : zone?.id === "return_studio" ? "Return to studio" : ["pond", "lighthouse", "windmill", "garden", "island_welcome"].includes(zone?.id ?? "") ? zone!.label : `Open ${zone?.label ?? "exhibit"}`;
  return <>
    <header className="world-toolbar" aria-label="World navigation" inert={open}>
      <button className="toolbar-back" onClick={props.onExit} aria-label="Back to portfolio"><InterfaceIcon name="back" /><span>Portfolio</span></button>
      <div className="toolbar-location"><InterfaceIcon name={room ? "home" : "leaf"} /><div><span className="toolbar-location-kicker">YOU ARE EXPLORING</span><strong>{room ? "Developer Studio" : "Anshul’s Island"}</strong><span className="toolbar-mobile-discoveries">{props.gemsCount.collected} / {props.gemsCount.total} skills found</span></div></div>
      <div className="toolbar-discoveries" aria-label={`${props.gemsCount.collected} of ${props.gemsCount.total} skills discovered`}><InterfaceIcon name="gem" /><span>{props.gemsCount.collected}<span className="count-divider"> / {props.gemsCount.total}</span></span><span className="discovery-label">skills found</span></div>
      <div className="toolbar-actions">
        <button className="interface-icon-button toolbar-audio" onClick={() => setMuted(sound.toggleMute())} aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted} title={muted ? "Unmute audio" : "Mute audio"}><InterfaceIcon name={muted ? "muted" : "sound"} /></button>
        <button className="interface-icon-button island-map-toggle" aria-label="Island map" title="Island map" onClick={() => { setMapOpen(true); setOpen(true); }}><InterfaceIcon name="map" /></button>
        <button className="interface-icon-button" onClick={props.onPhoto} aria-label="Enter photo mode" title="Photo mode (P)"><InterfaceIcon name="camera" /></button>
        <button className="interface-button interface-button-primary explore-toggle" aria-label={props.isTouchDevice ? "Explore" : "Explore & settings"} onClick={() => { setMapOpen(false); setOpen(value => !value); }} aria-expanded={open} aria-controls="world-guide"><InterfaceIcon name="grid" /><span>Explore<span className="explore-long-label"> & settings</span></span></button>
      </div>
    </header>
    {open && <div className="guide-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="world-guide" id="world-guide" ref={menuRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="guide-heading"><div><p className="interface-kicker">{mapOpen ? "YOUR LITTLE FIELD MAP" : "A LITTLE FIELD GUIDE"}</p><h2 id="guide-title">{mapOpen ? "Follow your curiosity." : "Make yourself at home."}</h2></div><button className="interface-icon-button" onClick={close} aria-label="Close explore and settings"><InterfaceIcon name="close" /></button></div>
        <div className="guide-body">
        {mapOpen ? <IslandMap position={props.islandPosition} progress={props.islandProgress} onTravel={destination => act(() => props.onTravel(destination))} /> : <>
        <button className="interface-button guide-map-button" onClick={() => setMapOpen(true)}><InterfaceIcon name="map" />Open island map & discoveries<InterfaceIcon name="arrow" /></button>
        <div className="guide-progress"><span>{visitedCount} of 5 chapters explored</span><div aria-hidden="true">{CHAPTERS.map(([id]) => <i key={id} data-visited={props.visited.includes(id)} />)}</div></div>
        <nav className="guide-chapters" aria-label="Portfolio chapters">{CHAPTERS.map(([id, label, description], index) => <button key={id} onClick={() => act(() => props.onSection(id))}><span className="chapter-number">0{index + 1}</span><span><strong>{label}</strong><small>{description}</small></span>{props.visited.includes(id) ? <InterfaceIcon name="check" /> : <InterfaceIcon name="arrow" />}</button>)}</nav>
        <section className="guide-travel" aria-label="Travel"><p className="interface-kicker">TAKE A SHORTCUT</p><div><button className="interface-button" onClick={() => act(() => props.onTravel("room"))}><InterfaceIcon name="home" />Studio</button><button className="interface-button" onClick={() => act(() => props.onTravel("projects"))}><InterfaceIcon name="leaf" />Project walk</button></div></section>
        <section className="guide-settings" aria-label="Experience settings"><label htmlFor="world-quality"><strong>Rendering quality</strong><small>{props.quality === "low" ? "Fewer effects · 30 fps" : props.quality === "high" ? "Crisp edges · adaptive resolution" : "A balance of detail & performance"}</small></label><select id="world-quality" value={props.quality} onChange={event => props.onQuality(event.target.value as RenderQuality)}><option value="low">Lite</option><option value="balanced">Balanced</option><option value="high">High</option></select></section>
        <p className="guide-note">The same character in every mode. Choose Lite for a lighter experience.</p>
        <button className="interface-button guide-audio" onClick={() => setMuted(sound.toggleMute())} aria-pressed={muted}><InterfaceIcon name={muted ? "muted" : "sound"} />{muted ? "Unmute audio" : "Mute audio"}</button>
        <div className="guide-controls"><p className="interface-kicker">FIND YOUR WAY</p><p>{props.isTouchDevice ? "Drag the stick to move. Hold Run to speed up, tap Jump, and tap a nearby exhibit's prompt to open it." : "WASD or arrows to move · Shift to run · Space to jump · E to interact · P for photo mode."}</p></div>
        <button className="guide-respawn" onClick={() => act(props.onRespawn)}><InterfaceIcon name="reset" />Feeling stuck? Reset your position<InterfaceIcon name="arrow" /></button>
        </>}
        </div>
      </div>
    </div>}
    {!open && <>
      {!props.isTouchDevice && <div className="world-keyboard-hints" aria-label="Keyboard controls"><span><kbd>WASD</kbd> Move</span><span><kbd>Shift</kbd> Run</span><span><kbd>Space</kbd> Jump</span><span><kbd>E</kbd> Interact</span></div>}
      {zone ? <button className={`world-interaction${props.isTouchDevice ? " is-touch" : ""}`} onClick={props.onInteract}><span className="interaction-mark"><InterfaceIcon name={zone.id === "return_studio" ? "home" : "arrow"} /></span><span><small>{zone.id === "arcade" ? "TAKE A BREAK" : "SOMETHING TO DISCOVER"}</small><strong>{interaction}</strong></span>{!props.isTouchDevice && <kbd>E</kbd>}</button> : room && <p className={`world-door-hint${props.isTouchDevice ? " is-touch" : ""}`}><InterfaceIcon name="arrow" />Walk through the marked threshold to explore the island.</p>}
    </>}
    {props.avatarStatus !== "ready" && <p className="world-avatar-status" role="status">{props.avatarStatus === "loading" ? "Preparing your character…" : "Character unavailable. Change quality to retry."}</p>}
  </>;
}

export function PhotoInterface({ onCapture, onExit, isTouchDevice }: { onCapture: () => void; onExit: () => void; isTouchDevice: boolean }) {
  return <div className="world-photo-ui">
    <div className="photo-heading"><InterfaceIcon name="camera" /><div><strong>A different perspective.</strong><span>{isTouchDevice ? "Drag to orbit · Pinch to zoom" : "Drag to orbit · Scroll to zoom"}</span></div><button className="interface-icon-button" onClick={onExit} aria-label="Exit photo mode"><InterfaceIcon name="close" /></button></div>
    <div className="photo-actions"><button className="interface-button interface-button-primary" onClick={onCapture}><InterfaceIcon name="camera" />Save snapshot</button><button className="interface-button" onClick={onExit}>Back to exploring<kbd>Esc</kbd></button></div>
  </div>;
}
