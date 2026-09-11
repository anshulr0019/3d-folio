import * as THREE from "three";
import { sound } from "./Audio";

export class StudioCompanion {
  group: THREE.Group;
  private head: THREE.Mesh;
  private eye: THREE.Mesh;
  private basePos = new THREE.Vector3(-3.8, 1.6, -1.8);
  private lastInteractTime = 0;
  private wiggle = 0;

  constructor(roomGroup: THREE.Group) {
    this.group = new THREE.Group();
    this.group.position.copy(this.basePos);

    // 1. Droid Spherical Head / Body
    const bodyGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2,
    });
    this.head = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.head);

    // 2. Cyan Glowing Visor / Screen Eye
    const eyeGeo = new THREE.BoxGeometry(0.24, 0.1, 0.06);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });
    this.eye = new THREE.Mesh(eyeGeo, eyeMat);
    this.eye.position.set(0, 0.04, 0.3);
    this.head.add(this.eye);

    // 3. Mini Antenna
    const antPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 })
    );
    antPole.position.set(0, 0.38, 0);
    this.head.add(antPole);

    const antTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    antTip.position.set(0, 0.48, 0);
    this.head.add(antTip);

    // 4. Anti-Gravity Energy Ring under droid
    const ringGeo = new THREE.TorusGeometry(0.18, 0.02, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.8,
    });
    const repulsor = new THREE.Mesh(ringGeo, ringMat);
    repulsor.rotation.x = Math.PI / 2;
    repulsor.position.y = -0.32;
    this.group.add(repulsor);

    // Interactive tagging
    this.head.userData.interactive = {
      id: "companion",
      label: "Byte 🤖 (Studio Droid)",
      category: "companion",
    };

    roomGroup.add(this.group);
  }

  update(t: number, charPos: THREE.Vector3) {
    // Gentle floating hover
    this.group.position.y = this.basePos.y + Math.sin(t * 2.8) * 0.12;

    // Smooth head-tracking look at character
    const dx = charPos.x - this.group.position.x;
    const dz = charPos.z - this.group.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 10.0 * 10.0) {
      const targetAngle = Math.atan2(dx, dz);
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, targetAngle, 0.08);
      this.head.rotation.x = THREE.MathUtils.lerp(
        this.head.rotation.x,
        (charPos.y - this.group.position.y) * 0.2,
        0.08
      );
    }

    // Wiggle response after interaction
    if (this.wiggle > 0) {
      this.head.rotation.z = Math.sin(t * 20.0) * this.wiggle;
      this.wiggle *= 0.94;
    }
  }

  interact(): string {
    const now = performance.now();
    if (now - this.lastInteractTime < 400) return "Beep boop! 🚀";
    this.lastInteractTime = now;

    this.wiggle = 0.35;
    sound.playBeep(880, 0.06, "sine");
    setTimeout(() => sound.playBeep(1174.66, 0.09, "sine"), 70);

    const quotes = [
      "Beep boop! Anshul is building awesome web apps & SaaS products! 🚀",
      "Tip: Try sprinting with [Shift] and jumping with [Space]! ✨",
      "Have you collected all 5 Hidden Skill Gems yet? 💎",
      "Press [P] anytime to enter Photo Mode and take snapshots! 📸",
      "Easter Egg: Try the Konami code [↑↑↓↓←→←→BA]! 🪩",
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}
