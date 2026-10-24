import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Call once on authored, static Studio scenery, before adding movable props. */
export function batchStudio(root: THREE.Group, cellSize = 0) {
  const buckets = new Map<string, { owner: THREE.Object3D; meshes: THREE.Mesh<THREE.BufferGeometry, THREE.Material>[] }>();
  root.updateWorldMatrix(true, true);
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh || object instanceof THREE.InstancedMesh ||
      object.children.length || object.userData.interactive || Array.isArray(object.material) || object.material.transparent ||
      Object.keys(object.geometry.morphAttributes).length) return;
    let owner: THREE.Object3D = root;
    for (let ancestor: THREE.Object3D | null = object; ancestor && ancestor !== root; ancestor = ancestor.parent) {
      if (!ancestor.visible || ancestor.userData.noBatch) return;
      if (ancestor !== object && ancestor.userData.interactive && owner === root) owner = ancestor;
    }
    // Mirrored transforms need winding changes; leave them authored rather than silently flipping faces.
    if (object.matrixWorld.determinant() <= 0) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    const attributes = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b))
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`).join("|");
    // Keep outdoor batches local so off-screen scenery can be culled.
    const cell = cellSize && owner === root ? `${Math.floor(object.matrixWorld.elements[12] / cellSize)},${Math.floor(object.matrixWorld.elements[14] / cellSize)}` : "";
    const key = [cell, owner.uuid, object.material.uuid, object.castShadow, object.receiveShadow, object.renderOrder,
      object.layers.mask, object.geometry.index !== null, attributes].join("/");
    let bucket = buckets.get(key);
    if (!bucket) { bucket = { owner, meshes: [] }; buckets.set(key, bucket); }
    bucket.meshes.push(object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>);
  });

  const retired = new Set<THREE.BufferGeometry>();
  for (const { owner, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const inverse = owner.matrixWorld.clone().invert();
    const relative = (mesh: THREE.Mesh) => new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
    const configure = (batch: THREE.Mesh, source: THREE.Mesh) => {
      batch.name = "Studio static batch";
      batch.castShadow = source.castShadow; batch.receiveShadow = source.receiveShadow;
      batch.renderOrder = source.renderOrder; batch.layers.mask = source.layers.mask;
      owner.add(batch);
    };
    const remove = (mesh: THREE.Mesh) => { retired.add(mesh.geometry); mesh.removeFromParent(); };
    const repeated = new Map<THREE.BufferGeometry, typeof meshes>();
    meshes.forEach(mesh => {
      const matches = repeated.get(mesh.geometry) ?? [];
      matches.push(mesh); repeated.set(mesh.geometry, matches);
    });
    const instanced = new Set<THREE.Mesh>();
    for (const [geometry, matches] of repeated) {
      if (matches.length < 4) continue;
      const batch = new THREE.InstancedMesh(geometry, matches[0].material, matches.length);
      matches.forEach((mesh, index) => { batch.setMatrixAt(index, relative(mesh)); instanced.add(mesh); remove(mesh); });
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingBox(); batch.computeBoundingSphere();
      configure(batch, matches[0]);
    }
    const remaining = meshes.filter(mesh => !instanced.has(mesh));
    if (remaining.length < 2) continue;
    const baked = remaining.map(mesh => mesh.geometry.clone().applyMatrix4(relative(mesh)));
    const merged = mergeGeometries(baked, false);
    baked.forEach(geometry => geometry.dispose());
    if (!merged) continue; // Keep the originals if an unexpected attribute layout is incompatible.
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    configure(new THREE.Mesh(merged, remaining[0].material), remaining[0]);
    remaining.forEach(remove);
  }
  // A shared geometry may still be used by an instance batch or a preserved interactive mesh.
  root.traverse(object => { if (object instanceof THREE.Mesh) retired.delete(object.geometry); });
  retired.forEach(geometry => geometry.dispose());
}
