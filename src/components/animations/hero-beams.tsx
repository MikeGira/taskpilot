'use client';

// Animated SVG: central ⚡ script node with colored beams radiating to
// Windows (blue), Linux (orange), Cloud (cyan), On-Prem (violet).

const NODES = [
  { id: 'windows', label: 'Windows', x: 72,  y: 48,  icon: '⊞', dotColor: '#60a5fa', ringColor: 'rgba(96,165,250,0.25)', delay: '0s'   },
  { id: 'linux',   label: 'Linux',   x: 448, y: 48,  icon: '$',  dotColor: '#fb923c', ringColor: 'rgba(251,146,60,0.25)',  delay: '0.8s' },
  { id: 'cloud',   label: 'Cloud',   x: 448, y: 192, icon: '☁',  dotColor: '#22d3ee', ringColor: 'rgba(34,211,238,0.25)',  delay: '1.6s' },
  { id: 'onprem',  label: 'On-Prem', x: 72,  y: 192, icon: '⬡',  dotColor: '#a78bfa', ringColor: 'rgba(167,139,250,0.25)', delay: '2.4s' },
];

const CENTER = { x: 260, y: 120 };

export function HeroBeams() {
  return (
    <div className="mx-auto mt-14 mb-2 w-full max-w-[520px] select-none" aria-hidden>
      <svg viewBox="0 0 520 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-80">
        <defs>
          {NODES.map((n) => (
            <linearGradient key={n.id} id={`grad-${n.id}`}
              x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y} gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={n.dotColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={n.dotColor} stopOpacity="0.06" />
            </linearGradient>
          ))}
          {/* Center glow filter */}
          <filter id="center-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Beam lines */}
        {NODES.map((n) => (
          <line key={n.id}
            x1={CENTER.x} y1={CENTER.y} x2={n.x} y2={n.y}
            stroke={`url(#grad-${n.id})`} strokeWidth="1.2"
          />
        ))}

        {/* Animated colored dots */}
        {NODES.map((n) => (
          <circle key={`dot-${n.id}`} r="3.5" fill={n.dotColor} filter="url(#center-glow)">
            <animateMotion dur="3s" repeatCount="indefinite" begin={n.delay} calcMode="spline" keySplines="0.4 0 0.6 1">
              <mpath xlinkHref={`#path-${n.id}`} />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur="3s" repeatCount="indefinite" begin={n.delay} />
            <animate attributeName="r" values="2;3.5;2" dur="3s" repeatCount="indefinite" begin={n.delay} />
          </circle>
        ))}

        {/* Hidden paths for motion references */}
        {NODES.map((n) => (
          <path key={`path-${n.id}`} id={`path-${n.id}`} d={`M ${CENTER.x} ${CENTER.y} L ${n.x} ${n.y}`} stroke="none" />
        ))}

        {/* Center node — pulsing ⚡ */}
        <circle cx={CENTER.x} cy={CENTER.y} r="26" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.15" strokeWidth="1" />
        <circle cx={CENTER.x} cy={CENTER.y} r="26" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1">
          <animate attributeName="r" values="26;34;26" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.06;0;0.06" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={CENTER.x} y={CENTER.y + 6} textAnchor="middle" fill="white" fontSize="18" fontFamily="system-ui">⚡</text>

        {/* Environment nodes with colored rings */}
        {NODES.map((n) => (
          <g key={`node-${n.id}`}>
            {/* Subtle color ring */}
            <circle cx={n.x} cy={n.y} r="22" fill="none" stroke={n.dotColor} strokeOpacity="0.2" strokeWidth="1">
              <animate attributeName="stroke-opacity" values="0.2;0.4;0.2" dur="4s" repeatCount="indefinite" begin={n.delay} />
            </circle>
            <circle cx={n.x} cy={n.y} r="18" fill={n.ringColor} />
            <circle cx={n.x} cy={n.y} r="18" fill="none" stroke={n.dotColor} strokeOpacity="0.35" strokeWidth="0.8" />
            <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fillOpacity="0.8" fontSize="13" fontFamily="system-ui">
              {n.icon}
            </text>
            <text x={n.x} y={n.y + 30} textAnchor="middle" fill={n.dotColor} fillOpacity="0.5" fontSize="8.5" fontFamily="system-ui" letterSpacing="0.5">
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
