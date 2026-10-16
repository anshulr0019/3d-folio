/** Rebuild the shared, indexed rig and web textures. Original FBX/PNG sources are retained. */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AnimationMixer, Box3, Group, MeshStandardMaterial, TextureLoader, Texture, Vector3, VectorKeyframeTrack } from 'three';
import sharp from 'sharp';
import { compressGLB } from './compress-glb.mjs';

globalThis.window = { URL, innerWidth: 1, innerHeight: 1 };
TextureLoader.prototype.load = function () { return new Texture(); };
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const loader = new FBXLoader();
const clips = [];
let avatar;
let inputBytes = 0;
const referenceSpeeds = {};
for (const [file, name] of [['Idle', 'idle'], ['Walking', 'walk'], ['Running', 'run'], ['Jumping', 'jump']]) {
  const bytes = await readFile(new URL(`../public/models/${file}.fbx`, import.meta.url));
  inputBytes += bytes.length;
  const model = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  if (!avatar) avatar = model;
  const clip = model.animations[0];
  if (!clip) throw new Error(`${file} has no animation`);
  clip.name = name;
  // Only the hips own root travel. Preserve all child translations.
  const root = clip.tracks.find(track => track.name === 'mixamorigHips.position');
  if (!root) throw new Error(`${file} has no hips track`);
  const values = root.values;
  referenceSpeeds[name] = Math.hypot(values.at(-3) - values[0], values.at(-1) - values[2]) / clip.duration;
  for (let i = 0; i < values.length; i += 3) {
    values[i] = values[0];
    values[i + 2] = values[2];
    // The controller owns jump height; the baked foot correction below keeps the pose grounded.
    if (name === 'jump') values[i + 1] = values[1];
  }
  clip.optimize();
  clips.push(clip);
}
let originalVertices = 0;
let indexedVertices = 0;
avatar.traverse(object => {
  if (!object.isMesh) return;
  originalVertices += object.geometry.attributes.position.count;
  // Merge only vertices with matching normals, UVs, joints AND weights: no silhouette/rig reduction.
  const original = object.geometry;
  object.geometry = mergeVertices(original, 1e-6);
  original.dispose();
  indexedVertices += object.geometry.attributes.position.count;
  object.material = new MeshStandardMaterial({ roughness: 0.8 });
});
const grounded = new Group();
grounded.name = 'AvatarGround';
grounded.add(avatar);
const mixer = new AnimationMixer(grounded);
const bounds = new Box3();
let height;
for (const clip of clips) {
  mixer.stopAllAction();
  const action = mixer.clipAction(clip).play();
  const times = [];
  const offsets = [];
  const samples = Math.ceil(clip.duration * 60);
  for (let i = 0; i <= samples; i++) {
    const time = Math.min(clip.duration - 1e-6, i * clip.duration / samples);
    action.time = time;
    mixer.update(0);
    grounded.updateMatrixWorld(true);
    bounds.setFromObject(avatar, true);
    height ??= bounds.getSize(new Vector3()).y;
    times.push(i * clip.duration / samples);
    offsets.push(0, -bounds.min.y, 0);
  }
  // Grounding is sampled offline, not an expensive skinned-vertex scan in the render loop.
  clip.tracks.push(new VectorKeyframeTrack('AvatarGround.position', times, offsets));
}
mixer.stopAllAction();
// Persist calibrated stride speed in source units; runtime applies the normalized avatar scale.
grounded.userData.locomotion = { walk: referenceSpeeds.walk, run: referenceSpeeds.run };
const output = await new GLTFExporter().parseAsync(grounded, { binary: true, animations: clips });
const target = new URL('../public/models/avatar.glb', import.meta.url);
await writeFile(target, Buffer.from(output));
const compressed = await compressGLB(output);
const runtimeTarget = new URL('../public/models/avatar.meshopt.glb', import.meta.url);
await writeFile(runtimeTarget, compressed.data);
const textureSizes = {};
for (const [input, outputName, width, options] of [
  ['diffuse', 'avatar-color', 1024, { quality: 88 }],
  ['normal', 'avatar-normal', 1024, { lossless: true }],
  ['roughness', 'avatar-roughness', 512, { quality: 85 }],
]) {
  const dest = new URL(`../public/textures/character/${outputName}.webp`, import.meta.url);
  await sharp(new URL(`../public/textures/character/texture_${input}.png`, import.meta.url).pathname)
    .resize(width, width, { fit: 'inside', withoutEnlargement: true }).webp(options).toFile(dest.pathname);
  textureSizes[outputName] = (await stat(dest)).size;
}
console.log(JSON.stringify({ sourceBytes: inputBytes, indexedBytes: (await stat(target)).size, runtimeBytes: compressed.data.length, compressedViews: compressed.compressedViews, originalVertices, indexedVertices, triangles: originalVertices / 3, referenceSpeeds, height, textureSizes }, null, 2));
