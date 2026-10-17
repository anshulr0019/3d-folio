import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

/** Scroll effects enhance visible HTML; no styles hide content before this hook runs. */
export function usePortfolioMotion(rootRef: RefObject<HTMLElement | null>, active: boolean) {
  const revealed = useRef(new WeakSet<HTMLElement>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();

    media.add({
      motion: "(prefers-reduced-motion: no-preference)",
      desktop: "(min-width: 761px) and (pointer: fine)",
    }, context => {
      if (!context.conditions?.motion) return;
      const desktop = Boolean(context.conditions.desktop);
      const reveals = new Map<HTMLElement, gsap.core.Tween>();
      const targets = root.querySelectorAll<HTMLElement>(
        ".selected-work-heading, .journey-section .section-heading, .journey-stops > button, " +
        ".about-section > div:first-child, .about-copy > p, .about-skills, .education-note, " +
        ".contact-section > .eyebrow, .contact-section > h2, .contact-bottom",
      );

      targets.forEach(target => {
        // Avoid hiding text already visible at hydration, restored scroll, or an anchor.
        if (revealed.current.has(target) || target.getBoundingClientRect().top < innerHeight * .94) {
          revealed.current.add(target);
          return;
        }
        const tween = gsap.fromTo(target, { opacity: 0, y: desktop ? 18 : 8 }, {
          opacity: 1, y: 0, duration: desktop ? .55 : .35, ease: "power2.out",
          clearProps: "opacity,transform",
          scrollTrigger: { trigger: target, start: "top 94%", once: true },
          onStart: () => { revealed.current.add(target); },
        });
        reveals.set(target, tween);
      });

      // Tabbing to a not-yet-revealed action must expose it immediately.
      const onFocus = (event: FocusEvent) => {
        reveals.forEach((tween, target) => {
          if (event.target instanceof Node && target.contains(event.target)) {
            tween.progress(1);
            tween.scrollTrigger?.kill();
            revealed.current.add(target);
          }
        });
      };
      root.addEventListener("focusin", onFocus);

      const hero = root.querySelector<HTMLElement>(".folio-hero");
      const copy = root.querySelector<HTMLElement>(".hero-copy");
      const preview = root.querySelector<HTMLElement>(".hero-world-preview");
      if (desktop && hero && copy && preview) {
        gsap.timeline({ scrollTrigger: {
          trigger: hero, start: "top top", end: "bottom top", scrub: .45,
        } })
          .to(copy, { y: -36, ease: "none" }, 0)
          .to(preview, { y: 28, ease: "none" }, 0);
      }

      const stops = Array.from(root.querySelectorAll<HTMLElement>(".journey-stops > button"));
      const journey = root.querySelector<HTMLElement>(".journey-stops");
      if (journey && stops.length) {
        const updateJourney = (progress: number) => {
          stops.forEach((stop, index) => {
            const fill = gsap.utils.clamp(0, 1, progress * stops.length - index);
            stop.style.setProperty("--journey-progress", String(fill));
            stop.classList.toggle("is-reached", fill > .02);
          });
        };
        ScrollTrigger.create({
          trigger: journey, start: "top 88%", end: "bottom 45%",
          onUpdate: self => updateJourney(self.progress),
          onRefresh: self => updateJourney(self.progress),
        });
      }

      return () => {
        root.removeEventListener("focusin", onFocus);
        stops.forEach(stop => {
          stop.style.removeProperty("--journey-progress");
          stop.classList.remove("is-reached");
        });
      };
    }, root);

    // Filtering projects changes the pinned section's height without a window resize.
    // Refresh after the new layout is painted so later sections keep correct offsets.
    let refreshFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    resizeObserver.observe(root);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(refreshFrame);
      media.revert();
    };
  }, [rootRef, active]);
}
