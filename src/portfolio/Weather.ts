import * as THREE from "three";

export type WeatherType = "clear" | "rain";

export class WeatherSystem {
  type: WeatherType = "clear";
  private scene: THREE.Scene;
  private rainParticles: THREE.Points | null = null;
  private rainPositions: Float32Array = new Float32Array(0);
  private count = 600;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createRain();
  }

  private createRain() {
    const geo = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      this.rainPositions[i * 3 + 1] = Math.random() * 25 + 1;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(this.rainPositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    this.rainParticles = new THREE.Points(geo, mat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  setWeather(type: WeatherType) {
    this.type = type;
    if (this.rainParticles) {
      this.rainParticles.visible = type === "rain";
    }
  }

  update(dt: number) {
    if (this.type !== "rain" || !this.rainParticles) return;

    const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      positions[i * 3 + 1] -= dt * 28; // fall speed
      positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.1) * dt * 0.5; // wind wobble

      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = 22 + Math.random() * 5;
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    this.rainParticles.geometry.attributes.position.needsUpdate = true;
  }
}
