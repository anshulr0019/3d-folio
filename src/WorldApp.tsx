import React, { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { WorldEntryOverlay } from "./components/WorldEntryOverlay";
import * as THREE from "three";
import { Experience, GameState } from "./portfolio/Experience";
import type { Zone } from "./portfolio/World";
import { CONTENT } from "./portfolio/content";
import { WorldInterface, PhotoInterface } from "./portfolio/WorldInterface";
import { WorldPanel } from "./portfolio/WorldPanel";
import { InterfaceIcon } from "./portfolio/InterfaceIcon";
import { MobileJoystick, HoldControl } from "./portfolio/TouchControls";
import { useOverlayFocus } from "./portfolio/useOverlayFocus";
import type { AvatarStatus } from "./portfolio/Character";
import { resolveQuality, saveQuality, type Quality, type RenderQuality } from "./portfolio/quality";

// ─────────────────────────────────────────────────────────────────────────────
// Cinematic Overlay
// ─────────────────────────────────────────────────────────────────────────────
function CinematicOverlay({ onSkip, name, role }: { onSkip: () => void; name: string; role: string }) {
  return <div className="world-cinematic"><div><p className="interface-kicker">WELCOME TO MY LITTLE WORLD</p><h1>{name}</h1><p>{role}</p></div><button className="interface-button" onClick={onSkip}>Skip introduction<InterfaceIcon name="arrow" /></button></div>;
}

function LoadingScreen({ progress, onStart }: { progress: number; onStart: () => void }) {
  return <div className="world-loading" role="status">
    <span className="loading-orbit" /><p className="eyebrow">ANSHUL’S LITTLE UNIVERSE</p>
    <h1>{progress >= 100 ? "Your adventure is ready." : "Building your little escape."}</h1>
    <p>{progress >= 100 ? "Walk, explore, and discover what I’m building." : "Preparing the world and its assets…"}</p>
    <progress max={100} value={progress} aria-label="World loading progress" />
    {progress >= 100 && <button className="primary-action" onClick={onStart}>Let’s explore ↗</button>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intro Overlay
// ─────────────────────────────────────────────────────────────────────────────
function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useOverlayFocus(ref, onDone);
  const steps = [
    { title: "Make yourself at home.", sub: "A studio, a project campus, and a few things to discover. Take the scenic route through my work." },
    { title: "A world you can explore.", sub: "Use WASD or the arrow keys to walk. Hold Shift to run, and press Space to jump. On a phone, use the on-screen controls." },
    { title: "Follow your curiosity.", sub: "Walk up to an exhibit and press E, or tap its prompt. Open Explore for chapters, travel shortcuts, and settings." },
  ];
  return <div className="world-panel-backdrop"><div className="world-intro" role="dialog" aria-modal="true" aria-labelledby="intro-title" ref={ref} tabIndex={-1}>
    <p className="interface-kicker">BEFORE YOU WANDER / 0{step + 1} OF 03</p><h2 id="intro-title">{steps[step].title}</h2><p>{steps[step].sub}</p><div className="intro-steps" aria-label="Introduction steps">{steps.map((_, index) => <button key={index} aria-label={`Introduction step ${index + 1}`} aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}><span /></button>)}</div><div className="intro-actions"><button className="interface-button" onClick={onDone}>Skip intro</button><button className="interface-button interface-button-primary" onClick={() => step < 2 ? setStep(step + 1) : onDone()}>{step < 2 ? "Next" : "Start exploring"}<InterfaceIcon name="arrow" /></button></div>
  </div></div>;
}

function DevStatsPanel({ exp }: { exp: Experience | null }) {
  const [fps, setFps] = useState(60);
  const [renderStats, setRenderStats] = useState({ calls: 0, triangles: 0, textures: 0, geometries: 0, frameMs: 0, loadMs: 0 });
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(exp?.fps ?? 0);
      if (exp) setRenderStats({ calls: exp.renderer.info.render.calls, triangles: exp.renderer.info.render.triangles, textures: exp.renderer.info.memory.textures, geometries: exp.renderer.info.memory.geometries, frameMs: exp.frameCostMs, loadMs: exp.loadTimeMs });
      if (exp?.character) {
        const p = exp.character.group.position;
        setCoords({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10 });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [exp]);

  return <div className="world-dev-monitor"><strong>Developer monitor · {fps} FPS</strong><p>X {coords.x} / Y {coords.y} / Z {coords.z}</p><p>WebGL2 · {exp?.quality ?? "balanced"}</p><p>{renderStats.calls} draw calls · {renderStats.triangles.toLocaleString()} triangles</p><p>{renderStats.textures} textures · {renderStats.geometries} geometries</p><p>{renderStats.frameMs.toFixed(1)} ms CPU / frame · {(renderStats.loadMs / 1000).toFixed(1)} s world init</p></div>;
}

function HoverTooltip({ data }: { data: { id: string; label: string; screenX: number; screenY: number } }) {
  return <div className="world-hover-tooltip" style={{ left: `clamp(100px, ${data.screenX}px, calc(100vw - 100px))`, top: Math.max(160, data.screenY - 12) }}><span>{data.label}</span><small>Click to explore</small></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return <div className="world-toast" role="status" aria-live="polite">{message}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
interface WorldAppProps {
  quality: Quality;
  onExit: () => void;
  sourceRect?: DOMRect | null;
  portfolioRef?: React.RefObject<HTMLElement | null>;
  onEntranceComplete?: () => void;
}

export default function WorldApp({ quality, onExit, sourceRect, portfolioRef, onEntranceComplete }: WorldAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expRef = useRef<Experience | null>(null);
  const transitionTlRef = useRef<gsap.core.Timeline | null>(null);
  const transitionPlaneRef = useRef<THREE.Mesh | null>(null);
  const isTransitionMode = !!sourceRect;

  // Stable refs for transition props (avoid re-creating initEngineInBackground)
  const sourceRectRef = useRef(sourceRect);
  sourceRectRef.current = sourceRect;
  const portfolioRefStable = useRef(portfolioRef);
  portfolioRefStable.current = portfolioRef;
  const onEntranceCompleteRef = useRef(onEntranceComplete);
  onEntranceCompleteRef.current = onEntranceComplete;

  const [error, setError] = useState<string | null>(null);
  const loadingFailed = useRef(false);
  const [activeQuality, setActiveQuality] = useState<RenderQuality>(() => resolveQuality(quality));
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>("loading");
  const [visited, setVisited] = useState<string[]>([]);
  const [loadProgress, setLoadProgress] = useState(0);
  const [uiState, setUiState] = useState<"loading" | "entering" | "cinematic" | "intro" | "playing">("loading");
  const [gameState, setGameState] = useState<GameState>("LOADING");
  const [nearestZone, setNearestZone] = useState<Zone | null>(null);
  const [modalSection, setModalSection] = useState<string | null>(null);
  const [location, setLocation] = useState<"room" | "street">("room");
  const [hoveredObj, setHoveredObj] = useState<{ id: string; label: string; screenX: number; screenY: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [gemsCount, setGemsCount] = useState({ collected: 0, total: 5 });
  const [photoMode, setPhotoMode] = useState(false);
  const [showDevStats, setShowDevStats] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => matchMedia("(pointer: coarse), (max-width: 640px)").matches || navigator.maxTouchPoints > 0);
  useEffect(() => {
    const query = matchMedia("(pointer: coarse), (max-width: 640px)");
    const update = () => setIsTouchDevice(query.matches || navigator.maxTouchPoints > 0);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const showToast = useCallback((msg: string, duration = 3000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // ── Pre-initialize Experience in background ──
  const initEngineInBackground = useCallback(async () => {
    if (!canvasRef.current || expRef.current) return;

    const exp = new Experience(canvasRef.current, quality);
    expRef.current = exp;

    exp.on("stateChange", (s: GameState) => {
      setGameState(s);
      if (s === "STREET") setLocation("street");
      if (s === "ROOM") setLocation("room");
    });

    exp.on("cinematicEnd", () => {
      setUiState("intro");
    });

    exp.on("zoneChange", (zone: Zone | null) => {
      setNearestZone(zone);

    });

    exp.on("hoverObject", (obj: any) => {
      setHoveredObj(obj);
    });

    exp.on("openModal", (id: string) => {
      setModalSection(id);
      const chapterId = id.startsWith("project_") ? "projects" : id;
      setVisited(previous => previous.includes(chapterId) ? previous : [...previous, chapterId]);
    });

    exp.on("closeModal", () => {
      setModalSection(null);
    });

    exp.on("gemCollected", ({ gem, count, total }: any) => {
      setGemsCount({ collected: count, total });
      showToast(`Skill found: ${gem.name} · ${count}/${total}`, 3500);
    });

    exp.on("companionDialogue", (quote: string) => {
      showToast(`Byte: ${quote}`, 4000);
    });

    exp.on("partyMode", () => {
      showToast("Disco mode enabled.", 3000);
    });

    exp.on("photoModeChange", (active: boolean) => {
      setPhotoMode(active);
      if (active) setToast(null);
    });

    exp.on("avatarStatus", (status: AvatarStatus) => setAvatarStatus(status));
    exp.on("qualityChange", (q: RenderQuality) => setActiveQuality(q));
    const fail = (message: string) => {
      loadingFailed.current = true;
      transitionTlRef.current?.kill();
      transitionTlRef.current = null;
      exp.stopRendering();
      setError(message);
    };
    exp.on("contextLost", () => fail("The graphics connection was interrupted. Return to the portfolio and try Lite quality."));
    exp.on("error", () => fail("This device couldn’t finish rendering the world. Your projects are still available in the portfolio."));
    await exp.init(progress => { if (expRef.current === exp) setLoadProgress(previous => Math.max(previous, progress)); });
    if (expRef.current !== exp || loadingFailed.current) return;

    // If transition mode, play entrance animation instead of showing LoadingScreen
    if (sourceRectRef.current && portfolioRefStable.current) {
      playEntrance(exp);
    }
  }, [showToast, quality]);

  /* ── Transition entrance timeline ─────────────────────────────── */
  const playEntrance = useCallback((exp: Experience) => {
    const rect = sourceRectRef.current;
    const portfolioEl = portfolioRefStable.current?.current;
    if (!rect) return;

    setUiState("entering");
    exp.beginTransition();

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const plane = exp.createTransitionPlane(rect, vpW, vpH, "#e5efcd");
    transitionPlaneRef.current = plane;

    const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tl = gsap.timeline({
      onComplete: () => {
        // Clean up transition plane
        if (transitionPlaneRef.current) {
          exp.disposeTransitionPlane(transitionPlaneRef.current);
          transitionPlaneRef.current = null;
        }
        transitionTlRef.current = null;
        // Settle into ROOM
        exp.finishTransition();
        setUiState("playing");
        setGameState("ROOM");
        setLocation("room");
        onEntranceCompleteRef.current?.();
      }
    });
    transitionTlRef.current = tl;

    // Monitor target position in world space
    const monitorPos = { x: -4.2, y: 2.25, z: -5.52 };
    // Room overview camera target
    const studioView = exp.getStudioView();
    const camEnd = studioView.position;
    const lookStart = { x: -4.2, y: 2.25, z: -5.52 };
    const lookEnd = studioView.target;
    const lookTarget = { ...lookStart };

    if (prefersReducedMotion) {
      // ── Reduced motion: simple crossfade ──
      if (portfolioEl) {
        tl.to(portfolioEl, { opacity: 0, pointerEvents: "none", duration: 0.5, ease: "power2.inOut" }, 0);
      }
      // Snap camera to room overview
      tl.call(() => {
        exp.camera.position.set(camEnd.x, camEnd.y, camEnd.z);
        exp.camera.lookAt(lookEnd.x, lookEnd.y, lookEnd.z);
      }, [], 0.3);
    } else {
      // ── Full transition ──

      // 1. Fade out portfolio page (0s – 0.8s)
      if (portfolioEl) {
        tl.to(portfolioEl, {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.8,
          ease: "power2.in",
        }, 0);
      }

      // 2. Animate plane from card position to monitor (0.2s – 1.4s)
      tl.to(plane.position, {
        x: monitorPos.x,
        y: monitorPos.y,
        z: monitorPos.z,
        duration: 1.2,
        ease: "power3.inOut",
        onUpdate: () => plane.lookAt(exp.camera.position),
      }, 0.2);
      tl.to(plane.scale, {
        x: 2.4,
        y: 1.2,
        duration: 1.2,
        ease: "power3.inOut",
      }, 0.2);

      // 3. Camera pullback (0.3s – 1.8s)
      tl.to(exp.camera.position, {
        x: camEnd.x,
        y: camEnd.y,
        z: camEnd.z,
        duration: 1.5,
        ease: "power2.inOut",
      }, 0.3);
      tl.to(lookTarget, {
        x: lookEnd.x,
        y: lookEnd.y,
        z: lookEnd.z,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => exp.camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z),
      }, 0.3);

      // 4. Fade out the transition plane near the end (1.3s – 1.6s)
      tl.to((plane.material as THREE.MeshBasicMaterial), {
        opacity: 0,
        duration: 0.35,
        ease: "power2.in",
      }, 1.3);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadingFailed.current = false;
    // Let React paint the loading view before constructing the scene.
    const timer = window.setTimeout(() => {
      initEngineInBackground().catch(() => {
        if (active) { loadingFailed.current = true; expRef.current?.stopRendering(); setError("This browser couldn’t open the 3D world. You can still explore all my work in the portfolio."); }
      });
    }, 0);
    const deadline = window.setTimeout(() => {
      if (active && expRef.current?.state === "LOADING") { loadingFailed.current = true; expRef.current.stopRendering(); setError("Loading is taking longer than expected. You can still explore all my work in the portfolio."); }
    }, 60000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
      // Kill any running transition timeline
      if (transitionTlRef.current) {
        transitionTlRef.current.kill();
        transitionTlRef.current = null;
      }
      // Dispose transition plane if present
      if (transitionPlaneRef.current && expRef.current) {
        expRef.current.disposeTransitionPlane(transitionPlaneRef.current);
        transitionPlaneRef.current = null;
      }
      // Reset portfolio opacity in case we're mid-transition
      const portfolioEl = portfolioRefStable.current?.current;
      if (portfolioEl) {
        gsap.killTweensOf(portfolioEl);
        portfolioEl.style.opacity = "";
        portfolioEl.style.pointerEvents = "";
      }
      expRef.current?.destroy();
      expRef.current = null;
    };
  }, [initEngineInBackground]);

  const startExperience = useCallback(() => {
    if (!expRef.current || loadProgress < 100) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || activeQuality === "low") {
      expRef.current.skipCinematic();
    } else {
      setUiState("cinematic");
      expRef.current.playCinematic();
    }
  }, [loadProgress, activeQuality]);

  const handleSkipCinematic = useCallback(() => {
    const exp = expRef.current;
    if (!exp) return;
    exp.skipCinematic();
    setUiState("intro");
  }, []);

  const handleIntroComplete = useCallback(() => {
    const exp = expRef.current;
    if (!exp) return;
    exp.setState("ROOM");
    setGameState("ROOM");
    setUiState("playing");
  }, []);

  const handleInteract = useCallback(() => {
    const exp = expRef.current;
    if (!exp) return;
    const zone = exp.nearestZone;
    if (zone) {
      if (zone.id === "contact_linkedin") {
        window.open("https://www.linkedin.com/in/anshul-kumar-793502274/", "_blank");
      } else if (zone.id === "contact_github") {
        window.open("https://github.com/anshulr0019", "_blank");
      } else if (zone.id === "contact_gmail") {
        window.location.href = `mailto:${CONTENT.contact.email}`;
      } else {
        exp.openModal(zone.id);
      }
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    const exp = expRef.current;
    if (!exp) return;
    exp.closeModal();
    setModalSection(null);
  }, []);

  const handleTogglePhotoMode = useCallback(() => {
    expRef.current?.togglePhotoMode();
  }, []);

  const handleQualityChange = useCallback((nextQuality: RenderQuality) => {
    setActiveQuality(nextQuality);
    saveQuality(nextQuality);
    expRef.current?.setQuality(nextQuality);
  }, []);

  const handleCapturePhoto = useCallback(() => {
    const dataUrl = expRef.current?.captureScreenshot();
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Anshul-Kumar-Portfolio-Photo-${Date.now()}.png`;
      a.click();
      showToast("Snapshot downloaded.", 3000);
    }
  }, [showToast]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    const exp = expRef.current;
    if (!exp) return;
    exp.joystick = { x, y };
  }, []);

  const handleInterfaceChange = useCallback((open: boolean) => {
    setGuideOpen(open);
    expRef.current?.setInterfaceOpen(open);
  }, []);
  const handleHeldKey = useCallback((code: string, held: boolean) => {
    if (held) expRef.current?.keys.add(code);
    else expRef.current?.keys.delete(code);
  }, []);

  // ── Keyboard shortcuts (Ctrl+D for dev stats, ESC for photo mode) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const exp = expRef.current;
      if (!exp) return;

      if ((e.ctrlKey || e.metaKey) && e.code === "KeyD") {
        e.preventDefault();
        setShowDevStats((prev) => !prev);
      }

      if (e.code === "Escape" && exp.photoMode) {
        exp.togglePhotoMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { if (uiState === "playing" && !error) canvasRef.current?.focus({ preventScroll: true }); }, [uiState, error]);

  return (
    <div className="world-experience fixed inset-0 overflow-hidden select-none" style={{ zIndex: isTransitionMode ? 5 : undefined }}>
      {!isTransitionMode && !error && uiState !== "playing" && uiState !== "intro" && <button className="world-back" onClick={onExit}>← Portfolio</button>}
      {(error || (isTransitionMode && uiState === "loading")) && <WorldEntryOverlay progress={loadProgress} error={error} onExit={onExit} />}
      {uiState === "playing" && !photoMode && !modalSection && !error && <WorldInterface
        location={location} nearestZone={gameState === "ROOM" || gameState === "STREET" ? nearestZone : null}
        gemsCount={gemsCount} visited={visited} quality={activeQuality} avatarStatus={avatarStatus} isTouchDevice={isTouchDevice}
        onExit={onExit} onPhoto={handleTogglePhotoMode} onInteract={handleInteract}
        onSection={id => expRef.current?.openModal(id)} onTravel={destination => expRef.current?.travelTo(destination)}
        onRespawn={() => expRef.current?.respawn()} onQuality={handleQualityChange} onMenuChange={handleInterfaceChange}
      />}
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef} tabIndex={0} inert={!!modalSection || guideOpen || uiState === "intro" || !!error} data-world-canvas aria-label="Interactive portfolio world. Use WASD or arrow keys to move, Shift to run, Space to jump, E to interact and P for photo mode."
        className="absolute inset-0 w-full h-full block z-0"
      />

      {/* Loading: standard mode shows full LoadingScreen; transition mode shows thin progress bar */}
      {uiState === "loading" && !isTransitionMode && (
        <LoadingScreen
          progress={loadProgress}
          onStart={startExperience}
        />
      )}
      {uiState === "loading" && isTransitionMode && loadProgress < 100 && (
        <div className="transition-progress">
          <div className="transition-progress-bar" style={{ width: `${loadProgress}%` }} />
        </div>
      )}



      {/* Cinematic flythrough overlay */}
      {uiState === "cinematic" && (
        <CinematicOverlay
          onSkip={handleSkipCinematic}
          name={CONTENT.brand.name}
          role={CONTENT.brand.role}
        />
      )}

      {/* Intro */}
      {uiState === "intro" && <IntroOverlay onDone={handleIntroComplete} />}

      {uiState === "playing" && photoMode && !error && <PhotoInterface isTouchDevice={isTouchDevice} onCapture={handleCapturePhoto} onExit={handleTogglePhotoMode} />}

      {/* Developer Monitor Stats */}
      {showDevStats && !photoMode && uiState === "playing" && (
        <DevStatsPanel exp={expRef.current} />
      )}

      {/* 3D Hover Tooltip */}
      {hoveredObj && uiState === "playing" && !modalSection && !photoMode && !guideOpen && !isTouchDevice && (
        <HoverTooltip data={hoveredObj} />
      )}

      {/* Modal */}
      {modalSection && (
        <WorldPanel sectionId={modalSection} onClose={handleCloseModal} />
      )}

      {/* Toast */}
      {toast && !guideOpen && !modalSection && <Toast message={toast} />}

      {uiState === "playing" && isTouchDevice && !photoMode && !modalSection && !guideOpen && !error && (gameState === "ROOM" || gameState === "STREET") && <div className="world-touch-controls"><MobileJoystick onMove={handleJoystickMove} /><div><HoldControl label="Run" code="ShiftLeft" icon="arrow" onKey={handleHeldKey} /><HoldControl label="Jump" code="Space" icon="jump" onKey={handleHeldKey} /></div></div>}
    </div>
  );
}
