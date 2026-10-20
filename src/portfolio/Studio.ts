import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Zone } from "./World";
import { batchStudio } from "./batchStudio";
import { createSignMaterial } from "./signMaterial";

// Reference lock: the portfolio's sage/oak identity + the miniature composition
// reviewed in Bruno Simon's world. All furniture is authored here at one scale.
export const STUDIO = {
  background: 0xe5e8df, plaster: 0xdce1cf, oak: 0xb68d5d,
  forest: 0x355c4b, linen: 0xe9dfc7, ink: 0x253b34, brass: 0xb99a59,
} as const;

export function buildStudio(group: THREE.Group, shadowTexture: THREE.Texture, options: { batchStatic?: boolean } = {}) {
  const zones: Zone[] = [];
  const interactive: THREE.Object3D[] = [];
  const markers: THREE.Mesh[] = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const material = (color: number, roughness = 0.85) => {
    const key = `${color}:${roughness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
    return materials.get(key)!;
  };
  const geometries = new Map<string, THREE.BufferGeometry>();
  const leafGeometry = new THREE.SphereGeometry(0.4, 12, 8);
  const oak = material(STUDIO.oak);
  const forest = material(STUDIO.forest);
  const linen = material(STUDIO.linen);
  const ink = material(STUDIO.ink);
  const plaster = material(STUDIO.plaster);
  const brass = new THREE.MeshStandardMaterial({ color: STUDIO.brass, metalness: 0.55, roughness: 0.5 });

  function box(parent: THREE.Group, size: number[], pos: number[], mat: THREE.Material, radius = 0.04) {
    const key = `box:${size.join(":")}:${radius}`;
    if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius));
    const mesh = new THREE.Mesh(geometries.get(key)!, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent: THREE.Group, radius: number, height: number, pos: number[], mat: THREE.Material) {
    const key = `cylinder:${radius}:${height}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.CylinderGeometry(radius, radius, height, 24));
    const mesh = new THREE.Mesh(geometries.get(key)!, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function plaque(lines: string[], size: number[], pos: number[], fg = "#253b34", bg = "#eee8d9", uniform = false) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), createSignMaterial(lines, size, fg, bg, uniform));
    mesh.position.set(pos[0], pos[1], pos[2]); group.add(mesh); return mesh;
  }
  function shadow(x: number, z: number, sx: number, sz: number, opacity = 0.2) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, depthWrite: false, opacity,
    }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.018, z); group.add(mesh);
  }
  function destination(id: string, label: string, x: number, z: number, object: THREE.Object3D) {
    zones.push({ id, label, position: new THREE.Vector3(x, 0, z), radius: 2.25, color: STUDIO.forest });
    object.userData.interactive = { id, label, category: id };
    interactive.push(object);
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.74, 0.78, 48), new THREE.MeshBasicMaterial({
      color: STUDIO.forest, transparent: true, opacity: 0.45, depthWrite: false,
    }));
    marker.rotation.x = -Math.PI / 2; marker.position.set(x, 0.029, z);
    group.add(marker); markers.push(marker);
  }
  function plant(x: number, z: number, scale = 1) {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(scale); group.add(p);
    cylinder(p, 0.37, 0.72, [0, 0.36, 0], linen);
    cylinder(p, 0.32, 0.025, [0, 0.73, 0], material(0x544333));
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4; const h = 1.0 + (i % 3) * 0.35;
      const stem = cylinder(p, 0.018, h, [Math.sin(a) * 0.12, 0.7 + h / 2, Math.cos(a) * 0.12], forest);
      stem.rotation.z = Math.cos(a) * 0.15;
      const leaf = new THREE.Mesh(leafGeometry, forest);
      leaf.scale.set(0.7, 1.1, 0.15); leaf.rotation.set(-0.45, a, Math.sin(a) * 0.7);
      leaf.position.set(Math.sin(a) * 0.4, 0.8 + h, Math.cos(a) * 0.4);
      leaf.castShadow = true; p.add(leaf);
    }
    shadow(x, z, 2.3 * scale, 2.3 * scale);
  }

  // An open-front architectural model: no ceiling or near walls to hide the room.
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), material(STUDIO.background));
  backdrop.rotation.x = -Math.PI / 2; backdrop.position.y = -0.67; group.add(backdrop);
  box(group, [16.6, 0.6, 16.6], [0, -0.32, 0], linen, 0.15);
  const plankColors = [0xc8a77b, 0xc5a277, 0xcbaa80, 0xc2a076];
  const plankMaterials = plankColors.map(color => material(color));
  for (let i = 0; i < 32; i++) {
    box(group, [0.493, 0.025, 16], [-7.75 + i * 0.5, -0.006, 0], plankMaterials[i % 4], 0.008);
  }
  box(group, [16.2, 5.0, 0.25], [0, 2.5, -8.03], plaster);
  box(group, [0.25, 5.0, 16.2], [-8.03, 2.5, 0], linen);
  box(group, [16.2, 0.18, 0.22], [0, 0.09, -7.84], oak);
  box(group, [0.22, 0.18, 16.2], [-7.84, 0.09, 0], oak);
  box(group, [16.4, 0.18, 0.34], [0, 5, -8.03], oak);
  box(group, [0.34, 0.18, 16.4], [-8.03, 5, 0], oak);

  // Linen rug with woven edge and restrained stitch detail.
  box(group, [7.3, 0.018, 6.0], [-0.3, 0.014, 0.3], linen, 0.008);
  for (let i = 0; i < 23; i++) {
    box(group, [0.012, 0.004, 5.75], [-3.7 + i * 0.3, 0.026, 0.3], material(0xd7cbb1), 0.001);
  }
  box(group, [7.1, 0.004, 0.035], [-0.3, 0.027, -2.55], forest, 0.001);
  box(group, [7.1, 0.004, 0.035], [-0.3, 0.027, 3.15], forest, 0.001);

  // Window and deep oak reveal; a calm view through six panes.
  const windowFrame = new THREE.Group(); windowFrame.position.set(-7.8, 2.9, -0.8);
  windowFrame.rotation.y = Math.PI / 2; group.add(windowFrame);
  box(windowFrame, [5.0, 3.2, 0.14], [0, 0, 0], oak);
  const sky = new THREE.MeshBasicMaterial({ color: "#bed2c5" });
  box(windowFrame, [4.72, 2.92, 0.03], [0, 0, 0.09], sky);
  for (const x of [-0.8, 0.8]) box(windowFrame, [0.07, 3.0, 0.09], [x, 0, 0.14], linen);
  box(windowFrame, [4.8, 0.07, 0.09], [0, 0.15, 0.14], linen);
  box(windowFrame, [5.25, 0.13, 0.48], [0, -1.65, 0.12], oak);
  // Broad, translucent window-light patches retain soft daylight on Lite too.
  for (let i = 0; i < 3; i++) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.6), new THREE.MeshBasicMaterial({
      color: 0xfff0c2, transparent: true, opacity: 0.09, depthWrite: false,
    }));
    patch.rotation.set(-Math.PI / 2, 0, -0.42); patch.position.set(-4.8 + i * 1.65, 0.032, -0.5);
    group.add(patch);
  }

  // Workbench. Monitor coordinates also serve the landing-to-world transition.
  const desk = new THREE.Group(); group.add(desk);
  box(desk, [4.4, 0.18, 1.9], [-4.2, 1.45, -5.2], oak, 0.08);
  for (const x of [-6.1, -2.3]) {
    box(desk, [0.12, 1.38, 1.55], [x, 0.69, -5.2], forest);
  }
  box(desk, [2.55, 1.35, 0.13], [-4.2, 2.25, -5.6], ink, 0.08);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.15), createSignMaterial(
    ["Hello, I'm Anshul.", "CREATIVE DEVELOPER", "Ideas → code → experiences"], [2.35, 1.15], "#dce8c5", "#203d32",
  ));
  screen.position.set(-4.2, 2.25, -5.525); group.add(screen);
  box(desk, [0.1, 0.32, 0.12], [-4.2, 1.65, -5.6], ink);
  box(desk, [0.7, 0.05, 0.4], [-4.2, 1.57, -5.55], ink);
  box(desk, [1.15, 0.055, 0.4], [-4.3, 1.58, -4.7], linen);
  for (let i = 0; i < 12; i++) box(desk, [0.045, 0.012, 0.3], [-4.8 + i * 0.09, 1.615, -4.7], oak, 0.003);
  cylinder(desk, 0.1, 0.22, [-2.65, 1.65, -5.0], linen);
  box(desk, [0.7, 0.07, 0.5], [-5.8, 1.58, -4.95], forest);
  box(desk, [0.7, 0.055, 0.5], [-5.75, 1.65, -4.95], linen);
  box(desk, [1.0, 0.18, 0.9], [-4.2, 0.78, -3.65], forest, 0.08);
  box(desk, [1.0, 0.95, 0.18], [-4.2, 1.2, -3.25], forest, 0.08);
  for (const dx of [-0.35, 0.35]) for (const dz of [-0.3, 0.3]) {
    box(desk, [0.065, 0.7, 0.065], [-4.2 + dx, 0.35, -3.65 + dz], oak);
  }
  shadow(-4.2, -5.2, 6, 4, 0.28);
  destination("desk", "Workstation", -4.2, -3.0, screen);

  // Display shelving: open bays, books and ceramics, rather than a wardrobe.
  const shelf = new THREE.Group(); shelf.position.set(5.2, 0, -5.6); group.add(shelf);
  box(shelf, [2.8, 3.7, 0.14], [0, 1.9, -0.42], forest);
  for (const x of [-1.4, 1.4]) box(shelf, [0.1, 3.8, 1.0], [x, 1.9, 0], oak);
  for (const y of [0.2, 1.35, 2.5, 3.8]) box(shelf, [2.9, 0.1, 1.0], [0, y, 0], oak);
  for (let i = 0; i < 7; i++) {
    const h = 0.48 + (i % 3) * 0.12;
    const book = box(shelf, [0.18, h, 0.48], [-1.1 + i * 0.22, 1.4 + h / 2, 0.08], i % 2 ? linen : forest, 0.012);
    book.rotation.z = i === 6 ? -0.15 : 0;
  }
  cylinder(shelf, 0.26, 0.6, [0.75, 2.86, 0], linen);
  cylinder(shelf, 0.15, 0.18, [0.75, 3.23, 0], linen);
  const sculpture = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.065, 64, 8), brass);
  sculpture.position.set(-0.7, 2.98, 0); shelf.add(sculpture);
  box(shelf, [0.75, 0.36, 0.58], [0.6, 0.43, 0], linen);
  shadow(5.2, -5.6, 4.5, 2.8);
  destination("showcase", "Objects & experiments", 5.2, -3.9, sculpture);

  // Reading chair and a warm practical lamp.
  const lounge = new THREE.Group(); lounge.position.set(4.2, 0, -0.5); lounge.rotation.y = -0.28; group.add(lounge);
  box(lounge, [1.7, 0.3, 1.5], [0, 0.55, 0], forest, 0.14);
  box(lounge, [1.7, 1.2, 0.3], [0, 1.05, -0.6], forest, 0.14);
  for (const x of [-0.85, 0.85]) box(lounge, [0.25, 0.65, 1.55], [x, 0.8, 0], forest, 0.11);
  const pillow = box(lounge, [0.65, 0.6, 0.22], [0.2, 1, -0.35], linen, 0.09); pillow.rotation.z = -0.2;
  for (const x of [-0.6, 0.6]) for (const z of [-0.5, 0.5]) cylinder(lounge, 0.04, 0.4, [x, 0.2, z], oak);
  cylinder(lounge, 0.55, 0.09, [-1.7, 0.72, 0.1], oak);
  cylinder(lounge, 0.06, 0.68, [-1.7, 0.34, 0.1], brass);
  cylinder(lounge, 0.1, 0.2, [-1.7, 0.87, 0.1], linen);
  shadow(4.2, -0.5, 4, 3.2);
  destination("library", "Reading lounge", 3.8, 1.15, lounge);
  cylinder(group, 0.3, 0.06, [6.6, 0.03, -2.4], ink);
  cylinder(group, 0.035, 2.6, [6.6, 1.3, -2.4], brass);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.6, 24), linen);
  shade.position.set(6.6, 2.7, -2.4); group.add(shade);

  // A small, front-facing arcade cabinet with real control shapes.
  const arcade = new THREE.Group(); arcade.position.set(5.8, 0, 3.5); arcade.rotation.y = -0.35; group.add(arcade);
  box(arcade, [1.35, 2.65, 1.1], [0, 1.325, 0], forest, 0.1);
  box(arcade, [1.4, 0.35, 1.15], [0, 2.7, 0], oak);
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.25), createSignMaterial(["SNAKE / 01"], [1.2, 0.25], "#e9dfc7", "#253b34"));
  marquee.position.set(0, 2.7, 0.585); arcade.add(marquee);
  const gameScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.83), createSignMaterial(["PLAY", "TAKE A LITTLE BREAK"], [1.06, 0.83], "#dce8c5", "#1c3028"));
  gameScreen.position.set(0, 1.95, 0.56); arcade.add(gameScreen);
  box(arcade, [1.4, 0.14, 0.7], [0, 1.34, 0.55], oak);
  cylinder(arcade, 0.035, 0.2, [-0.3, 1.5, 0.67], ink);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), brass); knob.position.set(-0.3, 1.64, 0.67); arcade.add(knob);
  for (const x of [0.15, 0.37]) cylinder(arcade, 0.07, 0.045, [x, 1.44, 0.69], linen);
  shadow(5.8, 3.5, 2.7, 2.5);
  destination("arcade", "Cyber Arcade", 5.1, 4.6, arcade);

  plant(-6.3, 4.2, 1.2); plant(0.9, -6.8, 0.85);
  box(group, [4.7, 1.4, 0.12], [-3.4, 3.9, -7.8], oak);
  plaque(["ANSHUL'S STUDIO", "BUILDING FOR THE WEB & BEYOND"], [4.45, 1.16], [-3.4, 3.9, -7.72]);
  box(group, [2.0, 2.5, 0.12], [2.1, 3.15, -7.8], oak);
  plaque(["MAKE.", "SOMETHING", "USEFUL."], [1.8, 2.3], [2.1, 3.15, -7.72], "#e9dfc7", "#355c4b", true);
  const exit = plaque(["PROJECT CAMPUS  →"], [3.8, 0.8], [0, 0.033, 6.6]);
  exit.rotation.x = -Math.PI / 2;
  box(group, [4.8, 0.025, 0.15], [0, 0.02, 7.55], forest, 0.01);
  plaque(["01 / THE STUDIO"], [3.5, 0.4], [-4.6, -0.28, 8.315]);
  if (options.batchStatic !== false) batchStudio(group);
  return { zones, interactive, markers };
}
