import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { sound } from "./Audio";

function stripRootMotion(clip: THREE.AnimationClip) {
  clip.tracks.forEach((track) => {
    if (track.name.endsWith(".position")) {
      const values = (track as THREE.VectorKeyframeTrack).values;
      if (values && values.length >= 3) {
        const startX = values[0];
        const startZ = values[2];
        for (let i = 0; i < values.length; i += 3) {
          values[i] = startX;     // Lock X to start position (removes forward displacement)
          values[i + 2] = startZ; // Lock Z to start position (removes forward displacement)
        }
      }
    }
  });
}

export class Character {
  group = new THREE.Group();
  private scene: THREE.Scene;
  private proceduralGroup = new THREE.Group();
  private gltfGroup = new THREE.Group();
  private parts: Record<string, THREE.Mesh | THREE.Group> = {};
  private loadedModel: THREE.Object3D | null = null;

  // GLTF/FBX Animation Mixer
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private currentActionName = "";
  
  speed = 6.0;
  runSpeed = 11.0;
  direction = new THREE.Vector3(0, 0, -1);
  isMoving = false;
  isRunning = false;
  
  private targetRotY = 0;
  private currentTiltX = 0;
  private dustParticles: THREE.Mesh[] = [];
  private stepTimer = 0;

  // Pre-allocated vectors to prevent GC thrashing in render loop
  private static dustVec = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildProceduralModel();
    this.proceduralGroup.scale.setScalar(1.35);
    this.createDustPool();

    this.group.add(this.proceduralGroup);
    this.group.add(this.gltfGroup);
    this.scene.add(this.group);
    this.group.position.set(0, 0, 3);

