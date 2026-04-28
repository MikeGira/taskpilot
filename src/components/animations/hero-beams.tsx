'use client';

// Windows=blue, Linux=yellow-orange, Cloud=cyan, On-Prem=violet
// Nodes are now solid like macOS dots — high opacity fills and bright colors

const NODES = [
  { id: 'windows', label: 'Windows', x: 72,  y: 48,  icon: '⊞', dotColor: '#60a5fa', fillColor: 'rgba(96,165,250,0.55)',  strokeColor: '#60a5fa', delay: '0s'   },
  { id: 'linux',   label: 'Linux',   x: 448, y: 48,  icon: '$',  dotColor: '#fbbf24', fillColor: 'rgba(251,191,36,0.55)',  strokeColor: '#fbbf24', delay: '0.8s' },
  { id: 'cloud',   label: 'Cloud',   x: 448, y: 192, icon: '☁',  dotColor: '#22d3ee', fillColor: 'rgba(34,211,238,0.55)', strokeColor: '#22d3ee', delay: '1.6s' },
  { id: 'onprem',  label: 'On-Prem', x: 72,  y: 192, icon: '⬡',  dotColor: '#a78bfa', fillColor: 'rgba(167,139,250,0.55)', strokeColor: '#a78bfa', delay: '2.4s' },
];

const CENTER = { x: 260, y: 120 };

export function HeroBeams() {
  return (
    <div className="mx-auto mt-14 mb-2 w-full max-w-[520px] select-none" aria-hidden>
      <svg viewBox="0 0 520 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <defs>
          {NODES.map((n) => (
            <linearGradient key={n.id} id={`grad-${n.id}`}
              x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={n.dotColor} stopOpacity="0.7" />
              <stop offset="100%" stopColor={n.dotColor} stopOpacity="0.12" />
            </linearGradient>
          ))}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Beam lines — brighter */}
        {NODES.map((n) => (
          <line key={n.id}
            x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y}
            stroke={`url(#grad-${n.id})`} strokeWidth="1.5"
          />
        ))}

        {/* Animated traveling dots */}
        {NODES.map((n) => (
          <circle key={`dot-${n.id}`} r="4" fill={n.dotColor} filter="url(#dot-glow)">
            <animateMotion dur="3s" repeatCount="indefinite" begin={n.delay} calcMode="spline" keySplines="0.4 0 0.6 1">
              <mpath xlinkHref={`#path-${n.id}`} />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.88;1" dur="3s" repeatCount="indefinite" begin={n.delay} />
          </circle>
        ))}

        {/* Hidden paths for motion */}
        {NODES.map((n) => (
          <path key={`path-${n.id}`} id={`path-${n.id}`} d={`M ${CENTER.x} ${CENTER.y} L ${n.x} ${n.y}`} stroke="none" />
        ))}

        {/* Center node */}
        <circle cx={CENTER.x} cy={CENTER.y} r="26" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <circle cx={CENTER.x} cy={CENTER.y} r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1">
          <animate attributeName="r" values="26;36;26" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.15;0;0.15" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={CENTER.x} y={CENTER.y + 7} textAnchor="middle" fill="white" fontSize="20" fontFamily="system-ui">⚡</text>

        {/* Environment nodes — solid and bright like macOS dots */}
        {NODES.map((n) => (
          <g key={`node-${n.id}`} filter="url(#node-glow)">
            {/* Outer pulse ring */}
            <circle cx={n.x} cy={n.y} r="26" fill="none" stroke={n.strokeColor} strokeOpacity="0.3" strokeWidth="1">
              <animate attributeName="r" values="22;30;22" dur="3.5s" repeatCount="indefinite" begin={n.delay} />
              <animate attributeName="stroke-opacity" values="0.3;0;0.3" dur="3.5s" repeatCount="indefinite" begin={n.delay} />
            </circle>
            {/* Solid filled node */}
            <circle cx={n.x} cy={n.y} r="20" fill={n.fillColor} />
            <circle cx={n.x} cy={n.y} r="20" fill="none" stroke={n.strokeColor} strokeOpacity="0.9" strokeWidth="1.5" />
            {/* Icon */}
            <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
              fill="white" fillOpacity="1" fontSize="14" fontFamily="system-ui" fontWeight="bold">
              {n.icon}
            </text>
            {/* Label */}
            <text x={n.x} y={n.y + 33} textAnchor="middle"
              fill={n.dotColor} fillOpacity="0.95" fontSize="9" fontFamily="system-ui"
              fontWeight="600" letterSpacing="0.8">
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
