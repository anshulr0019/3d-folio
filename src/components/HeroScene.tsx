import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { createSignMaterial } from "../portfolio/signMaterial";

type Point = [number, number, number];

/** A deliberately small, self-contained scene: no model or texture downloads. */
function buildWorld(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const material = (color: string, roughness = 0.8) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness });
    materials.add(result);
    return result;
  };
  const colors = {
    grass: material("#a1b982"), earth: material("#63805a"), edge: material("#d7dfbd"),
    plaster: material("#eee6ce"), roof: material("#42664d"), glass: material("#658b7e", 0.3),
    road: material("#bfc6b2"), paint: material("#faf4d9"), wood: material("#a0845f"),
    leaf: material("#6e915d"), darkLeaf: material("#436b4e"), lime: material("#d5fa74"),
    ochre: material("#dbb979"), clay: material("#bd8f7a"), ink: material("#2b483a"),
  };
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, surface: THREE.Material, position: Point) => {
    geometries.add(geometry);
    const item = new THREE.Mesh(geometry, surface);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const box = (parent: THREE.Object3D, size: Point, position: Point, surface: THREE.Material, radius = 0.035) =>
    mesh(parent, new RoundedBoxGeometry(...size, 2, radius), surface, position);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);
  const sphere = (parent: THREE.Object3D, position: Point, scale: Point, surface: THREE.Material) => {
    const item = mesh(parent, sphereGeometry, surface, position);
    item.scale.set(...scale);
    return item;
  };

  const world = new THREE.Group();
  world.rotation.y = -0.24;
  scene.add(world);
  box(world, [4.3, 0.36, 3.6], [0, -0.2, 0], colors.earth, 0.16);
  box(world, [4.36, 0.13, 3.66], [0, 0.02, 0], colors.edge, 0.065);
  box(world, [4.22, 0.12, 3.52], [0, 0.12, 0], colors.grass, 0.06);
  box(world, [0.89, 0.025, 3.5], [0.2, 0.193, 0], colors.edge, 0.01);
  box(world, [0.68, 0.028, 3.5], [0.2, 0.209, 0], colors.road, 0.01);
  for (let z = -1.45; z < 1.6; z += 0.39) {
    box(world, [0.035, 0.012, 0.18], [0.2, 0.23, z], colors.paint, 0.005);
  }
  for (let x = -0.05; x < 0.5; x += 0.11) {
    box(world, [0.065, 0.014, 0.3], [x, 0.242, 0.93], colors.paint, 0.004);
  }

  // The studio: glazed facade, overhanging roof, skylight, and front steps.
  const studio = new THREE.Group();
  studio.position.set(-1.05, 0.2, -0.6);
  world.add(studio);
  box(studio, [1.4, 0.12, 1.35], [0, 0.06, 0], colors.edge);
  box(studio, [1.26, 0.96, 1.12], [0, 0.55, 0], colors.plaster, 0.055);
  box(studio, [1.01, 0.6, 0.025], [0, 0.49, 0.567], colors.glass, 0.008);
  for (const x of [-0.5, -0.17, 0.17, 0.5]) {
    box(studio, [0.035, 0.64, 0.045], [x, 0.49, 0.59], colors.roof, 0.007);
  }
  box(studio, [0.04, 0.62, 0.64], [0.636, 0.52, 0], colors.glass, 0.008);
  box(studio, [1.46, 0.16, 1.34], [0, 1.09, 0], colors.roof, 0.045);
  box(studio, [0.73, 0.06, 0.67], [0, 1.2, -0.08], colors.edge, 0.02);
  box(studio, [0.61, 0.045, 0.55], [0, 1.25, -0.08], colors.glass, 0.02);
  box(studio, [0.82, 0.08, 0.22], [0.03, 0.05, 0.79], colors.plaster, 0.02);

  const signMaterial = createSignMaterial(["THE STUDIO"], [0.96, 0.24], "#f3f1d9", "#42664d");
  if (signMaterial.map) textures.add(signMaterial.map);
  materials.add(signMaterial);
  mesh(studio, new THREE.PlaneGeometry(0.96, 0.24), signMaterial, [0, 0.91, 0.572]);

  // A second creative space and a little arcade on the other side of the street.
  box(world, [1.04, 0.65, 0.94], [1.29, 0.53, -0.85], colors.plaster, 0.045);
  box(world, [1.16, 0.13, 1.06], [1.29, 0.92, -0.85], colors.ochre, 0.045);
  box(world, [0.73, 0.36, 0.024], [1.29, 0.53, -0.37], colors.glass, 0.015);
  box(world, [0.035, 0.38, 0.04], [1.29, 0.53, -0.35], colors.plaster);
  box(world, [0.88, 0.53, 0.78], [1.36, 0.465, 0.75], colors.clay, 0.05);
  box(world, [1.02, 0.11, 0.92], [1.36, 0.785, 0.75], colors.plaster, 0.04);
  box(world, [0.47, 0.36, 0.03], [1.36, 0.42, 1.15], colors.ink, 0.03);
  box(world, [0.52, 0.085, 0.14], [1.36, 0.65, 1.21], colors.ochre, 0.025);

  const tree = (x: number, z: number, size = 1) => {
    const group = new THREE.Group();
    group.position.set(x, 0.2, z);
    group.scale.setScalar(size);
    world.add(group);
    mesh(group, new THREE.CylinderGeometry(0.04, 0.06, 0.45, 8), colors.wood, [0, 0.22, 0]);
    sphere(group, [0, 0.6, 0], [0.29, 0.38, 0.28], colors.darkLeaf);
    sphere(group, [-0.12, 0.67, 0.03], [0.21, 0.26, 0.22], colors.leaf);
  };
  tree(-1.6, 0.95, 1.15);
  tree(-0.74, 1.24, 0.8);
  tree(1.63, -0.05, 0.8);
  tree(-1.75, -1.28, 0.65);
  for (const [x, z] of [[-1.91, 0.38], [-1.82, 1.45], [0.93, -1.45], [1.8, 1.4]]) {
    sphere(world, [x, 0.28, z], [0.17, 0.12, 0.14], colors.leaf);
  }

  // Bench and a tiny visitor establish scale.
  box(world, [0.52, 0.055, 0.19], [-0.93, 0.4, 0.63], colors.wood, 0.015);
  box(world, [0.52, 0.19, 0.045], [-0.93, 0.5, 0.55], colors.wood, 0.015);
  for (const x of [-1.11, -0.75]) box(world, [0.045, 0.18, 0.12], [x, 0.29, 0.63], colors.ink, 0.01);
  const visitor = new THREE.Group();
  visitor.position.set(0.2, 0.23, 0.44);
  world.add(visitor);
  box(visitor, [0.13, 0.2, 0.12], [0, 0.18, 0], colors.ink, 0.04);
  sphere(visitor, [0, 0.34, 0], [0.082, 0.085, 0.082], colors.ochre);
  for (const x of [-0.04, 0.04]) box(visitor, [0.048, 0.11, 0.06], [x, 0.055, 0], colors.roof, 0.014);

  const marker = new THREE.Group();
  marker.position.set(-1.05, 1.85, -0.6);
  world.add(marker);
  mesh(marker, new THREE.OctahedronGeometry(0.17), colors.lime, [0, 0, 0]);
  const markerRing = mesh(marker, new THREE.TorusGeometry(0.24, 0.011, 6, 40), colors.ochre, [0, -0.27, 0]);
  markerRing.rotation.x = Math.PI / 2;

  const orbit = new THREE.Group();
  orbit.rotation.set(0.1, 0, -0.16);
  scene.add(orbit);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: "#9bab85", transparent: true, opacity: 0.4 });
  materials.add(orbitMaterial);
  const ring = mesh(orbit, new THREE.TorusGeometry(2.76, 0.008, 4, 100), orbitMaterial, [0, 0.15, 0]);
  ring.rotation.x = Math.PI / 2;
  ring.scale.y = 0.82;
  const satellite = sphere(orbit, [2.76, 0.15, 0], [0.075, 0.075, 0.075], colors.ochre);

  return {
    world, marker, orbit, satellite,
    dispose: () => {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(surface => surface.dispose());
      textures.forEach(texture => texture.dispose());
    },
  };
}

