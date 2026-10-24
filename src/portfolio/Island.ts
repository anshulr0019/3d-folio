import * as THREE from "three";
import { batchStudio } from "./batchStudio";
import { distanceToShore } from "./islandLayout";
import { sound } from "./Audio";
import { createSignMaterial } from "./signMaterial";
import { isOffshore, POND_STONES } from "./islandLayout";
import type { Zone } from "./World";
import type { RenderQuality } from "./quality";

export interface IslandProgress { pond: number; lighthouse: boolean; windmill: boolean }
/** Bounded animation work: five stones, eight ripples, one beacon and twelve lanterns. */
export class Island {
  progress: IslandProgress = { pond: 0, lighthouse: false, windmill: false };
  onMessage?: (message: string) => void;
  onProgress?: (progress: IslandProgress) => void;
  readonly zones: Zone[] = [];
  readonly interactive: THREE.Object3D[] = [];
  private ocean: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private board = new THREE.Group();
  private beacon = new THREE.Group();
  private blades = new THREE.Group();
  private lampMaterials: THREE.MeshBasicMaterial[] = [];
  private stones: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>[] = [];
  private ripples: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  private rippleAges = new Float32Array(8).fill(10);
  private rippleIndex = 0;
  private activeStone = -1;
  private heard = new Set<number>();
  private lastWake = 0;
  private quality: RenderQuality = "balanced";
  private waterLast = false;
  private greetedWater = false;
  private lastAction = -10;
  private time = 0;
  private reducedMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  private stoneRest = new THREE.Color(0xe7ddc5);
  private stoneHeard = new THREE.Color(0xc4d69c);

