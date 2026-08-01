import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { World, Zone } from "./World";
import { Character } from "./Character";
import { EventEmitter } from "./EventEmitter";
import { sound } from "./Audio";
import { WeatherType } from "./Weather";
import gsap from "gsap";

export type GameState =
  | "LOADING"
  | "CINEMATIC"
  | "INTRO"
  | "ROOM"
  | "DOOR_TRANSITION"
  | "STREET"
  | "MODAL";

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

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;

    // ── Renderer ──────────────────────────────
    // Cap pixel ratio at 1 – biggest single perf win on Retina Macs.
    // Bloom runs at half-res internally so Retina 2x is pure waste here.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // off when post-processing is active (MSAA replaced by TAA/bloom)
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1); // always 1x – quality is indistinguishable with bloom

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = false; // Baked contact shadow planes used instead of expensive shadow maps
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15; // brighter overall

    // ── Scene ─────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);
    this.scene.fog = new THREE.FogExp2(0x12121e, 0.011); // lighter fog

    // ── Camera ────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200); // reduced far clip
    this.camera.position.set(0, 3.8, 7.6);

    // ── Post-processing ───────────────────────
    this.buildPostProcessing(w, h);

    // ── Resize ────────────────────────────────
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);
    window.addEventListener("resize", () => this.resize());

    // ── Input ─────────────────────────────────
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      this.emit("keydown", e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
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
        this.character.group.position.set(0, 0, 3);
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
    this.character.group.position.set(0, 0, 3);
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

      this.character.setPosition(0, 0, 8);
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

      this.character.setPosition(0, 0, 3);
      this.cameraOffset.copy(this.roomCameraOffset);

      this.world.fadeIn(0.5, () => {
        this.setState("ROOM");
        this.emit("enterRoom");
      });
    });
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
      this.composer.render();
      return;
    }

    if (this.state !== "MODAL" && this.state !== "DOOR_TRANSITION" && this.state !== "INTRO") {
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
    this.world.updateRings(elapsed / 1000, delta / 1000);

    this.composer.render();
  }

  private applyCollisions(pos: THREE.Vector3, isStreet: boolean) {
    if (isStreet) {
      // 1. Boulevard & Sidewalk Outer Boundaries (prevents hair/head clipping into house roofs)
      pos.z = THREE.MathUtils.clamp(pos.z, -111.5, 12.0);
      pos.x = THREE.MathUtils.clamp(pos.x, -10.8, 10.8);

      // 2. Lamp Post Collisions (Lamps at X = ±8.2, Z = -12, -40, -68, -96, -124)
      const lampXs = [-8.2, 8.2];
      for (let z = -12; z > -130; z -= 28) {
        for (const lx of lampXs) {
          const dx = pos.x - lx;
          const dz = pos.z - z;
          const distSq = dx * dx + dz * dz;
          const minDist = 0.95; // Lamp post collision radius
          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            pos.x += (dx / dist) * overlap;
            pos.z += (dz / dist) * overlap;
          }
        }
      }

      // 3. House Front Collisions (Houses at X = ±14, Z = -20, -38, -58, -76)
      const houses = [
        { x: -14, z: -20 }, { x: 14, z: -38 },
        { x: -14, z: -58 }, { x: 14, z: -76 }
      ];
      for (const h of houses) {
        const dx = pos.x - h.x;
        const dz = pos.z - h.z;
        const distSq = dx * dx + dz * dz;
        const houseRadius = 5.8;
        if (distSq < houseRadius * houseRadius && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = houseRadius - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }

      // 4. Central Statue & Contact Pedestals Collisions
      const obstacles = [
        { x: 0, z: -105, r: 2.8 },    // Hero Statue Base
        { x: -6.8, z: -98, r: 0.9 },   // Left Plaza Torch Lamp
        { x: 6.8, z: -98, r: 0.9 },    // Right Plaza Torch Lamp
        { x: -5.2, z: -102.5, r: 1.1 }, // LinkedIn Plinth
        { x: -2.2, z: -108.5, r: 1.1 }, // GitHub Plinth
        { x: 2.2, z: -108.5, r: 1.1 },  // Gmail Plinth
        { x: 5.2, z: -102.5, r: 1.1 },  // Phone Plinth
      ];

      for (const obs of obstacles) {
        const dx = pos.x - obs.x;
        const dz = pos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < obs.r * obs.r && distSq > 0.0001) {
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
      const roomObs = [
        { x: -4.2, z: -5.2, r: 1.8 }, // Gaming Desk
        { x: 5.2, z: -5.6, r: 1.8 },  // Almirah / Wardrobe
        { x: 5.8, z: 3.5, r: 1.5 },   // Arcade Machine
      ];

      for (const obs of roomObs) {
        const dx = pos.x - obs.x;
        const dz = pos.z - obs.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < obs.r * obs.r && distSq > 0.0001) {
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
    let nearestDist = Infinity;

    for (const zone of this.world.zones) {
      const dist = pos.distanceTo(zone.position);
      if (dist < zone.radius && dist < nearestDist) {
        nearest = zone;
        nearestDist = dist;
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

    const isStreet = !!this.world.streetGroup.parent;

    // Desired camera offset & lookTarget offset based on location & movement direction
    let targetOffset = new THREE.Vector3(0, 3.4, 4.8);
    let targetLookOffset = new THREE.Vector3(0, 1.2, 0);

    if (isStreet) {
      const moveZ = this.character.direction.z; // positive when moving South (+Z)
      const isMoving = this.character.isMoving;

      if (isMoving && moveZ > 0.3) {
        // Stepping back / moving South down the road with S key
        // Elevate camera higher (Y = 9.2) and pull Z forward so player sees the road ahead of character
        targetOffset.set(0, 9.2, 4.8);
        targetLookOffset.set(0, 0.8, 3.8);
      } else if (isMoving && moveZ < -0.3) {
        // Moving North up the road with W key towards statue / houses
        targetOffset.set(0, 7.5, 9.2);
        targetLookOffset.set(0, 0.8, -2.5);
      } else {
        // Neutral high 3/4 isometric perspective
        targetOffset.set(0, 7.8, 8.5);
        targetLookOffset.set(0, 1.0, 0);
      }

      // Grand framing near Contact Plaza (Z < -90)
      if (char.position.z < -90) {
        targetOffset.y += 1.2;
      }
    }

    // Smooth lerp camera offset for fluid movement
    this.currentCameraOffset.lerp(targetOffset, Math.min(1, 4.5 * dt));

    let target = char.position.clone().add(this.currentCameraOffset);

    if (!isStreet) {
      target.x = THREE.MathUtils.clamp(target.x, -5.5, 5.5);
      target.z = THREE.MathUtils.clamp(target.z, -5.5, 6.5);
    }

    // Spring force: pull camera smoothly toward target position
    const error = target.clone().sub(this.camera.position);
    const springForce = error.multiplyScalar(this.cameraSpring.stiffness);
    this.cameraVelocity.add(springForce.multiplyScalar(dt));
    this.cameraVelocity.multiplyScalar(this.cameraSpring.damping);
    this.camera.position.add(this.cameraVelocity.clone().multiplyScalar(dt));

    // Smooth camera lookAt targeting character + directional offset
    const lookTarget = char.position.clone().add(targetLookOffset);
    this.cameraLookAt.lerp(lookTarget, Math.min(1, 6 * dt));
    this.camera.lookAt(this.cameraLookAt);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
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
