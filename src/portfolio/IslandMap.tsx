import { ISLAND_STOPS, shoreline, type IslandDestination } from "./islandLayout";
import type { IslandProgress } from "./Island";
const coast = shoreline(2).map(([x,z])=>`${x},${z}`).join(' ');
const land = shoreline().map(([x,z])=>`${x},${z}`).join(' ');
export function IslandMap({ position, progress, onTravel }: { position: {x:number;z:number}; progress:IslandProgress; onTravel:(destination:IslandDestination)=>void }) {
  const offshore = Math.abs(position.x)>45 || position.z < -28 || position.z > 77;
  return <section className="island-map" aria-label="Island map and discoveries">
    <div className="island-map-heading"><p className="interface-kicker">ANSHUL’S ISLAND</p><span>Take your time.</span></div>
    <svg viewBox="-48 -32 96 112" role="img" aria-label={offshore ? 'You are offshore. Use a destination below to return.' : 'Island map. Your position is marked by the dark dot.'}>
      <rect x="-48" y="-32" width="96" height="112" rx="4" fill="#b5cdc2" />
      <path d="M-43 -20h8m48 5h9m-64 70h7m55-11h7m-65-12h5m39 44h6" stroke="#e1eade" strokeWidth="0.5" />
      <polygon points={coast} fill="#dfcba4" /><polygon points={land} fill="#a6b58b" />
      <path d="M0 7V16Q4 30 0 36Q4 50 0 65M0 15Q-10 12-22 18M0 13Q20 10 25-6M1 26Q15 30 23 25M0 32Q-13 30-25 41M1 43H13M0 53H-13" fill="none" stroke="#eee2c4" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="-8" y="-8" width="16" height="16" rx="1" fill="#eee2c4" stroke="#b68d5d" strokeWidth="0.7" />
      <ellipse cx="-22" cy="16" rx="6.5" ry="4.6" fill="#719e99" />
      {ISLAND_STOPS.map((stop,i)=><g key={stop.id}><circle cx={stop.x} cy={stop.z} r="2.5" fill="#f6f3e8" stroke="#355c4b" strokeWidth="0.4" /><text x={stop.x} y={stop.z+0.9} textAnchor="middle" fontSize="2.5" fontWeight="700" fill="#253b34">{i+1}</text></g>)}
      <circle cx={Math.max(-44,Math.min(44,position.x))} cy={Math.max(-28,Math.min(76,position.z))} r="2.3" fill="#253b34" stroke="#fff8e5" strokeWidth="1" />
      <text x="-42" y="-23" fontSize="3.2" fill="#355c4b">N ↑</text>
    </svg>
    <p className="island-map-caption">{offshore ? 'You’re offshore. The ocean loops; shortcuts are always here.' : '● You are here · Choose a place to take a shortcut.'}</p>
    <div className="island-map-stops">{ISLAND_STOPS.map((stop,i)=><button key={stop.id} onClick={()=>onTravel(stop.id)}><span>{String(i+1).padStart(2,'0')}</span><span><strong>{stop.label}</strong><small>{stop.detail}</small></span><span aria-hidden="true">↗</span></button>)}</div>
    <div className="island-discoveries"><p className="interface-kicker">LITTLE THINGS YOU’VE SET IN MOTION</p><p>{progress.pond}/5 pond notes <span>·</span> {progress.windmill ? 'Windmill turning' : 'Windmill resting'} <span>·</span> {progress.lighthouse ? 'Lighthouse lit' : 'Lighthouse waiting'}</p><small>Optional discoveries. Your work and contact details are always open.</small></div>
  </section>;
}
