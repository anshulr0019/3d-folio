import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { World, Zone, DayNightMode, InteractiveObjectData } from "./World";
import { Character } from "./Character";
import { EventEmitter } from "./EventEmitter";
import { sound } from "./Audio";
import { WeatherType } from "./Weather";
import { CONTENT } from "./content";
import gsap from "gsap";

export type GameState =
  | "LOADING"
  | "CINEMATIC"
  | "INTRO"
  | "ROOM"
  | "DOOR_TRANSITION"
  | "STREET"
  | "MODAL";

// Pre-allocated collision tables to avoid array & object allocations in render loop
const STREET_HOUSES = [
  { x: -14, z: -20, r: 5.8, rSq: 33.64 },
  { x: 14, z: -38, r: 5.8, rSq: 33.64 },
  { x: -14, z: -58, r: 5.8, rSq: 33.64 },
  { x: 14, z: -76, r: 5.8, rSq: 33.64 },
];

const STREET_OBSTACLES = [
  { x: 0, z: -105, r: 2.8, rSq: 7.84 },      // Hero Statue Base
  { x: -6.8, z: -98, r: 0.9, rSq: 0.81 },     // Left Plaza Torch Lamp
  { x: 6.8, z: -98, r: 0.9, rSq: 0.81 },      // Right Plaza Torch Lamp
  { x: -5.2, z: -102.5, r: 1.1, rSq: 1.21 },  // LinkedIn Plinth
  { x: -2.2, z: -108.5, r: 1.1, rSq: 1.21 },  // GitHub Plinth
  { x: 2.2, z: -108.5, r: 1.1, rSq: 1.21 },   // Gmail Plinth
  { x: 5.2, z: -102.5, r: 1.1, rSq: 1.21 },   // Phone Plinth
];

const ROOM_OBSTACLES = [
  { x: -4.2, z: -5.2, r: 1.8, rSq: 3.24 }, // Gaming Desk
  { x: 5.2, z: -5.6, r: 1.8, rSq: 3.24 },  // Almirah / Wardrobe
  { x: 5.8, z: 3.5, r: 1.5, rSq: 2.25 },   // Arcade Machine
  { x: 4.2, z: -0.5, r: 1.5, rSq: 2.25 },  // Reading Lounge Armchair
];

export class Experience extends EventEmitter {
  private canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world!: World;
  character!: Character;

  // Post-processing
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;

  state: GameState = "LOADING";

  // Input
  keys = new Set<string>();
  joystick = { x: 0, y: 0 };

