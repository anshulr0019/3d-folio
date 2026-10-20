import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const document = { createElement() {
  const commands = [];
  const ctx = {
    fillRect(...args) { commands.push(['rect',this.fillStyle,...args]); },
    fillText(...args) { commands.push(['text',this.font,this.fillStyle,...args]); },
    measureText(text) { return { width: text.length * Number.parseFloat(this.font.split(' ')[1]) * 0.56 }; },
  };
  return { commands, getContext: () => ctx };
} };
function load(file, overrides = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,document,require: name => name in overrides ? overrides[name] : require(name)},{filename:file});
  return module.exports;
}
const { batchStudio } = load('../src/portfolio/batchStudio.ts', {three:THREE,'three/examples/jsm/utils/BufferGeometryUtils.js':{mergeGeometries}});
const { createSignMaterial } = load('../src/portfolio/signMaterial.ts', {three:THREE});
// Wide plaques, portrait posters and floor directions must preserve glyph proportions.
for (const size of [[4.45,1.16],[1.8,2.3],[3.8,0.8],[1.2,0.25]]) {
  const material = createSignMaterial(['A LONG STUDIO LABEL','SECOND LINE'],size);
  const {width,height,commands}=material.map.image;
  assert.ok(Math.abs(width-height*size[0]/size[1]) <= 1+size[0]/size[1]);
  assert.ok(Math.max(width,height)<=1536,'Sign textures must stay within their memory cap');
  assert.ok(commands.filter(c=>c[0]==='text').every(c=>c.length===6),'Never horizontally compress text with fillText(maxWidth)');
  material.map.dispose();material.dispose();
}
const { buildStudio } = load('../src/portfolio/Studio.ts',{three:THREE,'three/examples/jsm/geometries/RoundedBoxGeometry.js':{RoundedBoxGeometry},'./batchStudio':{batchStudio},'./signMaterial':{createSignMaterial}});
const { disposeObject } = load('../src/portfolio/dispose.ts',{three:THREE,gsap:{killTweensOf(){}}});
function make(batchStatic) {
  const group = new THREE.Group();
  // Root transforms must survive world/local geometry baking too.
  group.position.set(3,1,-2); group.rotation.y=0.31; group.scale.setScalar(1.2);
  const data = buildStudio(group,new THREE.Texture(),{batchStatic});
  group.updateWorldMatrix(true,true);
  return {group,...data};
}
const original=make(false), optimized=make(true);
const signTextures=new Set();
optimized.group.traverse(o=>{if(o.material?.map?.name.startsWith('Sign:'))signTextures.add(o.material.map);});
const signPixels=[...signTextures].reduce((sum,t)=>sum+t.image.width*t.image.height,0);
function stats(group) {
  const geometries = new Set(), buffers = new Set();
  let meshes=0, instances=0, triangles=0, bytes=0, unsharedBytes=0;
  group.traverse(object=>{
    if(!object.isMesh)return;
    meshes++; const count=object.isInstancedMesh?object.count:1;
    if(object.isInstancedMesh){instances+=count;bytes+=object.instanceMatrix.array.byteLength;}
    triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3*count;
    for(const a of [...Object.values(object.geometry.attributes),object.geometry.index].filter(Boolean))unsharedBytes+=a.array.byteLength;
    geometries.add(object.geometry);
  });
  for(const g of geometries) {
    for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))if(!buffers.has(a.array.buffer)){bytes+=a.array.buffer.byteLength;buffers.add(a.array.buffer);}
    assert.ok(g.attributes.position.array.every(Number.isFinite));
  }
  return {meshes,instances,triangles,geometries:geometries.size,bytes,unsharedBytes};
}
const before=stats(original.group),after=stats(optimized.group);
assert.equal(after.triangles,before.triangles);
assert.ok(after.meshes < before.meshes*0.4,'Static draw candidates should fall by at least 60%');
assert.ok(after.instances>50,'Repeated details should use instances');
assert.ok(after.bytes<before.unsharedBytes,'Batched buffers should be smaller than the original per-mesh allocations');
const boundsA=new THREE.Box3().setFromObject(original.group),boundsB=new THREE.Box3().setFromObject(optimized.group);
assert.ok(boundsA.min.distanceTo(boundsB.min)<1e-5 && boundsA.max.distanceTo(boundsB.max)<1e-5);
function materialSignature(material) {
  return JSON.stringify([material.type,material.color?.getHex(),material.roughness,material.metalness,material.transparent,material.opacity,material.map?.image?.commands]);
}
function owner(object) {for(let p=object;p;p=p.parent)if(p.userData.interactive)return p.userData.interactive.id;return null;}
function hit(group,origin,direction,objects=[group]) {
  const result=new THREE.Raycaster(origin,direction).intersectObjects(objects,true)[0];
  if(!result)return null;
  const world=result.object.matrixWorld.clone();
  if(result.instanceId!==undefined){const instance=new THREE.Matrix4();result.object.getMatrixAt(result.instanceId,instance);world.multiply(instance);}
  const normal=result.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(world));
  return {point:result.point,normal,material:materialSignature(result.object.material),id:owner(result.object),cast:result.object.castShadow,receive:result.object.receiveShadow};
}
let rays=0;
function compare(origin,direction,rawObjects,batchedObjects) {
  const a=hit(original.group,origin,direction,rawObjects), b=hit(optimized.group,origin,direction,batchedObjects);
  assert.equal(Boolean(a),Boolean(b)); if(!a)return;
  assert.ok(a.point.distanceTo(b.point)<2e-5,`Surface moved by ${a.point.distanceTo(b.point)}`);
  assert.ok(a.normal.distanceTo(b.normal)<2e-5,'Surface normal changed');
  assert.equal(a.material,b.material);assert.equal(a.id,b.id);assert.equal(a.cast,b.cast);assert.equal(a.receive,b.receive);rays++;
}
for(let x=-7.3;x<8;x+=1.4)for(let z=-7.2;z<8;z+=1.4) {
  const top=new THREE.Vector3(x,15,z).applyMatrix4(original.group.matrixWorld);
  const down=new THREE.Vector3(0,-1,0).transformDirection(original.group.matrixWorld);
  compare(top,down);
  const front=new THREE.Vector3(x,2.37,20).applyMatrix4(original.group.matrixWorld);
  compare(front,new THREE.Vector3(0,0,-1).transformDirection(original.group.matrixWorld));
}
assert.equal(original.interactive.length,optimized.interactive.length);
for(let i=0;i<original.interactive.length;i++) {
  const a=original.interactive[i], b=optimized.interactive[i];
  assert.equal(a.userData.interactive.id,b.userData.interactive.id);
  const center=new THREE.Box3().setFromObject(a).getCenter(new THREE.Vector3());
  const origin=center.clone().add(new THREE.Vector3(0,1,10));
  compare(origin,center.clone().sub(origin).normalize(),original.interactive,optimized.interactive);
}
assert.equal(JSON.stringify(original.zones),JSON.stringify(optimized.zones));
assert.equal(original.markers.length,optimized.markers.length);
const marker=optimized.markers[0];marker.material.opacity=0.12;assert.equal(marker.material.opacity,0.12);
// Live instance buffers need the InstancedMesh dispose event, in addition to geometry disposal.
let expectedInstances=0,disposedInstances=0;
optimized.group.traverse(o=>{if(o.isInstancedMesh){expectedInstances++;o.addEventListener('dispose',()=>disposedInstances++);}});
disposeObject(optimized.group);assert.equal(disposedInstances,expectedInstances);
disposeObject(original.group);
console.log(JSON.stringify({result:'PASS: sign proportions/texture cap, surface/material/shadow raycasts, root transforms, triangles, interaction ownership, zones, markers and instance cleanup',rays,signTextures:signTextures.size,signPixels,before,after},null,2));
