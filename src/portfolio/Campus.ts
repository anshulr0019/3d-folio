import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { STUDIO } from "./Studio";
import { PROJECT_EXHIBITS } from "./projectExhibits";
import type { Zone } from "./World";
import { createSignMaterial } from "./signMaterial";
import { shoreline } from "./islandLayout";


// Reference lock: extend the approved studio's oak/sage miniature architecture.
// Borrow Bruno's compact landmarks, physical wayfinding and tactile composition;
// project imagery stays authentic, and one restrained accent identifies each exhibit.

export const CAMPUS_PROJECTS = [
  { x: -13, z: 27, turn: 0.12 },
  { x: 13, z: 39, turn: -0.16 },
  { x: -13, z: 49, turn: 0.12 },
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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), createSignMaterial(lines, size, color, bg));
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

  // One continuous island. Sand extends below the lawn, then gives way to water.
  function terrain(offset: number, height: number, color: number) {
    const shape = new THREE.Shape();
    shoreline(offset, 192).forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(color));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = height; mesh.receiveShadow = true; group.add(mesh);
  }
  terrain(3.0, -0.12, 0xdac69e); terrain(0, -0.025, 0x9fac83);
  const inner = shoreline(-0.03, 192), outer = shoreline(0.65, 192);
  const shoreVertices: number[] = [], shoreIndices: number[] = [];
  inner.forEach(([x,z],i) => {
    shoreVertices.push(x,-0.027,z,outer[i][0],-0.119,outer[i][1]);
    const a=i*2,b=((i+1)%inner.length)*2;
    shoreIndices.push(a,b,a+1,a+1,b,b+1);
  });
  const skirtGeometry=new THREE.BufferGeometry();
  skirtGeometry.setAttribute("position",new THREE.Float32BufferAttribute(shoreVertices,3));skirtGeometry.setIndex(shoreIndices);skirtGeometry.computeVertexNormals();
  const skirtMaterial=mat(0xdac69e).clone();skirtMaterial.side=THREE.DoubleSide;
  group.add(new THREE.Mesh(skirtGeometry,skirtMaterial));
  // Rounded paths join the studio, exhibits and discoveries without enclosing the visitor.
  function path(points: number[][], width = 2.8) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.004, z)));
    const samples = curve.getPoints(80), vertices: number[] = [], indices: number[] = [];
    samples.forEach((point, i) => {
      const tangent = curve.getTangent(i / 80), nx = -tangent.z * width / 2, nz = tangent.x * width / 2;
      vertices.push(point.x + nx, point.y, point.z + nz, point.x - nx, point.y, point.z - nz);
      if (i < 80) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, mat(0xe1d3b5)); mesh.receiveShadow = true; group.add(mesh);
  }
  path([[0, 7.8], [0, 16], [2, 25], [0, 36], [2, 48], [0, 60], [0, 66]], 4);
  path([[0, 15], [-10, 13], [-16, 18]], 2.8);
  path([[0, 13], [15, 10], [24, 0], [25, -6]], 2.8);
  path([[1, 26], [14, 28], [23, 25]], 3);
  path([[0, 32], [-12, 32], [-25, 41], [-24, 53], [-13, 54]], 2.8);
  path([[1, 43], [13, 44]], 3);
  path([[1, 53], [-13, 54]], 3);
  // The studio is the northern landmark; its open threshold joins this path directly.
  const welcome = label(group, ["TAKE THE SCENIC ROUTE", "Pond ←   /   Lighthouse →"], [5.6, 1.2], [0, 1.4, 11.5]);
  box(group, [5.9, 1.45, 0.16], [0, 1.4, 11.4], STUDIO.oak);
  for (const x of [-2.4, 2.4]) box(group, [0.12, 0.8, 0.12], [x, 0.4, 11.4], STUDIO.forest);
  obstacles.push({ x: 0, z: 11.4, halfX: 3, halfZ: 0.2 });
  zone("island_welcome", "Find your own route", 0, 9.3, welcome, STUDIO.forest, 1.8);

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
      texture.anisotropy = 8;
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

  const bio = label(group, ["A LITTLE ABOUT ME", "Anshul Kumar", "Full-stack developer / Delhi"], [5, 1.9], [13, 2.0, 17]);
  box(group, [5.3, 2.2, 0.18], [13, 2, 16.9], STUDIO.oak);
  zone("about", "About Anshul", 13, 20, bio);
  obstacles.push({ x: 13, z: 17, halfX: 2.7, halfZ: 0.4 });
  const skills = label(group, ["THE TOOL SHED", "React / Next.js / TypeScript", "Node.js / Supabase / Three.js"], [5.6, 2], [14, 2, 52]);
  box(group, [6.1, 0.18, 3], [14, 3.8, 51], STUDIO.forest);
  for (const x of [11.2, 16.8]) box(group, [0.16, 3.8, 0.16], [x, 1.9, 52], STUDIO.oak);
  zone("skills", "Tools & skills", 14, 55, skills);
  obstacles.push({ x: 14, z: 52, halfX: 3, halfZ: 0.4 });
  const education = label(group, ["LEARNING, ALWAYS", "B.Tech / Computer Science", "Building alongside academics"], [4.8, 2], [-10, 1.8, 60]);
  box(group, [5, 2.2, 0.18], [-10, 1.8, 59.9], STUDIO.oak);
  zone("experience", "Education", -10, 63, education);
  obstacles.push({ x: -10, z: 60, halfX: 2.6, halfZ: 0.4 });

  // Contact lives on a real wooden pier at the southern shore.
  box(group, [8.2, 0.2, 12], [0, -0.09, 65], STUDIO.oak);
  for (let z = 59.5; z < 71; z += 0.5) box(group, [8.15, 0.015, 0.035], [0, 0.018, z], 0x987347, 0.005);
  for (const x of [-4, 4]) for (const z of [60, 65, 70]) disk(group, 0.12, 1.6, [x, -0.3, z], STUDIO.forest);
  const contact = label(group, ["LET'S MAKE SOMETHING.", "A conversation by the water"], [6.7, 1.3], [0, 2.5, 62]);
  zone("contact", "Let's talk", 0, 65, contact, STUDIO.forest, 2);
  for (const [id, title, x] of [["contact_github", "GITHUB", -2.7], ["contact_gmail", "EMAIL", 0], ["contact_linkedin", "LINKEDIN", 2.7]] as const) {
    box(group, [2.3, 0.9, 0.7], [x, 0.45, 69], STUDIO.forest);
    const face = label(group, [title], [2.1, 0.5], [x, 0.6, 69.36]);
    zone(id, title, x, 70.6, face, STUDIO.forest, 1.25);
    obstacles.push({ x, z: 69, halfX: 1.15, halfZ: 0.4 });
  }

  // Quiet garden: a sheltered detour, with no task or unlock required.
  disk(group, 4.7, 0.03, [-25, 0, 41], 0xd9cfb3);
  bench(-25, 39); bench(-28, 42, Math.PI / 2);
  const garden = label(group, ["STAY A LITTLE.", "Nothing to complete here."], [3.8, 1.1], [-25, 1.4, 37]);
  zone("garden", "Take a quiet moment", -25, 41, garden, STUDIO.forest, 3.5);
  for (const [x, z, scale] of [[-12,-14,1.1],[-20,-8,1],[-30,2,1.2],[14,-13,1.1],[30,7,1],[-31,33,1.2],[-30,47,1],[28,47,1.2],[21,60,0.9],[-23,59,1.1],[-9,18,0.85],[29,34,0.9]]) tree(x, z, scale);
  for (const [x, z] of [[7,23], [-7,43], [23,12]]) bench(x,z);
  planter(13, 14, 5); planter(-18, 57, 3.5);
  // Batch only static geometry. Animated discoveries are added afterwards.

  return { zones, interactive, markers, obstacles, dispose: () => { disposed = true; } };
}

/** Resolve solid scenery only; the shore and ocean are freely traversable. */
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

  }
}
