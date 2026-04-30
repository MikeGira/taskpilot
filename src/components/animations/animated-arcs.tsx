'use client';

// Full globe — IT scripts reaching every environment.
// Elevation-angle projection, dense visible grid, grid-following arcs, triangle nodes.

const CX = 300;   // centre of 600×600 viewport
const CY = 300;
const R  = 245;   // sphere radius
const EL = 22;    // degrees above equatorial plane — creates 3-D tilt

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

// ── Grid ──────────────────────────────────────────────────────────────────────
const LAT_RINGS = [-55, -30, -8, 12, 32, 52, 70];
const LON_LINES = [-120, -80, -40, 0, 40, 80, 120];

// ── Animated arcs (travel along the actual grid) ──────────────────────────────
const ANIM = [
  { d: latArc(32,  -105,  55), color: '#60a5fa', delay: '0s',   dur: '4.0s' },
  { d: latArc(12,  -120,  10), color: '#818cf8', delay: '1.3s', dur: '4.6s' },
  { d: latArc(52,    5,  110), color: '#34d399', delay: '0.7s', dur: '3.4s' },
  { d: latArc(-8,  -85,   75), color: '#22d3ee', delay: '2.0s', dur: '5.0s' },
  { d: latArc(-30, -70,   50), color: '#a78bfa', delay: '3.0s', dur: '4.2s' },
  { d: lonArc( 40,   8,   72), color: '#60a5fa', delay: '0.4s', dur: '3.0s' },
  { d: lonArc(-40,   5,   68), color: '#818cf8', delay: '1.8s', dur: '3.6s' },
  { d: lonArc( 80, -20,   60), color: '#34d399', delay: '2.6s', dur: '2.8s' },
  { d: lonArc(-80, -15,   55), color: '#22d3ee', delay: '0.9s', dur: '3.2s' },
];

// ── Triangle node markers ─────────────────────────────────────────────────────
const NODE_COORDS: [number, number][] = [
  [ 32,  40], [ 32, -80],
  [ 12, -40], [ 12,  80],
  [ 52,   0], [ 52,  80],
  [-8,  -40], [-8,   40],
  [ 70,   0], [-30,  40],
  [-30, -80], [ 70, -80],
];

function triPts(x: number, y: number, s = 5.5) {
  const h = s * 0.866;
  return `${x.toFixed(1)},${(y - h * 0.67).toFixed(1)} ` +
         `${(x - s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)} ` +
         `${(x + s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnimatedArcs() {
  const gridLats = LAT_RINGS.map(lat => latArc(lat));
  const gridLons = LON_LINES.map(lon => lonArc(lon));
  const nodes    = NODE_COORDS.map(([lat, lon]) => toXY(lat, lon));

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
          {/* Clip everything to the sphere boundary */}
          <clipPath id="globe-clip">
            <circle cx={CX} cy={CY} r={R + 1} />
          </clipPath>

          {/* Sphere background gradient */}
          <radialGradient id="sphere-bg" cx="38%" cy="32%">
            <stop offset="0%"   stopColor="#0d0d28" />
            <stop offset="55%"  stopColor="#07071a" />
            <stop offset="100%" stopColor="#030308" />
          </radialGradient>

          {/* Radial fade — full grid visible in centre, dissolves at rim */}
          <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="white" stopOpacity="1"   />
            <stop offset="65%"  stopColor="white" stopOpacity="0.9" />
            <stop offset="88%"  stopColor="white" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"   />
          </radialGradient>
          <mask id="grid-mask">
            <circle cx={CX} cy={CY} r={R} fill="url(#grid-fade)" />
          </mask>

          {/* Arc glow */}
          <filter id="arc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Node glow */}
          <filter id="node-glow" x="-130%" y="-130%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Sphere body ─────────────────────────────────────────────────── */}
        <circle cx={CX} cy={CY} r={R} fill="url(#sphere-bg)" />

        {/* Subtle inner highlight — top-left glow */}
        <circle cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(129,140,248,0.06)"
          strokeWidth="30"
          strokeDasharray="420 999"
          strokeDashoffset="-60"
        />

        {/* ── Grid lines ──────────────────────────────────────────────────── */}
        <g clipPath="url(#globe-clip)">
          <g mask="url(#grid-mask)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" fill="none">
            {gridLats.map((d, i) => <path key={`lat${i}`} d={d} />)}
            {gridLons.map((d, i) => <path key={`lon${i}`} d={d} />)}
          </g>

          {/* ── Animated traveling arcs ──────────────────────────────────── */}
          {ANIM.map((seg, i) => (
            <g key={i}>
              <path d={seg.d} stroke={seg.color} strokeOpacity="0.1" strokeWidth="0.8" fill="none" pathLength="1000" />
              <path
                d={seg.d}
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

          {/* ── Triangle node markers ────────────────────────────────────── */}
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

        {/* ── Outer sphere rim ────────────────────────────────────────────── */}
        <circle cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
        {/* Outer glow ring */}
        <circle cx={CX} cy={CY} r={R + 5}
          fill="none"
          stroke="rgba(129,140,248,0.07)"
          strokeWidth="10"
        />
      </svg>
    </div>
  );
}
