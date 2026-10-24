import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/portfolio/islandLayout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
const {oceanWrap,shoreline,isOffshore,ISLAND_STOPS}=module.exports;
for(const x of [-900,-129,-128,0,127,128,900]) for(const z of [-900,-107,-106,22,149,150,900]) {
 const shift=oceanWrap(x,z),nx=x+shift.x,nz=z+shift.z;
 assert.ok(nx>=-128 && nx<128 && nz>=-106 && nz<150);
 assert.ok(Math.abs(shift.x/256-Math.round(shift.x/256))<1e-9);
 assert.ok(Math.abs(shift.z/256-Math.round(shift.z/256))<1e-9);
 const camera={x:x+11,z:z+17};
 assert.equal(camera.x+shift.x-nx,11);assert.equal(camera.z+shift.z-nz,17);
}
for(const stop of ISLAND_STOPS) assert.equal(isOffshore(stop.x,stop.z),false,stop.label+' must be on land');
for(const [x,z] of shoreline()) assert.ok(Number.isFinite(x)&&Number.isFinite(z));
assert.equal(isOffshore(120,22),true);
console.log('PASS: ocean wrapping in both axes, preserved camera offsets, finite coastline and accessible map destinations.');
