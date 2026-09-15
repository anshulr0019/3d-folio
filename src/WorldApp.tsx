import React, { useEffect, useRef, useState, useCallback } from "react";
import { Experience, GameState } from "./portfolio/Experience";
import type { Zone } from "./portfolio/World";
import { ModalContent } from "./portfolio/ModalContent";
import { CONTENT } from "./portfolio/content";
import { sound } from "./portfolio/Audio";
import { ArcadeGame } from "./portfolio/ArcadeGame";
import { QUALITY_LABELS, resolveQuality, type Quality, type RenderQuality } from "./portfolio/quality";

// ─────────────────────────────────────────────────────────────────────────────
// Cinematic Overlay
// ─────────────────────────────────────────────────────────────────────────────
function CinematicOverlay({ onSkip, name, role }: { onSkip: () => void; name: string; role: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 200); }, []);

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Letterbox bars – cinematic aspect ratio feel */}
      <div className="absolute top-0 left-0 right-0 h-[10vh] bg-black" />
      <div className="absolute bottom-0 left-0 right-0 h-[10vh] bg-black" />

      {/* Center title card */}
      <div className="text-center px-8 select-none">
        <p className="text-indigo-400 text-sm font-semibold tracking-[0.35em] uppercase mb-3 opacity-80">
          Interactive Portfolio Experience
        </p>
        <h1
          className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4"
          style={{ textShadow: "0 0 60px rgba(139,92,246,0.9), 0 0 120px rgba(99,102,241,0.5)" }}
        >
          {name}
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium tracking-wide">{role}</p>
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute bottom-[14vh] right-8 pointer-events-auto px-5 py-2.5 rounded-xl border border-white/20 bg-black/40 backdrop-blur-md text-sm text-slate-300 hover:text-white hover:border-white/40 transition-all active:scale-95"
      >
        Skip ↩
      </button>
    </div>
  );
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
  const steps = [
    { title: "Welcome to my world", sub: "An interactive 3D portfolio experience" },
    { title: "Explore the studio & street", sub: "Play arcade games in the room or walk outside to explore houses" },
    { title: "Visit the street buildings", sub: "Each building holds a section of my portfolio" },
    { title: "Press E to interact", sub: "Step into a glowing ring near a building or arcade and press E" },
  ];

  const advance = useCallback(() => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else onDone();
  }, [step, steps.length, onDone]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-40">
      <div className="text-center max-w-lg px-6 glass-panel p-8 rounded-3xl border border-white/20 shadow-2xl animate-modal-in">
        <div className="flex gap-2 justify-center mb-8">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-10 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" : i < step ? "w-4 bg-indigo-600/60" : "w-4 bg-white/20"
              }`}
            />
          ))}
        </div>

        <h2 className="text-3xl md:text-5xl font-black mb-4 text-white leading-tight tracking-tight">
          {steps[step].title}
        </h2>
        <p className="text-slate-300 text-lg mb-8 leading-relaxed">{steps[step].sub}</p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onDone}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Skip Intro
          </button>
          <button
            onClick={advance}
            className="px-7 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 text-sm"
          >
            {step < steps.length - 1 ? "Next →" : "Start Exploring 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD
// ─────────────────────────────────────────────────────────────────────────────
function ZoneEntryBanner({ banner }: { banner: { title: string; subtitle: string; icon: string; color: string } }) {
  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-hud-fade-up">
      <div
        className="glass-panel px-7 py-3.5 rounded-3xl border-2 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex items-center gap-4 backdrop-blur-xl"
        style={{ borderColor: banner.color }}
      >
        <span className="text-3xl filter drop-shadow-md">{banner.icon}</span>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">DISTRICT ENTRY</div>
          <div className="text-lg font-extrabold text-white tracking-wide">{banner.title}</div>
          <div className="text-xs font-medium text-slate-300">{banner.subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function PhotoModeOverlay({
  onCapture,
  onExit,
}: {
  onCapture: () => void;
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="flex justify-center">
        <div className="glass-pill px-6 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center gap-3 shadow-2xl border border-white/20">
          <span className="text-amber-400 text-sm">📸</span>
          <span className="font-bold tracking-wider">PHOTO MODE</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center items-center gap-4 pointer-events-auto">
        <button
          onClick={onCapture}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center gap-2 transition-all active:scale-95 border border-indigo-400/40 cursor-pointer"
        >
          <span>📸</span> Save snapshot
        </button>
        <button
          onClick={onExit}
          className="glass-panel px-5 py-3 rounded-2xl text-slate-300 hover:text-white font-semibold text-sm shadow-xl transition-all active:scale-95 border border-white/10 cursor-pointer"
        >
          ✕ Exit [P / ESC]
        </button>
      </div>
    </div>
  );
}

function DevStatsPanel({ exp }: { exp: Experience | null }) {
  const [fps, setFps] = useState(60);
  const [coords, setCoords] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(exp?.fps ?? 0);
      if (exp?.character) {
        const p = exp.character.group.position;
        setCoords({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 10) / 10 });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [exp]);

  return (
    <div className="fixed top-20 right-4 z-40 glass-panel p-3.5 rounded-2xl text-[11px] font-mono text-emerald-400 space-y-1 shadow-2xl border border-emerald-500/30">
      <div className="font-bold text-white flex items-center justify-between gap-4">
        <span>⚡ DEV MONITOR</span>
        <span className="text-emerald-400">{fps} FPS</span>
      </div>
      <div className="text-slate-300">Pos: X:{coords.x} Y:{coords.y} Z:{coords.z}</div>
      <div className="text-slate-400">Renderer: WebGL2 (ACES Filmic)</div>
      <div className="text-slate-400">Quality: {exp?.quality ?? "balanced"}</div>
    </div>
  );
}

function HUD({
  state,
  nearestZone,
  onInteract,
  location,
  gemsCount,
  onTogglePhotoMode,
}: {
  state: GameState;
  nearestZone: Zone | null;
  onInteract: () => void;
  location: "room" | "street";
  gemsCount: { collected: number; total: number };
  onTogglePhotoMode: () => void;
}) {
  const isPlaying = state === "ROOM" || state === "STREET";
  const [muted, setMuted] = useState(sound.isMuted());

  const toggleSound = () => {
    const isMutedNow = sound.toggleMute();
    setMuted(isMutedNow);
  };

  return (
    <>
      {/* Top left - Location badge, Audio toggle, Gems counter & Photo Mode */}
      {isPlaying && (
        <div className="world-hud fixed top-4 left-4 z-20 flex flex-wrap items-center gap-2.5 animate-hud-slide-left">
          <div className="glass-pill px-4 py-2 text-xs font-semibold text-slate-100 flex items-center gap-2 shadow-xl rounded-2xl border border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            {location === "room" ? "🏠 Developer Studio" : "🌆 Story Boulevard"}
          </div>
          <button
            onClick={toggleSound}
            className="glass-pill p-2.5 rounded-2xl text-slate-300 hover:text-white transition-all shadow-xl active:scale-95 border border-white/10 hover:border-indigo-400/40"
            title={muted ? "Unmute Audio" : "Mute Audio"}
          >
            {muted ? "🔇" : "🔊"}
          </button>

          {/* Skill Gems counter */}
          <div className="glass-pill px-3.5 py-2 rounded-2xl text-xs font-bold text-cyan-300 flex items-center gap-1.5 shadow-xl border border-cyan-500/30">
            <span>💎</span>
            <span>{gemsCount.collected}/{gemsCount.total} Skills</span>
          </div>

          {/* Photo Mode trigger */}
          <button
            onClick={onTogglePhotoMode}
            className="glass-pill px-3.5 py-2 rounded-2xl text-xs font-bold text-amber-300 hover:text-white border border-amber-500/30 hover:border-amber-400/60 flex items-center gap-1.5 transition-all shadow-xl active:scale-95"
            title="Enter Photo Mode [P]"
          >
            <span>📸</span>
            <span>Photo</span>
            <span className="text-[10px] opacity-60 ml-0.5">[P]</span>
          </button>
        </div>
      )}

      {/* Bottom center - Controls indicator */}
      {isPlaying && (
        <div className="desktop-controls fixed bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-hud-fade-up">
          <div className="glass-panel rounded-2xl px-5 py-2.5 text-xs text-slate-300 flex items-center gap-4 shadow-2xl border border-white/10">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-white shadow-sm">WASD</kbd>
              <span className="text-slate-400 font-medium text-[11px]">Move</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-white shadow-sm">Space</kbd>
              <span className="text-slate-400 font-medium text-[11px]">Jump</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-white shadow-sm">Shift</kbd>
              <span className="text-slate-400 font-medium text-[11px]">Sprint</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-white shadow-sm">E</kbd>
              <span className="text-slate-400 font-medium text-[11px]">Interact</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-white shadow-sm">P</kbd>
              <span className="text-slate-400 font-medium text-[11px]">Photo</span>
            </div>
          </div>
        </div>
      )}

      {/* Zone interaction prompt */}
      {isPlaying && nearestZone && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 animate-bounce-slow pointer-events-none">
          <div
            className="glass-panel border-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            style={{ borderColor: `#${nearestZone.color.toString(16).padStart(6, "0")}` }}
          >
            <kbd
              className="px-3 py-1 rounded-xl text-xs font-extrabold border border-white/30 bg-indigo-600 hover:bg-indigo-500 cursor-pointer pointer-events-auto shadow-md transition-all active:scale-95"
              onClick={onInteract}
            >
              [E] INTERACT
            </kbd>
            <span>
              {nearestZone.id === "arcade" ? "Play " : "Explore "}
              <span className="neon-text-glow" style={{ color: `#${nearestZone.color.toString(16).padStart(6, "0")}` }}>
                {nearestZone.label}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Door hint in room */}
      {state === "ROOM" && !nearestZone && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse-glow">
          <div className="glass-panel border border-indigo-500/40 rounded-2xl px-5 py-2.5 text-xs text-indigo-300 font-medium flex items-center gap-2 shadow-lg">
            <span>🚪</span>
            <span>Walk toward the exit door to enter Boulevard</span>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover Tooltip
// ─────────────────────────────────────────────────────────────────────────────
function HoverTooltip({
  data,
}: {
  data: { id: string; label: string; screenX: number; screenY: number };
}) {
  return (
    <div
      className="fixed pointer-events-none z-40 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded-xl glass-panel border border-cyan-400/50 text-xs font-bold text-cyan-200 shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-md"
      style={{ left: data.screenX, top: data.screenY - 8 }}
    >
      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span>{data.label}</span>
      <span className="text-[10px] text-slate-400 font-normal">Click or [E]</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────
function Modal({
  sectionId,
  onClose,
}: {
  sectionId: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const labels: Record<string, string> = {
    about: "About Me",
    skills: "Skills & Capabilities",
    projects: "Featured Projects",
    experience: "Education",
    contact: "Get In Touch",
    desk: "Workstation & Dev Terminal",
    showcase: "Live Projects",
    library: "Reading Lounge & Dev Philosophy",
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => { window.removeEventListener("keydown", handler); previous?.focus(); };
  }, [onClose]);

  if (sectionId === "arcade") {
    return <ArcadeGame onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={labels[sectionId] ?? sectionId} tabIndex={-1} className="w-full max-w-xl max-h-[85vh] glass-panel rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-modal-in border border-white/15">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-black text-white tracking-wide">{labels[sectionId] ?? sectionId}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-slate-300 hover:text-white flex items-center justify-center text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 scrollbar-thin">
          <ModalContent sectionId={sectionId} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors px-4 py-2 rounded-xl bg-white/5 border border-white/10"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Joystick
// ─────────────────────────────────────────────────────────────────────────────
function MobileJoystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const handleStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touchId.current = t.identifier;
    startPos.current = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  };

  const handleMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== touchId.current) continue;
      const dx = (t.clientX - startPos.current.x) / 55;
      const dy = (t.clientY - startPos.current.y) / 55;
      const mx = Math.max(-1, Math.min(1, dx));
      const my = Math.max(-1, Math.min(1, dy));
      onMove(mx, my);
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${mx * 24}px), calc(-50% + ${my * 24}px))`;
      }
    }
    e.preventDefault();
  };

  const handleEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        touchId.current = null;
        onMove(0, 0);
        if (knobRef.current) {
          knobRef.current.style.transform = "translate(-50%, -50%)";
        }
      }
    }
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="w-28 h-28 rounded-full bg-white/8 border border-white/15 relative touch-none"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <div
        ref={knobRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/25 border border-white/30 transition-transform duration-75"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md border border-indigo-500/40 rounded-2xl px-5 py-3 text-sm text-white shadow-xl animate-slide-down">
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function WorldApp({ quality, onExit }: { quality: Quality; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expRef = useRef<Experience | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [activeQuality, setActiveQuality] = useState<RenderQuality>(() => resolveQuality(quality));
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
  const [zoneBanner, setZoneBanner] = useState<{ title: string; subtitle: string; icon: string; color: string } | null>(null);
  const isTouchDevice = "ontouchstart" in window;

  const showToast = useCallback((msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  const triggerZoneBanner = useCallback((title: string, subtitle: string, icon: string, color = "#818cf8") => {
    setZoneBanner({ title, subtitle, icon, color });
    setTimeout(() => setZoneBanner(null), 2800);
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
      if (zone) {
        sound.playZoneChime();
        triggerZoneBanner(zone.label, "Interactive Exploration Hub", "📍", `#${zone.color.toString(16).padStart(6, "0")}`);
      }
    });

    exp.on("hoverObject", (obj: any) => {
      setHoveredObj(obj);
    });

    exp.on("openModal", (id: string) => {
      setModalSection(id);
      setVisited(previous => previous.includes(id) ? previous : [...previous, id]);
    });

    exp.on("closeModal", () => {
      setModalSection(null);
    });

    exp.on("gemCollected", ({ gem, count, total }: any) => {
      setGemsCount({ collected: count, total });
      showToast(`✨ Collected ${gem.name} (+${gem.exp} XP)! [${count}/${total} Found]`, 3500);
    });

    exp.on("companionDialogue", (quote: string) => {
      showToast(`🤖 Byte: "${quote}"`, 4000);
    });

    exp.on("partyMode", () => {
      showToast("🎉 SECRET DISCO PARTY MODE ACTIVATED! 🪩", 4500);
    });

    exp.on("photoModeChange", (active: boolean) => {
      setPhotoMode(active);
      if (active) showToast("📸 Photo Mode active! Drag to orbit, scroll to zoom.", 3000);
    });

    exp.on("enterStreet", () => {
      triggerZoneBanner("Story Boulevard", "Featured Projects & Architecture District", "🌆", "#38bdf8");
    });

    exp.on("enterRoom", () => {
      triggerZoneBanner("Developer Studio", "Creative Workspace & Terminal specs", "🏠", "#a855f7");
    });

    exp.on("qualityChange", (q: RenderQuality) => setActiveQuality(q));
    exp.on("contextLost", () => setError("The graphics connection was interrupted. Return to the portfolio and try Lite quality."));
    exp.on("error", () => setError("This device couldn’t finish rendering the world. Your projects are still available in the portfolio."));
    await exp.init(progress => setLoadProgress(progress));
  }, [showToast, triggerZoneBanner, quality]);

  useEffect(() => {
    let active = true;
    // Let React paint the loading view before constructing the scene.
    const timer = window.setTimeout(() => {
      initEngineInBackground().catch(() => {
        if (active) setError("This browser couldn’t open the 3D world. You can still explore all my work in the portfolio.");
      });
    }, 0);
    const deadline = window.setTimeout(() => {
      if (active && expRef.current?.state === "LOADING") setError("Loading is taking longer than expected. Try Lite quality for a smaller download.");
    }, 60000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(deadline);
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
    triggerZoneBanner("Developer Studio", "Creative Workspace & Terminal Specs", "🏠", "#a855f7");
  }, [triggerZoneBanner]);

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

  const handleCapturePhoto = useCallback(() => {
    const dataUrl = expRef.current?.captureScreenshot();
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Anshul-Kumar-Portfolio-Photo-${Date.now()}.png`;
      a.click();
      showToast("💾 Snapshot saved!", 3000);
    }
  }, [showToast]);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    const exp = expRef.current;
    if (!exp) return;
    exp.joystick = { x, y };
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

  return (
    <div className="fixed inset-0 bg-[#0f0f1a] overflow-hidden select-none">
      <button className="world-back" onClick={onExit}>← Portfolio</button>
      {error && <div className="world-loading world-error" role="alert"><h1>Let’s take the simpler route.</h1><p>{error}</p><button onClick={onExit}>View portfolio</button></div>}
      {uiState === "playing" && !photoMode && !modalSection && <details className="explorer-menu">
        <summary>Explore & settings <span>＋</span></summary>
        <div className="explorer-content"><p className="eyebrow">YOUR DISCOVERY TRAIL</p>
          <p>{["about", "projects", "skills", "experience", "contact"].filter(id => visited.includes(id)).length} / 5 chapters explored</p>
          <div className="explorer-chapters">{[["about", "About me"], ["projects", "Projects"], ["skills", "Skills"], ["experience", "Education"], ["contact", "Contact"]].map(([id, label]) => <button key={id} onClick={e => { expRef.current?.openModal(id); e.currentTarget.closest("details")?.removeAttribute("open"); }}>{visited.includes(id) ? "✓" : "○"} {label} <span>↗</span></button>)}</div>
          <div className="explorer-travel"><button onClick={() => expRef.current?.travelTo("room")}>⌂ Studio</button><button onClick={() => expRef.current?.travelTo("projects")}>↗ Project district</button><button onClick={() => expRef.current?.respawn()}>↺ Unstuck</button></div>
          <label htmlFor="render-quality">Visual quality</label><select id="render-quality" value={activeQuality} onChange={e => expRef.current?.setQuality(e.target.value as RenderQuality)}>{(["low", "balanced", "high"] as const).map(q => <option key={q} value={q}>{QUALITY_LABELS[q].split(" ·")[0]}</option>)}</select>
          <p className="explorer-note">Auto lowers effects if frames run slowly. Full avatar downloads are chosen before entering.</p>
        </div></details>}
      {/* Three.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block z-0"
      />

      {/* Loading */}
      {uiState === "loading" && (
        <LoadingScreen
          progress={loadProgress}
          onStart={startExperience}
        />
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

      {/* HUD (hidden when in photo mode) */}
      {uiState === "playing" && !photoMode && (
        <HUD
          state={gameState}
          nearestZone={nearestZone}
          onInteract={handleInteract}
          location={location}
          gemsCount={gemsCount}
          onTogglePhotoMode={handleTogglePhotoMode}
        />
      )}

      {/* Photo Mode Overlay */}
      {uiState === "playing" && photoMode && (
        <PhotoModeOverlay
          onCapture={handleCapturePhoto}
          onExit={handleTogglePhotoMode}
        />
      )}

      {/* Zone Entry Banner */}
      {zoneBanner && !photoMode && uiState === "playing" && (
        <ZoneEntryBanner banner={zoneBanner} />
      )}

      {/* Developer Monitor Stats */}
      {showDevStats && !photoMode && uiState === "playing" && (
        <DevStatsPanel exp={expRef.current} />
      )}

      {/* 3D Hover Tooltip */}
      {hoveredObj && uiState === "playing" && !modalSection && !photoMode && (
        <HoverTooltip data={hoveredObj} />
      )}

      {/* Modal */}
      {modalSection && (
        <Modal sectionId={modalSection} onClose={handleCloseModal} />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}

      {/* Mobile controls */}
      {uiState === "playing" && isTouchDevice && !photoMode && !modalSection && (
        <div className="fixed bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
          <div className="pointer-events-auto">
            <MobileJoystick onMove={handleJoystickMove} />
          </div>
          <div className="flex flex-col gap-3 pointer-events-auto">
            <button
              className="w-16 h-16 rounded-full bg-black/50 border border-white/20 text-white font-bold text-sm backdrop-blur-md active:bg-white/20 transition-colors"
              onClick={handleInteract} aria-label="Interact with nearby object"
            >
              Explore
            </button>
            <button className="w-16 h-16 rounded-full bg-black/60 border border-white/20 text-white text-xs font-bold touch-none" aria-label="Jump"
              onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); expRef.current?.keys.add("Space"); }}
              onPointerUp={() => expRef.current?.keys.delete("Space")} onPointerCancel={() => expRef.current?.keys.delete("Space")} onLostPointerCapture={() => expRef.current?.keys.delete("Space")}>Jump</button>
          </div>
        </div>
      )}
    </div>
  );
}
