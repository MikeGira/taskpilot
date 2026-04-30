'use client';

import { useState, useEffect } from 'react';

// Full rotating globe — IT scripts reaching every environment.
// Elevation-angle projection keeps the 3-D look.
// Latitude rings stay fixed (symmetric — look identical when rotated).
// Only meridians, nodes, and arc paths shift with the longitude offset.

const CX = 300;
const CY = 300;
const R  = 245;
const EL = 22; // degrees above equatorial plane

const EL_RAD = (EL * Math.PI) / 180;
const COS_EL = Math.cos(EL_RAD);
const SIN_EL = Math.sin(EL_RAD);

function toXY(latDeg: number, lonDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: CX + R * Math.cos(lat) * Math.sin(lon),
    y: CY - R * (Math.sin(lat) * COS_EL + Math.cos(lat) * Math.cos(lon) * SIN_EL),
  };
}

function pts2path(pts: { x: number; y: number }[]) {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function latArc(latDeg: number, lon1 = -130, lon2 = 130, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i++)
    pts.push(toXY(latDeg, lon1 + (i / steps) * (lon2 - lon1)));
  return pts2path(pts);
}

function lonArc(lonDeg: number, lat1 = -78, lat2 = 78, steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++)
    pts.push(toXY(lat1 + (i / steps) * (lat2 - lat1), lonDeg));
  return pts2path(pts);
}

// ── Fixed grid (latitude rings don't change on rotation) ─────────────────────
const LAT_RINGS = [-55, -30, -8, 12, 32, 52, 70];
const FIXED_LAT_PATHS = LAT_RINGS.map(lat => latArc(lat));

const LON_LINES = [-120, -80, -40, 0, 40, 80, 120];

// ── Animated arc definitions (raw lat/lon, computed per frame) ────────────────
type AnimSeg =
  | { type: 'lat'; lat: number; lon1: number; lon2: number; color: string; delay: string; dur: string }
  | { type: 'lon'; lon: number; lat1: number; lat2: number; color: string; delay: string; dur: string };

const ANIM_DEFS: AnimSeg[] = [
  // Northern & equatorial latitude arcs
  { type: 'lat', lat:  32, lon1: -105, lon2:  60, color: '#60a5fa', delay: '0s',   dur: '4.0s' },
  { type: 'lat', lat:  12, lon1: -120, lon2:  15, color: '#818cf8', delay: '1.3s', dur: '4.6s' },
  { type: 'lat', lat:  52, lon1:    5, lon2: 110, color: '#34d399', delay: '0.7s', dur: '3.4s' },
  { type: 'lat', lat:  -8, lon1:  -85, lon2:  80, color: '#22d3ee', delay: '2.0s', dur: '5.0s' },
  // Southern latitude arcs — fills the lower globe
  { type: 'lat', lat: -30, lon1:  -75, lon2:  55, color: '#a78bfa', delay: '3.0s', dur: '4.2s' },
  { type: 'lat', lat: -52, lon1:  -60, lon2:  70, color: '#f472b6', delay: '1.6s', dur: '4.8s' },
  // Meridian arcs spanning full sphere top to bottom
  { type: 'lon', lon:  40, lat1: -65, lat2:  72, color: '#60a5fa', delay: '0.4s', dur: '3.2s' },
  { type: 'lon', lon: -40, lat1: -60, lat2:  68, color: '#818cf8', delay: '1.8s', dur: '3.6s' },
  { type: 'lon', lon:  80, lat1: -55, lat2:  65, color: '#34d399', delay: '2.6s', dur: '3.0s' },
  { type: 'lon', lon: -80, lat1: -50, lat2:  60, color: '#22d3ee', delay: '0.9s', dur: '3.4s' },
];

// ── Node markers (lat, lon) — spread across full globe ───────────────────────
const NODE_COORDS: [number, number][] = [
  [ 32,  40], [ 32, -80],
  [ 12, -40], [ 12,  80],
  [ 52,   0], [ 52,  80],
  [ -8, -40], [ -8,  40],
  [ 70,   0], [-30,  40],
  [-30, -80], [-52,   0],
  [-52,  80], [ 70, -80],
];

