import * as THREE from "three";
import { sound } from "./Audio";

export interface PushableProp {
  mesh: THREE.Object3D;
  radius: number;
  baseY: number;
  mass: number;
  elasticity: number;
  friction: number;
  velocity: THREE.Vector3;
  velocityY: number;
  angularVelocity: THREE.Vector3;
  isBall?: boolean;
  minBounds: THREE.Vector2;
  maxBounds: THREE.Vector2;
  lastKickTime: number;
  type: "room" | "street";
}

export class PhysicsPropsSystem {
  private props: PushableProp[] = [];

  // ─────────────────────────────────────────────
  // Build Room Props
  // ─────────────────────────────────────────────
  buildRoomProps(roomGroup: THREE.Group) {
    const roomMin = new THREE.Vector2(-6.8, -6.8);
    const roomMax = new THREE.Vector2(6.8, 6.8);

    // 1. ⚽ Colorful Cyber Beach Ball (Near Rug)
    const ballGeo = new THREE.SphereGeometry(0.46, 20, 16);
    const ballCanvas = document.createElement("canvas");
    ballCanvas.width = 128;
    ballCanvas.height = 64;
    const bCtx = ballCanvas.getContext("2d")!;
    bCtx.fillStyle = "#38bdf8";
    bCtx.fillRect(0, 0, 64, 64);
    bCtx.fillStyle = "#ec4899";
    bCtx.fillRect(64, 0, 64, 64);
    bCtx.fillStyle = "#facc15";
    bCtx.fillRect(0, 0, 128, 16);
    const ballTex = new THREE.CanvasTexture(ballCanvas);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.2,
      metalness: 0.1,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(2.0, 0.46, 1.2);
    roomGroup.add(ball);

    this.props.push({
      mesh: ball,
      radius: 0.48,
      baseY: 0.46,
      mass: 0.7,
      elasticity: 0.85,
      friction: 0.975,
      velocity: new THREE.Vector3(),
      velocityY: 0,
      angularVelocity: new THREE.Vector3(),
      isBall: true,
      minBounds: roomMin,
      maxBounds: roomMax,
      lastKickTime: 0,
      type: "room",
    });

    // 2. 📦 Wooden Studio Crate (Near Desk)
    const crateGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.6,
      metalness: 0.1,
    });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(-3.8, 0.35, 2.2);
    roomGroup.add(crate);

    this.props.push({
      mesh: crate,
      radius: 0.52,
      baseY: 0.35,
      mass: 1.8,
      elasticity: 0.45,
      friction: 0.93,
      velocity: new THREE.Vector3(),
      velocityY: 0,
      angularVelocity: new THREE.Vector3(),
      minBounds: roomMin,
      maxBounds: roomMax,
      lastKickTime: 0,
      type: "room",
    });

    // 3. 🦆 Golden Duck Mascot (Near Armchair)
    const duckGroup = new THREE.Group();
    // Body
    const duckBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.3 })
    );
    duckBody.scale.set(1, 0.85, 1.25);
    duckGroup.add(duckBody);
    // Head
    const duckHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.3 })
    );
    duckHead.position.set(0, 0.3, 0.22);
    duckGroup.add(duckHead);
    // Beak
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 })
    );
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.28, 0.42);
    duckGroup.add(beak);
    // Position duck in room
    duckGroup.position.set(-1.5, 0.35, -1.8);
    roomGroup.add(duckGroup);

    this.props.push({
      mesh: duckGroup,
      radius: 0.46,
      baseY: 0.35,
      mass: 0.85,
      elasticity: 0.7,
      friction: 0.95,
      velocity: new THREE.Vector3(),
      velocityY: 0,
      angularVelocity: new THREE.Vector3(),
      minBounds: roomMin,
      maxBounds: roomMax,
      lastKickTime: 0,
      type: "room",
    });

    // 4. 🎲 Glowing Neon Dodecahedron Die
    const dieGeo = new THREE.DodecahedronGeometry(0.4);
    const dieMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.6,
    });
    const die = new THREE.Mesh(dieGeo, dieMat);
    die.position.set(3.2, 0.4, -2.8);
    roomGroup.add(die);

    this.props.push({
      mesh: die,
      radius: 0.44,
      baseY: 0.4,
      mass: 1.1,
      elasticity: 0.65,
      friction: 0.96,
      velocity: new THREE.Vector3(),
      velocityY: 0,
      angularVelocity: new THREE.Vector3(),
      minBounds: roomMin,
      maxBounds: roomMax,
      lastKickTime: 0,
      type: "room",
    });
  }

  // ─────────────────────────────────────────────
  // Build Street Props
  // ─────────────────────────────────────────────
  buildStreetProps(streetGroup: THREE.Group) {
    const streetMin = new THREE.Vector2(-9.5, -110);
    const streetMax = new THREE.Vector2(9.5, 10);

    // Street Soccer Ball (Near Plaza entrance)
    const ballGeo = new THREE.SphereGeometry(0.55, 18, 14);
    const soccerMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1,
    });
    const soccer = new THREE.Mesh(ballGeo, soccerMat);
    soccer.position.set(2.0, 0.55, -20);
    streetGroup.add(soccer);

    this.props.push({
      mesh: soccer,
      radius: 0.55,
      baseY: 0.55,
      mass: 0.8,
      elasticity: 0.88,
      friction: 0.98,
      velocity: new THREE.Vector3(),
      velocityY: 0,
      angularVelocity: new THREE.Vector3(),
      isBall: true,
      minBounds: streetMin,
      maxBounds: streetMax,
      lastKickTime: 0,
      type: "street",
    });

    // Street Stacked Crates
    const cratePositions = [
      [-4.0, -42],
      [4.2, -72],
      [-4.5, -88],
    ];

    cratePositions.forEach(([cx, cz]) => {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.85, 0.85),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, metalness: 0.3 })
      );
      crate.position.set(cx, 0.425, cz);
      streetGroup.add(crate);

      this.props.push({
        mesh: crate,
        radius: 0.58,
        baseY: 0.425,
        mass: 2.2,
        elasticity: 0.4,
        friction: 0.93,
        velocity: new THREE.Vector3(),
        velocityY: 0,
        angularVelocity: new THREE.Vector3(),
        minBounds: streetMin,
        maxBounds: streetMax,
        lastKickTime: 0,
        type: "street",
      });
    });
  }

  // ─────────────────────────────────────────────
  // Physics Update Loop
  // ─────────────────────────────────────────────
  update(
    charPos: THREE.Vector3,
    charVel: THREE.Vector3,
    isSprinting: boolean,
    dt: number,
    currentLocation: "room" | "street"
  ) {
    const charRadius = 0.65;
    const now = performance.now();
    const cappedDt = Math.min(dt, 0.05);

    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i];
      if (prop.type !== currentLocation) continue;

      const pPos = prop.mesh.position;
      let dx = pPos.x - charPos.x;
      let dz = pPos.z - charPos.z;
      let distSq = dx * dx + dz * dz;
      const minDist = charRadius + prop.radius;
      const minDistSq = minDist * minDist;

      // 1. Character to Prop Collision & Immediate Impulse
      if (distSq < minDistSq) {
        let dist = Math.sqrt(distSq);
        let nx = 0;
        let nz = 0;

        if (dist < 0.001) {
          // If perfectly overlapping, push in character velocity or forward direction
          if (charVel.lengthSq() > 0.01) {
            nx = charVel.x;
            nz = charVel.z;
          } else {
            nz = 1.0;
          }
          const vLen = Math.sqrt(nx * nx + nz * nz);
          nx /= vLen;
          nz /= vLen;
          dist = 0.001;
        } else {
          nx = dx / dist;
          nz = dz / dist;
        }

        // Hard separation: push prop outside character radius so character CANNOT walk over it
        pPos.x = charPos.x + nx * (minDist + 0.04);
        pPos.z = charPos.z + nz * (minDist + 0.04);

        // High momentum impulse calculation
        const forwardSpeed = Math.max(charVel.length(), 3.5);
        const kickPower = isSprinting ? 16.0 : 10.0;
        const impulse = (kickPower * forwardSpeed) / (prop.mass * 3.5);

        prop.velocity.x = nx * impulse + charVel.x * 1.4;
        prop.velocity.z = nz * impulse + charVel.z * 1.4;
        prop.velocityY = isSprinting ? 3.4 : 1.6; // Satisfying hop off floor

        // Dynamic angular spin
        prop.angularVelocity.x += prop.velocity.z * 3.5;
        prop.angularVelocity.z -= prop.velocity.x * 3.5;
        prop.angularVelocity.y += (Math.random() - 0.5) * 8.0;

        // Audio kick feedback
        if (now - prop.lastKickTime > 140) {
          prop.lastKickTime = now;
          sound.playKick();
        }
      }

      // 2. Prop to Prop Elastic Collision
      for (let j = i + 1; j < this.props.length; j++) {
        const other = this.props[j];
        if (other.type !== currentLocation) continue;

        const oPos = other.mesh.position;
        const pdx = oPos.x - pPos.x;
        const pdz = oPos.z - pPos.z;
        const pDistSq = pdx * pdx + pdz * pdz;
        const pMinDist = prop.radius + other.radius;

        if (pDistSq < pMinDist * pMinDist && pDistSq > 0.0001) {
          const pDist = Math.sqrt(pDistSq);
          const pnx = pdx / pDist;
          const pnz = pdz / pDist;

          // Separate
          const pOverlap = (pMinDist - pDist) * 0.55;
          pPos.x -= pnx * pOverlap;
          pPos.z -= pnz * pOverlap;
          oPos.x += pnx * pOverlap;
          oPos.z += pnz * pOverlap;

          // Swap / redistribute momentum
          const relVx = prop.velocity.x - other.velocity.x;
          const relVz = prop.velocity.z - other.velocity.z;
          const impulse = (relVx * pnx + relVz * pnz) * 0.9;

          prop.velocity.x -= pnx * impulse;
          prop.velocity.z -= pnz * impulse;
          other.velocity.x += pnx * impulse;
          other.velocity.z += pnz * impulse;
        }
      }

      // 3. Integrate Velocity, Gravity & Friction
      if (prop.velocity.lengthSq() > 0.0001 || prop.velocityY !== 0) {
        pPos.x += prop.velocity.x * cappedDt;
        pPos.z += prop.velocity.z * cappedDt;

        // Vertical gravity and ground bounce
        prop.velocityY -= 22.0 * cappedDt;
        pPos.y += prop.velocityY * cappedDt;

        if (pPos.y <= prop.baseY) {
          pPos.y = prop.baseY;
          if (prop.velocityY < -1.5) {
            prop.velocityY = -prop.velocityY * (prop.elasticity * 0.5);
          } else {
            prop.velocityY = 0;
          }
        }

        // Frame-rate independent friction damping
        const decay = Math.pow(prop.friction, cappedDt * 60);
        prop.velocity.x *= decay;
        prop.velocity.z *= decay;

        // Rolling & tumble rotation
        if (prop.isBall) {
          prop.mesh.rotation.x += prop.velocity.z * cappedDt * 3.2;
          prop.mesh.rotation.z -= prop.velocity.x * cappedDt * 3.2;
        } else {
          prop.mesh.rotation.x += prop.angularVelocity.x * cappedDt;
          prop.mesh.rotation.y += prop.angularVelocity.y * cappedDt;
          prop.mesh.rotation.z += prop.angularVelocity.z * cappedDt;
          prop.angularVelocity.multiplyScalar(Math.pow(0.92, cappedDt * 60));
        }
      }

      // 4. Boundary Walls Bounce
      if (pPos.x < prop.minBounds.x + prop.radius) {
        pPos.x = prop.minBounds.x + prop.radius;
        prop.velocity.x = -prop.velocity.x * prop.elasticity;
        sound.playKick();
      } else if (pPos.x > prop.maxBounds.x - prop.radius) {
        pPos.x = prop.maxBounds.x - prop.radius;
        prop.velocity.x = -prop.velocity.x * prop.elasticity;
        sound.playKick();
      }

      if (pPos.z < prop.minBounds.y + prop.radius) {
        pPos.z = prop.minBounds.y + prop.radius;
        prop.velocity.z = -prop.velocity.z * prop.elasticity;
        sound.playKick();
      } else if (pPos.z > prop.maxBounds.y - prop.radius) {
        pPos.z = prop.maxBounds.y - prop.radius;
        prop.velocity.z = -prop.velocity.z * prop.elasticity;
        sound.playKick();
      }
    }
  }
}
