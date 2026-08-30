import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function CharacterShowcaseCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── Optimized Lighting (No expensive PointLights) ──
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 2.8);
    rimLight.position.set(-3, 4, -4);
    scene.add(rimLight);

    // ── Glowing Platform ──
    const platformGroup = new THREE.Group();

    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.35, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
    );
    baseMesh.position.y = -0.06;
    platformGroup.add(baseMesh);

    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.03, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x818cf8 })
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    platformGroup.add(ringMesh);

    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    platformGroup.add(shadow);

    scene.add(platformGroup);

    // ── Character Model Loading ──
    let modelGroup: THREE.Group | null = null;
    let mixer: THREE.AnimationMixer | null = null;

    const loader = new GLTFLoader();
    loader.load(
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

        const targetHeight = 2.1;
        const scaleFactor = targetHeight / (size.y || 2.1);
        wrapper.scale.setScalar(scaleFactor);

        wrapper.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
          }
        });

        modelGroup = wrapper;
        scene.add(modelGroup);

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          const idleAnim = gltf.animations.find((a) => a.name.toLowerCase().includes("idle")) || gltf.animations[0];
          mixer.clipAction(idleAnim).play();
        }
      },
      undefined,
      (err) => console.error("Error loading showcase character model:", err)
    );

    // ── Mouse Interactivity ──
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    window.addEventListener("mousemove", onMouseMove);

    // ── Render Loop ──
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (mixer) {
        mixer.update(delta);
      }

      if (modelGroup) {
        // Slow subtle rotation & breathing bob
        modelGroup.rotation.y = time * 0.45 + mouseX * 0.4;
        modelGroup.position.y = Math.sin(time * 2) * 0.03;
      }

      // Tilt camera slightly with mouse
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouseX * 0.3, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.4 + mouseY * 0.2, 0.05);
      camera.lookAt(0, 1.0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full min-h-[380px] md:min-h-[480px]" />;
}
