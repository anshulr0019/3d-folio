import { createContext, useContext, Component, useState, useRef, useCallback, useEffect, useMemo, type ReactNode, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import { WorldEntryOverlay } from "./components/WorldEntryOverlay";
import SelectedWork from "./components/SelectedWork";
import HeroWorldPreview from "./components/HeroWorldPreview";
import { useSmoothScroll } from "./components/SmoothScrollProvider";
import { usePortfolioMotion } from "./components/usePortfolioMotion";
import { CONTENT } from "./portfolio/content";
import { readQuality, type Quality } from "./portfolio/quality";
import { prefersLightweightExperience } from "./portfolio/deviceBudget";

const WorldExitContext = createContext(() => {});
function WorldChunkFallback({ error }: { error?: Error | null }) {
  const onExit = useContext(WorldExitContext);
  return <WorldEntryOverlay progress={0} error={error ? "The 3D files couldn’t load. You can still explore all my work in the portfolio." : null} onExit={onExit} />;
}

const WorldApp = dynamic(() => import("./WorldApp"), {
  ssr: false,
  loading: WorldChunkFallback,
});
class WorldBoundary extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <WorldEntryOverlay progress={0} error="The world couldn’t open here. You can still explore every project in the portfolio." onExit={this.props.onExit} />;
    return this.props.children;
  }
}

/* Warm the chunk cache on intent so the transition starts sooner */
let _preloaded = false;
function loadWorld() {
  if (_preloaded) return;
  _preloaded = true;
  void import("./WorldApp").catch(() => { _preloaded = false; });
}
function preloadWorld() { if (!prefersLightweightExperience()) loadWorld(); }

const STOPS = [
  { number: "01", title: "The studio", detail: "Where ideas become experiments", icon: "⌘" },
  { number: "02", title: "The project campus", detail: "Projects, skills & a little curiosity", icon: "↗" },
  { number: "03", title: "The arcade", detail: "Take a break. Beat your score.", icon: "✳" },
  { number: "04", title: "Contact garden", detail: "Every good journey starts a conversation", icon: "◎" },
];

/**
 * App mode state machine:
 *   portfolio → loading → world → exiting → portfolio
 *
 * portfolio : 2D page only
 * loading   : 2D page visible, WorldApp mounted behind it (loading assets)
 * world     : WorldApp fullscreen, 2D unmounted
 * exiting   : 2D page fading in over WorldApp, then WorldApp unmounts
 */
type AppMode = "portfolio" | "loading" | "world" | "exiting";

