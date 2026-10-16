import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { World, Zone, InteractiveObjectData } from "./World";
import { Character } from "./Character";
import { EventEmitter } from "./EventEmitter";
import { sound } from "./Audio";
import { WeatherType } from "./Weather";
import { CONTENT } from "./content";
import gsap from "gsap";
import { resolveQuality, SETTINGS, type Quality, type RenderQuality } from "./quality";
import { disposeObject } from "./dispose";
import { resolveCampusCollisions } from "./Campus";
import { PhotoGesture } from "./PhotoGesture";

export type GameState =
  | "LOADING"
  | "CINEMATIC"
  | "TRANSITION"
  | "INTRO"
  | "ROOM"
  | "DOOR_TRANSITION"
  | "STREET"
  | "MODAL";

const ROOM_OBSTACLES = [
  { x: -4.2, z: -5.2, r: 1.8, rSq: 3.24 }, // Workbench
  { x: -4.2, z: -3.65, r: 1.05, rSq: 1.1025 }, // Desk chair
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
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

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

  // Camera offsets – high 3/4 elevated isometric perspective with directional bias
  private roomCameraOffset = new THREE.Vector3(12, 14, 20);
  private streetCameraOffset = new THREE.Vector3(11, 14, 17);
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
  private interfaceOpen = false;
  private photoGesture = new PhotoGesture();
  private photoAzimuth = 0;
  private photoElevation = 0.35;
  private photoDistance = 5.0;

  // Konami Easter Egg Sequence
  private konamiSequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];
  private currentKonamiIdx = 0;

  quality: RenderQuality;
  fps = 0;
  loadTimeMs = 0;
  frameCostMs = 0;
  private loadStartedAt = performance.now();
  private autoQuality: boolean;
  private disposed = false;
  private failed = false;
  private listeners = new AbortController();
  private resizeObserver: ResizeObserver;
  private sampleStart = 0;
  private sampleFrames = 0;
  private slowSamples = 0;
  private partyInterval: ReturnType<typeof setInterval> | null = null;
  private loadingManager = new THREE.LoadingManager();

  private listen<K extends keyof (WindowEventMap & DocumentEventMap & HTMLElementEventMap & { webglcontextlost: Event })>(target: EventTarget, type: K, listener: (event: (WindowEventMap & DocumentEventMap & HTMLElementEventMap & { webglcontextlost: Event })[K]) => void, options: AddEventListenerOptions = {}) {
    target.addEventListener(type, listener as EventListener, { ...options, signal: this.listeners.signal });
  }

  constructor(canvas: HTMLCanvasElement, quality: Quality = "auto") {
    super();
    this.canvas = canvas;
    this.quality = resolveQuality(quality);
    this.autoQuality = quality === "auto";

    // ── Renderer ──────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: this.quality === "low" ? "low-power" : "default",
    });
    this.renderer.setPixelRatio(1);
    // Count every scene/post-processing pass, rather than only the final output triangle.
    this.renderer.info.autoReset = false;

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = this.quality !== "low";
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    if (SETTINGS[this.quality].bloom) this.buildPostProcessing(w, h);

    // ── Resize ────────────────────────────────
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.listen(window, "resize", () => this.resize());

    // ── Input & Raycast Listeners ─────────────
    this.listen(window, "keydown", (e) => {
      if (this.interfaceOpen || this.state === "MODAL" || (this.photoMode && e.code !== "KeyP")) return;
      if (e.target instanceof HTMLElement) {
        if (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (e.target.closest("button, a") && ["Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) return;
      }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
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
    this.listen(window, "keyup", (e) => this.keys.delete(e.code));

    // Pointer hover & Photo Mode drag tracking
    this.listen(canvas, "pointermove", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.photoMode) {
        const change = this.photoGesture.move(e.pointerId, e.clientX, e.clientY);
        if (change) {
          this.photoAzimuth -= change.dx * 0.008;
          this.photoElevation = THREE.MathUtils.clamp(this.photoElevation + change.dy * 0.008, -0.2, 1.2);
          this.photoDistance = THREE.MathUtils.clamp(this.photoDistance * change.zoom, 2, 96);
        }
      } else if (e.pointerType !== "touch") {
        this.checkRaycastHover(e.clientX, e.clientY);
      }
    });

    // Pointer click on interactive 3D objects / photo drag start
    this.listen(canvas, "pointerdown", (e: PointerEvent) => {
      if (this.photoMode) {
        if (e.button > 0) return;
        e.preventDefault();
        if (this.photoGesture.begin(e.pointerId, e.clientX, e.clientY)) canvas.setPointerCapture(e.pointerId);
      } else {
        const rect = canvas.getBoundingClientRect();
        this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        this.checkRaycastHover(e.clientX, e.clientY);
      }
      if (!this.photoMode && this.hoveredObject && (this.state === "ROOM" || this.state === "STREET")) {
        this.handleObjectClick(this.hoveredObject);
      }
    });

    const endPhotoPointer = (event: PointerEvent) => this.photoGesture.end(event.pointerId);
    this.listen(canvas, "pointerup", endPhotoPointer);
    this.listen(canvas, "pointercancel", endPhotoPointer);
    this.listen(canvas, "lostpointercapture", endPhotoPointer);

    // Wheel zoom in Photo Mode
    this.listen(canvas, "wheel", (e: WheelEvent) => {
      if (this.photoMode) {
        this.photoDistance = THREE.MathUtils.clamp(
          this.photoDistance + e.deltaY * 0.005,
          2.0,
          96.0
        );
      }
    }, { passive: true });
    this.listen(window, "blur", () => this.clearInput());
    this.listen(document, "visibilitychange", () => {
      this.clearInput();
      cancelAnimationFrame(this.rafId);
      if (!document.hidden && !this.disposed && !this.failed) this.startLoop();
    });
    this.listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      this.stopRendering();
      this.emit("contextLost");
    });
  }

  private buildPostProcessing(w: number, h: number) {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom at HALF resolution — 4x cheaper than full-res, visually identical
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
      0.18,   // restrained glow in the daylight studio
      0.5,    // radius
      0.82    // threshold raised — only bright emissive spots glow, stops weird ambient glow
    );
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  async init(onProgress: (progress: number) => void = () => {}) {
    let finish!: () => void;
    const loaded = new Promise<void>(resolve => { finish = resolve; });
    this.loadingManager.onProgress = (_url, done, total) => {
      if (!this.disposed) onProgress(Math.min(90, (done / total) * 90));
    };
    this.loadingManager.onLoad = finish;
    // The sentinel covers procedural-only scenes and nested animation requests.
    this.loadingManager.itemStart("world");
    this.world = new World(this.scene, this.quality, this.loadingManager);
    this.character = new Character(this.scene, this.quality === "high", this.loadingManager, status => {
      if (!this.disposed) this.emit("avatarStatus", status);
    });
    this.cameraOffset.copy(this.roomCameraOffset);
    this.world.collectibles.onCollectCallback = (gem, count, total) => {
      this.emit("gemCollected", { gem, count, total });
    };
    this.loadingManager.itemEnd("world");
    await Promise.all([loaded, this.character.ready]);
    if (this.disposed || this.failed) return;
    this.resize();
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed || this.failed) return;
    this.loadTimeMs = performance.now() - this.loadStartedAt;
    onProgress(100);
    this.setState("LOADING");
    this.startLoop();
  }

  setInterfaceOpen(open: boolean) {
    this.interfaceOpen = open;
    this.clearInput();
    if (open) {
      this.hoveredObject = null;
      this.canvas.style.cursor = "default";
      this.emit("hoverObject", null);
    }
  }

  private clearInput() {
    this.keys.clear();
    this.joystick.x = this.joystick.y = 0;
    this.photoGesture.clear();
    this.character?.stopMovement();
  }

  /** A fatal graphics/load failure must not resume work when the tab becomes visible. */
  stopRendering() {
    this.failed = true;
    cancelAnimationFrame(this.rafId);
    this.clearInput();
    this.cinematicTimeline?.kill();
  }

  setQuality(quality: RenderQuality, automatic = false) {
    if (!automatic) this.autoQuality = false;
    this.quality = quality;
    if (SETTINGS[quality].bloom && !this.composer) this.buildPostProcessing(this.canvas.clientWidth, this.canvas.clientHeight);
    if (!SETTINGS[quality].bloom) this.disposePostProcessing();
    this.world?.setQuality(quality);
    void this.character?.setDetailed(quality === "high");
    this.resize();
    this.slowSamples = 0;
    this.emit("qualityChange", quality);
  }

  private render() {
    this.renderer.info.reset();
    this.renderer.shadowMap.enabled = this.quality !== "low";
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  respawn() {
    if (this.state !== "ROOM" && this.state !== "STREET") return;
    this.clearInput();
    const isStreet = this.state === "STREET";
    this.character.setPosition(0, 0, isStreet ? 8 : 3, Math.PI);
    this.cameraYaw = 0;
    this.cameraVelocity.set(0, 0, 0);
    if (isStreet) this.settleCampusCamera();
    else this.settleStudioCamera();
    this.nearestZone = null;
    this.emit("zoneChange", null);
  }

  travelTo(destination: "room" | "projects") {
    if (this.state !== "ROOM" && this.state !== "STREET") return;
    if (destination === "room") {
      if (this.state === "STREET") this.enterRoom();
      else this.respawn();
    } else {
      const arrive = () => {
        const zone = this.world.streetZones.find(zone => zone.id === "project_0");
        if (!zone) return;
        this.clearInput();
        this.character.setPosition(zone.position.x, 0, zone.position.z + 0.6, Math.PI);
        this.cameraVelocity.set(0, 0, 0);
        this.settleCampusCamera();
        this.detectZone();
      };
      if (this.state === "ROOM") { this.once("enterStreet", arrive); this.exitRoom(); }
      else arrive();
    }
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
      { pos: this.getStudioView().position, look: this.getStudioView().target },
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
    if (this.bloomPass) tl.fromTo(this.bloomPass, { strength: 2.2 }, {
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
    if (this.bloomPass) gsap.killTweensOf(this.bloomPass);

    this.settleStudioCamera();
    if (this.bloomPass) this.bloomPass.strength = 0.18;

    this.isCinematicDone = true;
    this.character.setPosition(0, 0, 3, Math.PI);
    this.setState("INTRO");
    this.emit("cinematicEnd");
  }

  setWeather(type: WeatherType) {
    this.world?.setWeather(type);
    // Keep weather transitions within the scene's restrained lighting range.
    if (this.bloomPass) gsap.to(this.bloomPass, {
      strength: type === "rain" ? 0.2 : 0.15,
      duration: 1.5, ease: "power2.inOut"
    });
  }

  setState(s: GameState) {
    this.clearInput();
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
      if (this.bloomPass) gsap.to(this.bloomPass, { strength: 0.15, duration: 0.8, ease: "power2.out" });
      this.character.setPosition(0, 0, 8, Math.PI);
      this.cameraVelocity.set(0, 0, 0);
      this.settleCampusCamera();
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

      // Restore room bloom level
      if (this.bloomPass) gsap.to(this.bloomPass, { strength: 0.18, duration: 0.8, ease: "power2.out" });

      this.character.setPosition(0, 0, 3, Math.PI);
      this.cameraOffset.copy(this.roomCameraOffset);
      this.cameraVelocity.set(0, 0, 0);
      this.settleStudioCamera();

      this.world.fadeIn(0.5, () => {
        this.setState("ROOM");
        this.emit("enterRoom");
      });
    });
  }

  private checkRaycastHover(screenX: number, screenY: number) {
    if (this.interfaceOpen || (this.state !== "ROOM" && this.state !== "STREET")) {
      if (this.hoveredObject) {
        this.hoveredObject = null;
        this.canvas.style.cursor = "default";
        this.emit("hoverObject", null);
      }
      return;
    }

    if (!this.world?.interactiveObjects?.length) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const activeGroup = this.state === "ROOM" ? this.world.roomGroup : this.world.streetGroup;
    const activeObjects = this.world.interactiveObjects.filter(object => {
      let node: THREE.Object3D | null = object;
      while (node) { if (!node.visible) return false; if (node === activeGroup) return true; node = node.parent; }
      return false;
    });
    const intersects = this.raycaster.intersectObjects(activeObjects, true);

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
      this.openModal("experience");
    } else if (data.id.startsWith("contact_")) {
      if (data.id === "contact_linkedin") window.open(CONTENT.contact.socials[1].url, "_blank", "noopener,noreferrer");
      else if (data.id === "contact_github") window.open(CONTENT.contact.socials[0].url, "_blank", "noopener,noreferrer");
      else if (data.id === "contact_gmail") window.location.href = `mailto:${CONTENT.contact.email}`;
      else if (data.id === "contact_phone") window.location.href = `tel:${CONTENT.contact.phone}`;
    } else {
      this.openModal(data.id);
    }
  }

  togglePhotoMode(): boolean {
    this.photoMode = !this.photoMode;
    this.clearInput();
    if (this.photoMode) {
      const offset = this.camera.position.clone().sub(this.character.group.position);
      this.photoAzimuth = Math.atan2(offset.x, offset.z);
      this.photoDistance = Math.max(5, offset.length());
      this.photoElevation = Math.asin(THREE.MathUtils.clamp((offset.y - 1.2) / this.photoDistance, -0.9, 0.9));
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
    if (this.partyInterval) clearInterval(this.partyInterval);
    this.partyInterval = setInterval(() => {
      const col = colors[step % colors.length];
      if (this.world.roomCeiling) this.world.roomCeiling.color.setHex(col);
      if (this.world.roomWarm) this.world.roomWarm.color.setHex(colors[(step + 2) % colors.length]);
      step++;
      if (step > 30 && this.partyInterval) { clearInterval(this.partyInterval); this.world.roomCeiling?.color.setHex(0xffedce); this.world.roomWarm?.color.setHex(0xffd399); }
    }, 150);
    this.emit("partyMode");
  }

  openModal(zoneId: string) {
    if (zoneId === "return_studio") { this.enterRoom(); return; }
    if (this.state !== "STREET" && this.state !== "ROOM") return;
    sound.playModalPop();
    this.clearInput();
    this.setState("MODAL");
    this.emit("openModal", zoneId);
  }

  closeModal() {
    const prev = this.state;
    if (prev !== "MODAL") return;
    sound.playModalPop();
    this.clearInput();
    this.setState(this.world.streetGroup.parent ? "STREET" : "ROOM");
    this.emit("closeModal");
  }

  // ── Transition entrance (Phase 1) ─────────
  beginTransition() {
    this.setState("TRANSITION");
  }

  /**
   * Create a WebGL plane whose screen-space projection matches the given DOM rect.
   * Camera is positioned close to the desk monitor, facing it.
   */
  createTransitionPlane(
    cardRect: DOMRect,
    vpWidth: number,
    vpHeight: number,
    color: string = "#e5efcd"
  ): THREE.Mesh {
    // Position camera facing the desk monitor
    this.camera.position.set(-4.2, 2.3, -2.0);
    this.camera.lookAt(-4.2, 2.25, -5.52);
    this.camera.updateMatrixWorld(true);

    // Projection math: find 3D position and size from screen rect
    const depth = 3.5;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const visH = 2 * depth * Math.tan(halfFov);
    const visW = visH * this.camera.aspect;

    const ndcX = ((cardRect.left + cardRect.width / 2) / vpWidth) * 2 - 1;
    const ndcY = -((cardRect.top + cardRect.height / 2) / vpHeight) * 2 + 1;
    const planeW = (cardRect.width / vpWidth) * visW;
    const planeH = (cardRect.height / vpHeight) * visH;

    // Camera basis vectors (each starts from a fresh Vector3)
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const pos = this.camera.position.clone();
    pos.addScaledVector(fwd, depth);
    pos.addScaledVector(right, ndcX * visW / 2);
    pos.addScaledVector(up, ndcY * visH / 2);

    // Canvas texture approximating the source element's color
    const cvs = document.createElement("canvas");
    cvs.width = 128;
    cvs.height = 128;
    const ctx = cvs.getContext("2d")!;
    const grad = ctx.createRadialGradient(70, 58, 0, 70, 58, 90);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "#e8ebdf");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    // Subtle rounded-rect inset to hint at the card shape
    ctx.strokeStyle = "rgba(180,195,165,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, 116, 116, 14);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(cvs);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const geo = new THREE.PlaneGeometry(1, 1);
    const plane = new THREE.Mesh(geo, mat);
    plane.position.copy(pos);
    plane.scale.set(planeW, planeH, 1);
    plane.lookAt(this.camera.position);
    plane.renderOrder = 999;

    this.scene.add(plane);
    return plane;
  }

  /** Remove the transition plane and dispose its resources. */
  disposeTransitionPlane(plane: THREE.Mesh) {
    this.scene.remove(plane);
    plane.geometry.dispose();
    const mat = plane.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    mat.dispose();
  }

  /** Settle into ROOM state after the entrance animation completes. */
  finishTransition() {
    this.isCinematicDone = true;
    this.character.setPosition(0, 0, 3, Math.PI);
    this.cameraOffset.copy(this.roomCameraOffset);
    this.settleStudioCamera();
    this.cameraVelocity.set(0, 0, 0);
    this.nearestZone = null;
    this.emit("zoneChange", null);
    this.setState("ROOM");
    this.emit("enterRoom");
  }

  // ── Main loop ─────────────────────────────
  private startLoop() {
    cancelAnimationFrame(this.rafId);
    this.lastTime = performance.now();
    this.sampleStart = this.lastTime;
    this.sampleFrames = 0;
    let lastUpdateTime = this.lastTime;
    const loop = (now: number) => {
      if (this.disposed || this.failed || document.hidden) return;
      this.rafId = requestAnimationFrame(loop);
      if (this.state === "LOADING" || this.state === "MODAL" || this.interfaceOpen) {
        this.lastTime = this.sampleStart = lastUpdateTime = now;
        this.sampleFrames = 0;
        return;
      }
      const interval = 1000 / SETTINGS[this.quality].fps;
      const elapsed = now - this.lastTime;
      if (elapsed < interval - 1) return;
      // The 1 ms tolerance can accept an early frame. Advance at least one slot;
      // modulo alone would leave lastTime unchanged and render that slot twice.
      this.lastTime += Math.max(1, Math.floor(elapsed / interval)) * interval;
      // Scheduling remainder controls pacing; simulation uses only time since its last update.
      const delta = Math.min(now - lastUpdateTime, 50);
      lastUpdateTime = now;
      this.elapsed += delta;
      const workStart = performance.now();
      try { this.update(delta, this.elapsed); }
      catch (error) { this.stopRendering(); this.emit("error", error); return; }
      this.frameCostMs += (performance.now() - workStart - this.frameCostMs) * 0.1;
      this.sampleFrames++;
      if (now - this.sampleStart >= 2500) {
        this.fps = Math.round(this.sampleFrames * 1000 / (now - this.sampleStart));
        this.slowSamples = this.fps < 38 ? this.slowSamples + 1 : 0;
        if (this.autoQuality && this.slowSamples >= 2 && this.quality !== "low") this.setQuality(this.quality === "high" ? "balanced" : "low", true);
        this.sampleStart = now;
        this.sampleFrames = 0;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(delta: number, elapsed: number) {
    // During cinematic or transition, GSAP controls camera – just render + ambient
    if (this.state === "CINEMATIC" || this.state === "TRANSITION") {
      this.world?.updateRings(elapsed / 1000, delta / 1000);
      this.render();
      return;
    }

    if (this.state === "LOADING") {
      return;
    }

    if (
      this.state !== "MODAL" &&
      this.state !== "DOOR_TRANSITION" &&
      this.state !== "INTRO" && !this.interfaceOpen && !this.photoMode
    ) {
      const isStreet = !!this.world.streetGroup.parent;
      const surface = isStreet ? "stone" : "wood";
      const pos = this.character.group.position;
      const startX = pos.x, startZ = pos.z;
      this.character.update(this.keys, this.joystick, delta, elapsed, this.cameraYaw, surface, true);
      const intendedX = pos.x, intendedZ = pos.z;

      // ── Physical Boundary & Object Collision Resolution ──
      this.applyCollisions(pos, isStreet);
      this.character.resolveMovement(startX, startZ, intendedX, intendedZ, delta, surface);

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
      if (this.character.group.position.z >= this.TRANSITION_Z && Math.abs(this.character.group.position.x) < 2.4) {
        this.exitRoom();
      }
    }

    if (this.state === "STREET" && this.character.group.position.z >= 11.2 && Math.abs(this.character.group.position.x) < 2.1) {
      this.enterRoom();
    }
    this.updateCamera(delta);
    this.world.updateFade(this.camera);

    // Pass physics prop parameters to update loop
    const charPos = this.character?.group?.position;
    const charVel = this.character?.velocity || Experience._tempVelocity;
    const isSprinting = this.character?.isRunning || false;
    this.world.updateRings(elapsed / 1000, delta / 1000, charPos, charVel, isSprinting);

    this.render();
  }

  private static _tempTarget = new THREE.Vector3();
  private static _tempLookTarget = new THREE.Vector3();
  private static _tempVelocity = new THREE.Vector3();

  private applyCollisions(pos: THREE.Vector3, isStreet: boolean) {
    if (isStreet) {
      resolveCampusCollisions(pos, this.world.campusObstacles);
    } else {
      // Room Boundaries & Furniture Collision
      pos.x = THREE.MathUtils.clamp(pos.x, -7.15, 7.15);
      pos.z = THREE.MathUtils.clamp(pos.z, -7.0, Math.abs(pos.x) < 2.4 ? 7.5 : 6.8);

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

  getStudioView() {
    const fit = Math.max(1, 1.3 / this.camera.aspect);
    return {
      position: this.roomCameraOffset.clone().multiplyScalar(fit),
      target: new THREE.Vector3(0, 1.1, 0),
    };
  }

  private settleStudioCamera() {
    const pose = this.getStudioView();
    this.camera.position.copy(pose.position);
    this.cameraLookAt.copy(pose.target);
    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.cameraLookAt);
    this.cameraYaw = Math.atan2(pose.position.x, pose.position.z);
  }

  private settleCampusCamera() {
    const fit = Math.max(1, 0.85 / this.camera.aspect);
    const char = this.character.group.position;
    this.camera.position.copy(this.streetCameraOffset).multiplyScalar(fit).add(char);
    this.cameraLookAt.set(char.x, 1.2, char.z - 2.2);
    this.camera.fov = 46; this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.cameraLookAt);
    this.cameraYaw = Math.atan2(this.camera.position.x - char.x, this.camera.position.z - char.z + 2.2);
  }

  private updateCamera(delta: number) {
    if (!this.character?.group) return;
    const char = this.character.group;
    const dt = Math.min(delta / 1000, 0.05);
    if (this.photoMode) {
      this.camera.position.set(
        char.position.x + this.photoDistance * Math.sin(this.photoAzimuth) * Math.cos(this.photoElevation),
        char.position.y + 1.2 + this.photoDistance * Math.sin(this.photoElevation),
        char.position.z + this.photoDistance * Math.cos(this.photoAzimuth) * Math.cos(this.photoElevation),
      );
      this.cameraLookAt.set(char.position.x, char.position.y + 1.2, char.position.z);
      this.camera.lookAt(this.cameraLookAt); return;
    }
    const campus = !!this.world.streetGroup.parent;
    const fit = Math.max(1, (campus ? 0.85 : 1.3) / this.camera.aspect);
    const target = Experience._tempTarget.copy(campus ? this.streetCameraOffset : this.roomCameraOffset).multiplyScalar(fit);
    target.x += char.position.x * (campus ? 1 : 0.12);
    target.z += char.position.z * (campus ? 1 : 0.1);
    this.camera.position.lerp(target, 1 - Math.exp(-6 * dt));
    const lookTarget = Experience._tempLookTarget.set(
      char.position.x * (campus ? 1 : 0.12), campus ? 1.2 : 1.1,
      char.position.z * (campus ? 1 : 0.1) - (campus ? 2.2 : 0),
    );
    this.cameraLookAt.lerp(lookTarget, 1 - Math.exp(-6 * dt));
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, campus ? 46 : 42, 8, dt);
    this.camera.updateProjectionMatrix(); this.camera.lookAt(this.cameraLookAt);
    this.cameraYaw = Math.atan2(this.camera.position.x - this.cameraLookAt.x, this.camera.position.z - this.cameraLookAt.z);
  }

  resize() {
    if (this.disposed) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    const settings = SETTINGS[this.quality];
    const ratio = Math.min(window.devicePixelRatio || 1, settings.pixelRatio, Math.sqrt(settings.maxPixels / (w * h)));
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(ratio);
    this.composer?.setSize(w, h);
    // Composer.setSize resets every pass; explicitly resize bloom afterwards.
    this.bloomPass?.setSize(Math.floor(w * ratio / 2), Math.floor(h * ratio / 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private disposePostProcessing() {
    if (!this.composer) return;
    if (this.bloomPass) gsap.killTweensOf(this.bloomPass);
    this.composer.passes.forEach(pass => pass.dispose());
    this.composer.dispose();
    this.composer = null;
    this.bloomPass = null;
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.listeners.abort();
    this.resizeObserver.disconnect();
    this.clearInput();
    if (this.partyInterval) clearInterval(this.partyInterval);
    this.cinematicTimeline?.kill();
    [this.camera, this.camera.position, this.cameraLookAt].forEach(target => gsap.killTweensOf(target));
    this.disposePostProcessing();
    this.world?.dispose();
    this.character?.dispose();
    disposeObject(this.scene);
    this.scene.clear();
    this.removeAllListeners();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