  constructor(root: THREE.Group) {
    try {
      const saved = JSON.parse(localStorage.getItem('anshul-island-discoveries-v1') ?? '{}');
      if (Array.isArray(saved.notes)) saved.notes.filter((i: unknown) => Number.isInteger(i) && Number(i)>=0 && Number(i)<5).forEach((i: number)=>this.heard.add(i));
      this.progress = {pond:this.heard.size,lighthouse:saved.lighthouse===true,windmill:saved.windmill===true};
      this.pondComplete=this.heard.size===5;
    } catch { /* Discovery persistence is optional in private browsing. */ }
    this.beacon.userData.noBatch=true;this.blades.userData.noBatch=true;this.board.userData.noBatch=true;
    const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const oak = material(0xb68d5d), cream = material(0xe9dfc7), sage = material(0x355c4b);
    const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) => {
      const object = new THREE.Mesh(geometry, mat); object.position.set(x,y,z); parent.add(object); return object;
    };
    const box = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat = oak) => mesh(new THREE.BoxGeometry(sx,sy,sz),mat,parent,x,y,z);
    const sign = (text: string[], x: number, z: number, width = 4.8) => {
      box(root,x,1.25,z,width+0.2,1.35,0.16);
      box(root,x,0.4,z,0.16,0.8,0.16);
      return mesh(new THREE.PlaneGeometry(width,1.15),createSignMaterial(text,[width,1.15]),root,x,1.25,z+0.09);
    };
    const zone = (id: string, label: string, x: number, z: number, object: THREE.Object3D, radius = 3) => {
      this.zones.push({ id,label,position:new THREE.Vector3(x,0,z),radius,color:0x355c4b });
      object.userData.interactive = { id,label,category:"discovery" }; this.interactive.push(object);
    };
    // A single inexpensive surface follows the camera. Waves are periodic across the ocean seam.
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(600,600), new THREE.MeshStandardMaterial({ color:0x8bbab4, roughness:0.55, metalness:0.08 }));
    this.ocean.userData.noBatch=true;
    this.ocean.rotation.x = -Math.PI/2; this.ocean.position.y = -0.19; this.ocean.receiveShadow = true; root.add(this.ocean);
    const waterUniform = { value:0 };
    this.ocean.material.userData.time = waterUniform;
    this.ocean.material.onBeforeCompile = shader => {
      shader.uniforms.islandTime = waterUniform;
      shader.vertexShader = 'varying vec3 islandPosition;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nislandPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = 'uniform float islandTime; varying vec3 islandPosition;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat wave = sin(islandPosition.x * 0.392699 + islandTime * 0.6) * sin(islandPosition.z * 0.392699 - islandTime * 0.4);\ndiffuseColor.rgb += wave * 0.025;');
    };
    this.ocean.material.customProgramCacheKey = () => 'island-ocean-v1';
    // A small automatic board makes deep-water travel explicit.
    const deck = mesh(new THREE.SphereGeometry(1,16,8),cream,this.board,0,0,0); deck.scale.set(0.72,0.10,1.5);
    box(this.board,0,0.08,0,0.12,0.025,2.5,sage);
    this.board.visible = false; root.add(this.board);

    const pond = mesh(new THREE.CircleGeometry(6.5,64),material(0x709f9b),root,-22,-0.005,16);
    pond.rotation.x = -Math.PI/2; pond.scale.y = 0.72;
    const pondBank = mesh(new THREE.RingGeometry(6.4,6.8,64),cream,root,-22,-0.012,16); pondBank.rotation.x = -Math.PI/2; pondBank.scale.y = 0.72;
    POND_STONES.forEach((position,i) => {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.93,1.02,0.16,12),material(0xe7ddc5));
      stone.position.set(position.x,-0.055,position.z); root.add(stone); stone.userData.noBatch=true; this.stones.push(stone);
      const dot = mesh(new THREE.CircleGeometry(0.13,12),sage,root,position.x,0.028,position.z); dot.rotation.x=-Math.PI/2;
      for(let j=0;j<i;j++) { const pip=mesh(new THREE.CircleGeometry(0.06,8),sage,root,position.x+(j-1.5)*0.18,0.029,position.z+0.35);pip.rotation.x=-Math.PI/2; }
    });
    zone('pond','Play the melody pond',-22,18,sign(['MELODY POND','Five stones. Your own little melody.'],-22,21.5),7);
    for(let i=0;i<8;i++) {
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.8,0.86,32),new THREE.MeshBasicMaterial({color:0xe6f0de,transparent:true,opacity:0,depthWrite:false}));
      ripple.rotation.x=-Math.PI/2; ripple.visible=false; root.add(ripple); this.ripples.push(ripple);
    }
    // Lighthouse: tapered plaster tower, oak gallery, warm rotating beam.
    const tower = new THREE.Group();tower.position.set(25,0,-10); root.add(tower);
    mesh(new THREE.CylinderGeometry(3.8,4.6,0.2,32),cream,tower,0,0,0);
    mesh(new THREE.CylinderGeometry(1.15,1.9,9,16),cream,tower,0,4.5,0);
    for(const y of [0.5,4.5,8.8]) mesh(new THREE.CylinderGeometry(y>8?2:1.6,y>8?2:1.65,0.22,16),sage,tower,0,y,0);
    mesh(new THREE.CylinderGeometry(1.1,1.1,1.7,12),material(0xb9cebb),tower,0,9.7,0);
    for(let i=0;i<8;i++) { const a=i*Math.PI/4;box(tower,Math.cos(a)*1.15,9.7,Math.sin(a)*1.15,0.12,1.8,0.12,sage); }
    mesh(new THREE.ConeGeometry(2,1.3,16),sage,tower,0,11.1,0);
    const bulb = mesh(new THREE.SphereGeometry(0.48,12,8),new THREE.MeshBasicMaterial({color:0xffe5a1}),this.beacon,0,0,0);
    bulb.name='Lighthouse lamp';
    const beamGeometry=new THREE.ConeGeometry(3.4,22,24,1,true);beamGeometry.translate(0,-11,0);beamGeometry.rotateX(-Math.PI/2);
    const beam=mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xffe6aa,transparent:true,opacity:0.09,depthWrite:false,side:THREE.DoubleSide}),this.beacon,0,0,0);
    beam.name='Lighthouse beam'; this.beacon.position.set(0,9.8,0); this.beacon.visible=this.progress.lighthouse;tower.add(this.beacon);
    zone('lighthouse','Light the lighthouse',25,-6,sign(['THE LOOKOUT','Send a little light out to sea.'],25,-3),3.8);
    // Distant boats answer the lighthouse. They are simple silhouettes, not physics bodies.
    for(const [x,z] of [[48,-28],[59,-4],[-48,55]]) {
      const boat = new THREE.Group();boat.position.set(x,-0.09,z);root.add(boat);
      const hull=mesh(new THREE.SphereGeometry(1,12,6),oak,boat,0,0,0);hull.scale.set(1.3,0.25,2.5);
      box(boat,0,1.7,0,0.08,3.4,0.08,sage);
      const sail=mesh(new THREE.ConeGeometry(1,2.6,3),cream,boat,0.7,1.8,0);sail.scale.z=0.05;
      const lamp=new THREE.MeshBasicMaterial({color:0x677d64});mesh(new THREE.SphereGeometry(0.17,8,6),lamp,boat,0,3.5,0).userData.noBatch=true;this.lampMaterials.push(lamp);
    }
    const mill = new THREE.Group();mill.position.set(23,0,24);root.add(mill);
    box(mill,0,1.5,0,3.8,3,2.8,cream);box(mill,0,3.2,0,4.4,0.25,3.5,sage);
    box(mill,0,1.2,1.45,1,2.4,0.12,sage);
    this.blades.position.set(0,5.0,1.6);mill.add(this.blades);
    for(let i=0;i<4;i++) { const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2;this.blades.add(arm);box(arm,0,1.3,0,0.22,2.6,0.18);box(arm,0.4,1.6,0,0.7,1.8,0.12,cream); }
    mesh(new THREE.SphereGeometry(0.3,12,8),sage,this.blades,0,0,0.16);
    zone('windmill','Start the wind workshop',23,28,sign(['THE WIND WORKSHOP','A small turn. A brighter island.'],23,30),3);
    for(const [x,z] of [[-3,14],[3,21],[-3,29],[3,37],[-3,45],[3,53],[-3,60],[8,12],[17,5]]) {
      box(root,x,0.65,z,0.13,1.3,0.13,sage);
      const lamp=new THREE.MeshBasicMaterial({color:0x86977a});mesh(new THREE.SphereGeometry(0.22,10,8),lamp,root,x,1.4,z).userData.noBatch=true;this.lampMaterials.push(lamp);
    }
    // Reuse low-detail geometry for scattered meadow tufts and shoreline stones.
    const tuftGeometry=new THREE.ConeGeometry(0.16,0.55,4), tuftMaterial=material(0x718b63);
    const tufts=new THREE.InstancedMesh(tuftGeometry,tuftMaterial,120);
    const transform=new THREE.Object3D();let n=0;
    for(let i=0;i<800 && n<120;i++) {
      const x=Math.sin(i*71.23)*35,z=22+Math.cos(i*38.91)*47;
      if(distanceToShore(x,z)>-2 || (Math.abs(x)<8 && z<12) || Math.abs(x)<4 || Math.hypot(x+22,z-16)<7 || Math.hypot(x-25,z+10)<5 || Math.abs(x)>8 && Math.abs(x)<19 && z>24) continue;
      transform.position.set(x,0.18,z);transform.rotation.set(0,i*1.4,Math.sin(i)*0.15);transform.scale.setScalar(0.7+(i%4)*0.2);transform.updateMatrix();tufts.setMatrixAt(n++,transform.matrix);
    }
    tufts.count=n;tufts.computeBoundingSphere();root.add(tufts);
    const reeds=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035,0.055,1.2,5),sage,24);
    for(let i=0;i<24;i++) { const a=i/24*Math.PI*2;transform.position.set(-22+Math.cos(a)*6.1,0.4,16+Math.sin(a)*4.5);transform.rotation.set(Math.sin(i)*0.2,0,Math.cos(i)*0.18);transform.scale.setScalar(0.7+(i%3)*0.2);transform.updateMatrix();reeds.setMatrixAt(i,transform.matrix); }reeds.computeBoundingSphere();root.add(reeds);
    batchStudio(root, 18);
  }
  setQuality(quality: RenderQuality) { this.quality=quality; }
  private notify() {
    try { localStorage.setItem('anshul-island-discoveries-v1',JSON.stringify({...this.progress,notes:[...this.heard]})); } catch { /* Optional. */ }
    this.onProgress?.({...this.progress});
  }
  private ripple(x: number,z: number) {
    const i=this.rippleIndex++ % this.ripples.length;this.rippleAges[i]=0;this.ripples[i].position.set(x,0.034,z);
  }
  private playStone(i: number) {
    sound.playBeep([261.63,293.66,329.63,392,440][i],0.7,'sine');
    this.stones[i].material.color.setHex(0xc4d69c);this.ripple(POND_STONES[i].x,POND_STONES[i].z);
    this.heard.add(i);this.progress.pond=this.heard.size;this.notify();
    if(this.heard.size===5 && !this.pondComplete) { this.pondComplete=true;this.onMessage?.('Five stones, one little melody. The pond is yours to play.'); }
  }
  private pondComplete=false;
  interact(id: string): boolean {
    if(!['pond','lighthouse','windmill','garden','island_welcome'].includes(id)) return false;
    if(this.time-this.lastAction<0.5) return true;this.lastAction=this.time;
    if(id==='pond') this.playStone([0,1,2,3,4].find(i=>!this.heard.has(i)) ?? (Math.floor(this.time)%5));
    if(id==='lighthouse') {
      const first=!this.progress.lighthouse;this.progress.lighthouse=true;this.beacon.visible=true;
      this.onMessage?.(first ? 'Signal sent. Watch the boats answer, out beyond the shore.' : 'Your light is still turning. There is always a way home.');sound.playZoneChime();this.notify();
    }
    if(id==='windmill') {
      this.progress.windmill=!this.progress.windmill;
      this.onMessage?.(this.progress.windmill ? 'The wind is working. Follow the warm lanterns along the path.' : 'The windmill is resting. You can start it again anytime.');sound.playBeep(392,0.3,'sine');this.notify();
    }
    if(id==='garden') this.onMessage?.('Nothing to collect here. Stay for a moment, or keep wandering.');
    if(id==='island_welcome') this.onMessage?.('Pond to the west, lighthouse to the east. Open the Island map anytime for a shortcut.');
    return true;
  }
  update(t: number,dt: number,pos: THREE.Vector3,velocity: THREE.Vector3) {
    this.time=t;this.ocean.position.x=pos.x;this.ocean.position.z=pos.z;
    this.ocean.material.userData.time.value=this.quality==='low' || this.reducedMotion?0:t;
    const offshore=isOffshore(pos.x,pos.z);
    this.board.visible=offshore;
    if(offshore) {
      this.board.position.set(pos.x,-0.03+Math.sin(t*2)*0.018,pos.z);
      if(velocity.lengthSq()>0.1) this.board.rotation.y=Math.atan2(velocity.x,velocity.z);
      if(!this.greetedWater) {this.greetedWater=true;this.onMessage?.('Your board is ready. Keep exploring—the ocean loops back around.');}
      if(t-this.lastWake>0.35 && velocity.lengthSq()>1) {this.ripple(pos.x,pos.z);this.lastWake=t;}
    }
    if(this.waterLast && !offshore) this.onMessage?.('Back on shore. Your board will be here when you need it.');
    this.waterLast=offshore;
    const stone=pos.y<0.2 ? POND_STONES.findIndex(p=>Math.hypot(pos.x-p.x,pos.z-p.z)<0.93) : -1;
    if(stone!==this.activeStone && stone>=0) this.playStone(stone);
    this.activeStone=stone;
    this.stones.forEach((s,i)=> {s.material.color.lerp(this.heard.has(i)?this.stoneHeard:this.stoneRest,Math.min(1,dt*2));});
    this.ripples.forEach((r,i)=> {
      this.rippleAges[i]+=dt;const age=this.rippleAges[i];r.visible=age<1.6;
      if(r.visible) {r.scale.setScalar(0.5+age*1.6);r.material.opacity=(1-age/1.6)*0.5;}
    });
    if(this.progress.lighthouse && !this.reducedMotion) this.beacon.rotation.y=t*0.45;
    if(this.progress.windmill && !this.reducedMotion) this.blades.rotation.z-=dt*0.85;
    this.lampMaterials.forEach((m,i)=>m.color.setHex(i<3 ? (this.progress.lighthouse && Math.sin(t*2+i)>0.1?0xffe2a0:0x677d64) : (this.progress.windmill?0xffe2a0:0x86977a)));
  }
}
