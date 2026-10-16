/** Static review asset: clip the generated floor and project the approved front/rear references.
 * This creates a UV/material draft, not an auto-rigged or finished painted character.
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import sharp from 'sharp';
import { compressGLB } from './compress-glb.mjs';

const directory = new URL('../docs/design/character/', import.meta.url);
const bytes = await readFile(new URL('anshul-hunyuan-shape-10k.glb', directory));
const loaded = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
loaded.scene.updateMatrixWorld(true);
const floorY = -0.600;
const clipped = [], boundary = [];
function triangle(a, b, c) {
  if (new T.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).lengthSq() < 1e-24) return;
  clipped.push(...a.toArray(), ...b.toArray(), ...c.toArray());
}
loaded.scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  const { geometry } = mesh;
  const position = geometry.attributes.position;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const input = Array.from({ length: 3 }, (_, k) => new T.Vector3().fromBufferAttribute(position, geometry.index.getX(i + k)).applyMatrix4(mesh.matrixWorld));
    // The source fused an oversized backpack handle into a slab behind the neck.
    // Flatten that protrusion into the backpack top, preserving the actual head/neck.
    input.forEach(point => { if (point.z < -0.08 && point.y > 0.36) point.y = 0.36; });
    const polygon = [], crossings = [];
    for (let k = 0; k < 3; k++) {
      const a = input[k], b = input[(k + 1) % 3];
      if (a.y >= floorY) polygon.push(a);
      if ((a.y >= floorY) !== (b.y >= floorY)) {
        const point = a.clone().lerp(b, (floorY - a.y) / (b.y - a.y));
        point.y = floorY;
        polygon.push(point); crossings.push(point);
      }
    }
    for (let k = 1; k + 1 < polygon.length; k++) triangle(polygon[0], polygon[k], polygon[k + 1]);
    if (crossings.length === 2) boundary.push(crossings);
  }
});
// Close the cut shoe soles where the slab was welded to the generated feet.
const key = point => `${Math.round(point.x * 1e6)},${Math.round(point.z * 1e6)}`;
const graph = new Map();
for (const [a, b] of boundary) for (const [from, to] of [[a, b], [b, a]]) {
  const id = key(from), node = graph.get(id) ?? { point: from, adjacent: new Set() };
  node.adjacent.add(key(to)); graph.set(id, node);
}
if ([...graph.values()].some(node => node.adjacent.size !== 2)) throw new Error('Floor cut is not a set of simple closed contours; inspect manually');
const visited = new Set();
let caps = 0;
for (const start of graph.keys()) {
  if (visited.has(start)) continue;
  const loop = []; let current = start, previous;
  do {
    if (visited.has(current)) throw new Error('Unexpected intersecting floor boundary');
    visited.add(current); loop.push(graph.get(current).point);
    const next = [...graph.get(current).adjacent].find(id => id !== previous);
    previous = current; current = next;
  } while (current !== start);
  const faces = T.ShapeUtils.triangulateShape(loop.map(point => new T.Vector2(point.x, point.z)), []);
  for (const [i, j, k] of faces) {
    const a = loop[i], b = loop[j], c = loop[k];
    const normal = new T.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (normal.y > 0) triangle(a, c, b); else triangle(a, b, c);
  }
  caps++;
}
let geometry = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(clipped, 3));
geometry = mergeVertices(geometry, 1e-6);
geometry.computeVertexNormals(); geometry.computeBoundingBox();
const box = geometry.boundingBox;
const inputNames = ['anshul-model-reference-front-v1.png', 'anshul-model-reference-back-v1.png'];
const references = [];
for (const name of inputNames) {
  const input = await readFile(new URL(name, directory));
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Measure the subject framing; this reads pixels without painting or modifying the references.
  const mask = new Uint8Array(info.width * info.height);
  let top = info.height, bottom = 0, left = info.width, right = 0;
  for (let y = 20; y < info.height - 30; y++) for (let x = 30; x < info.width - 30; x++) {
    const offset = (y * info.width + x) * 3;
    const r = data[offset], g = data[offset + 1], b = data[offset + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 18 || (r + g + b) / 3 < 125) {
      mask[y * info.width + x] = 1;
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      left = Math.min(left, x); right = Math.max(right, x);
    }
  }
  // Move UVs that hit the grey reference background to a nearby subject pixel.
  // This changes mesh coordinates, not reference-image pixels. Erode by two pixels
  // so bilinear/mipmap filtering does not pull the background into silhouette seams.
  const nearest = new Int32Array(mask.length).fill(-1), queue = new Int32Array(mask.length);
  let head = 0, tail = 0;
  for (let y = 2; y < info.height - 2; y++) for (let x = 2; x < info.width - 2; x++) {
    const id = y * info.width + x;
    if (!mask[id] || !mask[id - 2] || !mask[id + 2] || !mask[id - 2 * info.width] || !mask[id + 2 * info.width]) continue;
    nearest[id] = id; queue[tail++] = id;
  }
  while (head < tail) {
    const id = queue[head++], x = id % info.width, y = Math.floor(id / info.width);
    for (const next of [x ? id - 1 : -1, x + 1 < info.width ? id + 1 : -1, y ? id - info.width : -1, y + 1 < info.height ? id + info.width : -1]) {
      if (next < 0 || nearest[next] !== -1) continue;
      nearest[next] = nearest[id]; queue[tail++] = next;
    }
  }
  references.push({ width: info.width, height: info.height, top, bottom, centerX: (left + right) / 2, nearest, mask, data });
}
const positions = geometry.attributes.position, normals = geometry.attributes.normal;
const temp = await mkdtemp(join(tmpdir(), 'portfolio-uv-'));
let atlas;
try {
  await writeFile(join(temp, 'mesh.json'), JSON.stringify({ positions: Array.from(positions.array), indices: Array.from(geometry.index.array) }));
  execFileSync(process.env.PORTFOLIO_UV_PYTHON ?? 'python3', [new URL('./unwrap-likeness.py', import.meta.url).pathname, join(temp, 'mesh.json'), join(temp, 'uv.json')]);
  atlas = JSON.parse(await readFile(join(temp, 'uv.json'), 'utf8'));
} finally { await rm(temp, { recursive: true, force: true }); }
// Bake reference projections into a real packed UV atlas. Per-texel sampling avoids
// interpolating long UV jumps across the grey gaps between limbs in the references.
const atlasWidth = 1024, atlasHeight = 1024;
const pixels = new Uint8Array(atlasWidth * atlasHeight * 3), painted = new Uint8Array(atlasWidth * atlasHeight);
function referenceColour(side, point) {
  const ref = references[side], scale = (ref.bottom - ref.top) / (box.max.y - box.min.y);
  let x = ref.centerX + (side ? -1 : 1) * point.x * scale;
  let y = ref.top + (box.max.y - point.y) * scale;
  if (side && point.z < -0.08 && point.y > 0.36) { x = 501; y = 311; } // Generated backpack handle: tan canvas trim.
  else if (side && point.z < 0.06 && point.y > 0.395 && point.y < 0.455) {
    // The generated rear image's high collar otherwise paints the mesh's neck green.
    const skin = references[0], pixel = (300 * skin.width + 512) * 3;
    return skin.data.subarray(pixel, pixel + 3);
  }
  const sample = T.MathUtils.clamp(Math.round(y), 0, ref.height - 1) * ref.width + T.MathUtils.clamp(Math.round(x), 0, ref.width - 1);
  const pixel = ref.mask[sample] ? sample : ref.nearest[sample];
  return ref.data.subarray(pixel * 3, pixel * 3 + 3);
}
const p = new T.Vector3(), n = new T.Vector3();
for (let i = 0; i < atlas.indices.length; i += 3) {
  const ids = atlas.indices.slice(i, i + 3), original = ids.map(id => atlas.mapping[id]);
  const uv = ids.map(id => [atlas.uvs[id * 2] * (atlasWidth - 1), atlas.uvs[id * 2 + 1] * (atlasHeight - 1)]);
  const [a, b, c] = uv;
  const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(denominator) < 1e-8) continue;
  const fromX = Math.max(0, Math.floor(Math.min(...uv.map(v => v[0])))), toX = Math.min(atlasWidth - 1, Math.ceil(Math.max(...uv.map(v => v[0]))));
  const fromY = Math.max(0, Math.floor(Math.min(...uv.map(v => v[1])))), toY = Math.min(atlasHeight - 1, Math.ceil(Math.max(...uv.map(v => v[1]))));
  for (let y = fromY; y <= toY; y++) for (let x = fromX; x <= toX; x++) {
    const w0 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / denominator;
    const w1 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / denominator;
    const w2 = 1 - w0 - w1;
    if (Math.min(w0, w1, w2) < -0.001) continue;
    p.set(0, 0, 0); n.set(0, 0, 0);
    for (const [k, weight] of [w0, w1, w2].entries()) {
      const id = original[k];
      p.x += positions.getX(id) * weight; p.y += positions.getY(id) * weight; p.z += positions.getZ(id) * weight;
      n.x += normals.getX(id) * weight; n.y += normals.getY(id) * weight; n.z += normals.getZ(id) * weight;
    }
    n.normalize();
    let frontWeight = T.MathUtils.smoothstep(n.z, -0.35, 0.35);
    if (p.z < -0.07 && p.y > 0) frontWeight = 0;
    const front = referenceColour(0, p), back = referenceColour(1, p), target = (y * atlasWidth + x) * 3;
    for (let channel = 0; channel < 3; channel++) pixels[target + channel] = Math.round(front[channel] * frontWeight + back[channel] * (1 - frontWeight));
    painted[y * atlasWidth + x] = 1;
  }
}
// Pad all UV charts from their own painted pixels so texture filtering has no empty gaps.
const queue = new Int32Array(painted.length); let head = 0, tail = 0;
for (let i = 0; i < painted.length; i++) if (painted[i]) queue[tail++] = i;
while (head < tail) {
  const id = queue[head++], x = id % atlasWidth, y = Math.floor(id / atlasWidth);
  for (const next of [x ? id - 1 : -1, x + 1 < atlasWidth ? id + 1 : -1, y ? id - atlasWidth : -1, y + 1 < atlasHeight ? id + atlasWidth : -1]) {
    if (next < 0 || painted[next]) continue;
    pixels.copyWithin(next * 3, id * 3, id * 3 + 3); painted[next] = 1; queue[tail++] = next;
  }
}
const textureInput = sharp(pixels, { raw: { width: atlasWidth, height: atlasHeight, channels: 3 } });
await textureInput.clone().png().toFile(new URL('anshul-colour-atlas-v1.png', directory).pathname);
const texture = await textureInput.webp({ quality: 92 }).toBuffer();
const finalPositions = new Float32Array(atlas.mapping.flatMap(id => [positions.getX(id), positions.getY(id), positions.getZ(id)]));
const finalNormals = new Float32Array(atlas.mapping.flatMap(id => [normals.getX(id), normals.getY(id), normals.getZ(id)]));
if (atlas.mapping.length >= 65536 || [...finalPositions, ...finalNormals, ...atlas.uvs].some(value => !Number.isFinite(value))) throw new Error('Invalid mesh attributes');
if (atlas.uvs.some(value => value < 0 || value > 1)) throw new Error('UV coordinates exceed the atlas');
const chunks = [], bufferViews = [], accessors = [];
let offset = 0;
const addBytes = (data, target) => {
  const bytes = Buffer.from(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength ?? data.length);
  const index = bufferViews.length;
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) });
  chunks.push(bytes, Buffer.alloc((4 - bytes.length % 4) % 4));
  offset += (bytes.length + 3) & ~3;
  return index;
};
const attribute = (array, type, componentType = 5126, bounds) => {
  const count = array.length / ({ VEC3: 3, VEC2: 2, SCALAR: 1 }[type]);
  const view = addBytes(array, type === 'SCALAR' ? 34963 : 34962);
  const index = accessors.length;
  accessors.push({ bufferView: view, componentType, count, type, ...bounds });
  return index;
};
const pos = attribute(finalPositions, 'VEC3', 5126, { min: box.min.toArray(), max: box.max.toArray() });
const normal = attribute(finalNormals, 'VEC3');
const primitives = [{ attributes: { POSITION: pos, NORMAL: normal, TEXCOORD_0: attribute(new Float32Array(atlas.uvs), 'VEC2') }, indices: attribute(new Uint16Array(atlas.indices), 'SCALAR', 5123), material: 0, mode: 4 }];
const images = [{ bufferView: addBytes(texture), mimeType: 'image/webp' }];
const json = {
  asset: { version: '2.0', generator: 'Portfolio static likeness review pipeline' },
  extensionsUsed: ['EXT_texture_webp'], extensionsRequired: ['EXT_texture_webp'],
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'AnshulLikenessStaticDraft' }],
  meshes: [{ primitives }], accessors, bufferViews, buffers: [{ byteLength: offset }], images,
  textures: images.map((_, source) => ({ sampler: 0, extensions: { EXT_texture_webp: { source } } })),
  samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
  materials: [{ name: 'Baked reference colour draft', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.95 } }],
  extras: { stage: 'static camera-projection texture draft; no rig or animation', floorCutY: floorY, capContours: caps, sourceTriangles: 10000, referenceFrames: references.map(({ top, bottom, centerX }) => ({ top, bottom, centerX })) },
};
const text = Buffer.from(JSON.stringify(json)), jsonData = Buffer.alloc((text.length + 3) & ~3, 0x20); text.copy(jsonData);
const binary = Buffer.concat(chunks), output = Buffer.alloc(28 + jsonData.length + binary.length);
output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
output.writeUInt32LE(jsonData.length, 12); output.writeUInt32LE(0x4e4f534a, 16); jsonData.copy(output, 20);
output.writeUInt32LE(binary.length, 20 + jsonData.length); output.writeUInt32LE(0x004e4942, 24 + jsonData.length); binary.copy(output, 28 + jsonData.length);
const compressed = await compressGLB(output);
await writeFile(new URL('anshul-colour-draft-v1.glb', directory), compressed.data);
// OBJ + PNG companion for riggers that do not accept GLB/WebP or Meshopt.
const obj = ['mtllib anshul-colour-draft-v1.mtl', 'o AnshulColourDraft', 'usemtl AnshulColourDraft'];
for (let i = 0; i < atlas.mapping.length; i++) obj.push(`v ${Array.from(finalPositions.subarray(i * 3, i * 3 + 3)).join(' ')}`);
for (let i = 0; i < atlas.mapping.length; i++) obj.push(`vt ${atlas.uvs[i * 2]} ${1 - atlas.uvs[i * 2 + 1]}`);
for (let i = 0; i < atlas.mapping.length; i++) obj.push(`vn ${Array.from(finalNormals.subarray(i * 3, i * 3 + 3)).join(' ')}`);
for (let i = 0; i < atlas.indices.length; i += 3) obj.push('f ' + atlas.indices.slice(i, i + 3).map(id => `${id + 1}/${id + 1}/${id + 1}`).join(' '));
await writeFile(new URL('anshul-colour-draft-v1.obj', directory), obj.join('\n') + '\n');
await writeFile(new URL('anshul-colour-draft-v1.mtl', directory), 'newmtl AnshulColourDraft\nKa 1 1 1\nKd 1 1 1\nKs 0 0 0\nNs 1\nd 1\nillum 2\nmap_Kd anshul-colour-atlas-v1.png\n');
const stats = { bytes: compressed.data.length, triangles: geometry.index.count / 3, vertices: atlas.mapping.length, materials: 1, capContours: caps, bounds: { min: box.min, max: box.max }, referenceFrames: json.extras.referenceFrames, textureBytes: texture.length };
await writeFile(new URL('anshul-colour-draft-v1.json', directory), JSON.stringify(stats, null, 2));
console.log(JSON.stringify(stats, null, 2));
