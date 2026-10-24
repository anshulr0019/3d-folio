import type { ReactNode } from "react";

export type InterfaceIconName = "map" | "back" | "arrow" | "close" | "grid" | "camera" | "sound" | "muted" | "home" | "leaf" | "gem" | "check" | "reset" | "jump" | "move" | "copy";
const paths: Record<InterfaceIconName, ReactNode> = {
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15" /></>,
  back: <><path d="m10 6-6 6 6 6M4 12h16" /></>,
  arrow: <><path d="M6 18 18 6M6 6h12v12" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  camera: <><path d="m8 6 1-2h6l1 2h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="12" r="3.5" /></>,
  sound: <><path d="M11 4 6 8H3v8h3l5 4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
  muted: <><path d="M11 4 6 8H3v8h3l5 4ZM16 9l5 6m-5 0 5-6" /></>,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7" /></>,
  leaf: <><path d="M20 4c-12-2-18 4-14 11s16 4 14-11ZM4 21 16 9M8 17v-5m0 5h5" /></>,
  gem: <><path d="m3 8 4-4h10l4 4-9 13ZM3 8h18M8 8l4 13 4-13M8 8l4-4 4 4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  reset: <><path d="M4 10a8 8 0 1 1 1 9M4 4v6h6" /></>,
  jump: <><path d="M12 20V4m-6 6 6-6 6 6M4 21h16" /></>,
  move: <><path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-9 3-3 3 3 3m12-6 3 3-3 3m-9 3 3 3 3-3" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
};
export function InterfaceIcon({ name }: { name: InterfaceIconName }) {
  return <svg className="interface-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
