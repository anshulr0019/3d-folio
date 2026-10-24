import * as THREE from "three";
import gsap from "gsap";
import type { RenderQuality } from "./quality";
import { disposeObject } from "./dispose";
import { WeatherSystem, type WeatherType } from "./Weather";
import { PhysicsPropsSystem } from "./PhysicsProps";
import { CollectiblesSystem } from "./Collectibles";
import { Island } from "./Island";
import { StudioCompanion } from "./StudioCompanion";
import { buildStudio, STUDIO } from "./Studio";
import { buildCampus, type CampusObstacle } from "./Campus";

export type DayNightMode = "day" | "dusk" | "night";
export interface InteractiveObjectData {
  id: string; label: string; category: string;
  inspectPos?: THREE.Vector3; lookAtPos?: THREE.Vector3; icon?: string; description?: string;
}
export interface Zone { id: string; label: string; position: THREE.Vector3; radius: number; color: number }

function createContactShadowTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(0,0,0,0.92)");
  gradient.addColorStop(0.25, "rgba(0,0,0,0.7)");
  gradient.addColorStop(0.6, "rgba(0,0,0,0.25)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/** Scene lifecycle shared by the studio and the compact outdoor campus. */
export class World {
  isOutdoor = false;
  island: Island;
  roomGroup = new THREE.Group();
  streetGroup = new THREE.Group();
  zones: Zone[] = [];
  roomZones: Zone[] = [];
  streetZones: Zone[] = [];
  roomRings: THREE.Mesh[] = [];
  streetRings: THREE.Mesh[] = [];
  interactiveObjects: THREE.Object3D[] = [];
  campusObstacles: CampusObstacle[] = [];
  doorPosition = new THREE.Vector3(0, 0, 11.3);
  dayNightMode: DayNightMode = "day";
  weather: WeatherSystem;
  physicsProps = new PhysicsPropsSystem();
  collectibles = new CollectiblesSystem();
  companion: StudioCompanion;
  roomCeiling: THREE.PointLight;
  roomWarm: THREE.PointLight;
  private ambientLight = new THREE.AmbientLight(0xfff4df, 1.25);
  private sunLight = new THREE.DirectionalLight(0xffe3b1, 2.4);
  private characterShadow: THREE.Mesh;
  private fadeOverlay: THREE.Mesh;
  private campusDispose: () => void;

  constructor(public scene: THREE.Scene, private quality: RenderQuality = "balanced", manager = THREE.DefaultLoadingManager) {
    this.roomGroup.name = "Developer Studio";
    this.streetGroup.name = "Anshul’s Island";
    this.weather = new WeatherSystem(scene);
    scene.add(this.ambientLight, this.sunLight, this.sunLight.target);
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.bias = -0.0004; this.sunLight.shadow.normalBias = 0.035;
    this.sunLight.shadow.radius = 3;
    this.roomCeiling = new THREE.PointLight(0xffedce, 7, 18);
    this.roomCeiling.position.set(0, 6, 0);
    this.roomWarm = new THREE.PointLight(0xffd399, 5, 9);
    this.roomWarm.position.set(6.6, 2.5, -2.4);
    this.roomGroup.add(this.roomCeiling, this.roomWarm);

    const shadowTexture = createContactShadowTexture();
    const studio = buildStudio(this.roomGroup, shadowTexture, { background: false });
    this.roomZones = studio.zones; this.roomRings = studio.markers;
    this.interactiveObjects.push(...studio.interactive);
    const campus = buildCampus(this.streetGroup, manager, shadowTexture);
    this.streetZones = campus.zones; this.streetRings = campus.markers;
    this.campusObstacles = campus.obstacles; this.campusDispose = campus.dispose;
    this.interactiveObjects.push(...campus.interactive);
    this.island = new Island(this.streetGroup);
    this.streetZones.push(...this.island.zones);
    this.interactiveObjects.push(...this.island.interactive);
    this.campusObstacles.push({x:-8.03,z:0,halfX:0.16,halfZ:8.1},{x:0,z:-8.03,halfX:8.1,halfZ:0.16},{x:25,z:-10,halfX:1.9,halfZ:1.9},{x:23,z:24,halfX:2,halfZ:1.5});
    this.physicsProps.buildRoomProps(this.roomGroup);
    this.physicsProps.buildStreetProps(this.streetGroup);
    this.collectibles.buildGems(this.roomGroup, this.streetGroup);
    this.companion = new StudioCompanion(this.roomGroup);
    this.interactiveObjects.push(this.companion.group);

    this.characterShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.15), new THREE.MeshBasicMaterial({
      map: shadowTexture, transparent: true, opacity: 0.5, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }));
    this.characterShadow.rotation.x = -Math.PI / 2; this.characterShadow.visible = false;
    scene.add(this.characterShadow);
    this.fadeOverlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
      color: 0x253b34, transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    }));
    this.fadeOverlay.renderOrder = 9999; this.fadeOverlay.visible = false; scene.add(this.fadeOverlay);
    this.zones = [...this.roomZones, ...this.streetZones];
    scene.add(this.roomGroup, this.streetGroup); this.activateRoom(); this.setQuality(quality);
  }

  activateRoom() {
    this.isOutdoor = false;
    this.weather.setWeather("clear");
    this.scene.background = new THREE.Color(STUDIO.background); this.scene.fog = new THREE.Fog(STUDIO.background, 35, 65);
    this.ambientLight.color.setHex(0xfff4df); this.ambientLight.intensity = 1.25;
    this.sunLight.color.setHex(0xffe3b1); this.sunLight.intensity = 2.4;
    this.sunLight.position.set(-9, 16, 8); this.sunLight.target.position.set(0, 0, 0);
    Object.assign(this.sunLight.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 0.5, far: 50 });
    this.sunLight.shadow.camera.updateProjectionMatrix(); this.sunLight.castShadow = true;
  }

  activateStreet() {
    this.isOutdoor = true;
    this.scene.background = new THREE.Color(STUDIO.background); this.scene.fog = new THREE.Fog(STUDIO.background, 35, 65);
    this.ambientLight.color.setHex(0xf2f2dc); this.ambientLight.intensity = 1.4;
    this.sunLight.color.setHex(0xffe8bf); this.sunLight.intensity = 2.5;
    this.sunLight.position.set(-15, 32, 12); this.sunLight.target.position.set(0, 0, -14);
    Object.assign(this.sunLight.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 0.5, far: 100 });
    this.sunLight.shadow.camera.updateProjectionMatrix(); this.sunLight.castShadow = true;
  }

  setWeather(type: WeatherType) {
    this.weather.setWeather(type);
    if (type === "rain") {
      this.scene.background = new THREE.Color(0xa1aea2);
      this.ambientLight.color.setHex(0xc6d4ce); this.ambientLight.intensity = 1.1;
      this.sunLight.color.setHex(0xe4eae4); this.sunLight.intensity = 1.4;
    } else if (this.isOutdoor) this.activateStreet();
    else this.activateRoom();
  }

  fadeToBlack(duration: number, onComplete: () => void) {
    this.fadeOverlay.visible = true;
    gsap.to(this.fadeOverlay.material, { opacity: 1, duration, onComplete });
  }
  fadeIn(duration: number, onComplete?: () => void) {
    gsap.to(this.fadeOverlay.material, { opacity: 0, duration, onComplete: () => {
      this.fadeOverlay.visible = false; onComplete?.();
    } });
  }
  updateFade(camera: THREE.Camera) {
    if (!this.fadeOverlay.visible) return;
    this.fadeOverlay.position.copy(camera.position);
    this.fadeOverlay.quaternion.copy(camera.quaternion); this.fadeOverlay.translateZ(-0.25);
  }
  updateCharacterShadow(x: number, z: number, y = 0) {
    this.characterShadow.position.set(x, 0.037, z);
    this.characterShadow.scale.setScalar(1 + Math.max(0, y) * 0.25);
    (this.characterShadow.material as THREE.MeshBasicMaterial).opacity = 0.5 / (1 + Math.max(0, y) * 1.6);
    this.characterShadow.visible = y >= 0;
  }
  setQuality(quality: RenderQuality) {
    this.quality = quality;
    this.island?.setQuality(quality);
    if (quality === "low") this.setWeather("clear");
  }
  updateRings(t: number, dt = 0.016, charPos?: THREE.Vector3, charVel?: THREE.Vector3, isSprinting = false) {
    const isStreet = this.isOutdoor;
    if (charPos && charVel) {
      this.physicsProps.update(charPos, charVel, isSprinting, dt, isStreet ? "street" : "room");
      this.collectibles.update(t, charPos, isStreet ? "street" : "room");
    }
    if (charPos) {
      this.companion.update(t, charPos, dt, isStreet);
      if (charVel) this.island.update(t, dt, charPos, charVel);
      if (isStreet) {
        this.sunLight.position.set(charPos.x - 15, 32, charPos.z + 12);
        this.sunLight.target.position.set(charPos.x, 0, charPos.z);
      }
    }
    if (isStreet && this.quality !== "low") this.weather.update(dt);
    if (charPos) (isStreet ? this.streetRings : this.roomRings).forEach(marker => {
      const dx = marker.position.x - charPos.x, dz = marker.position.z - charPos.z;
      (marker.material as THREE.MeshBasicMaterial).opacity = dx * dx + dz * dz < 12 ? 0.65 : 0.18;
    });
  }
  dispose() {
    this.island.onMessage = undefined; this.island.onProgress = undefined;
    this.campusDispose(); this.sunLight.shadow.dispose();
    this.collectibles.onCollectCallback = undefined;
    [this.roomGroup, this.streetGroup].forEach(group => { disposeObject(group); this.scene.remove(group); });
    // Fade, weather and the character shadow are scene-owned and released by Experience.
  }
}
