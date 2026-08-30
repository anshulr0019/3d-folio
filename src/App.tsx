import React, { useEffect, useRef, useState, useCallback } from "react";
import { Experience, GameState } from "./portfolio/Experience";
import { Zone, DayNightMode } from "./portfolio/World";
import { ModalContent } from "./portfolio/ModalContent";
import { CONTENT } from "./portfolio/content";
import { sound } from "./portfolio/Audio";
import { ArcadeGame } from "./portfolio/ArcadeGame";
import { WeatherType } from "./portfolio/Weather";

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

import { CharacterShowcaseCanvas } from "./portfolio/CharacterShowcaseCanvas";

// ─────────────────────────────────────────────────────────────────────────────
// Loading Screen & Hero Landing
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen({ progress, onStart }: { progress: number; onStart: () => void }) {
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState("Initializing WebGL Engine...");

  useEffect(() => {
    if (progress < 25) {
      setStatusText("Initializing WebGL Engine...");
    } else if (progress < 50) {
      setStatusText("Loading 3D Studio & Boulevard Geometry...");
    } else if (progress < 75) {
      setStatusText("Sculpting 3D Character Mesh & Rig...");
    } else if (progress < 99) {
      setStatusText("Compiling Shaders & Post-Processing Bloom...");
    } else {
      setStatusText("✨ 3D World Ready to Explore!");
    }

    if (progress >= 100) {
      setTimeout(() => setReady(true), 200);
    }
  }, [progress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((ready || progress >= 100) && (e.code === "Enter" || e.key === "Enter")) {
        try {
          ;(sound as any).playClick()
        } catch {}
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ready, progress, onStart]);

  const handleEnterWorld = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      ;(sound as any).playClick()
    } catch {}
    onStart();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06060c] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Background Radial Glow & Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/25 via-[#06060c] to-[#040408] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(168,85,247,0.15),transparent_40%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{ 
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)", 
          backgroundSize: "28px 28px" 
        }} 
      />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/30 text-sm">
            3D
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Interactive Story</p>
            <p className="text-xs font-medium text-slate-400">Portfolio Environment</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 glass-pill px-4 py-1.5 rounded-full border border-white/10 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Three.js • WebGL 2.0 • GSAP</span>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4 my-auto">
        {/* Left Column: Text & Hero Branding */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 glass-pill px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
            ✦ 3D EXPERIENCE PORTFOLIO ✦
          </div>

          {/* Hero Name & Title */}
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-none">
              <span className="bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                {CONTENT.brand.name}
              </span>
            </h1>
            <p className="text-xl sm:text-2xl font-semibold text-indigo-400/90 tracking-wide font-mono">
              {CONTENT.brand.role}
            </p>
          </div>

          {/* Bio Snippet & Feature Badges */}
          <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
            Step directly into an interactive 3D studio & boulevard. Explore projects, skills, retro arcade games, and contact monuments as a playable character.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {["🕹️ Playable 3D World", "🌆 Story Boulevard", "🎮 Retro Arcade", "🏛️ Contact Plaza"].map((chip, idx) => (
              <span key={idx} className="glass-panel px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-300 shadow-md">
                {chip}
              </span>
            ))}
          </div>

          {/* Loading & Enter World Section */}
          <div className="pt-6 space-y-4 max-w-md">
            {!ready ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-2 text-indigo-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    {statusText}
                  </span>
                  <span className="font-bold text-white tabular-nums">{Math.round(progress)}%</span>
                </div>

                {/* Progress Bar Container */}
                <div className="h-3 w-full bg-slate-900/90 rounded-full p-0.5 border border-white/10 shadow-inner overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 transition-all duration-200 shadow-[0_0_15px_rgba(168,85,247,0.8)] relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/80 blur-[2px] rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-modal-in">
                <button
                  onClick={handleEnterWorld}
                  className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right text-white font-extrabold text-lg tracking-wide transition-all duration-500 hover:scale-[1.03] active:scale-95 shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-indigo-400/40 flex items-center justify-center gap-3 group cursor-pointer"
                >
                  <span>ENTER WORLD</span>
                  <span className="text-xl transition-transform group-hover:translate-x-2">➔</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 3D Character Showcase Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-full max-w-sm aspect-square rounded-3xl glass-panel border border-indigo-500/20 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex items-center justify-center group overflow-hidden">
            {/* Ambient Backlight Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />

            {/* Avatar Badge */}
            <div className="absolute top-4 left-4 z-10 glass-pill px-3 py-1 rounded-full text-[11px] font-bold text-indigo-300 border border-white/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CUSTOM 3D AVATAR</span>
            </div>

            {/* Live 3D Canvas */}
            <CharacterShowcaseCanvas />

            <div className="absolute bottom-3 text-center z-10 text-[11px] font-medium text-slate-400 pointer-events-none">
              Hover to interact & tilt preview
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Quick Controls */}
      <footer className="relative z-10 w-full px-8 py-4 flex flex-wrap items-center justify-between border-t border-white/5 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-300">Controls:</span>
          <span><kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono">WASD</kbd> Move</span>
          <span><kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono">Space</kbd> Jump</span>
          <span><kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono">E</kbd> Interact</span>
        </div>
        <div className="text-slate-500">
          © {new Date().getFullYear()} {CONTENT.brand.name} • 3D Web Portfolio
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition Overlay: "Entering Anshul's World..."
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Premium Awwwards-Grade Transition Screen: "Entering Anshul's World..."
// ─────────────────────────────────────────────────────────────────────────────
function EnteringWorldOverlay() {
  const [logIndex, setLogIndex] = useState(0);
  const logs = [
    "INITIALIZING THREE.JS WEBGL RENDER ENGINE",
    "COMPILING HIGH-PRECISION SHADERS & ATMOSPHERE",
    "PRE-BUILDING 3D STUDIO & BOULEVARD ENVIRONMENT",
    "SYNCHRONIZING AUDIO SOUNDSCAPE & CHARACTER PHYSICS",
    "WORLD WARMUP COMPLETE • LAUNCHING EXPERIENCE",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setLogIndex((prev) => (prev < logs.length - 1 ? prev + 1 : prev));
    }, 280);
    return () => clearInterval(timer);
  }, [logs.length]);

  return (
    <div className="fixed inset-0 z-50 bg-[#04040a] text-white flex flex-col items-center justify-between p-8 select-none overflow-hidden animate-fade-in font-sans">
      {/* Background Parallax Stars & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.18)_0%,rgba(168,85,247,0.08)_40%,transparent_75%)] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}
      />

      {/* Top Bar Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
          <span className="text-xs font-mono tracking-widest text-slate-300 uppercase">ANSHUL RIVERA • 3D ENVIRONMENT</span>
        </div>
        <div className="text-xs font-mono text-indigo-400/90 tracking-wider">
          SYSTEM_STATUS: PREWARMING_GPU
        </div>
      </header>

      {/* Center Hero Visual & Title */}
      <main className="relative z-10 flex flex-col items-center text-center my-auto space-y-8 max-w-2xl px-4">
        {/* 3D Holographic Diamond Portal Ring */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer glowing pulsing orb */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 blur-xl animate-pulse" />
          
          {/* Rotating outer ring */}
          <div className="absolute inset-0 rounded-2xl border border-indigo-500/40 border-t-indigo-400 animate-spin" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-2 rounded-2xl border border-purple-500/30 border-b-pink-400 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }} />
          
          {/* Center Badge */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center font-black text-xl text-white shadow-[0_0_25px_rgba(99,102,241,0.5)]">
            AR
          </div>
        </div>

        {/* Text Container */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-[11px] font-mono tracking-widest text-indigo-300 uppercase">
            ✦ ENTERING ANSHUL'S WORLD ✦
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-indigo-200">
            ANSHUL RIVERA
          </h1>

          <p className="text-sm sm:text-base font-medium text-slate-400 tracking-wide max-w-md mx-auto">
            Preparing an interactive 3D story portfolio, custom studio interior & virtual boulevard.
          </p>
        </div>

        {/* Realtime Terminal Status Ticker */}
        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/10 p-3.5 shadow-2xl font-mono text-left space-y-1 text-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-500 border-b border-white/5 pb-1 mb-1">
            <span>CONSOLE LOG</span>
            <span className="text-indigo-400">FPS: 60 TARGET</span>
          </div>
          <div className="flex items-center gap-2 text-indigo-300">
            <span className="text-emerald-400 font-bold">➔</span>
            <span className="truncate">{logs[logIndex]}</span>
          </div>
        </div>
      </main>

      {/* Bottom Progress Bar */}
      <footer className="relative z-10 w-full max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>LOADING ENVIRONMENT</span>
          <span className="text-indigo-400 font-bold">{Math.round(((logIndex + 1) / logs.length) * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out shadow-[0_0_10px_#818cf8]"
            style={{ width: `${((logIndex + 1) / logs.length) * 100}%` }}
          />
        </div>
      </footer>
    </div>
  );
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
function HUD({
  state,
  nearestZone,
  onInteract,
  location,
}: {
  state: GameState;
  nearestZone: Zone | null;
  onInteract: () => void;
  location: "room" | "street";
}) {
  const isPlaying = state === "ROOM" || state === "STREET";
  const [muted, setMuted] = useState(sound.isMuted());

  const toggleSound = () => {
    const isMutedNow = sound.toggleMute();
    setMuted(isMutedNow);
  };

  return (
    <>
      {/* Top left - Location badge & Audio toggle */}
      {isPlaying && (
        <div className="fixed top-4 left-4 z-20 flex items-center gap-2.5 animate-hud-slide-left">
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
        </div>
      )}

      {/* Top right - Minimap radar */}
      {isPlaying && location === "street" && (
        <div className="fixed top-4 right-4 z-20 glass-panel p-4 rounded-3xl text-xs text-slate-300 max-w-[180px] animate-hud-slide-right shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
            <span className="font-extrabold text-white tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🧭</span> MAP RADAR
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shadow-[0_0_8px_#818cf8]" />
          </div>
          {[
            { name: "About Me", color: "bg-pink-400" },
            { name: "Skills", color: "bg-emerald-400" },
            { name: "Projects", color: "bg-amber-400" },
            { name: "Experience", color: "bg-indigo-400" },
            { name: "Contact", color: "bg-rose-400" },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-2 mb-1.5 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${item.color} shadow-sm`} />
              <span className="text-slate-200 font-medium">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom center - Controls indicator */}
      {isPlaying && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-hud-fade-up">
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
  const labels: Record<string, string> = {
    about: "About Me",
    skills: "Skills & Capabilities",
    projects: "Featured Projects",
    experience: "Work Experience",
    contact: "Get In Touch",
    desk: "Workstation & Dev Terminal",
    showcase: "Showcase & Awards",
    library: "Reading Lounge & Dev Philosophy",
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (sectionId === "arcade") {
    return <ArcadeGame onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl max-h-[85vh] glass-panel rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-modal-in border border-white/15">
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
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expRef = useRef<Experience | null>(null);

  const [loadProgress, setLoadProgress] = useState(0);
  const [uiState, setUiState] = useState<"loading" | "entering" | "cinematic" | "intro" | "playing">("loading");
  const [gameState, setGameState] = useState<GameState>("LOADING");
  const [nearestZone, setNearestZone] = useState<Zone | null>(null);
  const [modalSection, setModalSection] = useState<string | null>(null);
  const [location, setLocation] = useState<"room" | "street">("room");
  const [hoveredObj, setHoveredObj] = useState<{ id: string; label: string; screenX: number; screenY: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isTouchDevice = "ontouchstart" in window;

  const showToast = useCallback((msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  // ── Pre-initialize Experience in background ──
  const initEngineInBackground = useCallback(async () => {
    if (!canvasRef.current || expRef.current) return;

    const exp = new Experience(canvasRef.current);
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

    exp.on("dayNightChange", (mode: DayNightMode) => {
      setDayNightMode(mode);
    });

    exp.on("openModal", (id: string) => {
      setModalSection(id);
    });

    exp.on("closeModal", () => {
      setModalSection(null);
    });

    exp.on("enterStreet", () => {
      showToast("🌆 Welcome to the street! Visit a building or billboard to explore.");
    });

    exp.on("enterRoom", () => {
      showToast("🏠 Back in the room.");
    });

    exp.on("keydown", (code: string) => {
      if (code === "KeyE") handleInteract();
    });

    await exp.init();
  }, [showToast]);

  // ── Simulate loading progress & background engine init ──────
  useEffect(() => {
    let prog = 0;
    const id = setInterval(() => {
      prog += Math.random() * 12 + 4;
      if (prog >= 100) {
        prog = 100;
        clearInterval(id);
        initEngineInBackground();
      }
      setLoadProgress(Math.min(100, prog));
    }, 120);
    return () => clearInterval(id);
  }, [initEngineInBackground]);

  // ── User Clicks ENTER WORLD ────────────────────────
  const startExperience = useCallback(async () => {
    setUiState("entering");

    if (!expRef.current && canvasRef.current) {
      await initEngineInBackground();
    }

    setTimeout(() => {
      setUiState("cinematic");
      expRef.current?.playCinematic();
    }, 1200);
  }, [initEngineInBackground]);

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
    showToast("🎮 Move with WASD. Press [F] to inspect objects, [N] to toggle Day/Night!");
  }, [showToast]);

  const handleInteract = useCallback(() => {
    const exp = expRef.current;
    if (!exp) return;
    const zone = exp.nearestZone;
    if (zone) {
      if (zone.id === "contact_linkedin") {
        window.open("https://linkedin.com", "_blank");
      } else if (zone.id === "contact_github") {
        window.open("https://github.com", "_blank");
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

  const handleJoystickMove = useCallback((x: number, y: number) => {
    const exp = expRef.current;
    if (!exp) return;
    exp.joystick = { x, y };
  }, []);

  // ── Keyboard E / F for interact ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const exp = expRef.current;
      if (!exp) return;

      if (e.code === "KeyE" || e.code === "KeyF") {
        const zone = exp.nearestZone;
        if (zone && (gameState === "STREET" || gameState === "ROOM")) {
          handleInteract();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, handleInteract]);

  return (
    <div className="fixed inset-0 bg-[#0f0f1a] overflow-hidden">
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

      {/* Transition: Entering Anshul's World... */}
      {uiState === "entering" && <EnteringWorldOverlay />}

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

      {/* HUD */}
      {uiState === "playing" && (
        <HUD
          state={gameState}
          nearestZone={nearestZone}
          onInteract={handleInteract}
          location={location}
        />
      )}

      {/* 3D Hover Tooltip */}
      {hoveredObj && uiState === "playing" && !modalSection && (
        <HoverTooltip data={hoveredObj} />
      )}

      {/* Modal */}
      {modalSection && (
        <Modal sectionId={modalSection} onClose={handleCloseModal} />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} />}

      {/* Mobile controls */}
      {uiState === "playing" && isTouchDevice && (
        <div className="fixed bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
          <div className="pointer-events-auto">
            <MobileJoystick onMove={handleJoystickMove} />
          </div>
          <div className="flex flex-col gap-3 pointer-events-auto">
            <button
              className="w-16 h-16 rounded-full bg-black/50 border border-white/20 text-white font-bold text-sm backdrop-blur-md active:bg-white/20 transition-colors"
              onTouchStart={(e) => { e.preventDefault(); handleInteract(); }}
            >
              E
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
