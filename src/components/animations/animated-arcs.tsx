'use client';

// Vercel-style globe with animated colored connection arcs.
// Each arc represents a script deploying to a server region.
// Uses SVG stroke-dashoffset animation with pathLength normalization
// so the "traveling dash" effect is consistent on every arc.

const GLOBE_CX = 300;
const GLOBE_CY = 300;
const GLOBE_R  = 215;

// Connection arcs — each is a quadratic bezier Q cx cy ex ey
// Control points are pulled outside the globe for a nice arc effect.
const ARCS = [
  { id: 'na-eu',  d: 'M 160 238 Q 228 108 298 218', color: '#818cf8', delay: '0s',    dur: '2.8s' }, // Americas → Europe (indigo)
  { id: 'eu-as',  d: 'M 298 218 Q 368 118 435 232', color: '#22d3ee', delay: '0.7s',  dur: '2.5s' }, // Europe → Asia (cyan)
  { id: 'as-au',  d: 'M 435 232 Q 492 300 428 378', color: '#fb923c', delay: '1.5s',  dur: '2.2s' }, // Asia → Australia (orange)
  { id: 'na-sa',  d: 'M 160 238 Q 90 320 192 388',  color: '#34d399', delay: '0.3s',  dur: '2.6s' }, // Americas → S.America (green)
  { id: 'eu-af',  d: 'M 298 218 Q 330 270 308 368', color: '#a78bfa', delay: '1.1s',  dur: '2.4s' }, // Europe → Africa (violet)
  { id: 'sa-af',  d: 'M 192 388 Q 248 432 308 368', color: '#60a5fa', delay: '1.9s',  dur: '2s'   }, // S.America → Africa (blue)
  { id: 'as-na',  d: 'M 435 232 Q 298 70  160 238', color: '#f472b6', delay: '2.4s',  dur: '3.2s' }, // Asia → Americas long arc (pink)
  { id: 'eu-na',  d: 'M 298 218 Q 230 148 160 238', color: '#fbbf24', delay: '3.0s',  dur: '2.3s' }, // Europe → Americas (amber)
];

// Endpoint dots — glowing circles at key server/region nodes
const DOTS = [
  { x: 160, y: 238, color: '#818cf8' }, // Americas
  { x: 298, y: 218, color: '#22d3ee' }, // Europe
  { x: 435, y: 232, color: '#fb923c' }, // Asia
  { x: 428, y: 378, color: '#34d399' }, // Australia
  { x: 192, y: 388, color: '#a78bfa' }, // South America
  { x: 308, y: 368, color: '#60a5fa' }, // Africa
];

export function AnimatedArcs() {
  return (
    <div className="w-full flex flex-col items-center py-4">
      <svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[500px] opacity-90"
        aria-hidden
      >
        <defs>
          {/* Globe gradient */}
          <radialGradient id="globe-bg" cx="40%" cy="35%">
            <stop offset="0%"   stopColor="#0d0d28" />
            <stop offset="60%"  stopColor="#07071a" />
            <stop offset="100%" stopColor="#030308" />
          </radialGradient>

          {/* Glow filter for arcs */}
          <filter id="arc-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dot glow */}
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip arcs to globe surface */}
          <clipPath id="globe-clip">
            <circle cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R} />
          </clipPath>
        </defs>

        {/* ── Globe sphere ────────────────────────────────────────────────── */}
        <circle
          cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R}
          fill="url(#globe-bg)"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />

        {/* Subtle outer glow ring */}
        <circle
          cx={GLOBE_CX} cy={GLOBE_CY} r={GLOBE_R + 4}
          fill="none"
          stroke="rgba(129,140,248,0.08)"
          strokeWidth="8"
        />

        {/* ── Latitude grid lines (horizontal ellipses) ───────────────────── */}
        {[
          { cy: 300, rx: 215, ry: 13 },  // equator
          { cy: 190, rx: 185, ry: 11 },  // 30°N
          { cy: 410, rx: 185, ry: 11 },  // 30°S
          { cy: 110, rx: 107, ry:  7 },  // 60°N
          { cy: 490, rx: 107, ry:  7 },  // 60°S
        ].map(({ cy, rx, ry }, i) => (
          <ellipse
            key={i}
            cx={GLOBE_CX} cy={cy} rx={rx} ry={ry}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.8"
          />
        ))}

        {/* ── Longitude grid lines (vertical ellipses) ────────────────────── */}
        {[
          { rx: 13, ry: 215 },
          { rx: 107, ry: 215 },
        ].map(({ rx, ry }, i) => (
          <ellipse
            key={i}
            cx={GLOBE_CX} cy={GLOBE_CY} rx={rx} ry={ry}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.8"
          />
        ))}

        {/* ── Animated connection arcs ─────────────────────────────────────── */}
        {ARCS.map((arc) => (
          <g key={arc.id}>
            {/* Ghost trail (faint static path) */}
            <path
              d={arc.d}
              stroke={arc.color}
              strokeOpacity="0.06"
              strokeWidth="1"
              fill="none"
              pathLength="1000"
            />
            {/* Animated traveling dash */}
            <path
              d={arc.d}
              stroke={arc.color}
              strokeWidth="1.8"
              fill="none"
              filter="url(#arc-glow)"
              pathLength="1000"
              strokeDasharray="180 1000"
              strokeLinecap="round"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="1000"
                to="-200"
                dur={arc.dur}
                begin={arc.delay}
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.4 0 0.6 1"
              />
              <animate
                attributeName="stroke-opacity"
                values="0;1;1;1;0"
                keyTimes="0;0.05;0.5;0.85;1"
                dur={arc.dur}
                begin={arc.delay}
                repeatCount="indefinite"
              />
            </path>
          </g>
        ))}

        {/* ── Region dots with pulse ───────────────────────────────────────── */}
        {DOTS.map((dot, i) => (
          <g key={i} filter="url(#dot-glow)">
            {/* Pulsing outer ring */}
            <circle cx={dot.x} cy={dot.y} r="6" fill={dot.color} fillOpacity="0.15">
              <animate attributeName="r" values="4;9;4" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.15;0;0.15" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
            </circle>
            {/* Core dot */}
            <circle cx={dot.x} cy={dot.y} r="3" fill={dot.color} fillOpacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  );
}
