import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { CONTENT } from "./portfolio/content";
import { QUALITY_LABELS, readQuality, saveQuality, type Quality } from "./portfolio/quality";

const WorldApp = lazy(() => import("./WorldApp"));
class WorldBoundary extends Component<{ children: ReactNode; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="world-loading"><h1>The world couldn’t open here.</h1><p>You can still explore every project in the portfolio.</p><button onClick={this.props.onExit}>Back to portfolio</button></div>;
    return this.props.children;
  }
}
const STOPS = [
  { number: "01", title: "The studio", detail: "Where ideas become experiments", icon: "⌘" },
  { number: "02", title: "Story boulevard", detail: "Projects, skills & a little curiosity", icon: "↗" },
  { number: "03", title: "The arcade", detail: "Take a break. Beat your score.", icon: "✳" },
  { number: "04", title: "Contact plaza", detail: "Every good journey starts a conversation", icon: "◎" },
];
export default function App() {
  const [world, setWorld] = useState(false);
  const [quality, setQuality] = useState<Quality>(readQuality);
  const [filter, setFilter] = useState("All work");
  const [copied, setCopied] = useState(false);
  const exit = () => setWorld(false);
  if (world) return <WorldBoundary onExit={exit}><Suspense fallback={<div className="world-loading" role="status"><span className="loading-orbit" /><h1>Opening the world</h1><p>Getting your adventure ready.</p><button onClick={exit}>Back to portfolio</button></div>}><WorldApp quality={quality} onExit={exit} /></Suspense></WorldBoundary>;
  const projects = CONTENT.projects.filter(p => filter === "All work" || (filter === "3D & creative" ? p.tech.includes("Three.js") : !p.tech.includes("Three.js")));
  return (
    <main className="portfolio-page">
      <a className="skip-link" href="#work">Skip to projects</a>
      <header className="folio-nav"><a className="wordmark" href="#home" aria-label="Anshul Kumar home">ak<span>®</span></a><nav aria-label="Main navigation"><a href="#work">Selected work</a><a href="#about">About</a><a className="nav-contact" href="#contact">Let’s talk <span>↗</span></a></nav></header>
      <section id="home" className="folio-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> {CONTENT.about.location} <span className="eyebrow-divider">/</span> Open to opportunities</div>
          <h1>I build things<br />for the <em>web.</em><br /><span className="hero-outline">And beyond.</span></h1>
          <p className="hero-intro">I’m {CONTENT.brand.name}, a full-stack developer turning ideas into useful products and playful digital experiences.</p>
          <div className="hero-actions"><button className="primary-action" onClick={() => setWorld(true)}>Enter my 3D world <span>↗</span></button><a className="text-action" href="#work">Explore my work <span>↓</span></a></div>
          <div className="quality-choice"><label htmlFor="quality">Experience quality</label><select id="quality" value={quality} onChange={e => { const q = e.target.value as Quality; setQuality(q); saveQuality(q); }}>{Object.entries(QUALITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <p className="quiet-note">Take the scenic route, or scroll straight to the work.</p>
        </div>
        <button className="world-preview" onClick={() => setWorld(true)} aria-label="Explore the interactive 3D world">
          <div className="preview-header"><span><i /> AN INTERACTIVE LITTLE UNIVERSE</span><span>VOL. 01</span></div>
          <div className="mini-world" aria-hidden="true"><div className="world-orbit orbit-one" /><div className="world-orbit orbit-two" /><div className="map-island"><div className="map-road" /><div className="map-crosswalk" /><div className="map-building building-one"><span>STUDIO</span><i /><i /><i /></div><div className="map-building building-two"><span>MAKE</span><i /><i /></div><div className="map-building building-three"><span>PLAY</span><i /><i /></div><div className="map-tree tree-one" /><div className="map-tree tree-two" /><div className="map-tree tree-three" /><div className="map-person"><i /></div><div className="map-marker">✦</div></div><span className="map-caption caption-studio">01 / THE STUDIO</span><span className="map-caption caption-plaza">04 / SAY HELLO</span></div>
          <div className="preview-footer"><span>Small world.<br /><strong>Lots to discover.</strong></span><span className="preview-enter">↗</span></div>
        </button>
      </section>
      <div className="folio-strip"><span>IDEA → CODE → EXPERIENCE</span><span>React / Next.js / TypeScript / Three.js</span><span>SCROLL TO EXPLORE ↓</span></div>
      <section id="work" className="folio-section">
        <div className="section-heading"><div><p className="eyebrow">01 / SELECTED WORK</p><h2>Built with purpose.<br /><span>Made to be used.</span></h2></div><p>A few things I’ve brought to life,<br />from everyday tools to digital worlds.</p></div>
        <div className="project-filters" aria-label="Filter projects">{["All work", "Web apps", "3D & creative"].map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
        <div className="project-grid">{projects.map(project => {
          const index = CONTENT.projects.indexOf(project);
          return <article className={`project-card project-${index}`} key={project.title}>
            <div className="project-art" aria-hidden="true"><span className="project-index">0{index + 1} / {index === 2 ? "INTERACTIVE EXPERIENCE" : "WEB APPLICATION"}</span>{index === 0 ? <div className="art-date"><span>find your</span><strong>kind of<br /><em>connection.</em></strong><i>infyn ↗</i></div> : index === 1 ? <div className="art-delivery"><span className="delivery-symbol">↗</span><strong>DeliveryWatch</strong><span>Your emails. On the radar.</span><div><i /> SPF <i /> DKIM <i /> DMARC</div></div> : <div className="art-world"><span>EXPLORE / DISCOVER / PLAY</span><strong>A world<br />of my own<span>✳</span></strong><i>Built for the curious.</i></div>}</div>
            <div className="project-body"><h3>{project.title}</h3><p>{project.description}</p><div className="tech-tags">{project.tech.map(tech => <span key={tech}>{tech}</span>)}</div><div className="project-links">{index === 2 ? <button onClick={() => setWorld(true)}>Explore world ↗</button> : <a href={project.link} target="_blank" rel="noopener noreferrer">Live project ↗</a>}<a href={project.github} target="_blank" rel="noopener noreferrer">Source code ↗</a></div></div>
          </article>;
        })}</div>
      </section>
      <section className="folio-section journey-section"><div className="section-heading"><div><p className="eyebrow">02 / THE SCENIC ROUTE</p><h2>A portfolio you can<br /><em>get a little lost in.</em></h2></div><button className="text-action" onClick={() => setWorld(true)}>Start exploring ↗</button></div><div className="journey-stops">{STOPS.map(stop => <button key={stop.number} onClick={() => setWorld(true)}><span className="stop-number">{stop.number} <i>{stop.icon}</i></span><h3>{stop.title}</h3><p>{stop.detail}</p></button>)}</div></section>
      <section id="about" className="folio-section about-section"><div><p className="eyebrow">03 / THE PERSON BEHIND THE PIXELS</p><h2>Curiosity is<br />my default <em>setting.</em></h2><div className="about-monogram" aria-hidden="true">ak<span>✳</span></div></div><div className="about-copy">{CONTENT.about.bio.map(p => <p key={p}>{p}</p>)}<div className="about-skills">{CONTENT.skills.map(skill => <span key={skill.name}>{skill.name}</span>)}</div><div className="education-note"><span>CURRENTLY</span><strong>{CONTENT.education[0].degree}</strong><p>{CONTENT.education[0].institution}</p></div></div></section>
      <section id="contact" className="folio-section contact-section"><p className="eyebrow"><span className="status-dot" /> {CONTENT.contact.availability}</p><h2>Have something<br />in <em>mind?</em> <a href={`mailto:${CONTENT.contact.email}`} aria-label="Email Anshul">↗</a></h2><div className="contact-bottom"><div><a href={`mailto:${CONTENT.contact.email}`}>{CONTENT.contact.email}</a><button onClick={async () => { try { await navigator.clipboard.writeText(CONTENT.contact.email); setCopied(true); } catch { setCopied(false); } }} aria-label="Copy email address">{copied ? "Copied ✓" : "Copy ↗"}</button><span className="sr-only" role="status">{copied ? "Email address copied" : ""}</span></div><div className="social-links">{CONTENT.contact.socials.filter(s => s.name !== "Email").map(s => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">{s.name} ↗</a>)}</div></div></section>
      <footer className="folio-footer"><a className="wordmark" href="#home">ak<span>®</span></a><span>© {new Date().getFullYear()} {CONTENT.brand.name}</span><span>Made with code & curiosity.</span><a href="#home">Back to top ↑</a></footer>
    </main>
  );
}
