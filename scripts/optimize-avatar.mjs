/** Rebuild the optimized avatar from the original FBX sources. Originals are retained. */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { MeshStandardMaterial, TextureLoader, Texture } from 'three';

// Export geometry and animation only. Runtime applies the shared character textures.
globalThis.window = { URL, innerWidth: 1, innerHeight: 1 };
TextureLoader.prototype.load = function () { return new Texture(); };
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const loader = new FBXLoader();
const clips = [];
let avatar;
let inputBytes = 0;
for (const [file, name] of [['Idle', 'idle'], ['Walking', 'walk'], ['Running', 'run'], ['Jumping', 'jump']]) {
  const bytes = await readFile(new URL(`../public/models/${file}.fbx`, import.meta.url));
  inputBytes += bytes.length;
  const model = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  if (!avatar) avatar = model;
  const clip = model.animations[0];
  if (!clip) throw new Error(`${file} has no animation`);
  clip.name = name;
  clips.push(clip);
}
avatar.traverse(object => {
  if (object.isMesh) object.material = new MeshStandardMaterial({ roughness: 0.7 });
});
const output = await new GLTFExporter().parseAsync(avatar, { binary: true, animations: clips });
const target = new URL('../public/models/avatar.glb', import.meta.url);
await writeFile(target, Buffer.from(output));
console.log(JSON.stringify({ sourceBytes: inputBytes, optimizedBytes: (await stat(target)).size, animations: clips.map(clip => clip.name) }, null, 2));
