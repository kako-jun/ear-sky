interface Props {
  size?: number;
  className?: string;
}

export default function CloudEarIcon({ size = 48, className = "" }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="neon-ear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2d78" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
      </defs>
      {/* Headphone band — floating arc above cloud */}
      <path
        d="M10 38 Q10 12 32 10 Q54 12 54 38"
        stroke="url(#neon-ear)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
      />
      {/* Headphone ear cups */}
      <rect x="6" y="34" width="7" height="10" rx="3" fill="url(#neon-ear)" opacity="0.35" />
      <rect x="51" y="34" width="7" height="10" rx="3" fill="url(#neon-ear)" opacity="0.35" />
      {/* Cat ears */}
      <path d="M18 22 L14 10 L24 18 Z" fill="url(#neon-ear)" opacity="0.9" />
      <path d="M46 22 L50 10 L40 18 Z" fill="url(#neon-ear)" opacity="0.9" />
      <path d="M18 20 L16 13 L22 18 Z" fill="currentColor" opacity="0.3" />
      <path d="M46 20 L48 13 L42 18 Z" fill="currentColor" opacity="0.3" />
      {/* Cloud body */}
      <ellipse cx="32" cy="36" rx="20" ry="14" fill="white" opacity="0.95" />
      <ellipse cx="22" cy="34" rx="12" ry="11" fill="white" opacity="0.95" />
      <ellipse cx="42" cy="34" rx="12" ry="11" fill="white" opacity="0.95" />
      <ellipse cx="32" cy="30" rx="14" ry="10" fill="white" opacity="0.95" />
      {/* Eyes */}
      <ellipse cx="27" cy="35" rx="2" ry="2.5" fill="#1a1520" />
      <ellipse cx="37" cy="35" rx="2" ry="2.5" fill="#1a1520" />
      {/* Mouth */}
      <path
        d="M30 40 Q32 43 34 40"
        stroke="#1a1520"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