interface HeroSceneProps {
  running: boolean;
  onReady: () => void;
  onError: () => void;
}

export default function HeroScene({ running, onReady, onError }: HeroSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(running);
  const syncPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    runningRef.current = running;
    syncPlaybackRef.current?.();
  }, [running]);

  useEffect(() => {
    const host = hostRef.current;
    const hero = host?.closest<HTMLElement>(".folio-hero");
    const preview = host?.closest<HTMLElement>(".hero-world-preview");
    if (!host || !hero || !preview) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia("(pointer: coarse)").matches ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.8, 3.8, 3.8, -3.8, 0.1, 40);
    camera.position.set(6.4, 6.5, 8.7);
    camera.lookAt(0, 0.4, 0);
    scene.add(new THREE.HemisphereLight("#fff9e9", "#80956f", 2.8));
    const sun = new THREE.DirectionalLight("#fff3d5", 3.2);
    sun.position.set(-3, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    scene.add(sun);
    const rim = new THREE.DirectionalLight("#edf7d5", 1.6);
    rim.position.set(4, 3, -5);
    scene.add(rim);
    const assets = buildWorld(scene);
    let frame = 0;
    let visible = true;
    let lost = false;
    let previousTime = 0;
    let elapsed = 0;
    let scrollTarget = 0;
    let scroll = 0;
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const canAnimate = () => runningRef.current && visible && !document.hidden && !lost;

    const render = () => { if (!lost) renderer.render(scene, camera); };
    const animate = (time: number) => {
      frame = 0;
      if (!canAnimate()) return;
      frame = requestAnimationFrame(animate);
      // A decorative preview should not render at 120/144 Hz on fast displays.
      if (previousTime && time - previousTime < 1000 / 60 - 0.5) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      elapsed += delta;
      const ease = 1 - Math.exp(-delta * 5);
      pointer.lerp(pointerTarget, ease);
      scroll = THREE.MathUtils.lerp(scroll, scrollTarget, ease);
      assets.world.rotation.y = -0.24 + scroll * 0.85 + pointer.x * 0.14 + Math.sin(elapsed * 0.35) * 0.05;
      assets.world.rotation.x = pointer.y * 0.045 + scroll * 0.08;
      assets.world.position.y = Math.sin(elapsed * 1.1) * 0.065 + scroll * 0.12;
      assets.marker.position.y = 1.85 + Math.sin(elapsed * 1.7) * 0.09;
      assets.marker.rotation.y = elapsed * 0.55;
      assets.orbit.rotation.y = -scroll * 0.3;
      assets.satellite.position.set(Math.cos(elapsed * 0.22) * 2.76, 0.15, Math.sin(elapsed * 0.22) * 2.26);
      camera.position.set(6.4 + pointer.x * 0.3, 6.5 + scroll * 1.2 - pointer.y * 0.35, 8.7);
      camera.lookAt(0, 0.4, 0);
      render();
    };
    const syncPlayback = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      if (canAnimate()) frame = requestAnimationFrame(animate);
    };
    syncPlaybackRef.current = syncPlayback;

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      const halfHeight = Math.max(2.65, 3.35 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    intersectionObserver.observe(host);

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !runningRef.current) return;
      const rect = preview.getBoundingClientRect();
      pointerTarget.set(
        THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
        THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1),
      );
    };
    const onPointerLeave = () => pointerTarget.set(0, 0);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      syncPlayback();
      onError();
    };
    preview.addEventListener("pointermove", onPointerMove, { passive: true });
    preview.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", syncPlayback);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: preview,
      start: "top center",
      end: "bottom top",
      onUpdate: self => { scrollTarget = self.progress; },
      onRefresh: self => { scrollTarget = self.progress; },
    });

    resize();
    onReady();
    syncPlayback();

    return () => {
      syncPlaybackRef.current = null;
      cancelAnimationFrame(frame);
      trigger.kill();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      preview.removeEventListener("pointermove", onPointerMove);
      preview.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", syncPlayback);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      assets.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [onReady, onError]);

  return <div ref={hostRef} className="hero-scene-canvas" />;
}
