import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import gsap from "gsap";
import { WeatherSystem, WeatherType } from "./Weather";

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────
function seededRandom(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// ─────────────────────────────────────────────
// Procedural Textures & Canvas Generators
// ─────────────────────────────────────────────
function makeLabel(text: string, color = "#ffffff", bgHex = ""): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  if (bgHex) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 128);
  }
  ctx.fillStyle = color;
  ctx.font = "900 52px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHerringboneParquetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Base rich dark walnut floor color
  ctx.fillStyle = "#1b1828";
  ctx.fillRect(0, 0, 1024, 1024);

  // Herringbone pattern
  const pw = 120; // plank width
  const ph = 36;  // plank height

  ctx.lineWidth = 2.5;

  for (let y = -100; y < 1124; y += ph * 2) {
    for (let x = -100; x < 1124; x += pw) {
      // Alternating wood plank tones
      const shade = 20 + Math.floor(seededRandom(x, y) * 22);
      const r = shade + 8;
      const g = shade;
      const b = shade + 18;

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.strokeStyle = "rgba(10, 8, 18, 0.7)";

      // Left slanting plank
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.fillRect(0, 0, pw, ph);
      ctx.strokeRect(0, 0, pw, ph);

      // Fine wood grain detail lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.beginPath();
      ctx.moveTo(10, ph / 2);
      ctx.lineTo(pw - 10, ph / 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // Subtle micro-noise for satin finish depth
  ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
  for (let i = 0; i < 35000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2 + Math.random() * 3, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoothingWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Soothing matte slate-greige tone
  ctx.fillStyle = "#222234";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle plaster grain / linen weave
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let i = 0; i < 20000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 1, 1);
  }

  // Soft vertical fabric/slat accent lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAsphaltNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, 256, 256);
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const nx = 128 + (Math.random() - 0.5) * 30;
    const ny = 128 + (Math.random() - 0.5) * 30;
    d[i] = Math.min(255, Math.max(0, nx));
    d[i + 1] = Math.min(255, Math.max(0, ny));
    d[i + 2] = 255;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 24);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const sz = 128;
  const canvas = document.createElement("canvas");
  canvas.width = sz;
  canvas.height = sz;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.92)");
  grad.addColorStop(0.25, "rgba(0, 0, 0, 0.70)");
  grad.addColorStop(0.6, "rgba(0, 0, 0, 0.25)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(canvas);
}

function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#64748b";
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 0); ctx.lineTo(128, 256);
  ctx.moveTo(0, 128); ctx.lineTo(256, 128);
  ctx.stroke();

  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 32);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMatrixScreenTexture(): { texture: THREE.CanvasTexture; update: (t: number) => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  const drops: number[] = Array(32).fill(0);

  const update = (_t: number) => {
    ctx.fillStyle = "rgba(9, 9, 18, 0.2)";
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = "#06b6d4";
    ctx.font = "14px 'JetBrains Mono', monospace";

    drops.forEach((y, i) => {
      const text = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
      const x = i * 16;
      ctx.fillText(text, x, y);
      if (y > 256 || Math.random() > 0.96) {
        drops[i] = 0;
      } else {
        drops[i] += 14;
      }
    });
    tex.needsUpdate = true;
  };

  const tex = new THREE.CanvasTexture(canvas);
  return { texture: tex, update };
}

export interface Zone {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  color: number;
}

export class World {
  scene: THREE.Scene;
  roomGroup = new THREE.Group();
  streetGroup = new THREE.Group();
  zones: Zone[] = [];
  doorPosition = new THREE.Vector3(0, 0, 7.8);
  weather: WeatherSystem;

  roomZones: Zone[] = [];
  streetZones: Zone[] = [];
  roomRings: THREE.Mesh[] = [];
  streetRings: THREE.Mesh[] = [];

  private skydome: THREE.Mesh | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private sunLight: THREE.DirectionalLight | null = null;
  private particles: THREE.Points | null = null;
  private starParticles: THREE.Points | null = null;
  private screenUpdater: ((t: number) => void) | null = null;
  private gltfLoader = new GLTFLoader();

  private fadeOverlay: THREE.Mesh | null = null;
  private rings: THREE.Mesh[] = [];
  private steamParticles: THREE.Mesh[] = [];

  // Neon flicker targets [light, mesh, baseIntensity]
  private neonFlickers: Array<{ light: THREE.PointLight; mesh: THREE.Mesh; base: number }> = [];
  private flickerFrame = 0; // throttle flicker updates

  // Wet road materials to swap on rain
  private roadMesh: THREE.Mesh | null = null;
  private dryRoadMat: THREE.MeshStandardMaterial | null = null;
  private wetRoadMat: THREE.MeshStandardMaterial | null = null;

  // Cached 3D GLTF Model Templates for zero-cost cloning
  private modelCache = new Map<string, THREE.Group>();

  // Baked contact shadow system (replaces real-time shadow maps)
  private contactShadowTex: THREE.CanvasTexture | null = null;
  private characterShadow: THREE.Mesh | null = null;
  private animatedEmblems: THREE.Group[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.weather = new WeatherSystem(scene);
    this.buildSkyDome();
    this.buildLights();
    this.buildRoom();
    this.buildStreet();
    this.createCharacterShadow();
    this.activateRoom();
    this.buildAmbientDust();
    this.scene.add(this.roomGroup);
    this.createFade();
  }

  private createCharacterShadow() {
    // Character ground shadow plane disabled per user request
  }

  activateRoom() {
    this.zones = this.roomZones;
    this.rings = this.roomRings;
  }

  activateStreet() {
    this.zones = this.streetZones;
    this.rings = this.streetRings;
  }

