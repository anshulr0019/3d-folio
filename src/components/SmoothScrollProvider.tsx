import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

interface SmoothScrollControls {
  start: () => void;
  stop: () => void;
  scrollTo: (target: string | HTMLElement | number) => void;
}

const SmoothScrollContext = createContext<SmoothScrollControls>({
  start: () => undefined,
  stop: () => undefined,
  scrollTo: () => undefined,
});

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let cleanup = () => {};
    const syncMotion = () => {
      cleanup();
      cleanup = () => {};
      if (query.matches) return;
      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.9,
        anchors: true,
      });
      lenisRef.current = lenis;
      if (stoppedRef.current) lenis.stop();
      const updateScrollTrigger = () => ScrollTrigger.update();
      const raf = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", updateScrollTrigger);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.refresh();
      cleanup = () => {
        lenis.off("scroll", updateScrollTrigger);
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenisRef.current = null;
      };
    };
    syncMotion();
    query.addEventListener("change", syncMotion);
    return () => { query.removeEventListener("change", syncMotion); cleanup(); };
  }, []);

  const controls = useMemo<SmoothScrollControls>(() => ({
    start: () => { stoppedRef.current = false; lenisRef.current?.start(); },
    stop: () => { stoppedRef.current = true; lenisRef.current?.stop(); },
    scrollTo: (target) => {
      if (lenisRef.current) lenisRef.current.scrollTo(target);
      else if (typeof target === "number") window.scrollTo({ top: target });
      else (typeof target === "string" ? document.querySelector(target) : target)?.scrollIntoView();
    },
  }), []);

  return <SmoothScrollContext.Provider value={controls}>{children}</SmoothScrollContext.Provider>;
}
