'use client';

// Hemisphere dome — IT scripts reaching every environment.
// Vercel-style: elevation-angle projection, dense grid, traveling arcs, triangle nodes.

const CX = 500;   // horizontal center
const CY = 500;   // sphere center at viewport bottom — only dome is visible
const R  = 480;   // sphere radius
const EL = 22;    // elevation angle (degrees above equatorial plane)

const EL_RAD = (EL * Math.PI) / 180;
const COS_EL = Math.cos(EL_RAD);
const SIN_EL = Math.sin(EL_RAD);

// Elevation-angle orthographic projection.
// This makes latitude rings bow inward at the edges (the key dome visual).
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

function latArc(latDeg: number, lon1 = -130, lon2 = 130, steps = 60) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(toXY(latDeg, lon1 + (i / steps) * (lon2 - lon1)));
  }
  return pts2path(pts);
}

function lonArc(lonDeg: number, lat1 = 4, lat2 = 82, steps = 40) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(toXY(lat1 + (i / steps) * (lat2 - lat1), lonDeg));
  }
  return pts2path(pts);
}

// ── Grid ──────────────────────────────────────────────────────────────────────
const LAT_RINGS = [10, 22, 36, 50, 64, 78];
const LON_LINES = [-120, -80, -40, 0, 40, 80, 120];

// ── Animated traveling segments ───────────────────────────────────────────────
const ANIM = [
  { d: latArc(22, -100,  70), color: '#60a5fa', delay: '0s',   dur: '4.2s' },
  { d: latArc(10, -120,  10), color: '#818cf8', delay: '1.4s', dur: '4.8s' },
  { d: latArc(36,   0,  115), color: '#34d399', delay: '0.8s', dur: '3.6s' },
  { d: latArc(50, -85,   85), color: '#22d3ee', delay: '2.2s', dur: '5.2s' },
  { d: latArc(64, -70,   60), color: '#a78bfa', delay: '3.1s', dur: '4.0s' },
  { d: lonArc( 40,   6,  70), color: '#60a5fa', delay: '0.5s', dur: '3.0s' },
  { d: lonArc(-40,   5,  65), color: '#818cf8', delay: '1.9s', dur: '3.4s' },
  { d: lonArc( 80,   4,  52), color: '#34d399', delay: '2.7s', dur: '2.8s' },
];

// ── Triangle node positions (lat, lon) ────────────────────────────────────────
const NODE_COORDS: [number, number][] = [
  [22,  40], [22, -80],
  [36,   0], [36,  80],
  [50, -40], [50,  40],
  [10, -40], [10,  80],
  [64,   0], [64, -80],
  [78,  40],
];

function trianglePoints(x: number, y: number, s = 7) {
  const h = s * 0.866;
  return `${x.toFixed(1)},${(y - h * 0.67).toFixed(1)} ${(x - s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)} ${(x + s * 0.5).toFixed(1)},${(y + h * 0.33).toFixed(1)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AnimatedArcs() {
  const gridLats = LAT_RINGS.map(lat => latArc(lat));
  const gridLons = LON_LINES.map(lon => lonArc(lon));
  const nodes    = NODE_COORDS.map(([lat, lon]) => toXY(lat, lon));

  return (
    <div className="w-full overflow-hidden select-none">
      <svg
        viewBox="0 0 1000 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        aria-hidden
      >
        <defs>
          {/* Clip everything to the sphere silhouette */}
          <clipPath id="dome-clip">
            <circle cx={CX} cy={CY} r={R + 1} />
          </clipPath>

          {/* Radial fade: bright dome centre, edges dissolve */}
          <radialGradient id="grid-fade" cx="50%" cy="90%" r="65%">
            <stop offset="0%"   stopColor="white" stopOpacity="1"   />
            <stop offset="55%"  stopColor="white" stopOpacity="0.8" />
            <stop offset="85%"  stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0"   />
          </radialGradient>
          <mask id="grid-mask">
            <rect x="0" y="0" width="1000" height="500" fill="url(#grid-fade)" />
          </mask>

          {/* Glow for animated arcs */}
          <filter id="arc-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow for triangle nodes */}
          <filter id="node-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g clipPath="url(#dome-clip)">
          {/* Subtle sphere background */}
          <circle cx={CX} cy={CY} r={R} fill="rgba(8,8,24,0.5)" />

          {/* Grid lines with radial fade */}
          <g mask="url(#grid-mask)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.75" fill="none">
            {gridLats.map((d, i) => <path key={`lat${i}`} d={d} />)}
            {gridLons.map((d, i) => <path key={`lon${i}`} d={d} />)}
          </g>

          {/* Animated traveling arcs */}
          {ANIM.map((seg, i) => (
            <g key={i}>
              {/* Faint static trail */}
              <path d={seg.d} stroke={seg.color} strokeOpacity="0.09" strokeWidth="1" fill="none" pathLength="1000" />
              {/* Bright traveling segment */}
              <path
                d={seg.d}
                stroke={seg.color}
                strokeWidth="2.2"
                fill="none"
                filter="url(#arc-glow)"
                pathLength="1000"
                strokeDasharray="110 1000"
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="1200" to="-200"
                  dur={seg.dur} begin={seg.delay}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0;1;1;1;0"
                  keyTimes="0;0.07;0.45;0.88;1"
                  dur={seg.dur} begin={seg.delay}
                  repeatCount="indefinite"
                />
              </path>
            </g>
          ))}

          {/* Triangle node markers */}
          {nodes.map((pt, i) => (
            <g key={i} filter="url(#node-glow)">
              <polygon
                points={trianglePoints(pt.x, pt.y)}
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>

        {/* Outer sphere ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      </svg>
    </div>
  );
}
