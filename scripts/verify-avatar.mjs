/** Verify the shipped compressed asset with the same loader/decoder as the browser. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

function unpack(bytes) {
  const jsonLength = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)), binary: bytes.subarray(28 + jsonLength) };
}
const original = await readFile(new URL('../public/models/avatar.glb', import.meta.url));
const runtime = await readFile(new URL('../public/models/avatar.meshopt.glb', import.meta.url));
const before = unpack(original), after = unpack(runtime);
await MeshoptDecoder.ready;
assert.equal(after.json.bufferViews.length, before.json.bufferViews.length);
// Every buffer view must decode byte-for-byte, including joints, weights and keyframes.
for (const [index, view] of after.json.bufferViews.entries()) {
  const sourceView = before.json.bufferViews[index];
  const expected = before.binary.subarray(sourceView.byteOffset ?? 0, (sourceView.byteOffset ?? 0) + sourceView.byteLength);
  const extension = view.extensions?.EXT_meshopt_compression;
  let actual;
  if (extension) {
    actual = new Uint8Array(view.byteLength);
    const encoded = after.binary.subarray(extension.byteOffset, extension.byteOffset + extension.byteLength);
    MeshoptDecoder.decodeGltfBuffer(actual, extension.count, extension.byteStride, encoded, extension.mode, extension.filter);
  } else actual = after.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  assert.ok(expected.equals(Buffer.from(actual)), `Buffer view ${index} changed`);
}
for (const key of ['accessors', 'nodes', 'meshes', 'skins', 'animations', 'materials', 'scenes']) {
  assert.deepEqual(after.json[key], before.json[key], `${key} changed`);
}
const start = performance.now();
const model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
  runtime.buffer.slice(runtime.byteOffset, runtime.byteOffset + runtime.byteLength), '',
);
let vertices = 0, triangles = 0, meshes = 0, materials = new Set();
model.scene.traverse(object => {
  if (!object.isMesh) return;
  meshes++;
  vertices += object.geometry.attributes.position.count;
  triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
  assert.ok(object.isSkinnedMesh, 'Expected an animated mesh');
  assert.equal(object.geometry.attributes.skinWeight.count, object.geometry.attributes.position.count);
});
assert.deepEqual(model.animations.map(clip => clip.name).sort(), ['idle', 'jump', 'run', 'walk']);
assert.ok(runtime.length < original.length * 0.7, 'Expected at least 30% download reduction');
assert.ok(runtime.length <= 1_600_000, 'Current rig exceeds its download budget');
console.log(JSON.stringify({ result: 'PASS: exact geometry, skeleton and animation data; browser loader decoded successfully', originalBytes: original.length, runtimeBytes: runtime.length, savedPercent: +(100 * (1 - runtime.length / original.length)).toFixed(1), meshes, materials: materials.size, vertices, triangles, localParseMilliseconds: +(performance.now() - start).toFixed(1) }, null, 2));
