import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { sound } from "./Audio";
import { disposeObject } from "./dispose";

export type AvatarStatus = "loading" | "ready" | "error";

const HEIGHT = 2.4;
const JUMP_SPEED = 7.2;
const GRAVITY = 24;
const BLEND_RATE = 14;

export class Character {
  group = new THREE.Group();
  private visual = new THREE.Group();
  private fallback = new THREE.Group();
  private disposed = false;
  private detailedRequested = false;
  private baseLoad: Promise<void> | null = null;
  private detailLoad: Promise<void> | null = null;
  private loadedModel: THREE.Object3D | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private detailMaps: THREE.Texture[] = [];
  private mixer: THREE.AnimationMixer | null = null;
  private animations = new Map<string, THREE.AnimationAction>();
  private weights = { idle: 1, walk: 0, run: 0, jump: 0 };
  private referenceSpeeds = { walk: 1.4, run: 3.5 };
  private footProbes: { mesh: THREE.SkinnedMesh; indices: number[] }[] = [];
  private footPoint = new THREE.Vector3();
  private gaitPhase = 0;
  private idleTime = 0;
  private jumpHeld = false;
  private jumpVelocity = 0;
  private isGrounded = true;
  private posY = 0;
  private landing = 0;
  private stepDistance = 0;
  readonly ready: Promise<void>;

  speed = 6;
  runSpeed = 11;
  direction = new THREE.Vector3(0, 0, -1);
  velocity = new THREE.Vector3();
  isMoving = false;
  isRunning = false;
  targetRotY = Math.PI;

  constructor(
    private scene: THREE.Scene,
    detailed = true,
    private manager = THREE.DefaultLoadingManager,
    private onAvatarStatus: (status: AvatarStatus) => void = () => {},
  ) {
    // Only shown if the rig cannot load; quality settings all use the same animated model.
    this.buildFallback();
    this.group.add(this.visual, this.fallback);
    scene.add(this.group);
    this.group.position.set(0, 0, 3);
    this.setRotationY(Math.PI);
    this.ready = this.setDetailed(detailed);
  }

  /** Quality changes shading only. Never replace the rig or reset movement/animation. */
  setDetailed(detailed: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.detailedRequested = detailed;
    if (this.loadedModel) {
      this.applyDetail();
      return detailed ? this.ensureDetails() : Promise.resolve();
    }
    if (!this.baseLoad) {
      this.onAvatarStatus("loading");
      this.baseLoad = this.loadCharacterModel().finally(() => { this.baseLoad = null; });
    }
    return this.baseLoad;
  }