  // Raycasting & Interactive objects
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-999, -999);
  hoveredObject: InteractiveObjectData | null = null;

  // Camera – spring physics
  private cameraVelocity = new THREE.Vector3();
  private cameraSpring = { stiffness: 7, damping: 0.88 };

  // Camera offsets – high 3/4 elevated isometric perspective with directional bias
  private roomCameraOffset = new THREE.Vector3(0, 3.4, 4.8);
  private streetCameraOffset = new THREE.Vector3(0, 7.8, 8.5);
  private currentCameraOffset = new THREE.Vector3(0, 7.8, 8.5);
  private cameraOffset = new THREE.Vector3(0, 3.4, 4.8);
  private cameraLookAt = new THREE.Vector3(0, 1.4, 0);
  private cameraYaw = 0;

  // Cinematic
  isCinematicDone = false;

  // Time
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private frameCounter = 0;

  // Active zone
  nearestZone: Zone | null = null;
  private TRANSITION_Z = 7.0;

  // Photo Mode
  photoMode = false;
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private photoAzimuth = 0;
  private photoElevation = 0.35;
  private photoDistance = 5.0;

  // Konami Easter Egg Sequence
  private konamiSequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
  private currentKonamiIdx = 0;

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;

    // ── Renderer ──────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // ── Scene ─────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);
    this.scene.fog = new THREE.FogExp2(0x12121e, 0.011);

    // ── Camera ────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 3.8, 7.6);

    // ── Post-processing ───────────────────────
    this.buildPostProcessing(w, h);

    // ── Resize ────────────────────────────────
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    window.addEventListener("resize", () => this.resize());

    // ── Input & Raycast Listeners ─────────────
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);

      // KeyE / KeyF: Interact / Open Modal on active zone
      if ((e.code === "KeyE" || e.code === "KeyF") && (this.state === "ROOM" || this.state === "STREET")) {
        if (this.nearestZone) {
          this.openModal(this.nearestZone.id);
        }
      }

      // KeyP: Photo Mode toggle
      if (e.code === "KeyP" && (this.state === "ROOM" || this.state === "STREET")) {
        this.togglePhotoMode();
      }

      // Konami code check
      if (e.code === this.konamiSequence[this.currentKonamiIdx]) {
        this.currentKonamiIdx++;
        if (this.currentKonamiIdx === this.konamiSequence.length) {
          this.currentKonamiIdx = 0;
          this.triggerPartyMode();
        }
      } else if (e.code === "KeyK") {
        this.triggerPartyMode();
      } else {
        this.currentKonamiIdx = 0;
      }

      this.emit("keydown", e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    // Pointer hover & Photo Mode drag tracking
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.photoMode && this.isPointerDragging) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;

        this.photoAzimuth -= dx * 0.008;
        this.photoElevation = THREE.MathUtils.clamp(
          this.photoElevation + dy * 0.008,
          -0.2,
          1.2
        );
      } else {
        this.checkRaycastHover(e.clientX, e.clientY);
      }
    });

    // Pointer click on interactive 3D objects / photo drag start
    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      if (this.photoMode) {
        this.isPointerDragging = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      } else if (this.hoveredObject && (this.state === "ROOM" || this.state === "STREET")) {
        this.handleObjectClick(this.hoveredObject);
      }
    });

    window.addEventListener("pointerup", () => {
      this.isPointerDragging = false;
    });

    // Wheel zoom in Photo Mode
    canvas.addEventListener("wheel", (e: WheelEvent) => {
      if (this.photoMode) {
        this.photoDistance = THREE.MathUtils.clamp(
          this.photoDistance + e.deltaY * 0.005,
          2.0,
          14.0
        );
      }
    }, { passive: true });
  }

  private buildPostProcessing(w: number, h: number) {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom at HALF resolution — 4x cheaper than full-res, visually identical
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
      0.7,    // strength
      0.5,    // radius
      0.82    // threshold raised — only bright emissive spots glow, stops weird ambient glow
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  async init() {
    this.world = new World(this.scene);
    this.character = new Character(this.scene);
    this.cameraOffset.copy(this.roomCameraOffset);

    // Forward collectibles events
    this.world.collectibles.onCollectCallback = (gem, count, total) => {
      this.emit("gemCollected", { gem, count, total });
    };

    this.resize();
    this.setState("LOADING");
    this.startLoop();
    try {
      this.renderer.compile(this.scene, this.camera);
    } catch {}
  }

  private cinematicTimeline: gsap.core.Timeline | null = null;

  playCinematic() {
    this.setState("CINEMATIC");
    this.emit("cinematicStart");

    // Park character below ground so it doesn't show during cinematic
    this.character.group.position.set(0, -10, 0);

    // Keyframe positions for the camera flythrough
    const kf = [
      { pos: new THREE.Vector3(4, 20, 4),  look: new THREE.Vector3(0, 0, 0) },
      { pos: new THREE.Vector3(-10, 9, -2), look: new THREE.Vector3(0, 1, -1) },
      { pos: new THREE.Vector3(4, 6, 10),  look: new THREE.Vector3(0, 1.5, 0) },
      { pos: new THREE.Vector3(0, 3.8, 7.6), look: new THREE.Vector3(0, 1.2, 0) },
    ];

    this.cinematicTimeline = gsap.timeline({
      onComplete: () => {
        this.isCinematicDone = true;
        this.character.setPosition(0, 0, 3, Math.PI);
        this.setState("INTRO");
        this.emit("cinematicEnd");
      }
    });

    const tl = this.cinematicTimeline;
    // Overshoot fov during swoop for drama
    tl.to(this.camera, { fov: 75, duration: 1.2, ease: "power2.in",
      onUpdate: () => this.camera.updateProjectionMatrix() });
    tl.to(this.camera, { fov: 55, duration: 1.5, ease: "power2.out",
      onUpdate: () => this.camera.updateProjectionMatrix() }, "-=0.2");

    kf.forEach((k, i) => {
      const dur = i === 0 ? 0.01 : i === kf.length - 1 ? 1.4 : 1.2;
      const ease = i === kf.length - 1 ? "power3.out" : "power2.inOut";

      tl.to(this.camera.position, {
        x: k.pos.x, y: k.pos.y, z: k.pos.z,
        duration: dur, ease,
      }, i === 0 ? 0 : "+=0");

      tl.to(this.cameraLookAt, {
        x: k.look.x, y: k.look.y, z: k.look.z,
        duration: dur, ease,
        onUpdate: () => this.camera.lookAt(this.cameraLookAt),
      }, `<`);
    });

    // Pulse bloom strength during flythrough
    tl.fromTo(this.bloomPass, { strength: 2.2 }, {
      strength: 0.85, duration: 3.5, ease: "power2.out"
    }, 0.3);
  }

  skipCinematic() {
    if (this.cinematicTimeline) {
      this.cinematicTimeline.kill();
      this.cinematicTimeline = null;
    }
    gsap.killTweensOf(this.camera);
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.cameraLookAt);
    gsap.killTweensOf(this.bloomPass);

    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 3.8, 7.6);
    this.cameraLookAt.set(0, 1.2, 0);
    this.camera.lookAt(this.cameraLookAt);
    this.bloomPass.strength = 0.7;

    this.isCinematicDone = true;
    this.character.setPosition(0, 0, 3, Math.PI);
    this.setState("INTRO");
    this.emit("cinematicEnd");
  }

  setWeather(type: WeatherType) {
    this.world?.setWeather(type);
    // Ramp bloom down a touch in rain for realistic look
    gsap.to(this.bloomPass, {
      strength: type === "rain" ? 1.1 : 0.85,
      duration: 1.5, ease: "power2.inOut"
    });
  }

  setState(s: GameState) {
    this.state = s;
    this.emit("stateChange", s);
  }

  // ── Room → Street transition ──────────────
  exitRoom() {
    if (this.state !== "ROOM") return;
    this.setState("DOOR_TRANSITION");
    sound.playDoorSwoosh();

    this.world.fadeToBlack(0.4, () => {
      this.scene.remove(this.world.roomGroup);
      this.scene.add(this.world.streetGroup);
      this.world.activateStreet();
      // Bright sunny sky atmosphere with linear depth fog
      const skyColor = new THREE.Color(0x7dd3fc);
      this.scene.background = skyColor;
      this.scene.fog = new THREE.Fog(skyColor, 40, 180);
      gsap.to(this.bloomPass, { strength: 0.4, duration: 0.8, ease: "power2.out" });

      this.character.setPosition(0, 0, 8, Math.PI);
      this.cameraYaw = 0;
      this.cameraVelocity.set(0, 0, 0);
      this.camera.position.set(0, 4.0, 15.5);
      this.cameraLookAt.set(0, 1.25, 6.0);
      this.camera.lookAt(this.cameraLookAt);
      this.cameraOffset.copy(this.streetCameraOffset);

      this.world.fadeIn(0.5, () => {
        this.setState("STREET");
        this.emit("enterStreet");
      });
    });
  }

  // ── Street → Room transition ──────────────
  enterRoom() {
    if (this.state !== "STREET") return;
    this.setState("DOOR_TRANSITION");
    sound.playDoorSwoosh();

    this.world.fadeToBlack(0.4, () => {
      this.scene.remove(this.world.streetGroup);
      this.scene.add(this.world.roomGroup);
      this.world.activateRoom();
      this.scene.background = new THREE.Color(0x0d0d1a);
      this.scene.fog = new THREE.FogExp2(0x12121e, 0.011);
      // Restore room bloom level
      gsap.to(this.bloomPass, { strength: 0.7, duration: 0.8, ease: "power2.out" });

      this.character.setPosition(0, 0, 3, Math.PI);
      this.cameraOffset.copy(this.roomCameraOffset);
      this.cameraVelocity.set(0, 0, 0);
      this.camera.position.set(0, 3.4, 7.8);
      this.cameraLookAt.set(0, 1.4, 0);
      this.camera.lookAt(this.cameraLookAt);

      this.world.fadeIn(0.5, () => {
        this.setState("ROOM");
        this.emit("enterRoom");
      });
    });
  }

  private checkRaycastHover(screenX: number, screenY: number) {
    if (this.state !== "ROOM" && this.state !== "STREET") {
      if (this.hoveredObject) {
        this.hoveredObject = null;
        this.canvas.style.cursor = "default";
        this.emit("hoverObject", null);
      }
      return;
    }

    if (!this.world?.interactiveObjects?.length) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.world.interactiveObjects, true);

    let found: InteractiveObjectData | null = null;
    for (let i = 0; i < intersects.length; i++) {
      let obj: THREE.Object3D | null = intersects[i].object;
      while (obj && !obj.userData?.interactive) {
        obj = obj.parent;
      }
      if (obj?.userData?.interactive) {
        found = obj.userData.interactive as InteractiveObjectData;
        break;
      }
    }

    if (found !== this.hoveredObject) {
      this.hoveredObject = found;
      this.canvas.style.cursor = found ? "pointer" : "default";
      this.emit("hoverObject", found ? { ...found, screenX, screenY } : null);
    }
  }

  handleObjectClick(data: InteractiveObjectData) {
    if (data.id === "arcade") {
      this.openModal("arcade");
    } else if (data.id === "companion") {
      const quote = this.world.companion?.interact() || "Beep boop! 🚀";
      this.emit("companionDialogue", quote);
    } else if (data.id === "resume") {
      window.open("/resume.pdf", "_blank");
    } else if (data.id.startsWith("contact_")) {
      if (data.id === "contact_linkedin") window.open("https://linkedin.com", "_blank");
      else if (data.id === "contact_github") window.open("https://github.com", "_blank");
      else if (data.id === "contact_gmail") window.location.href = `mailto:${CONTENT.contact.email}`;
    } else {
      this.openModal(data.id);
    }
  }

  togglePhotoMode(): boolean {
    this.photoMode = !this.photoMode;
    if (this.photoMode) {
      this.photoAzimuth = 0;
      this.photoElevation = 0.35;
      this.photoDistance = 5.0;
    }
    sound.playModalPop();
    this.emit("photoModeChange", this.photoMode);
    return this.photoMode;
  }

  captureScreenshot(): string {
    sound.playCameraShutter();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  triggerPartyMode() {
    sound.playFanfare();
    const colors = [0xec4899, 0x38bdf8, 0xa855f7, 0xfacc15, 0x22c55e];
    let step = 0;
    const interval = setInterval(() => {
      const col = colors[step % colors.length];
      if (this.world.roomCeiling) this.world.roomCeiling.color.setHex(col);
      if (this.world.roomWarm) this.world.roomWarm.color.setHex(colors[(step + 2) % colors.length]);
      step++;
      if (step > 30) clearInterval(interval);
    }, 150);
    this.emit("partyMode");
  }

  toggleDayNight(): DayNightMode {
    const next = this.world.toggleDayNightMode();
    ;(sound as any).playClick();
    this.emit("dayNightChange", next);
    return next;
  }

  openModal(zoneId: string) {
    if (this.state !== "STREET" && this.state !== "ROOM") return;
    sound.playModalPop();
    this.setState("MODAL");
    this.emit("openModal", zoneId);
  }

  closeModal() {
    const prev = this.state;
    if (prev !== "MODAL") return;
    sound.playModalPop();
    this.setState(this.world.streetGroup.parent ? "STREET" : "ROOM");
    this.emit("closeModal");
  }

  // ── Main loop ─────────────────────────────
  private startLoop() {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      const delta = Math.min(now - this.lastTime, 50);
      this.lastTime = now;
      this.elapsed += delta;
      this.update(delta, this.elapsed);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(delta: number, elapsed: number) {
    // During cinematic, GSAP controls camera – just render
    if (this.state === "CINEMATIC") {
      this.world?.updateRings(elapsed / 1000, delta / 1000);
      this.composer.render();
      return;
    }

    if (this.state === "LOADING") {
      return;
    }

    if (
      this.state !== "MODAL" &&
      this.state !== "DOOR_TRANSITION" &&
      this.state !== "INTRO"
    ) {
      const isStreet = !!this.world.streetGroup.parent;
      const surface = isStreet ? "asphalt" : "wood";
      this.character.update(this.keys, this.joystick, delta, elapsed, this.cameraYaw, surface);

      // ── Physical Boundary & Object Collision Resolution ──
      const pos = this.character.group.position;
      this.applyCollisions(pos, isStreet);

      // Update character shadow under feet (works in room & street, handles jumping)
      this.world.updateCharacterShadow(pos.x, pos.z, pos.y);
    }

    // Zone detection (throttled to every 6th frame for performance)
    this.frameCounter++;
    if ((this.state === "STREET" || this.state === "ROOM") && this.frameCounter % 6 === 0) {
      this.detectZone();
    }

    // Door exit detection
    if (this.state === "ROOM") {
      if (this.character.group.position.z >= this.TRANSITION_Z) {
        this.exitRoom();
      }
    }

    this.updateCamera(delta);
    this.world.updateFade(this.camera);

    // Pass physics prop parameters to update loop
    const charPos = this.character?.group?.position;
    const charVel = this.character?.velocity || Experience._tempVelocity;
    const isSprinting = this.character?.isRunning || false;
    this.world.updateRings(elapsed / 1000, delta / 1000, charPos, charVel, isSprinting);

    this.composer.render();
  }

  private static _tempTarget = new THREE.Vector3();
  private static _tempDesiredOffset = new THREE.Vector3();
  private static _tempDesiredLookOffset = new THREE.Vector3();
  private static _tempLookTarget = new THREE.Vector3();
  private static _tempError = new THREE.Vector3();
  private static _tempVelocity = new THREE.Vector3();

  private applyCollisions(pos: THREE.Vector3, isStreet: boolean) {
    if (isStreet) {
      // 1. Boulevard & Sidewalk Outer Boundaries (prevents hair/head clipping into house roofs)
      pos.z = THREE.MathUtils.clamp(pos.z, -111.5, 12.0);
      pos.x = THREE.MathUtils.clamp(pos.x, -10.8, 10.8);

      // 2. Lamp Post Collisions (Lamps at X = ±8.2, Z = -12, -40, -68, -96, -124)
      const minDist = 0.95;
      const minDistSq = 0.9025;
      for (let z = -12; z > -130; z -= 28) {
        for (let lxIdx = 0; lxIdx < 2; lxIdx++) {
          const lx = lxIdx === 0 ? -8.2 : 8.2;
          const dx = pos.x - lx;
          const dz = pos.z - z;
          const distSq = dx * dx + dz * dz;
          if (distSq < minDistSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
          }
        }
      }

      // 3. House Front Collisions
      for (let i = 0; i < STREET_HOUSES.length; i++) {
        const h = STREET_HOUSES[i];
        const dx = pos.x - h.x;
        const dz = pos.z - h.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < h.rSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = h.r - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }

      // 4. Central Statue & Contact Pedestals Collisions
      for (let i = 0; i < STREET_OBSTACLES.length; i++) {
        const obs = STREET_OBSTACLES[i];
        const dx = pos.x - obs.x;
        const dz = pos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < obs.rSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = obs.r - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }
    } else {
      // Room Boundaries & Furniture Collision
      pos.x = THREE.MathUtils.clamp(pos.x, -5.2, 5.2);
      pos.z = THREE.MathUtils.clamp(pos.z, -6.0, 7.5);

      // Desk, Almirah & Arcade Machine Collisions
      for (let i = 0; i < ROOM_OBSTACLES.length; i++) {
        const obs = ROOM_OBSTACLES[i];
        const dx = pos.x - obs.x;
        const dz = pos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < obs.rSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = obs.r - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }
    }
  }

  private detectZone() {
    const pos = this.character.group.position;
    let nearest: Zone | null = null;
    let nearestDistSq = Infinity;

    for (let i = 0; i < this.world.zones.length; i++) {
      const zone = this.world.zones[i];
      const dx = pos.x - zone.position.x;
      const dz = pos.z - zone.position.z;
      const distSq = dx * dx + dz * dz;
      const rSq = zone.radius * zone.radius;
      if (distSq < rSq && distSq < nearestDistSq) {
        nearest = zone;
        nearestDistSq = distSq;
      }
    }

    if (nearest !== this.nearestZone) {
      if (nearest) sound.playZoneChime();
      this.nearestZone = nearest;
      this.emit("zoneChange", nearest);
    }
  }

  private updateCamera(delta: number) {
    if (!this.character?.group) return;

    const char = this.character.group;
    const dt = delta / 1000;

    // ── Photo Mode Free Orbit Camera ──
    if (this.photoMode) {
      const cx = char.position.x + this.photoDistance * Math.sin(this.photoAzimuth) * Math.cos(this.photoElevation);
      const cy = char.position.y + 1.2 + this.photoDistance * Math.sin(this.photoElevation);
      const cz = char.position.z + this.photoDistance * Math.cos(this.photoAzimuth) * Math.cos(this.photoElevation);

      this.camera.position.set(cx, cy, cz);
      const lookTarget = Experience._tempLookTarget.set(char.position.x, char.position.y + 1.2, char.position.z);
      this.cameraLookAt.copy(lookTarget);
      this.camera.lookAt(lookTarget);
      return;
    }

    const isStreet = !!this.world.streetGroup.parent;

    if (isStreet) {
      // ── AAA Third-Person Perspective (TPP) Camera Behind the Character ──
      // Target camera angle: positioned behind character's facing direction
      const charFacing = this.character.targetRotY;
      const desiredCamAngle = charFacing - Math.PI;

      // Shortest angular difference wrapping [-PI, PI]
      let diff = desiredCamAngle - this.cameraYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      // Smooth exponential angular dampening (silky smooth arc with zero jitter)
      const turnDamp = 1 - Math.exp(-3.5 * dt);
      this.cameraYaw += diff * turnDamp;

      // AAA 3rd-person trailing geometry
      const dist = 7.5;
      const height = 4.0;
      const lookDist = 2.0;

      const camOffsetX = Math.sin(this.cameraYaw) * dist;
      const camOffsetZ = Math.cos(this.cameraYaw) * dist;
      const lookOffsetX = -Math.sin(this.cameraYaw) * lookDist;
      const lookOffsetZ = -Math.cos(this.cameraYaw) * lookDist;

      Experience._tempDesiredOffset.set(camOffsetX, height, camOffsetZ);
      Experience._tempDesiredLookOffset.set(lookOffsetX, 1.25, lookOffsetZ);

      // Grand framing near Contact Plaza (Z < -90)
      if (char.position.z < -90) {
        Experience._tempDesiredOffset.y += 1.0;
      }
    } else {
      Experience._tempDesiredOffset.set(0, 3.4, 4.8);
      Experience._tempDesiredLookOffset.set(0, 1.2, 0);
      this.cameraYaw = 0;
    }

    // Direct smoothed target calculation with spring dampening
    const target = Experience._tempTarget.copy(char.position).add(Experience._tempDesiredOffset);

    if (!isStreet) {
      target.x = THREE.MathUtils.clamp(target.x, -3.5, 3.5);
      target.z = THREE.MathUtils.clamp(target.z, 2.5, 9.5);
      target.y = Math.max(2.8, target.y);
    }

    // Spring force: pull camera smoothly toward target position with ZERO GC allocations
    const error = Experience._tempError.subVectors(target, this.camera.position);
    this.cameraVelocity.addScaledVector(error, this.cameraSpring.stiffness * dt);
    this.cameraVelocity.multiplyScalar(this.cameraSpring.damping);
    this.camera.position.addScaledVector(this.cameraVelocity, dt);

    // Smooth camera lookAt targeting character + directional offset
    const lookTarget = Experience._tempLookTarget.copy(char.position).add(Experience._tempDesiredLookOffset);
    this.cameraLookAt.lerp(lookTarget, Math.min(1, 8.0 * dt));
    this.camera.lookAt(this.cameraLookAt);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    // Keep bloom at HALF resolution (4x faster fillrate on Retina displays)
    this.bloomPass.resolution.set(Math.floor(w / 2), Math.floor(h / 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.world?.dispose();
    this.character?.dispose();
    this.renderer.dispose();
  }
}
