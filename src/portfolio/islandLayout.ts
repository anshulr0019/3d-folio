/** Shared world coordinates for terrain, navigation, water and the map. */
export const ISLAND_CENTER_Z = 22;
export const OCEAN_PERIOD = 256;
export const ISLAND_STOPS = [
  { id: "room", label: "Studio", x: 0, z: 3, detail: "Where it all starts" },
  { id: "projects", label: "Project walk", x: -12.5, z: 31, detail: "Explore the work" },
  { id: "pond", label: "Melody pond", x: -22, z: 18, detail: "Walk the five musical stones" },
  { id: "lighthouse", label: "Lighthouse", x: 25, z: -6, detail: "Send a signal across the sea" },
  { id: "windmill", label: "Wind workshop", x: 23, z: 25, detail: "Bring the path lanterns to life" },
  { id: "garden", label: "Quiet garden", x: -25, z: 41, detail: "Take the long way home" },
  { id: "dock", label: "Contact dock", x: 0, z: 65, detail: "A conversation by the water" },
] as const;
export type IslandDestination = typeof ISLAND_STOPS[number]["id"];
export function shoreRadius(angle: number) {
  return 1 + 0.06 * Math.sin(angle * 3 + 0.5) + 0.035 * Math.cos(angle * 5 - 0.4);
}
export function shoreline(offset = 0, count = 96): [number, number][] {
  return Array.from({ length: count }, (_, i) => {
    const a = i / count * Math.PI * 2, r = shoreRadius(a);
    return [Math.cos(a) * (37 * r + offset), ISLAND_CENTER_Z + Math.sin(a) * (48 * r + offset)];
  });
}
export function distanceToShore(x: number, z: number) {
  const dx = x / 37, dz = (z - ISLAND_CENTER_Z) / 48;
  return (Math.hypot(dx, dz) - shoreRadius(Math.atan2(dz, dx))) * 37;
}
export function isOffshore(x: number, z: number) { return distanceToShore(x, z) > 3.2; }
/** Returns the translation to apply to both the player and camera at the ocean seam. */
export function oceanWrap(x: number, z: number) {
  const wrap = (n: number) => ((n + OCEAN_PERIOD / 2) % OCEAN_PERIOD + OCEAN_PERIOD) % OCEAN_PERIOD - OCEAN_PERIOD / 2;
  return { x: wrap(x) - x, z: wrap(z - ISLAND_CENTER_Z) + ISLAND_CENTER_Z - z };
}
export const POND_STONES = Array.from({ length: 5 }, (_, i) => ({ x: -26 + i * 2, z: 16 + Math.sin(i * 0.9) * 1.4 }));