  // ─────────────────────────────────────────────
  // Skybox Dome
  // ─────────────────────────────────────────────
  private buildSkyDome() {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, "#0369a1");
    grad.addColorStop(0.25, "#0ea5e9");
    grad.addColorStop(0.5, "#38bdf8");
    grad.addColorStop(0.7, "#7dd3fc");
    grad.addColorStop(0.85, "#e0f2fe");
    grad.addColorStop(1.0, "#fef3c7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 512);

    // Faint cloud band at horizon
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 60; i++) {
      const cx = Math.random() * 32;
      const cy = 400 + Math.random() * 80;
      const rx = 4 + Math.random() * 12;
      const ry = 2 + Math.random() * 6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const skySphere = new THREE.Mesh(
      new THREE.SphereGeometry(220, 32, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
    );
    this.skydome = skySphere;
    this.scene.add(skySphere);

    // Stars (hidden during sunny, shown during rain)
    const starCanvas = document.createElement("canvas");
    starCanvas.width = 16;
    starCanvas.height = 16;
    const sCtx = starCanvas.getContext("2d")!;
    const sGrad = sCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    sGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    sGrad.addColorStop(0.4, "rgba(224, 231, 255, 0.6)");
    sGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 16, 16);
    const starTex = new THREE.CanvasTexture(starCanvas);

    const starCount = 100;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const phi = Math.random() * Math.PI * 0.35;
      const theta = Math.random() * Math.PI * 2;
      const r = 210;
      starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.6, map: starTex, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    });
    this.starParticles = new THREE.Points(starGeo, starMat);
    this.starParticles.visible = false;
    this.scene.add(this.starParticles);
  }

  // ─────────────────────────────────────────────
  // Lights & Atmosphere
  // ─────────────────────────────────────────────
  private buildLights() {
    // Bright, vibrant daylight ambient fill
    this.ambientLight = new THREE.AmbientLight(0xbae6fd, 1.4);
    this.scene.add(this.ambientLight);

    // Bright warm sun light (no real-time shadow maps — baked contact shadows instead)
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 3.0);
    this.sunLight.position.set(12, 22, 12);
    this.scene.add(this.sunLight);

    // Overhead fill
    const ceiling = new THREE.PointLight(0xa78bfa, 3.0, 18);
    ceiling.position.set(0, 5.0, 0);
    this.scene.add(ceiling);

    // Soft rim accents
    const rim = new THREE.PointLight(0xc084fc, 2.5, 18);
    rim.position.set(-7, 8, -7);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0x38bdf8, 2.5, 16);
    warm.position.set(7, 6, 5);
    this.scene.add(warm);
  }

  setWeather(type: WeatherType) {
    this.weather.setWeather(type);
    if (type === "rain") {
      const fogColor = new THREE.Color(0x334155);
      this.scene.fog = new THREE.Fog(fogColor, 20, 100);
      this.scene.background = fogColor;
      if (this.ambientLight) { this.ambientLight.intensity = 0.85; this.ambientLight.color.setHex(0x64748b); }
      if (this.sunLight) { this.sunLight.color.setHex(0x94a3b8); this.sunLight.intensity = 1.4; }
      if (this.roadMesh && this.wetRoadMat) this.roadMesh.material = this.wetRoadMat;
      if (this.skydome) (this.skydome.material as THREE.MeshBasicMaterial).color.setHex(0x64748b);
      if (this.starParticles) this.starParticles.visible = true;
    } else {
      const fogColor = new THREE.Color(0x7dd3fc);
      this.scene.fog = new THREE.Fog(fogColor, 40, 180);
      this.scene.background = fogColor;
      if (this.ambientLight) { this.ambientLight.intensity = 1.4; this.ambientLight.color.setHex(0xbae6fd); }
      if (this.sunLight) { this.sunLight.color.setHex(0xfffbeb); this.sunLight.intensity = 3.0; }
      if (this.roadMesh && this.dryRoadMat) this.roadMesh.material = this.dryRoadMat;
      if (this.skydome) (this.skydome.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      if (this.starParticles) this.starParticles.visible = false;
    }
  }

  private addContactShadow(g: THREE.Group, x: number, z: number, radius: number) {
    if (!this.contactShadowTex) this.contactShadowTex = createContactShadowTexture();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 1,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, 0.02, z);
    g.add(plane);
    return plane;
  }

  private buildAmbientDust() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 35;
      positions[i + 1] = Math.random() * 12;
      positions[i + 2] = (Math.random() - 0.5) * 35;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  // ─────────────────────────────────────────────
  // Room
  // ─────────────────────────────────────────────
  buildRoom() {
    const g = this.roomGroup;
    this.zones = [];

    const floorTex = createHerringboneParquetTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.3,
      metalness: 0.1,
    });
    const wallTex = createSoothingWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.6 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // Ceiling
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x141322, roughness: 0.9 });
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 5.2;
    g.add(ceil);

    // Ceiling Crown Molding Trim
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x161526 });
    [
      [0, 5.12, -7.92, 16, 0.16, 0.16],
      [-7.92, 5.12, 0, 0.16, 0.16, 16],
      [7.92, 5.12, 0, 0.16, 0.16, 16],
    ].forEach(([x, y, z, w, h, d]) => {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), crownMat);
      cr.position.set(x, y, z);
      g.add(cr);
    });

    // Baseboards
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a192c });
    const baseBack = new THREE.Mesh(new THREE.BoxGeometry(16, 0.28, 0.1), baseMat);
    baseBack.position.set(0, 0.14, -7.95);
    g.add(baseBack);

    // Lower Wall Wainscoting Slats (Back Wall)
    const wainscot = new THREE.Mesh(
      new THREE.BoxGeometry(15.8, 1.2, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1a182a, roughness: 0.7 })
    );
    wainscot.position.set(0, 0.6, -7.94);
    g.add(wainscot);

    // Walls
    [
      [0, 2.6, -8, 16, 5.2, 0.4],
      [-8, 2.6, 0, 0.4, 5.2, 16],
      [8, 2.6, 0, 0.4, 5.2, 16],
    ].forEach(([x, y, z, w, h, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
    });

    // Front wall door frame & sides
    const fwL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5.2, 0.4), wallMat);
    fwL.position.set(-5.25, 2.6, 8);
    g.add(fwL);
    const fwR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 5.2, 0.4), wallMat);
    fwR.position.set(5.25, 2.6, 8);
    g.add(fwR);
    const fwTop = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.75, 0.4), wallMat);
    fwTop.position.set(0, 4.32, 8);
    g.add(fwTop);

    // Door Frame
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.5, 0.5), woodTrimMat);
    frameL.position.set(-1.28, 1.75, 8);
    g.add(frameL);
    const frameR = frameL.clone();
    frameR.position.set(1.28, 1.75, 8);
    g.add(frameR);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.28, 0.5), woodTrimMat);
    frameTop.position.set(0, 3.64, 8);
    g.add(frameTop);

    // Door leaf
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.4, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.3, metalness: 0.2 })
    );
    door.position.set(0, 1.7, 7.98);
    door.castShadow = true;
    g.add(door);

    // Exit portal ring on ground
    const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 12, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.02, 7.3);
    g.add(ring);
    this.rings.push(ring);

    // Woven Area Rug under Center/Desk
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 5.8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b38, roughness: 0.95 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.012, 0.5);
    rug.receiveShadow = true;
    g.add(rug);

    // Decorative Rug Gold Border
    const rugBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.9 })
    );
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.set(0, 0.013, 0.5);
    g.add(rugBorder);

    // Workstation Corner (Left Back)
    this.buildGamingDesk(g, -4.2, -5.2);

    // Luxury Almirah / Wardrobe & Display Tower (Right Back)
    this.buildLuxuryAlmirah(g, 5.2, -5.6);

    // Arcade Machine Zone (Right Front)
    this.buildArcadeMachine(g, 5.8, 3.5);

    // Cozy Lounge Armchair Corner (Right Middle)
    this.buildLoungeCorner(g, 4.2, -0.5);

    // Potted Monstera Plant (Left Front)
    this.buildPottedPlant(g, -6.2, 4.5);

    // Framed Wall Art Prints (Left Wall)
    this.buildWallArt(g);

    // Neon Wall Signs
    this.addNeonSign(g, "DEVELOPER", 0x6366f1, -4.5, 3.8, -7.75);
    this.addNeonSign(g, "CREATIVE", 0xa855f7, 0, 3.8, -7.75);
    this.addNeonSign(g, "BUILDER", 0x06b6d4, 4.5, 3.8, -7.75);

    // Floor Lamp
    this.addFloorLamp(g, 3.2, 0, -4.8);

    // Glass Window with Moonlight Glow
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, emissive: 0x0284c7, emissiveIntensity: 0.7, transparent: true, opacity: 0.85
    });
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.2), windowMat);
    win.rotation.y = Math.PI / 2;
    win.position.set(-7.78, 3.1, -2);
    g.add(win);

    this.roomZones = [...this.zones];
    this.roomRings = [...this.rings];
  }

  private buildLuxuryAlmirah(g: THREE.Group, x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const almirahMat = new THREE.MeshStandardMaterial({
      color: 0x1a1828,
      roughness: 0.4,
      metalness: 0.3,
    });
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x27243a,
      roughness: 0.35,
      metalness: 0.2,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({
      color: 0x4a3b32,
      roughness: 0.5,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Main Carcass Body (Width: 2.2, Height: 3.8, Depth: 0.8)
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.8), almirahMat);
    body.position.y = 1.9;
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);

    // Left Wardrobe Double Doors (Width: 1.3, Height: 3.6)
    const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.63, 3.6, 0.06), doorMat);
    doorLeft.position.set(-0.33, 1.9, 0.42);
    doorLeft.castShadow = true;
    group.add(doorLeft);

    const doorRight = new THREE.Mesh(new THREE.BoxGeometry(0.63, 3.6, 0.06), doorMat);
    doorRight.position.set(0.33, 1.9, 0.42);
    doorRight.castShadow = true;
    group.add(doorRight);

    // Brass Handles
    const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), brassMat);
    handleL.position.set(-0.06, 1.9, 0.46);
    group.add(handleL);

    const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), brassMat);
    handleR.position.set(0.06, 1.9, 0.46);
    group.add(handleR);

    // Open Side Display Shelving Unit (Right Column)
    const displayShelf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.6, 0.76), woodTrimMat);
    displayShelf.position.set(1.2, 1.9, 0.02);
    displayShelf.castShadow = true;
    group.add(displayShelf);

    // 4 Display Shelves with LED Backlight strip
    [0.7, 1.5, 2.3, 3.1].forEach((yPos) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.72), almirahMat);
      shelf.position.set(1.2, yPos, 0.04);
      group.add(shelf);

      // LED Light strip
      const led = new THREE.PointLight(0xa855f7, 0.8, 2.5);
      led.position.set(1.2, yPos + 0.08, 0.2);
      group.add(led);
    });

    // Display Accessories on Shelves:
    // Shelf 1 (Bottom): Tech Boxes
    const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x312e81 }));
    box1.position.set(1.2, 0.82, 0.1);
    group.add(box1);

    // Shelf 2: Stacked Books
    const bookColors = [0x6366f1, 0x06b6d4, 0x10b981];
    bookColors.forEach((col, i) => {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.35), new THREE.MeshStandardMaterial({ color: col }));
      bk.position.set(1.05 + i * 0.1, 1.63, 0.1);
      group.add(bk);
    });

    // Shelf 3: Golden 3D Trophy / Award
    const trophyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 12), brassMat);
    trophyBase.position.set(1.2, 2.37, 0.1);
    group.add(trophyBase);
    const trophyCup = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 12), brassMat);
    trophyCup.rotation.x = Math.PI;
    trophyCup.position.set(1.2, 2.52, 0.1);
    group.add(trophyCup);

    // Shelf 4 (Top): Potted Mini Succulent
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pot.position.set(1.2, 3.22, 0.1);
    group.add(pot);
    const plantTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.9 }));
    plantTop.position.set(1.2, 3.34, 0.1);
    group.add(plantTop);

    // Top Crown Lighting
    const topLight = new THREE.PointLight(0x818cf8, 1.2, 5);
    topLight.position.set(x + 0.3, 3.9, z + 0.5);
    g.add(topLight);

    g.add(group);
  }

  private buildLoungeCorner(g: THREE.Group, x: number, z: number) {
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(x, 0, z);

    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.5 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });

    // Velvet Armchair
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.2), velvetMat);
    seat.position.set(0, 0.4, 0);
    seat.castShadow = true;
    loungeGroup.add(seat);

    // Throw pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.15), cushionMat);
    pillow.rotation.y = 0.2;
    pillow.position.set(-0.25, 0.65, -0.35);
    loungeGroup.add(pillow);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.25), velvetMat);
    armL.position.set(-0.6, 0.55, 0);
    loungeGroup.add(armL);

    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 1.25), velvetMat);
    armR.position.set(0.6, 0.55, 0);
    loungeGroup.add(armR);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.2), velvetMat);
    back.position.set(0, 0.85, -0.5);
    loungeGroup.add(back);

    // Legs
    [[-0.5, -0.4], [0.5, -0.4], [-0.5, 0.4], [0.5, 0.4]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.3), woodMat);
      leg.position.set(dx, 0.15, dz);
      loungeGroup.add(leg);
    });

    // Side Coffee Table
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), woodMat);
    tableTop.position.set(-1.1, 0.5, 0.2);
    tableTop.castShadow = true;
    loungeGroup.add(tableTop);

    const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.48, 8), brassMat);
    tableLeg.position.set(-1.1, 0.24, 0.2);
    loungeGroup.add(tableLeg);

    // Coffee mug on side table
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    mug.position.set(-1.1, 0.57, 0.2);
    loungeGroup.add(mug);

    g.add(loungeGroup);
  }

  private buildPottedPlant(g: THREE.Group, x: number, z: number) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);

    // Ceramic pot
    const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.7, 24), potMat);
    pot.position.y = 0.35;
    pot.castShadow = true;
    plantGroup.add(pot);

    // Soil
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x331f10 }));
    soil.position.y = 0.68;
    plantGroup.add(soil);

    // Stems & Leaves
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, side: THREE.DoubleSide });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const height = 0.6 + Math.random() * 0.4;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, height, 8), stemMat);
      stem.rotation.z = Math.sin(angle) * 0.3;
      stem.rotation.x = Math.cos(angle) * 0.3;
      stem.position.set(Math.sin(angle) * 0.1, 0.7 + height / 2, Math.cos(angle) * 0.1);
      plantGroup.add(stem);

      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), leafMat);
      leaf.scale.set(1.2, 0.1, 0.8);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.4;
      leaf.position.set(Math.sin(angle) * 0.3, 0.7 + height, Math.cos(angle) * 0.3);
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }

    g.add(plantGroup);
  }

  private buildWallArt(g: THREE.Group) {
    const artMat1 = new THREE.MeshStandardMaterial({
      map: makeLabel("CREATE", "#38bdf8", "#0f172a"),
      roughness: 0.4,
    });
    const artMat2 = new THREE.MeshStandardMaterial({
      map: makeLabel("CODE 3D", "#a855f7", "#090914"),
      roughness: 0.4,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

    // Wall Art 1 (Left wall back)
    const frame1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 1.3), frameMat);
    frame1.position.set(-7.94, 3.2, -5.2);
    g.add(frame1);

    const print1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), artMat1);
    print1.rotation.y = Math.PI / 2;
    print1.position.set(-7.89, 3.2, -5.2);
    g.add(print1);

    // Wall Art 2 (Left wall front)
    const frame2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 1.3), frameMat);
    frame2.position.set(-7.94, 3.2, 2.2);
    g.add(frame2);

    const print2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), artMat2);
    print2.rotation.y = Math.PI / 2;
    print2.position.set(-7.89, 3.2, 2.2);
    g.add(print2);
  }

  private buildGamingDesk(g: THREE.Group, x: number, z: number) {
    const proceduralDeskGroup = new THREE.Group();
    proceduralDeskGroup.name = "proceduralDesk";

    const matWood = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
    const matLegs = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.2 });

    // Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.14, 1.8), matWood);
    top.position.set(x, 1.4, z);
    top.castShadow = true;
    proceduralDeskGroup.add(top);

    // Legs
    [[-1.8, -0.75], [1.8, -0.75], [-1.8, 0.75], [1.8, 0.75]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), matLegs);
      leg.position.set(x + dx, 0.7, z + dz);
      proceduralDeskGroup.add(leg);
    });

    g.add(proceduralDeskGroup);

    // Load Custom Desktop GLB Model
    this.gltfLoader.load(
      "/models/desktop.glb",
      (gltf) => {
        const desktopModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(desktopModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        desktopModel.position.x = -center.x;
        desktopModel.position.y = -box.min.y;
        desktopModel.position.z = -center.z;

        const wrapper = new THREE.Group();
        wrapper.add(desktopModel);

        const targetHeight = 1.8;
        const scaleFactor = targetHeight / (size.y || 1.8);
        wrapper.scale.setScalar(scaleFactor);
        wrapper.position.set(x, 0, z);

        wrapper.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        g.add(wrapper);
        proceduralDeskGroup.visible = false;
      },
      undefined,
      (err) => console.warn("Could not load desktop.glb, using procedural desk fallback", err)
    );

    // Animated Matrix screen texture overlay
    const { texture: matrixTex, update: updateMatrix } = createMatrixScreenTexture();
    this.screenUpdater = updateMatrix;

    const screenMat = new THREE.MeshStandardMaterial({
      map: matrixTex,
      emissiveMap: matrixTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.08), screenMat);
    screen.position.set(x, 2.25, z - 0.4);
    screen.castShadow = true;
    g.add(screen);

    // Screen light
    const screenLight = new THREE.PointLight(0x06b6d4, 1.5, 6);
    screenLight.position.set(x, 2.2, z - 0.2);
    g.add(screenLight);

    // Coffee mug steam particles
    const steamGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const steam = new THREE.Mesh(steamGeo, steamMat.clone());
      steam.position.set(x + 1.2, 1.65 + i * 0.08, z + 0.1);
      g.add(steam);
      this.steamParticles.push(steam);
    }
  }

  private buildArcadeMachine(g: THREE.Group, x: number, z: number) {
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 });
    const marqueeMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.8, roughness: 0.2
    });
    const arcadeScreenMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.9, roughness: 0.1
    });

    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);

    // Base body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 1.1), cabinetMat);
    body.position.y = 1.4;
    body.castShadow = true;
    cabinet.add(body);

    // Marquee top
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.4, 1.0), marqueeMat);
    marquee.position.set(0, 2.65, 0.05);
    cabinet.add(marquee);

    // Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.05), arcadeScreenMat);
    screen.position.set(0, 1.85, 0.52);
    arcadeScreenMat.map = makeLabel("CYBER SNAKE", "#ffffff", "#090918");
    cabinet.add(screen);

    // Control panel deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.2, 0.45), cabinetMat);
    deck.position.set(0, 1.2, 0.48);
    cabinet.add(deck);

    // Joystick & buttons
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    stick.position.set(-0.25, 1.35, 0.48);
    cabinet.add(stick);

    const btn1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.5 })
    );
    btn1.position.set(0.18, 1.32, 0.48);
    cabinet.add(btn1);

    const btn2 = btn1.clone();
    btn2.position.set(0.3, 1.32, 0.48);
    cabinet.add(btn2);

    g.add(cabinet);

    // Ground ring marker for Arcade Zone
    const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 12, 36);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.02, z);
    g.add(ring);
    this.rings.push(ring);

    this.zones.push({
      id: "arcade",
      label: "Play Cyber Arcade",
      color: 0xa855f7,
      position: new THREE.Vector3(x, 0, z),
      radius: 2.5,
    });
  }

  private buildFloatingShelves(g: THREE.Group, x: number, z: number) {
    const matWood = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.7 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 2.6), matWood);
    shelf.position.set(x, 1.8, z);
    shelf.castShadow = true; shelf.receiveShadow = true;
    g.add(shelf);

    const colors = [0x6366f1, 0xa855f7, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444];
    for (let i = 0; i < 10; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3 + Math.random() * 0.12, 0.26),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length] })
      );
      const row = Math.floor(i / 5);
      const col = i % 5;
      book.position.set(x + 0.18, 0.75 + row * 1.2, z - 1.0 + col * 0.48);
      g.add(book);
    }
  }

  private addNeonSign(g: THREE.Group, text: string, colorHex: number, x: number, y: number, z: number) {
    const hexStr = "#" + colorHex.toString(16).padStart(6, "0");
    const tex = makeLabel(text, hexStr);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.8 })
    );
    frame.position.set(x, y, z);
    g.add(frame);

    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.0),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    face.position.set(x, y, z + 0.05);
    g.add(face);

    const light = new THREE.PointLight(colorHex, 1.2, 8);
    light.position.set(x, y, z + 0.4);
    g.add(light);
  }

  private addFloorLamp(g: THREE.Group, x: number, _y: number, z: number) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8 })
    );
    pole.position.set(x, 1.1, z);
    g.add(pole);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.55, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.9, side: THREE.DoubleSide })
    );
    shade.position.set(x, 2.1, z);
    g.add(shade);

    const pl = new THREE.PointLight(0xfde047, 1.8, 14);
    pl.position.set(x, 2.0, z);
    g.add(pl);
  }

  // ─────────────────────────────────────────────
  // GLTF Cached Model Loader
  // ─────────────────────────────────────────────
  private loadModelCached(
    url: string,
    onSuccess: (model: THREE.Group, size: THREE.Vector3) => void,
    onError?: () => void
  ) {
    if (this.modelCache.has(url)) {
      const template = this.modelCache.get(url)!;
      const clone = template.clone(true);
      const size = (template as any)._boundsSize as THREE.Vector3;
      onSuccess(clone, size);
      return;
    }

    this.gltfLoader.load(
      url,
      (gltf) => {
        const rawModel = gltf.scene;

        // Hide stand meshes on lamp models if present
        rawModel.traverse((c: any) => {
          if (c.name && c.name.toLowerCase().includes("stand")) {
            c.visible = false;
          }
          if (c.isMesh) {
            c.frustumCulled = true;
            if (c.geometry) {
              c.geometry.computeBoundingSphere();
            }
          }
        });

        const box = new THREE.Box3().setFromObject(rawModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        rawModel.position.x = -center.x;
        rawModel.position.y = -box.min.y;
        rawModel.position.z = -center.z;

        const wrapper = new THREE.Group();
        wrapper.add(rawModel);
        (wrapper as any)._boundsSize = size;

        this.modelCache.set(url, wrapper);
        const clone = wrapper.clone(true);
        onSuccess(clone, size);
      },
      undefined,
      (err) => {
        if (onError) onError();
      }
    );
  }

  // ─────────────────────────────────────────────
  // Street
  // ─────────────────────────────────────────────
  buildStreet() {
    const g = this.streetGroup;
    g.clear();
    this.animatedEmblems = [];
    this.zones = [];
    this.rings = [];

    const asphaltTex = createAsphaltTexture();
    const asphaltNorm = createAsphaltNormalMap();
    const sidewalkTex = createSidewalkTexture();

    // Dry road material – textured asphalt with normal map for surface detail
    this.dryRoadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      normalMap: asphaltNorm,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.75,
      metalness: 0.05,
    });
    // Wet road material – reflective like rain-slicked asphalt
    this.wetRoadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      normalMap: asphaltNorm,
      normalScale: new THREE.Vector2(0.15, 0.15),
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.7,
      envMapIntensity: 1.2,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.65,
    });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.85 });

    // Road
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 260), this.dryRoadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -90);
    this.roadMesh = road;
    g.add(road);

    // Dashed center lines
    const dashMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8, metalness: 0.1 });
    for (let z = 0; z > -125; z -= 8) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 3.5),
        dashMat
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.01, z - 2);
      g.add(dash);
    }

    // Road edge lines (white painted strips)
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1 });
    const ledge = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 260), edgeMat);
    ledge.rotation.x = -Math.PI / 2;
    ledge.position.set(-7.85, 0.015, -90);
    g.add(ledge);
    const redge = ledge.clone();
    redge.position.set(7.85, 0.015, -90);
    g.add(redge);

    // Sidewalks
    const lwalk = new THREE.Mesh(new THREE.PlaneGeometry(5, 260), sideMat);
    lwalk.rotation.x = -Math.PI / 2;
    lwalk.position.set(-10.5, 0.06, -90);
    g.add(lwalk);

    const rwalk = lwalk.clone();
    rwalk.position.set(10.5, 0.06, -90);
    g.add(rwalk);

    // Grass
    const lgrass = new THREE.Mesh(new THREE.PlaneGeometry(30, 260), grassMat);
    lgrass.rotation.x = -Math.PI / 2;
    lgrass.position.set(-27, 0, -90);
    g.add(lgrass);

    const rgrass = lgrass.clone();
    rgrass.position.set(27, 0, -90);
    g.add(rgrass);

    // Sidewalk curbs (taller profile with lip)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const lcurb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 260), curbMat);
    lcurb.position.set(-8.0, 0.11, -90);
    g.add(lcurb);
    const llip = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 260), lipMat);
    llip.position.set(-8.0, 0.24, -90);
    g.add(llip);
    const rcurb = lcurb.clone();
    rcurb.position.set(8.0, 0.11, -90);
    g.add(rcurb);
    const rlip = llip.clone();
    rlip.position.set(8.0, 0.24, -90);
    g.add(rlip);

    // Houses / Zones along the Boulevard
    const houseData = [
      { id: "about", label: "About Me", color: 0xec4899, x: -14, z: -20 },
      { id: "skills", label: "Skills", color: 0x10b981, x: 14, z: -38 },
      { id: "projects", label: "Projects", color: 0xf59e0b, x: -14, z: -58 },
      { id: "experience", label: "Experience", color: 0x6366f1, x: 14, z: -76 },
    ];
    houseData.forEach((h) => {
      this.buildHouse(g, h.id, h.label, h.color, h.x, h.z);
      this.addContactShadow(g, h.x, h.z, 4.5);
    });

    // Grand Contact Monument Plaza at Z = -105 (just before road end barriers)
    this.buildContactPlaza(g);

    // Trees (placed in open stretches away from house entrances)
    const treeZsLeft = [-6, -38, -76, -114];
    treeZsLeft.forEach((tz) => {
      this.buildTree(g, -13.5, tz);
      this.addContactShadow(g, -13.5, tz, 2.0);
    });

    const treeZsRight = [-6, -20, -58, -96, -114];
    treeZsRight.forEach((tz) => {
      this.buildTree(g, 13.5, tz);
      this.addContactShadow(g, 13.5, tz, 2.0);
    });

    // Low-poly 3D Instanced Grass Tufts covering the entire green lawn
    this.buildGrassTufts(g);

    // Bushes (optimized coverage across green lawn borders & between houses)
    const bushPositions = [
      { x: -9.2, z: 6 }, { x: 9.2, z: 6 },
      { x: -9.2, z: -4 }, { x: 9.2, z: -4 },
      { x: -13.5, z: -10 }, { x: 13.5, z: -10 },
      { x: -18.0, z: -16 }, { x: 18.0, z: -16 },
      { x: -13.2, z: -28 }, { x: 13.2, z: -28 },
      { x: -19.0, z: -32 }, { x: 19.0, z: -32 },
      { x: -15.5, z: -50 }, { x: 15.5, z: -50 },
      { x: -13.2, z: -66 }, { x: 13.2, z: -66 },
      { x: -19.5, z: -70 }, { x: 19.5, z: -70 },
      { x: -16.0, z: -88 }, { x: 16.0, z: -88 },
    ];
    bushPositions.forEach((bp) => this.buildBush(g, bp.x, bp.z));

    // Lamps every 28 units
    let lampIdx = 0;
    for (let z = -12; z > -130; z -= 28) {
      const withLight = lampIdx % 2 === 0;
      this.buildLampPost(g, -8.2, z, withLight);
      this.buildLampPost(g, 8.2, z, withLight);
      this.addContactShadow(g, -8.2, z, 1.0);
      this.addContactShadow(g, 8.2, z, 1.0);
      lampIdx++;
    }

    // End of road barriers (white emissive glow stripped)
    const endZ = -115;
    [-4.2, 0, 4.2].forEach((barrierX) => {
      this.buildRoadBarrier(g, barrierX, endZ, 0);
    });

    // Backdrop City Skyline
    this.buildCitySkyline(g);

    this.streetZones = [...this.zones];
    this.streetRings = [...this.rings];
  }

  private buildHouse(g: THREE.Group, id: string, label: string, color: number, x: number, z: number) {
    const isLeft = x < 0;
    const houseRY = isLeft ? Math.PI / 2 : -Math.PI / 2;

    const proceduralHouseGroup = new THREE.Group();
    proceduralHouseGroup.name = `proceduralHouse_${id}`;

    const baseMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(9, 6.0, 9), baseMat);
    base.position.set(x, 3.0, z);
    base.castShadow = true; base.receiveShadow = false;
    proceduralHouseGroup.add(base);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.6, 4), roofMat);
    roof.position.set(x, 7.8, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    proceduralHouseGroup.add(roof);

    const doorX = isLeft ? x + 4.51 : x - 4.51;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.8, 1.8), doorMat);
    door.position.set(doorX, 1.4, z);
    proceduralHouseGroup.add(door);

    g.add(proceduralHouseGroup);

    this.loadModelCached(
      "/models/house.glb",
      (houseModel, size) => {
        const targetHeight = 7.5;
        const scaleFactor = targetHeight / (size.y || 7.5);
        houseModel.scale.setScalar(scaleFactor);
        houseModel.position.set(x, 0, z);
        houseModel.rotation.y = houseRY;

        houseModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });

        g.add(houseModel);
        proceduralHouseGroup.visible = false;
      },
      () => console.warn("Using procedural fallback for house", id)
    );

    // Glowing Neon Store Sign facing the road
    const tex = makeLabel(label, "#ffffff");
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 1.3),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    const signX = isLeft ? x + 4.2 : x - 4.2;
    sign.position.set(signX, 6.2, z);
    sign.rotation.y = houseRY;
    g.add(sign);

    // Glowing Portal Ring directly on Sidewalk for smooth interaction
    const zoneX = x < 0 ? -10.5 : 10.5;
    const zoneZ = z;
    const ringGeo = new THREE.TorusGeometry(2.2, 0.12, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(zoneX, 0.12, zoneZ);
    g.add(ring);
    this.rings.push(ring);

    this.zones.push({
      id,
      label,
      color,
      position: new THREE.Vector3(zoneX, 0, zoneZ),
      radius: 3.8,
    });
  }

  private buildRoadBarrier(g: THREE.Group, x: number, z: number, rotationY: number = 0) {
    this.loadModelCached(
      "/models/road_barrier.glb",
      (barrierModel, size) => {
        const targetHeight = 1.3;
        const scaleFactor = targetHeight / (size.y || 1.3);
        barrierModel.scale.setScalar(scaleFactor);
        barrierModel.position.set(x, 0, z);
        barrierModel.rotation.y = rotationY;

        barrierModel.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;

            // REMOVE WHITE GLOWING MATERIAS & EMISSIVE PROPERTIES
            const mesh = c as THREE.Mesh;
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m: any) => {
                if (m.emissive) {
                  m.emissive.setHex(0x000000);
                  m.emissiveIntensity = 0;
                }
                // Convert any blinding white material to matte slate gray
                if (m.color && m.color.r > 0.85 && m.color.g > 0.85 && m.color.b > 0.85) {
                  m.color.setHex(0x475569);
                }
              });
            }
          }
        });
        g.add(barrierModel);
      },
      () => {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.9, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 })
        );
        bar.position.set(x, 0.45, z);
        bar.rotation.y = rotationY;
        g.add(bar);
      }
    );
  }

  private buildTree(g: THREE.Group, x: number, z: number) {
    this.loadModelCached(
      "/models/tree.glb",
      (treeModel, size) => {
        const targetHeight = 4.8 * (0.85 + seededRandom(x, z) * 0.3);
        const scaleFactor = targetHeight / (size.y || 4.8);
        treeModel.scale.setScalar(scaleFactor);
        treeModel.position.set(x, 0, z);
        treeModel.rotation.y = seededRandom(x, z) * Math.PI * 2;

        treeModel.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;
          }
        });
        g.add(treeModel);
      },
      () => {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.35, 2.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x451a03 })
        );
        trunk.position.set(x, 1.3, z);
        trunk.castShadow = true;
        g.add(trunk);

        const leaves = new THREE.Mesh(
          new THREE.SphereGeometry(2.0, 10, 10),
          new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 })
        );
        leaves.position.set(x, 3.8, z);
        leaves.castShadow = true;
        g.add(leaves);
      }
    );
  }

  private buildBush(g: THREE.Group, x: number, z: number) {
    this.loadModelCached(
      "/models/bush.glb",
      (bushModel, size) => {
        const targetHeight = 1.2 * (0.8 + seededRandom(x, z) * 0.4);
        const scaleFactor = targetHeight / (size.y || 1.2);
        bushModel.scale.setScalar(scaleFactor);
        bushModel.position.set(x, 0, z);
        bushModel.rotation.y = seededRandom(x + 7, z + 3) * Math.PI * 2;

        bushModel.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = true;
            c.receiveShadow = false;
          }
        });
        g.add(bushModel);
      },
      () => {
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 })
        );
        bush.position.set(x, 0.4, z);
        g.add(bush);
      }
    );
  }

  private buildLampPost(g: THREE.Group, x: number, z: number, withLight = true) {
    this.loadModelCached(
      "/models/street_lamp.glb",
      (lampModel, size) => {
        const scale = (5.8 / (size.y || 5.8)) * (0.95 + seededRandom(x, z) * 0.1);
        lampModel.scale.setScalar(scale);
        lampModel.position.set(x, 0, z);

        lampModel.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            c.castShadow = false;
          }
        });
        g.add(lampModel);
      },
      () => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.12, 5.8, 6),
          new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        pole.position.set(x, 2.9, z);
        g.add(pole);

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfde047 })
        );
        bulb.position.set(x, 5.8, z);
        g.add(bulb);
      }
    );

    if (withLight) {
      const pl = new THREE.PointLight(0xfde047, 2.2, 10);
      pl.position.set(x, 5.7, z);
      g.add(pl);
    }
  }

  private buildCitySkyline(g: THREE.Group) {
    // Shared material — all buildings share one draw call material
    const skylineMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.95, metalness: 0.1 });
    const neonPalette = [0xff2d78, 0x00eeff, 0xa855f7, 0x10b981, 0xfbbf24, 0x6366f1];

    for (let i = 0; i < 12; i++) {
      const h = 12 + Math.random() * 28;
      const bw = 8 + Math.random() * 10;
      const bd = 8 + Math.random() * 10;
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (42 + Math.random() * 18);
      const z = -10 - i * 8;

      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), skylineMat);
      bldg.position.set(x, h / 2, z);
      g.add(bldg);

      // Neon accent stripe — MeshBasicMaterial is zero-cost for lighting calc
      const neonColor = neonPalette[i % neonPalette.length];
      const stripeMat = new THREE.MeshBasicMaterial({ color: neonColor });
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, h * 0.65, 0.18), stripeMat);
      stripe.position.set(x + bw / 2, h / 2, z + bd / 2);
      g.add(stripe);
      // NOTE: No PointLight added — buildings are background, not worth lighting cost
      // The neon stripe MeshBasicMaterial glows on its own without any lighting calc

      // Glowing windows (MeshBasicMaterial = free)
      const windowColors = [0xfef08a, 0x60a5fa, 0xfbbf24, 0xa78bfa];
      for (let wIdx = 0; wIdx < 4; wIdx++) {
        const wColor = windowColors[wIdx % windowColors.length];
        const winMat = new THREE.MeshBasicMaterial({ color: wColor, transparent: true, opacity: 0.65 });
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), winMat);
        win.position.set(
          x + (Math.random() - 0.5) * (bw - 1.5),
          2 + Math.random() * (h - 4),
          z + bd / 2 + 0.12
        );
        g.add(win);
      }
    }
  }

  private buildContactPlaza(g: THREE.Group) {
    const plazaZ = -105;
    const plazaRadius = 7.8;

    // Circular slate plaza floor platform
    const plazaGeo = new THREE.CylinderGeometry(plazaRadius, plazaRadius + 0.4, 0.12, 24);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.7,
      metalness: 0.2,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.06, plazaZ);
    plaza.receiveShadow = true;
    g.add(plaza);

    // Outer golden-bronze accent rim
    const rimGeo = new THREE.TorusGeometry(plazaRadius + 0.1, 0.08, 8, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.12, plazaZ);
    g.add(rim);

    // Contact shadow under plaza base
    this.addContactShadow(g, 0, plazaZ, 8.8);

    // Flanking torch lamp posts at entry of plaza
    this.buildLampPost(g, -6.8, -98, true);
    this.buildLampPost(g, 6.8, -98, true);

    // ── Central Hero Statue ──
    const base1 = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    base1.position.set(0, 0.28, plazaZ);
    g.add(base1);

    const base2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    base2.position.set(0, 0.7, plazaZ);
    g.add(base2);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 })
    );
    pillar.position.set(0, 1.5, plazaZ);
    g.add(pillar);

    // Sculpted Metallic Bronze Hero Statue
    const statue = new THREE.Group();
    statue.position.set(0, 2.1, plazaZ);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85,
    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.5), bronzeMat);
    chest.position.set(0, 1.2, 0);
    statue.add(chest);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), bronzeMat);
    head.position.set(0, 2.1, 0);
    statue.add(head);

    const cape = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.1), bronzeMat);
    cape.position.set(0, 1.0, -0.28);
    cape.rotation.x = -0.1;
    statue.add(cape);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0), bronzeMat);
    armL.position.set(-0.6, 1.3, 0.2);
    armL.rotation.z = Math.PI / 4;
    statue.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.0), bronzeMat);
    armR.position.set(0.6, 1.3, 0.2);
    armR.rotation.z = -Math.PI / 4;
    statue.add(armR);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.1), bronzeMat);
    legL.position.set(-0.25, 0.55, 0);
    statue.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.1), bronzeMat);
    legR.position.set(0.25, 0.55, 0);
    statue.add(legR);

    g.add(statue);

    const statueLight = new THREE.PointLight(0xfab52b, 2.5, 12);
    statueLight.position.set(0, 5.5, plazaZ + 0.5);
    g.add(statueLight);

    // Register central Contact Plaza zone
    this.zones.push({
      id: "contact",
      label: "Contact Plaza",
      color: 0xef4444,
      position: new THREE.Vector3(0, 0, plazaZ),
      radius: 7.0,
    });

    // Helper to generate 3D floating badge texture
    const makePedestalBadge = (text: string, hexColor: string) => {
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(8, 8, 368, 112, 20); else ctx.fillRect(8, 8, 368, 112);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = hexColor;
      ctx.stroke();
      ctx.font = "bold 38px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 192, 64);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    // ── 4 Surrounding Contact Pedestals (Plinths) ──
    const pedestals = [
      {
        id: "contact_linkedin",
        label: "LinkedIn",
        hexColor: "#0a66c2",
        color: 0x0a66c2,
        x: -5.2,
        z: -102.5,
        type: "linkedin",
      },
      {
        id: "contact_github",
        label: "GitHub",
        hexColor: "#94a3b8",
        color: 0x64748b,
        x: -2.2,
        z: -108.5,
        type: "github",
      },
      {
        id: "contact_gmail",
        label: "Gmail",
        hexColor: "#ea4335",
        color: 0xea4335,
        x: 2.2,
        z: -108.5,
        type: "gmail",
      },
      {
        id: "contact_phone",
        label: "Phone",
        hexColor: "#22c55e",
        color: 0x22c55e,
        x: 5.2,
        z: -102.5,
        type: "phone",
      },
    ];

    pedestals.forEach((p) => {
      // Stone Plinth Base
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.3, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
      );
      plinth.position.set(p.x, 0.65, p.z);
      g.add(plinth);

      // Accent Top Rim
      const plinthRim = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 1.6),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.3, metalness: 0.6 })
      );
      plinthRim.position.set(p.x, 1.32, p.z);
      g.add(plinthRim);

      // Contact shadow under pedestal
      this.addContactShadow(g, p.x, p.z, 1.6);

      // 3D Emblem Model on top
      const emblemUrl = `/models/${p.type}.glb`;
      this.loadModelCached(
        emblemUrl,
        (emblemModel, size) => {
          const targetHeight = 0.95;
          const scaleFactor = targetHeight / (size.y || 0.95);
          emblemModel.scale.setScalar(scaleFactor);
          emblemModel.position.set(p.x, 1.45, p.z);
          emblemModel.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          g.add(emblemModel);
          this.animatedEmblems.push(emblemModel);
        },
        () => {
          // Fallback procedural emblem
          const emblemGroup = new THREE.Group();
          emblemGroup.position.set(p.x, 1.45, p.z);
          if (p.type === "linkedin") {
            const bg = new THREE.Mesh(
              new THREE.BoxGeometry(0.85, 0.85, 0.25),
              new THREE.MeshStandardMaterial({ color: 0x0a66c2, roughness: 0.2, metalness: 0.5 })
            );
            bg.position.set(0, 0.45, 0);
            emblemGroup.add(bg);
          } else if (p.type === "github") {
            const bg = new THREE.Mesh(
              new THREE.CylinderGeometry(0.5, 0.5, 0.22, 16),
              new THREE.MeshStandardMaterial({ color: 0x181717, roughness: 0.3, metalness: 0.8 })
            );
            bg.rotation.x = Math.PI / 2;
            bg.position.set(0, 0.5, 0);
            emblemGroup.add(bg);
          } else if (p.type === "gmail") {
            const env = new THREE.Mesh(
              new THREE.BoxGeometry(0.95, 0.65, 0.22),
              new THREE.MeshStandardMaterial({ color: 0xea4335, roughness: 0.3, metalness: 0.4 })
            );
            env.position.set(0, 0.45, 0);
            emblemGroup.add(env);
          } else if (p.type === "phone") {
            const base = new THREE.Mesh(
              new THREE.TorusGeometry(0.35, 0.12, 8, 16, Math.PI),
              new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.6 })
            );
            base.rotation.z = -Math.PI / 4;
            base.position.set(0, 0.5, 0);
            emblemGroup.add(base);
          }
          g.add(emblemGroup);
          this.animatedEmblems.push(emblemGroup);
        }
      );

      // Floating 3D Badge Label over pedestal
      const badgeTex = makePedestalBadge(p.label, p.hexColor);
      const badgePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.8),
        new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true })
      );
      badgePlane.position.set(p.x, 2.7, p.z);
      g.add(badgePlane);

      // Glowing Interactive Portal Ring in front of pedestal
      const ringGeo = new THREE.TorusGeometry(1.2, 0.08, 12, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.9 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(p.x, 0.12, p.z + 0.8);
      g.add(ring);
      this.rings.push(ring);

      // Sub-zone registration
      this.zones.push({
        id: p.id,
        label: p.label,
        color: p.color,
        position: new THREE.Vector3(p.x, 0, p.z + 0.8),
        radius: 2.5,
      });
    });
  }

  private buildGrassTufts(g: THREE.Group) {
    const houses = [
      { x: -14, z: -20, r: 6.5 },
      { x: 14, z: -38, r: 6.5 },
      { x: -14, z: -58, r: 6.5 },
      { x: 14, z: -76, r: 6.5 },
      { x: 0, z: -105, r: 8.5 }, // Contact Monument Plaza
    ];

    const populateGrass = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number) => {
      const instancedGrass = new THREE.InstancedMesh(geo, mat, count);
      const dummy = new THREE.Object3D();
      let idx = 0;

      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        // Strictly place grass on the outer green lawns (|X| >= 15.5) so road (X: -8 to 8) and sidewalk (X: -13 to 13) stay 100% clean
        const x = side * (15.5 + seededRandom(i * 3.1, i * 7.7) * 20);
        const z = 8 - seededRandom(i * 5.3, i * 2.9) * 135;

        // Skip if inside house bounds
        let insideHouse = false;
        for (const house of houses) {
          const dx = x - house.x;
          const dz = z - house.z;
          if (dx * dx + dz * dz < house.r * house.r) {
            insideHouse = true;
            break;
          }
        }
        if (insideHouse) continue;

        const scale = 0.55 + seededRandom(i, x) * 0.45;
        const rotY = seededRandom(x, z) * Math.PI * 2;

        dummy.position.set(x, 0, z);
        dummy.rotation.set(0, rotY, (seededRandom(z, x) - 0.5) * 0.1);
        dummy.scale.set(scale, scale * (0.8 + seededRandom(i, z) * 0.3), scale);
        dummy.updateMatrix();

        instancedGrass.setMatrixAt(idx++, dummy.matrix);
      }

      instancedGrass.instanceMatrix.needsUpdate = true;
      g.add(instancedGrass);
    };

    // Load grass.glb model from assets and normalize its geometry
    this.loadModelCached(
      "/models/grass.glb",
      (grassModel) => {
        let grassGeo: THREE.BufferGeometry | null = null;
        let grassMat: THREE.Material | null = null;

        grassModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !grassGeo) {
            const mesh = child as THREE.Mesh;
            grassGeo = mesh.geometry.clone();
            grassMat = mesh.material;
          }
        });

        if (grassGeo && grassMat) {
          grassGeo.computeBoundingBox();
          const box = grassGeo.boundingBox || new THREE.Box3();
          const sizeY = box.max.y - box.min.y || 1;
          const center = new THREE.Vector3();
          box.getCenter(center);

          // Center geometry horizontally and align bottom to Y = 0
          grassGeo.translate(-center.x, -box.min.y, -center.z);

          const targetH = 0.5;
          const scaleF = targetH / sizeY;
          grassGeo.scale(scaleF, scaleF, scaleF);

          // Render 400 instances strictly on green lawns
          populateGrass(grassGeo, grassMat, 400);
        }
      },
      () => {
        // Procedural fallback
        const bladeGeo = new THREE.BufferGeometry();
        const verts: number[] = [];
        const numBlades = 3;
        for (let b = 0; b < numBlades; b++) {
          const angle = (b * Math.PI) / numBlades;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const w = 0.16, h = 0.5, tw = 0.03;
          const x0 = -w * cos, z0 = -w * sin;
          const x1 =  w * cos, z1 =  w * sin;
          const x2 =  tw * cos, z2 =  tw * sin;
          const x3 = -tw * cos, z3 = -tw * sin;
          verts.push(x0,0,z0, x1,0,z1, x2,h,z2, x0,0,z0, x2,h,z2, x3,h,z3);
          verts.push(x1,0,z1, x0,0,z0, x2,h,z2, x2,h,z2, x0,0,z0, x3,h,z3);
        }
        bladeGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        bladeGeo.computeVertexNormals();
        const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8, side: THREE.DoubleSide });
        populateGrass(bladeGeo, fallbackMat, 350);
      }
    );
  }

  // ─────────────────────────────────────────────
  // Transitions & Updates
  // ─────────────────────────────────────────────
  private createFade() {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x090912,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.fadeOverlay = new THREE.Mesh(geo, mat);
    this.fadeOverlay.renderOrder = 9999;
    this.fadeOverlay.visible = false;
    this.scene.add(this.fadeOverlay);
  }

  fadeToBlack(duration: number, onComplete: () => void) {
    if (!this.fadeOverlay) { onComplete(); return; }
    this.fadeOverlay.visible = true;
    const mat = this.fadeOverlay.material as THREE.MeshBasicMaterial;
    mat.opacity = 0;
    gsap.to(mat, { opacity: 1, duration, onComplete });
  }

  fadeIn(duration: number, onComplete?: () => void) {
    if (!this.fadeOverlay) { onComplete?.(); return; }
    const mat = this.fadeOverlay.material as THREE.MeshBasicMaterial;
    gsap.to(mat, {
      opacity: 0,
      duration,
      onComplete: () => {
        this.fadeOverlay!.visible = false;
        onComplete?.();
      },
    });
  }

  updateFade(camera: THREE.Camera) {
    if (!this.fadeOverlay?.visible) return;
    this.fadeOverlay.position.copy(camera.position);
    this.fadeOverlay.quaternion.copy(camera.quaternion);
    this.fadeOverlay.translateZ(-0.25);
  }

  updateCharacterShadow(_charX: number, _charZ: number, _charY: number = 0) {
    if (this.characterShadow) {
      this.characterShadow.visible = false;
    }
  }

  updateRings(t: number, dt: number = 0.016) {
    this.weather.update(dt);
    this.flickerFrame++;

    this.animatedEmblems.forEach((emb) => {
      emb.rotation.y += dt * 0.8;
    });

    this.rings.forEach((ring, i) => {
      ring.position.y = 0.12 + Math.sin(t * 2.5 + i * 1.4) * 0.09;
      ring.rotation.z = t * 0.5 + i;
    });

    if (this.particles) {
      this.particles.rotation.y = t * 0.04;
    }

    if (this.screenUpdater) {
      this.screenUpdater(t);
    }

    this.steamParticles.forEach((steam, idx) => {
      steam.position.y += 0.002;
      steam.scale.addScalar(0.001);
      if (steam.position.y > 1.95) {
        steam.position.y = 1.65 + idx * 0.08;
        steam.scale.setScalar(1);
      }
    });

    // Neon flicker throttled to every 4th frame (was every frame)
    if (this.flickerFrame % 4 === 0) {
      this.neonFlickers.forEach((neon, i) => {
        if (Math.random() > 0.96) {
          neon.light.intensity = neon.base * (0.05 + Math.random() * 0.25);
        } else {
          neon.light.intensity = neon.base * (0.8 + 0.2 * Math.sin(t * 1.8 + i * 0.7));
        }
      });
    }
  }

  dispose() {
    [this.roomGroup, this.streetGroup].forEach((grp) => {
      grp.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
          else c.material.dispose();
        }
      });
      this.scene.remove(grp);
    });
    if (this.particles) this.scene.remove(this.particles);
    if (this.fadeOverlay) this.scene.remove(this.fadeOverlay);
  }
}