    this.loadCharacterModel();
  }

  private loadCharacterModel() {
    const textureLoader = new THREE.TextureLoader();
    const diffuseMap = textureLoader.load("/textures/character/texture_diffuse.png");
    diffuseMap.colorSpace = THREE.SRGBColorSpace;
    diffuseMap.flipY = true;

    const normalMap = textureLoader.load("/textures/character/texture_normal.png");
    normalMap.flipY = true;

    const roughnessMap = textureLoader.load("/textures/character/texture_roughness.png");
    roughnessMap.flipY = true;

    const characterMat = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      roughness: 0.7,
      metalness: 0.0,
    });

    const fbxLoader = new FBXLoader();
    
    // 1. Try loading FBX animated Mixamo set (Idle.fbx, Walking.fbx, Running.fbx)
    fbxLoader.load(
      "/models/Idle.fbx",
      (fbx) => {
        const model = fbx;

        // Measure mesh-only bounding box for exact feet grounding on floor (Y = 0)
        let meshMinY = Infinity;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.computeBoundingBox();
            if (mesh.geometry.boundingBox && mesh.geometry.boundingBox.min.y < meshMinY) {
              meshMinY = mesh.geometry.boundingBox.min.y;
            }
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        if (meshMinY === Infinity) {
          meshMinY = box.min.y;
        }

        model.position.x = -center.x;
        // Soles of feet rest firmly on the ground floor surface
        model.position.y = -meshMinY - 0.34;
        model.position.z = -center.z;

        const wrapper = new THREE.Group();
        wrapper.add(model);

        // Normalize character height to prominent size (~2.4 units)
        const targetHeight = 2.4;
        const scaleFactor = targetHeight / (size.y || 2.4);
        wrapper.scale.setScalar(scaleFactor);

        wrapper.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = characterMat;
            mesh.castShadow = true;
            mesh.receiveShadow = false;
          }
        });

        // Initialize AnimationMixer on the rigged FBX character model
        this.mixer = new THREE.AnimationMixer(model);

        if (fbx.animations && fbx.animations.length > 0) {
          const idleClip = fbx.animations[0];
          idleClip.name = "idle";
          stripRootMotion(idleClip);
          const action = this.mixer.clipAction(idleClip);
          this.animations.set("idle", action);
          action.play();
          this.currentActionName = "idle";
        }

        // Load Walking animation clip from Walking.fbx
        fbxLoader.load(
          "/models/Walking.fbx",
          (walkFbx) => {
            if (walkFbx.animations && walkFbx.animations.length > 0) {
              const walkClip = walkFbx.animations[0];
              walkClip.name = "walk";
              stripRootMotion(walkClip);
              const action = this.mixer!.clipAction(walkClip);
              this.animations.set("walk", action);
            }
          },
          undefined,
          (err) => console.warn("Could not load Walking.fbx:", err)
        );

        // Load Running animation clip from Running.fbx
        fbxLoader.load(
          "/models/Running.fbx",
          (runFbx) => {
            if (runFbx.animations && runFbx.animations.length > 0) {
              const runClip = runFbx.animations[0];
              runClip.name = "run";
              stripRootMotion(runClip);
              const action = this.mixer!.clipAction(runClip);
              this.animations.set("run", action);
            }
          },
          undefined,
          (err) => console.warn("Could not load Running.fbx:", err)
        );

        // Load Jumping animation clip from Jumping.fbx
        fbxLoader.load(
          "/models/Jumping.fbx",
          (jumpFbx) => {
            if (jumpFbx.animations && jumpFbx.animations.length > 0) {
              const jumpClip = jumpFbx.animations[0];
              jumpClip.name = "jump";
              stripRootMotion(jumpClip);
              const action = this.mixer!.clipAction(jumpClip);
              action.setLoop(THREE.LoopOnce, 1);
              action.clampWhenFinished = true;
              this.animations.set("jump", action);
            }
          },
          undefined,
          (err) => console.warn("Could not load Jumping.fbx:", err)
        );

        this.loadedModel = wrapper;
        this.gltfGroup.add(wrapper);
        this.proceduralGroup.visible = false;
      },
      undefined,
      () => {
        // 2. Fallback to character.glb if FBX files not present
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          "/models/character.glb",
          (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            model.position.x = -center.x;
            model.position.y = -box.min.y;
            model.position.z = -center.z;

            const wrapper = new THREE.Group();
            wrapper.add(model);

            const targetHeight = 2.4;
            const scaleFactor = targetHeight / (size.y || 2.4);
            wrapper.scale.setScalar(scaleFactor);

            wrapper.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
              }
            });

            if (gltf.animations && gltf.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(model);
              gltf.animations.forEach((clip) => {
                const name = clip.name.toLowerCase();
                stripRootMotion(clip);
                const action = this.mixer!.clipAction(clip);
                this.animations.set(name, action);
              });
              const idleAction = this.animations.get("idle") || Array.from(this.animations.values())[0];
              if (idleAction) {
                idleAction.play();
                this.currentActionName = "idle";
              }
            }

            this.loadedModel = wrapper;
            this.gltfGroup.add(wrapper);
            this.proceduralGroup.visible = false;
          },
          undefined,
          (err) => console.warn("GLTF fallback error:", err)
        );
      }
    );
  }

  private buildProceduralModel() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.4 });
    const hoodieMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.65, metalness: 0.1 });
    const hoodDetailMat = new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const glowSoleMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x6366f1,
      emissiveIntensity: 0.8,
    });
    const headphoneMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.5 });

    // ── Head ──────────────────────────────────
    const headGroup = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.46), skinMat);
    head.position.y = 1.64;
    head.castShadow = true;
    headGroup.add(head);

    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.48),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.9 })
    );
    hair.position.set(0, 1.94, 0.01);
    headGroup.add(hair);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
    );
    visor.position.set(0, 1.66, 0.22);
    headGroup.add(visor);

    const earPadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    const padL = new THREE.Mesh(earPadGeo, headphoneMat);
    padL.rotation.z = Math.PI / 2;
    padL.position.set(-0.27, 1.64, 0);
    headGroup.add(padL);

    const padR = padL.clone();
    padR.position.set(0.27, 1.64, 0);
    headGroup.add(padR);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 8, 16, Math.PI),
      headphoneMat
    );
    band.rotation.y = Math.PI / 2;
    band.position.set(0, 1.88, 0);
    headGroup.add(band);

    this.proceduralGroup.add(headGroup);
    this.parts.headGroup = headGroup;

    // ── Torso ──────────────────────────────────
    const torsoGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.76, 0.4), hoodieMat);
    torso.position.y = 1.07;
    torso.castShadow = true;
    torsoGroup.add(torso);

    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.25, 0.06), hoodDetailMat);
    pocket.position.set(0, 0.85, 0.21);
    torsoGroup.add(pocket);

    const stringL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25), accentMat);
    stringL.position.set(-0.1, 1.25, 0.21);
    torsoGroup.add(stringL);
    const stringR = stringL.clone();
    stringR.position.set(0.1, 1.25, 0.21);
    torsoGroup.add(stringR);

    this.proceduralGroup.add(torsoGroup);
    this.parts.torsoGroup = torsoGroup;

    // ── Arms ──────────────────────────────────
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    armGeo.translate(0, -0.325, 0); // Pivot at shoulder

    const armL = new THREE.Mesh(armGeo, hoodieMat);
    armL.position.set(-0.43, 1.45, 0);
    armL.castShadow = true;
    this.proceduralGroup.add(armL);
    this.parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, hoodieMat);
    armR.position.set(0.43, 1.45, 0);
    armR.castShadow = true;
    this.proceduralGroup.add(armR);
    this.parts.armR = armR;

    const handGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(0, -0.68, 0);
    armL.add(handL);

    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0, -0.68, 0);
    armR.add(handR);

    // ── Legs ──────────────────────────────────
    const legGeo = new THREE.BoxGeometry(0.23, 0.7, 0.23);
    legGeo.translate(0, -0.35, 0); // Pivot at hip

    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.16, 0.7, 0);
    legL.castShadow = true;
    this.proceduralGroup.add(legL);
    this.parts.legL = legL;

    const legR = new THREE.Mesh(legGeo, pantsMat);
    legR.position.set(0.16, 0.7, 0);
    legR.castShadow = true;
    this.proceduralGroup.add(legR);
    this.parts.legR = legR;

    // ── Shoes (Attached to Leg Pivots) ────────
    const shoeLMain = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.34), shoeMat);
    shoeLMain.position.set(0, -0.68, 0.05);

    const soleL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.35), glowSoleMat);
    soleL.position.set(0, -0.74, 0.05);
    legL.add(soleL);
    legL.add(shoeLMain);

    const shoeRMain = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.34), shoeMat);
    shoeRMain.position.set(0, -0.68, 0.05);

    const soleR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.35), glowSoleMat);
    soleR.position.set(0, -0.74, 0.05);
    legR.add(soleR);
    legR.add(shoeRMain);
  }

  private createDustPool() {
    const geo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const p = new THREE.Mesh(geo, mat);
      p.visible = false;
      this.scene.add(p);
      this.dustParticles.push(p);
    }
  }

  private dustIdx = 0;

  private spawnDust(pos: THREE.Vector3, isRunning = false) {
    const count = isRunning ? 3 : 2;
    for (let s = 0; s < count; s++) {
      const p = this.dustParticles[this.dustIdx];
      this.dustIdx = (this.dustIdx + 1) % this.dustParticles.length;
      if (!p) continue;
      // Spawn tight cartoon dust puffs right at the soles of the shoes
      Character.dustVec.set(
        (Math.random() - 0.5) * (isRunning ? 0.16 : 0.08),
        0.02,
        (Math.random() - 0.5) * (isRunning ? 0.16 : 0.08)
      );
      p.position.copy(pos).add(Character.dustVec);
      const startScale = isRunning ? 0.8 : 0.5;
      p.scale.setScalar(startScale);
      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity = isRunning ? 0.65 : 0.45;
      mat.color.setHex(0xffffff);
      p.visible = true;
    }
  }

  private updateDust(dt: number) {
    for (let i = 0; i < this.dustParticles.length; i++) {
      const p = this.dustParticles[i];
      if (!p.visible) continue;
      const mat = p.material as THREE.MeshBasicMaterial;
      mat.opacity -= dt * 2.8;
      p.position.y += dt * 0.45;
      p.scale.multiplyScalar(0.93);
      if (mat.opacity <= 0) {
        p.visible = false;
      }
    }
  }

  private playAnimation(actionName: string, fadeDuration = 0.2) {
    if (!this.mixer || this.currentActionName === actionName) return;
    const nextAction = this.animations.get(actionName) || this.animations.get(`${actionName}_01`);
    if (!nextAction) return;

    const currentAction = this.animations.get(this.currentActionName);
    if (currentAction) {
      currentAction.fadeOut(fadeDuration);
    }
    nextAction.reset().fadeIn(fadeDuration).play();
    this.currentActionName = actionName;
  }

  // Jump & Gravity Physics
  private jumpVelocity = 0;
  private isGrounded = true;
  private posY = 0;

  setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.posY = y;
  }

  update(
    keys: Set<string>,
    joystick: { x: number; y: number },
    delta: number,
    elapsed: number,
    cameraYaw: number,
    surface: "wood" | "asphalt" = "wood"
  ) {
    const dt = Math.min(delta / 1000, 0.1); // cap max dt to prevent physics tunneling
    this.updateDust(dt);

    if (this.mixer) {
      this.mixer.update(dt);
    }

    // ── Spacebar Jump Trigger ─────────────────
    const isSpace = keys.has("Space") || keys.has("Spacebar");
    if (isSpace && this.isGrounded) {
      this.jumpVelocity = 9.5;
      this.isGrounded = false;
      sound.playJump();
      this.spawnDust(this.group.position, true);
    }

    // ── Gravity Physics Calculation ──────────
    if (!this.isGrounded) {
      this.jumpVelocity -= 26.0 * dt;
      this.posY += this.jumpVelocity * dt;
      if (this.posY <= 0) {
        this.posY = 0;
        this.jumpVelocity = 0;
        this.isGrounded = true;
        this.spawnDust(this.group.position, false);
      }
    }

    let moveX = 0;
    let moveZ = 0;

    if (keys.has("KeyW") || keys.has("ArrowUp")) moveZ -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) moveZ += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) moveX -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) moveX += 1;

    moveX += joystick.x;
    moveZ += joystick.y;

    const isRunning = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const spd = isRunning ? this.runSpeed : this.speed;
    this.isMoving = moveX !== 0 || moveZ !== 0;
    this.isRunning = isRunning && this.isMoving;

    if (this.isMoving) {
      const cos = Math.cos(cameraYaw);
      const sin = Math.sin(cameraYaw);
      const worldX = moveX * cos - moveZ * sin;
      const worldZ = moveX * sin + moveZ * cos;

      const len = Math.sqrt(worldX * worldX + worldZ * worldZ);
      const nx = worldX / len;
      const nz = worldZ / len;

      this.group.position.x += nx * spd * dt;
      this.group.position.z += nz * spd * dt;

      // Face movement direction
      this.targetRotY = Math.atan2(nx, nz);
      this.direction.set(nx, 0, nz);

      // Frame-rate independent footstep audio & particle triggering
      const stepInterval = isRunning ? 0.22 : 0.38;
      this.stepTimer += dt;
      if (this.stepTimer >= stepInterval && this.isGrounded) {
        this.stepTimer -= stepInterval;
        sound.playFootstep(surface);
        this.spawnDust(this.group.position, isRunning);
      }

      // Forward lean angle when sprinting vs running
      this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, isRunning ? 0.22 : 0.08, dt * 10);

      if (this.mixer) {
        if (!this.isGrounded) {
          this.playAnimation("jump", 0.1);
        } else {
          this.playAnimation(isRunning ? "run" : "walk");
        }
      }
    } else {
      this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, 0, dt * 8);
      this.stepTimer = 0;

      if (this.mixer) {
        if (!this.isGrounded) {
          this.playAnimation("jump", 0.1);
        } else {
          this.playAnimation("idle");
        }
      }
    }

    // Apply vertical jump position to group
    this.group.position.y = this.posY;

    // Smooth, frame-rate independent rotation dampening
    const dAngle = this.targetRotY - this.group.rotation.y;
    const wrappedAngle = ((dAngle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const rotDamp = 1 - Math.exp(-14 * dt);
    this.group.rotation.y += wrappedAngle * rotDamp;

    const t = elapsed / 1000;

    // ── GLTF Model Locomotion Physics (Walk & Run Body Motion) ──
    if (this.loadedModel && !this.mixer) {
      if (this.isMoving) {
        const freq = isRunning ? 16 : 10;

        // Hip Roll / Leg Stride Wobble (side to side)
        this.gltfGroup.rotation.z = Math.sin(t * freq) * (isRunning ? 0.16 : 0.08);

        // Shoulder / Torso / Arm Swinging Counter-Twist (yaw rotation)
        this.gltfGroup.rotation.y = Math.sin(t * freq * 0.5) * (isRunning ? 0.22 : 0.12);

        // Stride Pitch / Step Lean (x-axis pitch)
        this.gltfGroup.rotation.x = this.currentTiltX + Math.sin(t * freq) * (isRunning ? 0.08 : 0.04);

        // Vertical step compression & bounce
        const stepBounce = Math.abs(Math.sin(t * freq)) * (isRunning ? 0.18 : 0.08);
        this.gltfGroup.position.y = this.isGrounded ? stepBounce : 0;

        // Dynamic Squash & Stretch on step impact
        const squash = Math.sin(t * freq * 2);
        this.gltfGroup.scale.y = 1 + squash * (isRunning ? 0.05 : 0.02);
        this.gltfGroup.scale.x = 1 - squash * (isRunning ? 0.03 : 0.01);
      } else {
        this.gltfGroup.rotation.z = THREE.MathUtils.lerp(this.gltfGroup.rotation.z, 0, dt * 8);
        this.gltfGroup.rotation.x = THREE.MathUtils.lerp(this.gltfGroup.rotation.x, 0, dt * 8);
        this.gltfGroup.rotation.y = THREE.MathUtils.lerp(this.gltfGroup.rotation.y, 0, dt * 8);
        this.gltfGroup.position.y = Math.sin(t * 2) * 0.02;
        this.gltfGroup.scale.set(1, 1, 1);
      }
    }

    // ── Procedural Model Limb Animation (Legs AND Arms swing naturally when walking and running) ──
    if (this.proceduralGroup.visible) {
      this.proceduralGroup.rotation.x = this.currentTiltX;
      const legL = this.parts.legL as THREE.Mesh;
      const legR = this.parts.legR as THREE.Mesh;
      const armL = this.parts.armL as THREE.Mesh;
      const armR = this.parts.armR as THREE.Mesh;
      const torsoGroup = this.parts.torsoGroup as THREE.Group;
      const headGroup = this.parts.headGroup as THREE.Group;

      if (this.isMoving) {
        const freq = isRunning ? 16 : 10;

        // Legs swing (Left leg & Right leg opposite phase)
        legL.rotation.x = Math.sin(t * freq) * (isRunning ? 1.15 : 0.70);
        legR.rotation.x = -Math.sin(t * freq) * (isRunning ? 1.15 : 0.70);

        // Arms swing (Opposite to legs: Right arm swings forward with Left leg, Left arm swings forward with Right leg!)
        armL.rotation.x = -Math.sin(t * freq) * (isRunning ? 0.95 : 0.60);
        armR.rotation.x = Math.sin(t * freq) * (isRunning ? 0.95 : 0.60);

        // Torso & Head natural sway
        torsoGroup.rotation.z = Math.sin(t * freq) * (isRunning ? 0.08 : 0.04);
        if (headGroup) headGroup.rotation.y = Math.sin(t * freq * 0.5) * (isRunning ? 0.12 : 0.06);

        if (this.isGrounded) {
          this.proceduralGroup.position.y = Math.abs(Math.sin(t * freq)) * (isRunning ? 0.12 : 0.06);
        } else {
          this.proceduralGroup.position.y = 0;
        }
      } else {
        torsoGroup.position.y = Math.sin(t * 1.8) * 0.015;
        if (headGroup) headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, 0, dt * 8);
        torsoGroup.rotation.z = THREE.MathUtils.lerp(torsoGroup.rotation.z, 0, dt * 8);
        legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, dt * 10);
        legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, dt * 10);
        armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, dt * 10);
        armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, dt * 10);
        this.proceduralGroup.position.y = 0;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.dustParticles.forEach((p) => {
      this.scene.remove(p);
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
    this.dustParticles = [];
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    this.group.traverse((c: any) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
        else c.material.dispose();
      }
    });
  }
}