function triPts(x: number, y: number, s = 5.5) {
  const h = s * 0.866;
  return `${x.toFixed(1)},${(y - h * 0.67).toFixed(1)} ` +
         `${(x - s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)} ` +
         `${(x + s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnimatedArcs() {
  // Longitude offset drives the rotation — only meridians & nodes use it
  const [lonOff, setLonOff] = useState(0);

  useEffect(() => {
    // 0.15° per 50 ms = 3°/s = 1 full revolution every ~2 minutes (elegant, not distracting)
    const id = setInterval(() => setLonOff(prev => (prev + 0.15) % 360), 50);
    return () => clearInterval(id);
  }, []);

  // Recompute only what changes with rotation
  const gridLons = LON_LINES.map(lon => lonArc(lon + lonOff));
  const nodes    = NODE_COORDS.map(([lat, lon]) => toXY(lat, lon + lonOff));
  const animPaths = ANIM_DEFS.map(seg =>
    seg.type === 'lat'
      ? latArc(seg.lat, seg.lon1 + lonOff, seg.lon2 + lonOff)
      : lonArc(seg.lon + lonOff, seg.lat1, seg.lat2)
  );

  return (
    <div className="w-full flex items-center justify-center py-4 select-none">
      <svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[520px] opacity-95"
        aria-hidden
      >
        <defs>
          <clipPath id="globe-clip">
            <circle cx={CX} cy={CY} r={R + 1} />
          </clipPath>

          <radialGradient id="sphere-bg" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#0d0d28" />
            <stop offset="55%"  stopColor="#07071a" />
            <stop offset="100%" stopColor="#030308" />
          </radialGradient>

          <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="white" stopOpacity="1"    />
            <stop offset="65%"  stopColor="white" stopOpacity="0.9"  />
            <stop offset="88%"  stopColor="white" stopOpacity="0.35" />
            <stop offset="100%" stopColor="white" stopOpacity="0"    />
          </radialGradient>
          <mask id="grid-mask">
            <circle cx={CX} cy={CY} r={R} fill="url(#grid-fade)" />
          </mask>

          <filter id="arc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="node-glow" x="-130%" y="-130%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sphere body */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sphere-bg)" />
        <circle cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(129,140,248,0.06)"
          strokeWidth="30"
          strokeDasharray="420 999"
          strokeDashoffset="-60"
        />

        <g clipPath="url(#globe-clip)">
          {/* Grid */}
          <g mask="url(#grid-mask)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" fill="none">
            {/* Latitude rings — fixed, don't rotate */}
            {FIXED_LAT_PATHS.map((d, i) => <path key={`lat${i}`} d={d} />)}
            {/* Meridians — rotate with lonOff */}
            {gridLons.map((d, i) => <path key={`lon${i}`} d={d} />)}
          </g>

          {/* Animated arcs */}
          {ANIM_DEFS.map((seg, i) => (
            <g key={i}>
              <path d={animPaths[i]} stroke={seg.color} strokeOpacity="0.1" strokeWidth="0.8" fill="none" pathLength="1000" />
              <path
                d={animPaths[i]}
                stroke={seg.color}
                strokeWidth="2"
                fill="none"
                filter="url(#arc-glow)"
                pathLength="1000"
                strokeDasharray="100 1000"
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="1100" to="-180"
                  dur={seg.dur} begin={seg.delay}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0;0.95;0.95;0.95;0"
                  keyTimes="0;0.07;0.45;0.88;1"
                  dur={seg.dur} begin={seg.delay}
                  repeatCount="indefinite"
                />
              </path>
            </g>
          ))}

          {/* Triangle nodes — rotate with lonOff */}
          {nodes.map((pt, i) => (
            <g key={i} filter="url(#node-glow)">
              <polygon
                points={triPts(pt.x, pt.y)}
                fill="none"
                stroke="rgba(255,255,255,0.80)"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>

        {/* Outer rim */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke="rgba(129,140,248,0.07)" strokeWidth="10" />
      </svg>
    </div>
  );
}
