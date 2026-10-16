import { useEffect, useRef, useState, type MouseEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { CONTENT } from "../portfolio/content";

type PortfolioProject = (typeof CONTENT.projects)[number];

interface SelectedWorkProps {
  filter: string;
  projects: PortfolioProject[];
  onFilterChange: (filter: string) => void;
  onEnterWorld: (event: MouseEvent<HTMLElement>) => void;
}

const FILTERS = ["All work", "Web apps", "3D & creative"];

function formatIndex(value: number) {
  return String(value).padStart(2, "0");
}

export default function SelectedWork({
  filter,
  projects,
  onFilterChange,
  onEnterWorld,
}: SelectedWorkProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const activeIndexRef = useRef(0);
  const pinStartRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const projectKey = projects.map((project) => project.title).join("|");

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !pin || !viewport || !track) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add("(min-width: 761px) and (prefers-reduced-motion: no-preference)", () => {
      const cards = Array.from(track.querySelectorAll<HTMLElement>(".project-card"));
      const getDistance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

      const updateActiveCard = (progress: number) => {
        const distance = getDistance();
        const viewportCenter = viewport.clientWidth / 2;
        let closestIndex = 0;
        let closestDistance = Number.POSITIVE_INFINITY;

        cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2 - progress * distance;
          const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
          if (distanceFromCenter < closestDistance) {
            closestDistance = distanceFromCenter;
            closestIndex = index;
          }
        });

        if (activeIndexRef.current !== closestIndex) {
          activeIndexRef.current = closestIndex;
          setActiveIndex(closestIndex);
        }

        if (progressRef.current) {
          gsap.set(progressRef.current, { scaleX: progress });
        }
      };

      gsap.set(track, { x: 0 });

      if (cards.length <= 1 || getDistance() <= 1) {
        updateActiveCard(0);
        return undefined;
      }

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.max(getDistance(), 1)}`,
          pin,
          scrub: 0.25,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            pinStartRef.current = self.start;
            updateActiveCard(self.progress);
          },
          onUpdate: (self) => updateActiveCard(self.progress),
        },
      });

      if (tween.scrollTrigger) pinStartRef.current = tween.scrollTrigger.start;

      const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
      resizeObserver.observe(viewport);
      resizeObserver.observe(track);
      document.fonts.ready.then(() => ScrollTrigger.refresh());

      return () => {
        pinStartRef.current = null;
        resizeObserver.disconnect();
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { clearProps: "transform" });
      };
    });

    return () => {
      media.revert();
      if (progressRef.current) gsap.set(progressRef.current, { clearProps: "transform" });
    };
  }, [projectKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const updateFromNativeScroll = () => {
      if (!window.matchMedia("(max-width: 760px)").matches) return;

      const cards = Array.from(track.querySelectorAll<HTMLElement>(".project-card"));
      const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
        if (distanceFromCenter < closestDistance) {
          closestDistance = distanceFromCenter;
          closestIndex = index;
        }
      });

      if (activeIndexRef.current !== closestIndex) {
        activeIndexRef.current = closestIndex;
        setActiveIndex(closestIndex);
      }

      if (progressRef.current) {
        const maxScroll = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
        progressRef.current.style.transform = `scaleX(${viewport.scrollLeft / maxScroll})`;
      }
    };

    viewport.scrollTo({ left: 0 });
    activeIndexRef.current = 0;
    setActiveIndex(0);
    updateFromNativeScroll();
    viewport.addEventListener("scroll", updateFromNativeScroll, { passive: true });
    window.addEventListener("resize", updateFromNativeScroll);

    return () => {
      viewport.removeEventListener("scroll", updateFromNativeScroll);
      window.removeEventListener("resize", updateFromNativeScroll);
    };
  }, [projectKey]);

  const total = Math.max(projects.length, 1);

  const changeFilter = (nextFilter: string) => {
    if (pinStartRef.current !== null) {
      window.scrollTo({ top: pinStartRef.current, behavior: "auto" });
    }
    onFilterChange(nextFilter);
  };

  return (
    <section id="work" ref={sectionRef} className="selected-work-section">
      <div ref={pinRef} className="selected-work-pin">
        <div className="selected-work-inner">
          <div className="section-heading selected-work-heading">
            <div>
              <p className="eyebrow">01 / SELECTED WORK</p>
              <h2>Built with purpose.<br /><span>Made to be used.</span></h2>
            </div>
            <div className="selected-work-status">
              <p>A few things I've brought to life,<br />from everyday tools to digital worlds.</p>
              <div className="project-counter" aria-label={`Project ${activeIndex + 1} of ${total}`}>
                <strong>{formatIndex(Math.min(activeIndex + 1, total))}</strong>
                <span>/</span>
                <span>{formatIndex(total)}</span>
              </div>
            </div>
          </div>

          <div className="selected-work-controls">
            <div className="project-filters" aria-label="Filter projects">
              {FILTERS.map((label) => (
                <button
                  key={label}
                  aria-pressed={filter === label}
                  onClick={() => changeFilter(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            {projects.length > 1 && <p className="scroll-direction"><span>↓</span> Scroll to move sideways</p>}
          </div>
        </div>

        <div ref={viewportRef} className="selected-work-viewport">
          <div ref={trackRef} className="selected-work-track">
            {projects.map((project, trackIndex) => {
              const projectIndex = CONTENT.projects.indexOf(project);
              const isWorld = project.tech.includes("Three.js");

              return (
                <article
                  className={`project-card project-${projectIndex}${trackIndex === activeIndex ? " is-active" : ""}`}
                  key={project.title}
                >
                  <div className="project-art" aria-hidden="true">
                    <span className="project-index">
                      {formatIndex(projectIndex + 1)} / {isWorld ? "INTERACTIVE EXPERIENCE" : "WEB APPLICATION"}
                    </span>
                    {projectIndex === 0 ? (
                      <div className="art-date"><span>find your</span><strong>kind of<br /><em>connection.</em></strong><i>infyn ↗</i></div>
                    ) : projectIndex === 1 ? (
                      <div className="art-delivery"><span className="delivery-symbol">↗</span><strong>DeliveryWatch</strong><span>Your emails. On the radar.</span><div><i /> SPF <i /> DKIM <i /> DMARC</div></div>
                    ) : (
                      <div className="art-world"><span>EXPLORE / DISCOVER / PLAY</span><strong>A world<br />of my own<span>✳</span></strong><i>Built for the curious.</i></div>
                    )}
                  </div>
                  <div className="project-body">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="tech-tags">{project.tech.map((tech) => <span key={tech}>{tech}</span>)}</div>
                    <div className="project-links">
                      {isWorld ? (
                        <button onClick={onEnterWorld}>Explore world ↗</button>
                      ) : (
                        <a href={project.link} target="_blank" rel="noopener noreferrer">Live project ↗</a>
                      )}
                      <a href={project.github} target="_blank" rel="noopener noreferrer">Source code ↗</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {projects.length > 1 && <div className="selected-work-progress" aria-hidden="true"><span ref={progressRef} /></div>}
      </div>
    </section>
  );
}
