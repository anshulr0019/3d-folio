import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { STUDIO } from "./Studio";
import { PROJECT_EXHIBITS } from "./projectExhibits";
import type { Zone } from "./World";

// Reference lock: extend the approved studio's oak/sage miniature architecture.
// Borrow Bruno's compact landmarks, physical wayfinding and tactile composition;
// project imagery stays authentic, and one restrained accent identifies each exhibit.
export const CAMPUS_BOUNDS = { minX: -18, maxX: 18, minZ: -42, maxZ: 12.5 };
export const CAMPUS_PROJECTS = [
  { x: -10, z: -5, turn: 0.12 },
  { x: 10, z: -12, turn: -0.16 },
  { x: -10, z: -25, turn: 0.12 },
] as const;
export interface CampusObstacle { x: number; z: number; halfX: number; halfZ: number }

export function buildCampus(group: THREE.Group, manager: THREE.LoadingManager, shadowTexture: THREE.Texture) {
  const zones: Zone[] = [], interactive: THREE.Object3D[] = [], markers: THREE.Mesh[] = [];
  const obstacles: CampusObstacle[] = [];
  let disposed = false;
  const materials = new Map<number, THREE.MeshStandardMaterial>();
  function mat(color: number) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
    return materials.get(color)!;
  }
  function box(parent: THREE.Group, size: number[], pos: number[], color: number, radius = 0.06) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, radius), mat(color));
    mesh.position.set(pos[0], pos[1], pos[2]); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function disk(parent: THREE.Group, radius: number, height: number, pos: number[], color: number) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40), mat(color));
    mesh.position.set(pos[0], pos[1], pos[2]); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function shadow(x: number, z: number, sx: number, sz: number, opacity = 0.28) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, depthWrite: false, opacity,
    }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.019, z); group.add(mesh);
  }
  function label(parent: THREE.Group, lines: string[], size: number[], pos: number[], color = "#253b34", bg = "#eee8d9") {
    const canvas = document.createElement("canvas"); canvas.width = 1024;
    canvas.height = lines.length === 1 ? 128 : 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line, i) => {
      ctx.fillStyle = color; ctx.textBaseline = "middle";
      let fontSize = i === 0 ? 64 : 34;
      do { ctx.font = `${i === 0 ? 600 : 400} ${fontSize--}px system-ui, sans-serif`; }
      while (ctx.measureText(line).width > 920 && fontSize > 20);
      ctx.fillText(line, 48, lines.length === 1 ? 64 : 95 + i * 95);
    });
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ map: tex }));
    mesh.position.set(pos[0], pos[1], pos[2]); parent.add(mesh); return mesh;
  }
  function zone(id: string, name: string, x: number, z: number, object: THREE.Object3D, color: number = STUDIO.forest, radius = 2.8) {
    zones.push({ id, label: name, position: new THREE.Vector3(x, 0, z), color, radius });
    object.userData.interactive = { id, label: name, category: "campus" }; interactive.push(object);
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.88, 0.93, 48), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, depthWrite: false,
    }));
    marker.rotation.x = -Math.PI / 2; marker.position.set(x, 0.034, z);
    group.add(marker); markers.push(marker);
  }
  function tree(x: number, z: number, scale = 1) {
    const treeGroup = new THREE.Group(); treeGroup.position.set(x, 0, z); treeGroup.scale.setScalar(scale); group.add(treeGroup);
    disk(treeGroup, 0.16, 2.5, [0, 1.25, 0], STUDIO.oak);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 2), mat(i % 2 ? 0x78966c : 0x64875d));
      leaf.scale.set(0.85, 1.2, 0.85);
      leaf.position.set(Math.sin(i * 2.4) * 0.65, 2.6 + (i % 2) * 0.8, Math.cos(i * 2.4) * 0.65);
      leaf.castShadow = true; treeGroup.add(leaf);
    }
    shadow(x, z, 5 * scale, 4 * scale, 0.23);
    obstacles.push({ x, z, halfX: 0.5 * scale, halfZ: 0.5 * scale });
  }
  function planter(x: number, z: number, width: number) {
    box(group, [width, 0.45, 1.1], [x, 0.225, z], STUDIO.linen);
    box(group, [width - 0.2, 0.05, 0.9], [x, 0.47, z], 0x756949);
    for (let i = 0; i < Math.floor(width * 2); i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mat(i % 2 ? 0x91a57a : 0x657f57));
      leaf.scale.set(1, 0.8, 1); leaf.position.set(x - width / 2 + 0.3 + i * 0.48, 0.65, z); group.add(leaf);
    }
    obstacles.push({ x, z, halfX: width / 2 + 0.25, halfZ: 0.8 });
    shadow(x, z, width + 1, 2.4);
  }
  function bench(x: number, z: number, turn = 0) {
    const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = turn; group.add(b);
    for (const y of [0.62, 1.1]) box(b, [2.5, 0.12, y > 1 ? 0.13 : 0.65], [0, y, y > 1 ? -0.28 : 0], STUDIO.oak);
    for (const x of [-0.9, 0.9]) box(b, [0.1, 0.65, 0.6], [x, 0.325, 0], STUDIO.forest);
    shadow(x, z, 3.5, 2.4, 0.2);
    obstacles.push({ x, z, halfX: 1.5, halfZ: 0.7 });
  }

  const background = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat(STUDIO.background));
  background.rotation.x = -Math.PI / 2; background.position.set(0, -0.76, -14); group.add(background);
  box(group, [41, 0.7, 57], [0, -0.37, -14.5], STUDIO.linen, 0.28);
  box(group, [40.3, 0.05, 56.3], [0, -0.015, -14.5], 0xa7b58c, 0.2);
  // Narrow pedestrian spine plus cross-paths and a loop around the central garden.
  box(group, [5.6, 0.02, 51], [0, 0.008, -13.5], 0xe0d4bb, 0.02);
  for (const [x, z, width] of [[-5.3, 0.3, 14], [5.3, -6.2, 14], [-5.3, -19.6, 14], [5.3, -24, 14], [0, -34.5, 19]]) {
    box(group, [width, 0.018, 3], [x, 0.012, z], 0xe0d4bb, 0.02);
  }
  const loop = new THREE.Mesh(new THREE.RingGeometry(2.9, 6.3, 64), mat(0xe0d4bb));
  loop.rotation.x = -Math.PI / 2; loop.position.set(0, 0.026, -12); loop.receiveShadow = true; group.add(loop);
  disk(group, 2.85, 0.14, [0, 0.06, -12], STUDIO.linen);
  disk(group, 2.6, 0.08, [0, 0.14, -12], 0x8f9f75);
  obstacles.push({ x: 0, z: -12, halfX: 2.85, halfZ: 2.85 });
  tree(0, -12, 1.15);
  for (let z = 9; z >= -39; z -= 2) {
    box(group, [0.02, 0.002, 1.8], [-2.55, 0.023, z], 0xc8bda4, 0.001);
    box(group, [0.02, 0.002, 1.8], [2.55, 0.023, z], 0xc8bda4, 0.001);
  }

  // Each real project has its own architectural silhouette and a real screen capture.
  const loader = new THREE.TextureLoader(manager);
  CAMPUS_PROJECTS.forEach((layout, i) => {
    const project = PROJECT_EXHIBITS[i];
    const p = new THREE.Group(); p.position.set(layout.x, 0, layout.z); p.rotation.y = layout.turn; group.add(p);
    const accent = project.accent;
    if (i === 0) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.22, 10, 48, Math.PI), mat(accent));
      arch.position.set(0, 2.0, -0.1); p.add(arch);
      for (const x of [-3.7, 3.7]) box(p, [0.45, 2.1, 0.45], [x, 1.05, -0.1], accent);
    } else {
      box(p, [8.1, 0.3, 4.6], [0, 4.85, -0.9], i === 1 ? STUDIO.forest : STUDIO.oak);
      for (const x of [-3.75, 3.75]) box(p, [0.18, 4.7, 0.18], [x, 2.35, 0.85], STUDIO.oak);
      if (i === 2) for (let x = -3.5; x <= 3.5; x += 0.65) box(p, [0.16, 0.22, 4.9], [x, 5.08, -0.9], STUDIO.oak);
    }
    box(p, [7.7, 3.9, 0.22], [0, 2.3, -1.0], STUDIO.forest, 0.12);
    const previewMaterial = new THREE.MeshBasicMaterial({ color: 0xf0e9d9 });
    const preview = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 4.10625), previewMaterial);
    preview.position.set(0, 2.5, -0.86); p.add(preview);
    loader.load(project.preview, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      previewMaterial.map = texture; previewMaterial.color.setHex(0xffffff); previewMaterial.needsUpdate = true;
    });
    box(p, [7.8, 0.74, 0.16], [0, 4.75, 1.42], accent);
    label(p, [`0${i + 1} / ${project.name.toUpperCase()}`], [7.7, 0.72], [0, 4.75, 1.51], i === 1 ? "#f3ead7" : "#253b34", `#${accent.toString(16).padStart(6, "0")}`);
    label(p, [project.category, "[ E ]  OPEN PROJECT"], [7.7, 0.92], [0, 0.5, -0.82]);
    shadow(layout.x, layout.z, 10, 7, 0.3);
    const approachX = layout.x + Math.sin(layout.turn) * 4.1;
    const approachZ = layout.z + Math.cos(layout.turn) * 4.1;
    zone(`project_${i}`, project.name, approachX, approachZ, p, accent, 3.3);
    obstacles.push({ x: layout.x, z: layout.z - 1, halfX: 4.0, halfZ: 0.6 });
    planter(layout.x, layout.z - 3.0, 6.8);
  });

  // Arrival gate and a physical directory; returning to the studio stays obvious.
  for (const x of [-2.1, 2.1]) box(group, [0.25, 3.8, 0.35], [x, 1.9, 11.3], STUDIO.oak);
  box(group, [4.7, 0.7, 0.55], [0, 3.85, 11.3], STUDIO.forest);
  label(group, ["THE STUDIO"], [4.4, 0.55], [0, 3.85, 11.6], "#eee8d9", "#355c4b");
  const returnSign = label(group, ["BACK TO STUDIO"], [3.8, 0.6], [0, 0.032, 10.3]); returnSign.rotation.x = -Math.PI / 2;
  zone("return_studio", "Return to studio", 0, 9.7, returnSign, STUDIO.forest, 1.3);
  box(group, [2.6, 2.0, 0.14], [4.7, 1.8, 6.2], STUDIO.oak);
  const directory = label(group, ["THE CAMPUS", "01  Infyn / connections", "02  DeliveryWatch / SaaS", "03  Portfolio / creative"], [2.4, 1.8], [4.7, 1.8, 6.3]);
  for (const x of [3.55, 5.85]) box(group, [0.12, 1, 0.14], [x, 0.5, 6.2], STUDIO.oak);
  obstacles.push({ x: 4.7, z: 6.2, halfX: 1.45, halfZ: 0.3 });
  zone("projects", "Selected work", 3.5, 7.5, directory);

  // Portfolio chapters live in smaller garden stops, rather than duplicate houses.
  const bio = label(group, ["A LITTLE ABOUT ME", "Anshul Kumar", "Full-stack developer", "Delhi, India"], [4.2, 2.4], [11, 2.15, 2.0]);
  box(group, [4.4, 2.6, 0.2], [11, 2.15, 1.85], STUDIO.oak);
  for (const x of [9, 13]) box(group, [0.15, 1.1, 0.18], [x, 0.55, 1.85], STUDIO.oak);
  zone("about", "About Anshul", 10.5, 5.2, bio);
  obstacles.push({ x: 11, z: 1.9, halfX: 2.4, halfZ: 0.6 });
  bench(11, 0.2);
  const skills = label(group, ["THE TOOL SHED", "TypeScript / React / Next.js", "Node.js / Supabase", "Three.js / WebGL"], [5.4, 2.6], [10.5, 2.3, -27.2]);
  box(group, [5.7, 2.9, 0.2], [10.5, 2.3, -27.35], STUDIO.oak);
  box(group, [6.4, 0.2, 3.3], [10.5, 4.05, -28], STUDIO.forest);
  for (const x of [7.5, 13.5]) box(group, [0.18, 4.0, 0.18], [x, 2.0, -26.5], STUDIO.oak);
  zone("skills", "Tools & skills", 10.5, -23.9, skills);
  obstacles.push({ x: 10.5, z: -27.3, halfX: 3.1, halfZ: 0.6 });
  const education = label(group, ["LEARNING, ALWAYS", "B.Tech / Computer Science", "GGSIPU affiliated", "Building alongside academics"], [4.6, 2.3], [10.5, 1.9, -34]);
  box(group, [4.8, 2.5, 0.2], [10.5, 1.9, -34.15], STUDIO.oak);
  for (const x of [8.3, 12.7]) box(group, [0.15, 0.9, 0.18], [x, 0.45, -34.15], STUDIO.oak);
  zone("experience", "Education", 10.5, -31.1, education);
  obstacles.push({ x: 10.5, z: -34.1, halfX: 2.6, halfZ: 0.6 });

  // A quiet contact garden replaces the generic gold monument.
  disk(group, 7.3, 0.018, [0, 0.018, -36], 0xe0d4bb);
  const contactTitle = label(group, ["LET'S MAKE SOMETHING.", "OPEN TO OPPORTUNITIES"], [6.6, 1.7], [0, 2.8, -40]);
  box(group, [6.9, 1.9, 0.18], [0, 2.8, -40.15], STUDIO.forest);
  for (const x of [-3.4, 3.4]) box(group, [0.18, 3.65, 0.2], [x, 1.825, -40.15], STUDIO.oak);
  zone("contact", "Let's talk", 0, -37.5, contactTitle, STUDIO.forest, 2.0);
  obstacles.push({ x: 0, z: -40.1, halfX: 3.6, halfZ: 0.6 });
  for (const [id, title, x] of [["contact_github", "GITHUB", -5.1], ["contact_gmail", "EMAIL", -1.7], ["contact_linkedin", "LINKEDIN", 1.7], ["contact_phone", "CONTACT", 5.1]] as const) {
    box(group, [2.65, 1.15, 0.7], [x, 0.575, -38.6], STUDIO.oak);
    const face = label(group, [title], [2.4, 0.45], [x, 0.78, -38.235]);
    zone(id, title === "CONTACT" ? "Contact details" : title, x, -36.1, face, STUDIO.forest, 1.45);
    obstacles.push({ x, z: -38.6, halfX: 1.4, halfZ: 0.6 });
  }

  bench(-8.5, -35.8, 0.35); bench(8.5, -35.8, -0.35);
  planter(-11, -39.5, 3.6); planter(11, -39.5, 3.6);
  tree(8.2, -40, 0.85);

  for (const [x, z, scale] of [[-17, 6, 1.1], [-17, -12, 0.9], [-17, -34, 1.2], [17, 7, 1.1], [17, -3, 0.85], [17, -19, 1.0], [17, -38, 1.1], [-8, -39, 0.75]]) tree(x, z, scale);
  for (const [x, z] of [[-5, 5], [6, -20], [-5.5, -31], [-12, 8]]) bench(x, z);
  for (const [x, z] of [[-17, -4], [17, -12], [-17, -25], [16, -30]]) planter(x, z, 3.5);
  // Small bollards mark turns without a row of competing light sources.
  for (const [x, z] of [[-3.7, 5], [3.7, -3], [-5.3, -12], [5.3, -12], [-3.7, -28], [3.7, -33]]) {
    disk(group, 0.13, 0.85, [x, 0.425, z], STUDIO.forest);
    disk(group, 0.14, 0.12, [x, 0.88, z], STUDIO.linen);
  }
  return { zones, interactive, markers, obstacles, dispose: () => { disposed = true; } };
}

/** Resolve the avatar against authored footprints, then keep it on the campus. */
export function resolveCampusCollisions(pos: THREE.Vector3, obstacles: readonly CampusObstacle[]) {
  for (let pass = 0; pass < 2; pass++) {
    for (const obstacle of obstacles) {
      const dx = pos.x - obstacle.x, dz = pos.z - obstacle.z;
      const halfX = obstacle.halfX + 0.55, halfZ = obstacle.halfZ + 0.55;
      const overlapX = halfX - Math.abs(dx), overlapZ = halfZ - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      if (overlapX < overlapZ) pos.x = obstacle.x + (dx < 0 ? -halfX : halfX);
      else pos.z = obstacle.z + (dz < 0 ? -halfZ : halfZ);
    }
    pos.x = THREE.MathUtils.clamp(pos.x, CAMPUS_BOUNDS.minX, CAMPUS_BOUNDS.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, CAMPUS_BOUNDS.minZ, CAMPUS_BOUNDS.maxZ);
  }
}
