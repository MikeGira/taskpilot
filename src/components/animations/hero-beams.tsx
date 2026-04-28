'use client';

// Animated SVG: a central script node with connection beams radiating outward
// to 4 environment nodes (Windows, Linux, Cloud, On-Prem).
// Dots travel along each beam on a staggered loop.

const NODES = [
  { id: 'windows', label: 'Windows', x: 72,  y: 48,  icon: '⊞', delay: '0s' },
  { id: 'linux',   label: 'Linux',   x: 448, y: 48,  icon: '$',  delay: '0.8s' },
  { id: 'cloud',   label: 'Cloud',   x: 448, y: 192, icon: '☁',  delay: '1.6s' },
  { id: 'onprem',  label: 'On-Prem', x: 72,  y: 192, icon: '⬡',  delay: '2.4s' },
];

const CENTER = { x: 260, y: 120 };

export function HeroBeams() {
  return (
    <div className="mx-auto mt-14 mb-2 w-full max-w-[520px] select-none" aria-hidden>
      <svg
        viewBox="0 0 520 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full opacity-70"
      >
        <defs>
          {/* Gradient for each beam line */}
          {NODES.map((n) => (
            <linearGradient
              key={n.id}
              id={`grad-${n.id}`}
              x1={CENTER.x} y1={CENTER.y}
              x2={n.x} y2={n.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor="white" stopOpacity="0.5" />
              <stop offset="100%" stopColor="white" stopOpacity="0.08" />
            </linearGradient>
          ))}
        </defs>

        {/* Beam lines */}
        {NODES.map((n) => (
          <line
            key={n.id}
            x1={CENTER.x} y1={CENTER.y}
            x2={n.x} y2={n.y}
            stroke={`url(#grad-${n.id})`}
            strokeWidth="1"
          />
        ))}

        {/* Animated dots traveling along each beam */}
        {NODES.map((n) => (
          <circle key={`dot-${n.id}`} r="3" fill="white" opacity="0.9">
            <animateMotion
              dur="3.2s"
              repeatCount="indefinite"
              begin={n.delay}
              calcMode="spline"
              keySplines="0.4 0 0.6 1"
            >
              <mpath xlinkHref={`#path-${n.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.1;0.85;1"
              dur="3.2s"
              repeatCount="indefinite"
              begin={n.delay}
            />
          </circle>
        ))}

        {/* Hidden paths for animateMotion references */}
        {NODES.map((n) => (
          <path
            key={`path-${n.id}`}
            id={`path-${n.id}`}
            d={`M ${CENTER.x} ${CENTER.y} L ${n.x} ${n.y}`}
            stroke="none"
          />
        ))}

        {/* Center node — wand/script icon */}
        <circle cx={CENTER.x} cy={CENTER.y} r="22" fill="white" fillOpacity="0.06" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
        <circle cx={CENTER.x} cy={CENTER.y} r="22" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1">
          <animate attributeName="r" values="22;28;22" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.08;0;0.08" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" fill="white" fontSize="16" fontFamily="system-ui">⚡</text>

        {/* Environment nodes */}
        {NODES.map((n) => (
          <g key={`node-${n.id}`}>
            <circle cx={n.x} cy={n.y} r="18" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
            <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fillOpacity="0.7" fontSize="13" fontFamily="system-ui">
              {n.icon}
            </text>
            <text x={n.x} y={n.y + 28} textAnchor="middle" fill="white" fillOpacity="0.35" fontSize="9" fontFamily="system-ui" letterSpacing="0.5">
              {n.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
