export type Quality = "auto" | "low" | "balanced" | "high";
export type RenderQuality = Exclude<Quality, "auto">;
export const QUALITY_LABELS: Record<Quality, string> = {
  auto: "Auto · device aware", low: "Lite · battery friendly",
  balanced: "Balanced · more detail", high: "High · full avatar & effects",
};
export function resolveQuality(quality: Quality): RenderQuality {
  if (quality !== "auto") return quality;
  const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  if (device.connection?.saveData || /(^|-)2g$/.test(device.connection?.effectiveType ?? "") ||
      (device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
      (device.hardwareConcurrency !== undefined && device.hardwareConcurrency <= 4) ||
      matchMedia("(pointer: coarse)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";
  return "balanced";
}
export function readQuality(): Quality {
  try { const saved = localStorage.getItem("folio-quality"); if (saved && saved in QUALITY_LABELS) return saved as Quality; } catch { /* Optional preference. */ }
  return "auto";
}
export function saveQuality(quality: Quality) {
  try { localStorage.setItem("folio-quality", quality); } catch { /* Optional preference. */ }
}
export const SETTINGS = {
  low: { pixelRatio: 0.8, maxPixels: 1_000_000, fps: 30, bloom: false },
  balanced: { pixelRatio: 1, maxPixels: 2_000_000, fps: 60, bloom: false },
  high: { pixelRatio: 1.5, maxPixels: 3_000_000, fps: 60, bloom: true },
} as const;