  private async loadCharacterModel() {
    const assets = await Promise.allSettled([
      new GLTFLoader(this.manager).setMeshoptDecoder(MeshoptDecoder).loadAsync("/models/avatar.meshopt.glb"),
      new THREE.TextureLoader(this.manager).loadAsync("/textures/character/avatar-color.webp"),
    ] as const);
    const [modelResult, colorResult] = assets;
    if (this.disposed || modelResult.status === "rejected" || colorResult.status === "rejected") {
      assets.forEach(asset => {
        if (asset.status !== "fulfilled") return;
        if (asset.value instanceof THREE.Texture) asset.value.dispose();
        else disposeObject(asset.value.scene);
      });
      if (!this.disposed) this.onAvatarStatus("error");
      return;
    }
    const gltf = modelResult.value;
    const color = colorResult.value;
    color.colorSpace = THREE.SRGBColorSpace;
    // Textures retain the source FBX UV orientation.
    color.flipY = true;
    this.material = new THREE.MeshStandardMaterial({ map: color, roughness: 0.85, metalness: 0 });
    const originalMaterials = new Set<THREE.Material>();
    gltf.scene.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(mat => originalMaterials.add(mat));
      child.material = this.material!;
      child.castShadow = true;
      child.receiveShadow = false;
    });
    originalMaterials.forEach(mat => {
      Object.values(mat).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
      mat.dispose();
    });
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach(clip => {
      const action = this.mixer!.clipAction(clip);
      // Explicit time/weight control keeps walk and run on the same stride phase.
      action.play();
      action.paused = true;
      action.setEffectiveWeight(clip.name === "idle" ? 1 : 0);
      this.animations.set(clip.name, action);
    });
    this.mixer.update(0);
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    gltf.scene.traverse(child => {
      if (!(child instanceof THREE.SkinnedMesh)) return;
      const candidates: number[] = [];
      for (let i = 0; i < child.geometry.attributes.position.count; i++) {
        child.getVertexPosition(i, this.footPoint).applyMatrix4(child.matrixWorld);
        if (this.footPoint.y <= bounds.min.y + 0.08) candidates.push(i);
      }
      // A small sole sample corrects blended poses without scanning the full mesh each frame.
      const count = Math.min(candidates.length, 96);
      this.footProbes.push({ mesh: child, indices: Array.from({ length: count }, (_, i) => candidates[Math.floor(i * candidates.length / count)]) });
    });
    const wrapper = new THREE.Group();
    // Ground correction is animated on AvatarGround; never overwrite that transform.
    wrapper.position.set(-center.x, -bounds.min.y, -center.z);
    wrapper.add(gltf.scene);
    const normalized = new THREE.Group();
    const scale = HEIGHT / (size.y || HEIGHT);
    normalized.scale.setScalar(scale);
    normalized.add(wrapper);
    const calibration = gltf.scene.getObjectByName("AvatarGround")?.userData.locomotion;
    if (calibration?.walk > 0 && calibration?.run > 0) {
      this.referenceSpeeds = { walk: calibration.walk * scale, run: calibration.run * scale };
    }
    this.loadedModel = normalized;
    this.visual.add(normalized);
    this.fallback.visible = false;
    this.onAvatarStatus("ready");
    if (this.detailedRequested) await this.ensureDetails();
  }

  private ensureDetails(): Promise<void> {
    if (this.detailMaps.length || this.disposed) return Promise.resolve();
    if (!this.detailLoad) {
      this.detailLoad = this.loadDetails().finally(() => { this.detailLoad = null; });
    }
    return this.detailLoad;
  }

  private async loadDetails() {
    const loader = new THREE.TextureLoader(this.manager);
    const results = await Promise.allSettled([
      loader.loadAsync("/textures/character/avatar-normal.webp"),
      loader.loadAsync("/textures/character/avatar-roughness.webp"),
    ]);
    if (this.disposed || results.some(result => result.status === "rejected")) {
      results.forEach(result => { if (result.status === "fulfilled") result.value.dispose(); });
      // Optional surface detail failure leaves the fully animated base avatar usable.
      return;
    }
    this.detailMaps = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    this.detailMaps.forEach(texture => { texture.flipY = true; });
    this.applyDetail();
  }

  private applyDetail() {
    if (!this.material) return;
    this.material.normalMap = this.detailedRequested ? this.detailMaps[0] ?? null : null;
    this.material.roughnessMap = this.detailedRequested ? this.detailMaps[1] ?? null : null;
    this.material.normalScale.setScalar(0.55);
    this.material.needsUpdate = true;
  }

  private buildFallback() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xc58d68, roughness: 0.9 });
    const tee = new THREE.MeshStandardMaterial({ color: 0xd6b261, roughness: 0.95 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0xb77b4b, roughness: 0.95 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x352c25, roughness: 1 });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      this.fallback.add(mesh);
    };
    add(new THREE.SphereGeometry(0.38, 12, 8), skin, 0, 1.98);
    add(new THREE.SphereGeometry(0.39, 12, 8, 0, Math.PI * 2, 0, 1.2), hair, 0, 2.02);
    add(new THREE.CapsuleGeometry(0.25, 0.42, 3, 8), tee, 0, 1.23);
    for (const side of [-1, 1]) {
      add(new THREE.CapsuleGeometry(0.1, 0.5, 3, 8), skin, side * 0.36, 1.17);
      add(new THREE.CapsuleGeometry(0.13, 0.2, 3, 8), shorts, side * 0.16, 0.66);
      add(new THREE.CapsuleGeometry(0.085, 0.3, 3, 8), skin, side * 0.16, 0.235);
    }
  }

  stopMovement() {
    this.velocity.x = this.velocity.z = 0;
    this.isMoving = this.isRunning = false;
    this.stepDistance = 0;
  }

  setPosition(x: number, y: number, z: number, rotY?: number) {
    this.stopMovement();
    this.jumpVelocity = 0;
    this.jumpHeld = false;
    this.isGrounded = y <= 0;
    this.group.position.set(x, y, z);
    this.posY = y;
    this.landing = 0;
    this.weights = { idle: 1, walk: 0, run: 0, jump: 0 };
    this.visual.scale.setScalar(1);
    if (rotY !== undefined) this.setRotationY(rotY);
    this.updateAnimation(0, 0);
    this.groundVisual();
  }

  setRotationY(rotY: number) {
    this.targetRotY = rotY;
    this.group.rotation.y = rotY;
    this.direction.set(Math.sin(rotY), 0, Math.cos(rotY));
  }

  private updateAnimation(dt: number, horizontalSpeed: number) {
    if (!this.mixer) return;
    const { walk, run } = this.referenceSpeeds;
    const runBlend = THREE.MathUtils.smoothstep(horizontalSpeed, walk * 1.15, run * 1.1);
    const moving = THREE.MathUtils.smoothstep(horizontalSpeed, 0.025, 0.35);
    const airborne = this.isGrounded ? 0 : 1;
    const target = {
      idle: (1 - moving) * (1 - airborne),
      walk: moving * (1 - runBlend) * (1 - airborne),
      run: moving * runBlend * (1 - airborne),
      jump: airborne,
    };
    const blend = 1 - Math.exp(-BLEND_RATE * dt);
    this.idleTime += dt;
    const stride = THREE.MathUtils.lerp(walk * (this.animations.get("walk")?.getClip().duration ?? 1),
      run * (this.animations.get("run")?.getClip().duration ?? 1), runBlend);
    // Advance by distance; stop/start and walk/run changes cannot reset a foot mid-stride.
    this.gaitPhase = (this.gaitPhase + horizontalSpeed * dt / Math.max(stride, 0.1)) % 1;
    for (const name of ["idle", "walk", "run", "jump"] as const) {
      this.weights[name] += (target[name] - this.weights[name]) * blend;
      const action = this.animations.get(name);
      if (!action) continue;
      const duration = action.getClip().duration;
      if (name === "idle") action.time = this.idleTime % duration;
      else if (name === "jump") {
        if (!this.isGrounded) {
          const progress = THREE.MathUtils.clamp((JUMP_SPEED - this.jumpVelocity) / (JUMP_SPEED * 2), 0, 1);
          action.time = duration * (0.16 + progress * 0.72);
        }
      } else action.time = this.gaitPhase * duration;
      action.setEffectiveWeight(this.weights[name]);
    }
    this.mixer.update(0);
  }

  private groundVisual() {
    if (!this.footProbes.length) return;
    this.visual.position.y = 0;
    this.group.updateMatrixWorld(true);
    let minY = Infinity;
    for (const { mesh, indices } of this.footProbes) {
      for (const index of indices) {
        mesh.getVertexPosition(index, this.footPoint).applyMatrix4(mesh.matrixWorld);
        minY = Math.min(minY, this.footPoint.y);
      }
    }
    if (Number.isFinite(minY)) this.visual.position.y = THREE.MathUtils.clamp(this.group.position.y - minY, -0.12, 0.12);
  }

  update(
    keys: Set<string>,
    joystick: { x: number; y: number },
    delta: number,
    _elapsed: number,
    cameraYaw: number,
    surface: "wood" | "asphalt" | "stone" = "wood",
    deferVisual = false,
  ) {
    const dt = Math.min(delta / 1000, 0.1);
    const jumpPressed = keys.has("Space") || keys.has("Spacebar");
    if (jumpPressed && !this.jumpHeld && this.isGrounded) {
      this.jumpVelocity = JUMP_SPEED;
      this.isGrounded = false;
      sound.playJump();
    }
    this.jumpHeld = jumpPressed;
    if (!this.isGrounded) {
      // Analytic vertical integration avoids different jump heights at 30 and 60 fps.
      this.posY += this.jumpVelocity * dt - 0.5 * GRAVITY * dt * dt;
      this.jumpVelocity -= GRAVITY * dt;
      if (this.posY <= 0) {
        this.posY = this.jumpVelocity = 0;
        this.isGrounded = true;
        this.landing = 1;
        this.stepDistance = 0;
        sound.playFootstep(surface === "stone" ? "asphalt" : surface);
      }
    }
    let moveX = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    let moveZ = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
    const cameraRelative = surface !== "asphalt";
    const stickLength = Math.hypot(joystick.x, joystick.y);
    const stickStrength = cameraRelative ? THREE.MathUtils.clamp((stickLength - 0.12) / 0.88, 0, 1) : stickLength;
    if (stickLength > 0) {
      moveX += joystick.x / stickLength * stickStrength;
      moveZ += joystick.y / stickLength * stickStrength;
    }
    const length = Math.hypot(moveX, moveZ);
    const strength = Math.min(1, length);
    let nx = length > 0 ? moveX / length : 0;
    let nz = length > 0 ? moveZ / length : 0;
    if (cameraRelative) {
      const x = nx * Math.cos(cameraYaw) + nz * Math.sin(cameraYaw);
      nz = nz * Math.cos(cameraYaw) - nx * Math.sin(cameraYaw);
      nx = x;
    }
    const wantsRun = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const spd = cameraRelative
      ? (surface === "stone" ? (wantsRun ? 8 : 5.2) : (wantsRun ? 6.5 : 4.2))
      : (wantsRun ? this.runSpeed : this.speed);
    if (cameraRelative) {
      const rate = length > 0 ? 12 : 22;
      const blend = 1 - Math.exp(-rate * dt);
      const targetX = nx * spd * strength;
      const targetZ = nz * spd * strength;
      this.group.position.x += targetX * dt + (this.velocity.x - targetX) * blend / rate;
      this.group.position.z += targetZ * dt + (this.velocity.z - targetZ) * blend / rate;
      this.velocity.x += (targetX - this.velocity.x) * blend;
      this.velocity.z += (targetZ - this.velocity.z) * blend;
      if (length === 0 && Math.hypot(this.velocity.x, this.velocity.z) < 0.025) this.velocity.x = this.velocity.z = 0;
    } else {
      this.velocity.set(nx * spd, this.jumpVelocity, nz * spd);
      this.group.position.x += this.velocity.x * dt;
      this.group.position.z += this.velocity.z * dt;
    }
    this.velocity.y = this.jumpVelocity;
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = horizontalSpeed > 0.05;
    this.isRunning = wantsRun && horizontalSpeed > (cameraRelative ? 4.5 : this.speed);
    if (this.isMoving) {
      nx = this.velocity.x / horizontalSpeed;
      nz = this.velocity.z / horizontalSpeed;
      this.targetRotY = Math.atan2(nx, nz);
      this.direction.set(nx, 0, nz);
    }
    this.group.position.y = this.posY;
    const angle = THREE.MathUtils.euclideanModulo(this.targetRotY - this.group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
    this.group.rotation.y += angle * (1 - Math.exp(-14 * dt));
    this.landing *= Math.exp(-18 * dt);
    this.visual.scale.set(1 + this.landing * 0.012, 1 - this.landing * 0.025, 1 + this.landing * 0.012);
    if (!deferVisual) this.finishVisual(dt, horizontalSpeed, surface);
  }

  /** Use actual travel after collision resolution so the feet stop at walls and furniture. */
  resolveMovement(startX: number, startZ: number, intendedX: number, intendedZ: number, delta: number, surface: "wood" | "asphalt" | "stone") {
    const requestedSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (Math.abs(this.group.position.x - intendedX) > 1e-5) this.velocity.x = 0;
    if (Math.abs(this.group.position.z - intendedZ) > 1e-5) this.velocity.z = 0;
    const dt = Math.min(delta / 1000, 0.1);
    const speed = dt > 0 ? Math.min(requestedSpeed, Math.hypot(this.group.position.x - startX, this.group.position.z - startZ) / dt) : 0;
    this.isMoving = speed > 0.05;
    this.isRunning = this.isRunning && this.isMoving;
    this.finishVisual(dt, speed, surface);
  }

  private finishVisual(dt: number, speed: number, surface: "wood" | "asphalt" | "stone") {
    if (this.isGrounded && speed > 0.05) {
      const { walk, run } = this.referenceSpeeds;
      const runBlend = THREE.MathUtils.smoothstep(speed, walk * 1.15, run * 1.1);
      const stride = THREE.MathUtils.lerp(walk * (this.animations.get("walk")?.getClip().duration ?? 1),
        run * (this.animations.get("run")?.getClip().duration ?? 1), runBlend);
      const stepLength = stride / 2;
      this.stepDistance += speed * dt;
      if (this.stepDistance >= stepLength) {
        this.stepDistance %= stepLength;
        sound.playFootstep(surface === "stone" ? "asphalt" : surface);
      }
    } else this.stepDistance = 0;
    this.updateAnimation(dt, speed);
    this.groundVisual();
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.group);
    this.mixer?.stopAllAction();
    if (this.mixer && this.loadedModel) this.mixer.uncacheRoot(this.mixer.getRoot());
    this.mixer = null;
    const skeletons = new Set<THREE.Skeleton>();
    this.group.traverse(child => { if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton); });
    skeletons.forEach(skeleton => skeleton.dispose());
    this.footProbes = [];
    // Detach cached maps so each resource has one clear owner, including in Lite mode.
    if (this.material) this.material.normalMap = this.material.roughnessMap = null;
    this.detailMaps.forEach(texture => texture.dispose());
    this.detailMaps = [];
    disposeObject(this.group);
  }
}