export default function App() {
  const [mode, setMode] = useState<AppMode>("portfolio");
  const [quality, setQuality] = useState<Quality>("auto");
  const [filter, setFilter] = useState("All work");
  const [copied, setCopied] = useState(false);
  const [heroIntroPlayed, setHeroIntroPlayed] = useState(false);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const portfolioRef = useRef<HTMLElement>(null);
  const portfolioScrollRef = useRef(0);
  const { start: startSmoothScroll, stop: stopSmoothScroll } = useSmoothScroll();
  usePortfolioMotion(portfolioRef, mode === "portfolio");

  useEffect(() => {
    setQuality(readQuality());
  }, []);

  useEffect(() => {
    if (mode === "portfolio") startSmoothScroll();
    else stopSmoothScroll();
  }, [mode, startSmoothScroll, stopSmoothScroll]);

  /* ── Enter transition ────────────────────────── */
  const enterWorld = useCallback((e: MouseEvent<HTMLElement>) => {
    if (mode !== "portfolio") return;
    setHeroIntroPlayed(true);
    loadWorld();
    portfolioScrollRef.current = window.scrollY;
    setSourceRect(e.currentTarget.getBoundingClientRect());
    setMode("loading");
  }, [mode]);

  const handleEntranceComplete = useCallback(() => {
    setMode("world");
  }, []);

  /* ── Exit transition ─────────────────────────── */
  const exitWorld = useCallback(() => {
    setQuality(readQuality());
    setMode("exiting");
  }, []);

  /* When entering exit mode, fade the portfolio back in then finish */
  useEffect(() => {
    if (mode !== "exiting" || !portfolioRef.current) return;
    const el = portfolioRef.current;
    window.scrollTo({ top: portfolioScrollRef.current });
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    // Force reflow so the initial opacity: 0 is painted
    void el.offsetHeight;
    el.style.transition = "opacity 0.6s ease-out";
    el.style.opacity = "1";
    el.style.pointerEvents = "";
    const timer = setTimeout(() => {
      setMode("portfolio");
      setSourceRect(null);
      if (portfolioRef.current) {
        portfolioRef.current.style.transition = "";
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [mode]);

  /* ── Error fallback ──────────────────────────── */
  const resetToPortfolio = useCallback(() => {
    setQuality(readQuality());
    setMode("portfolio");
    setSourceRect(null);
    if (portfolioRef.current) {
      portfolioRef.current.style.opacity = "";
      portfolioRef.current.style.pointerEvents = "";
      portfolioRef.current.style.transition = "";
    }
  }, []);

  const showPortfolio = mode !== "world";
  const showWorld = mode === "loading" || mode === "world";

  const projects = useMemo(
    () => CONTENT.projects.filter(p => filter === "All work" || (filter === "3D & creative" ? p.tech.includes("Three.js") : !p.tech.includes("Three.js"))),
    [filter],
  );

  return (
    <>
      {showPortfolio && (
        <main ref={portfolioRef} className="portfolio-page" inert={mode === "loading"}>
          <a className="skip-link" href="#work">Skip to projects</a>
          <header className="folio-nav"><a className="wordmark" href="#home" aria-label="Anshul Kumar home">ak<span>®</span></a><nav aria-label="Main navigation"><a href="#work">Selected work</a><a href="#about">About</a><a className="nav-contact" href="#contact">Let's talk <span>↗</span></a></nav></header>
          <section id="home" className="folio-hero">
            <div
              className="hero-copy"
              data-intro={!heroIntroPlayed}
              onFocusCapture={() => setHeroIntroPlayed(true)}
              onPointerDownCapture={() => setHeroIntroPlayed(true)}
            >
              <div className="eyebrow"><span className="status-dot" /> {CONTENT.about.location} <span className="eyebrow-divider">/</span> Open to opportunities</div>
              <h1>
                <span className="hero-title-line"><span>I build things </span></span>
                <span className="hero-title-line"><span>for the <em>web.</em> </span></span>
                <span className="hero-title-line"><span className="hero-outline">And beyond.</span></span>
              </h1>
              <p className="hero-intro">I'm {CONTENT.brand.name}, a full-stack developer turning ideas into useful products and playful digital experiences.</p>
              <div className="hero-actions"><button className="primary-action" onClick={enterWorld} onPointerEnter={preloadWorld}>Enter my 3D world <span>↗</span></button><a className="text-action" href="#work">Explore my work <span>↓</span></a></div>
              <p className="quiet-note">Take the scenic route, or scroll straight to the work.</p>
            </div>
            <HeroWorldPreview active={mode === "portfolio"} onEnter={enterWorld} onIntent={preloadWorld} />
          </section>
          <div className="folio-strip"><span>IDEA → CODE → EXPERIENCE</span><span>React / Next.js / TypeScript / Three.js</span><span>SCROLL TO EXPLORE ↓</span></div>
          <SelectedWork filter={filter} projects={projects} onFilterChange={setFilter} onEnterWorld={enterWorld} />
          <section className="folio-section journey-section"><div className="section-heading"><div><p className="eyebrow">02 / THE SCENIC ROUTE</p><h2>A portfolio you can<br /><em>get a little lost in.</em></h2></div><button className="text-action" onClick={enterWorld}>Start exploring ↗</button></div><div className="journey-stops">{STOPS.map(stop => <button key={stop.number} onClick={enterWorld} onPointerEnter={preloadWorld}><span className="stop-number">{stop.number} <i>{stop.icon}</i></span><h3>{stop.title}</h3><p>{stop.detail}</p></button>)}</div></section>
          <section id="about" className="folio-section about-section"><div><p className="eyebrow">03 / THE PERSON BEHIND THE PIXELS</p><h2>Curiosity is<br />my default <em>setting.</em></h2><div className="about-monogram" aria-hidden="true">ak<span>✳</span></div></div><div className="about-copy">{CONTENT.about.bio.map(p => <p key={p}>{p}</p>)}<div className="about-skills">{CONTENT.skills.map(skill => <span key={skill.name}>{skill.name}</span>)}</div><div className="education-note"><span>CURRENTLY</span><strong>{CONTENT.education[0].degree}</strong><p>{CONTENT.education[0].institution}</p></div></div></section>
          <section id="contact" className="folio-section contact-section"><p className="eyebrow"><span className="status-dot" /> {CONTENT.contact.availability}</p><h2>Have something<br />in <em>mind?</em> <a href={`mailto:${CONTENT.contact.email}`} aria-label="Email Anshul">↗</a></h2><div className="contact-bottom"><div><a href={`mailto:${CONTENT.contact.email}`}>{CONTENT.contact.email}</a><button onClick={async () => { try { await navigator.clipboard.writeText(CONTENT.contact.email); setCopied(true); } catch { setCopied(false); } }} aria-label="Copy email address">{copied ? "Copied ✓" : "Copy ↗"}</button><span className="sr-only" role="status">{copied ? "Email address copied" : ""}</span></div><div className="social-links">{CONTENT.contact.socials.filter(s => s.name !== "Email").map(s => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{s.name} ↗</a>)}</div></div></section>
          <footer className="folio-footer"><a className="wordmark" href="#home">ak<span>®</span></a><span>© {new Date().getFullYear()} {CONTENT.brand.name}</span><span>Made with code & curiosity.</span><a href="#home">Back to top ↑</a></footer>
        </main>
      )}
      {showWorld && (
        <WorldExitContext.Provider value={resetToPortfolio}><WorldBoundary onExit={resetToPortfolio}>
          <WorldApp
            quality={quality}
            onExit={exitWorld}
            sourceRect={sourceRect}
            portfolioRef={portfolioRef}
            onEntranceComplete={handleEntranceComplete}
          />
        </WorldBoundary></WorldExitContext.Provider>
      )}
    </>
  );
}
