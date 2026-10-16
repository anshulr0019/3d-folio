/** Lossless EXT_meshopt_compression for exported GLBs, including skin and animation data.
 * Spec: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_meshopt_compression
 */
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const EXTENSION = 'EXT_meshopt_compression';
const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const align4 = size => (size + 3) & ~3;

export async function compressGLB(input) {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const source = Buffer.from(input);
  if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2 || source.readUInt32LE(8) !== source.length) {
    throw new Error('Expected a complete GLB 2.0 file');
  }
  const jsonLength = source.readUInt32LE(12);
  if (source.readUInt32LE(16) !== 0x4e4f534a) throw new Error('GLB has no JSON chunk');
  const json = JSON.parse(source.toString('utf8', 20, 20 + jsonLength));
  const binaryHeader = 20 + jsonLength;
  if (source.readUInt32LE(binaryHeader + 4) !== 0x004e4942) throw new Error('GLB has no binary chunk');
  const binary = source.subarray(binaryHeader + 8, binaryHeader + 8 + source.readUInt32LE(binaryHeader));
  if (json.buffers.length !== 1 || json.buffers[0].uri || json.extensionsUsed?.includes(EXTENSION)) {
    throw new Error('Expected an uncompressed GLB with one embedded buffer');
  }
  const indexViews = new Map();
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
    if (primitive.indices !== undefined) {
      const accessor = json.accessors[primitive.indices];
      indexViews.set(accessor.bufferView, accessor);
    }
  }
  const imageViews = new Set((json.images ?? []).map(image => image.bufferView));
  const chunks = [];
  let offset = 0;
  let compressedViews = 0;
  const append = bytes => {
    const start = offset;
    chunks.push(Buffer.from(bytes), Buffer.alloc(align4(bytes.length) - bytes.length));
    offset += align4(bytes.length);
    return start;
  };
  for (const [viewIndex, view] of json.bufferViews.entries()) {
    if (view.buffer !== 0) throw new Error('Unexpected external buffer');
    const raw = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    if (raw.length !== view.byteLength) throw new Error('Truncated buffer view');
    const accessor = json.accessors?.find(item => item.bufferView === viewIndex);
    const index = indexViews.get(viewIndex);
    // INDICES retains exact index order; triangle encoding can rotate triangle corners.
    const mode = index ? 'INDICES' : 'ATTRIBUTES';
    const packedStride = accessor && COMPONENT_BYTES[accessor.componentType] * COMPONENTS[accessor.type];
    const stride = index ? COMPONENT_BYTES[index.componentType] : view.byteStride || (packedStride >= 4 && packedStride % 4 === 0 ? packedStride : 4);
    const canCompress = !imageViews.has(viewIndex) && raw.length % stride === 0 &&
      (index ? (stride === 2 || stride === 4) : stride >= 4 && stride <= 256 && stride % 4 === 0);
    if (canCompress) {
      const count = raw.length / stride;
      const encoded = MeshoptEncoder.encodeGltfBuffer(raw, count, stride, mode);
      // Avoid adding extension overhead to small or incompressible views.
      if (encoded.length + 160 < raw.length) {
        const decoded = new Uint8Array(raw.length);
        MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode);
        if (!raw.equals(Buffer.from(decoded))) throw new Error(`Lossless round-trip failed for view ${viewIndex}`);
        const byteOffset = append(encoded);
        view.buffer = 1; // Virtual fallback; no duplicate uncompressed download.
        view.extensions = { ...view.extensions, [EXTENSION]: { buffer: 0, byteOffset, byteLength: encoded.length, byteStride: stride, count, mode } };
        compressedViews++;
        continue;
      }
    }
    view.byteOffset = append(raw);
  }
  if (!compressedViews) return { data: source, compressedViews: 0, sourceBytes: source.length };
  json.buffers = [
    { byteLength: offset },
    { byteLength: binary.length, extensions: { [EXTENSION]: { fallback: true } } },
  ];
  json.extensionsUsed = [...new Set([...(json.extensionsUsed ?? []), EXTENSION])];
  json.extensionsRequired = [...new Set([...(json.extensionsRequired ?? []), EXTENSION])];
  const text = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(align4(text.length), 0x20);
  text.copy(jsonChunk);
  const binChunk = Buffer.concat(chunks);
  const output = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonChunk.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(output, 20);
  const binOffset = 20 + jsonChunk.length;
  output.writeUInt32LE(binChunk.length, binOffset);
  output.writeUInt32LE(0x004e4942, binOffset + 4);
  binChunk.copy(output, binOffset + 8);
  return { data: output, compressedViews, sourceBytes: source.length };
}
