import * as THREE from "three";
import { sound } from "./Audio";

export interface SkillGem {
  id: string;
  name: string;
  icon: string;
  color: number;
  exp: number;
  location: "room" | "street";
  position: THREE.Vector3;
  mesh?: THREE.Group;
  collected: boolean;
}

export class CollectiblesSystem {
  private gems: SkillGem[] = [
    {
      id: "ts",
      name: "TypeScript Core Mastery",
      icon: "🔷",
      color: 0x38bdf8,
      exp: 120,
      location: "room",
      position: new THREE.Vector3(0, 1.2, 1.5),
      collected: false,
    },
    {
      id: "about",
      name: "Full-Stack Bio & Creative Shard",
      icon: "💖",
      color: 0xec4899,
      exp: 150,
      location: "street",
      position: new THREE.Vector3(-5.5, 1.3, -20),
      collected: false,
    },
    {
      id: "skills",
      name: "React, Next.js & Modern UI",
      icon: "⚡",
      color: 0x10b981,
      exp: 160,
      location: "street",
      position: new THREE.Vector3(5.5, 1.3, -38),
      collected: false,
    },
    {
      id: "projects",
      name: "Three.js & WebGL 3D Craft",
      icon: "🚀",
      color: 0xf59e0b,
      exp: 200,
      location: "street",
      position: new THREE.Vector3(-5.5, 1.3, -58),
      collected: false,
    },
    {
      id: "experience",
      name: "Education & Growth",
      icon: "🏆",
      color: 0x6366f1,
      exp: 220,
      location: "street",
      position: new THREE.Vector3(5.5, 1.3, -76),
      collected: false,
    },
  ];

  private burstParticles: THREE.Points[] = [];
  onCollectCallback?: (gem: SkillGem, totalCollected: number, totalGems: number) => void;

  // ─────────────────────────────────────────────
  // Build 3D Gem Meshes
  // ─────────────────────────────────────────────
  buildGems(roomGroup: THREE.Group, streetGroup: THREE.Group) {
    this.gems.forEach((gem) => {
      const g = new THREE.Group();
      g.position.copy(gem.position);

      // 1. Crystal Diamond Core
      const geo = new THREE.OctahedronGeometry(0.44, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: gem.color,
        emissive: gem.color,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.8,
        wireframe: false,
      });
      const crystal = new THREE.Mesh(geo, mat);
      g.add(crystal);

      // 2. Outer Wireframe Cage for cyber aesthetic
      const wireGeo = new THREE.OctahedronGeometry(0.55, 0);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wireframe = new THREE.Mesh(wireGeo, wireMat);
      g.add(wireframe);

      // 3. Floating Orbiting Sparkle Ring
      const ringCount = 14;
      const ringGeo = new THREE.BufferGeometry();
      const ringPos = new Float32Array(ringCount * 3);
      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        ringPos[i * 3] = Math.cos(angle) * 0.75;
        ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
        ringPos[i * 3 + 2] = Math.sin(angle) * 0.75;
      }
      ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
      const ringMat = new THREE.PointsMaterial({
        color: gem.color,
        size: 0.12,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const ringPoints = new THREE.Points(ringGeo, ringMat);
      g.add(ringPoints);

      gem.mesh = g;

      if (gem.location === "room") {
        roomGroup.add(g);
      } else {
        streetGroup.add(g);
      }
    });
  }

  // ─────────────────────────────────────────────
  // Update & Check Collection
  // ─────────────────────────────────────────────
  update(t: number, charPos: THREE.Vector3, currentLocation: "room" | "street") {
    const pickupRadiusSq = 2.2 * 2.2;

    this.gems.forEach((gem) => {
      if (gem.collected || !gem.mesh) return;
      if (gem.location !== currentLocation) return;

      // Levitation & rotation
      gem.mesh.position.y = gem.position.y + Math.sin(t * 3.0 + gem.position.x) * 0.15;
      gem.mesh.rotation.y = t * 2.2;
      gem.mesh.rotation.x = Math.sin(t * 1.5) * 0.2;

      // Distance check to player
      const dx = gem.mesh.position.x - charPos.x;
      const dz = gem.mesh.position.z - charPos.z;
      const dy = gem.mesh.position.y - charPos.y;
      const distSq = dx * dx + dz * dz + dy * dy * 0.5;

      if (distSq < pickupRadiusSq) {
        this.collectGem(gem);
      }
    });

    // Animate burst particles
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.scale.addScalar(0.04);
      (p.material as THREE.PointsMaterial).opacity -= 0.03;
      if ((p.material as THREE.PointsMaterial).opacity <= 0) {
        p.parent?.remove(p);
        this.burstParticles.splice(i, 1);
      }
    }
  }

  private collectGem(gem: SkillGem) {
    gem.collected = true;
    sound.playCollect();

    // Spawn celebration particle burst
    if (gem.mesh) {
      const burstCount = 40;
      const burstGeo = new THREE.BufferGeometry();
      const burstPos = new Float32Array(burstCount * 3);
      for (let i = 0; i < burstCount; i++) {
        burstPos[i * 3] = (Math.random() - 0.5) * 0.8;
        burstPos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
        burstPos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }
      burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
      const burstMat = new THREE.PointsMaterial({
        color: gem.color,
        size: 0.18,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const burst = new THREE.Points(burstGeo, burstMat);
      burst.position.copy(gem.mesh.position);
      gem.mesh.parent?.add(burst);
      this.burstParticles.push(burst);

      // Remove gem mesh
      gem.mesh.parent?.remove(gem.mesh);
    }

    const collectedCount = this.gems.filter((g) => g.collected).length;
    if (this.onCollectCallback) {
      this.onCollectCallback(gem, collectedCount, this.gems.length);
    }

    if (collectedCount === this.gems.length) {
      sound.playFanfare();
    }
  }

  getCollectedCount(): number {
    return this.gems.filter((g) => g.collected).length;
  }

  getTotalCount(): number {
    return this.gems.length;
  }
}
