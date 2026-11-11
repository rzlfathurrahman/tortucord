interface TortugaLogoProps {
  className?: string;
  size?: number;
}

export function TortugaLogo({ className = 'w-6 h-6', size }: TortugaLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="tortuga-grad" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.5" stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="tortuga-inner" x1="16" y1="8" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="1" stopColor="#059669" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {/* Outer Carapace Shield */}
      <path
        d="M16 2.5L27.5 8.75V19.75L16 29.5L4.5 19.75V8.75L16 2.5Z"
        stroke="url(#tortuga-grad)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="url(#tortuga-inner)"
      />
      {/* Central Hexagonal Core Plate */}
      <path
        d="M16 9.5L21.75 12.8V19.2L16 22.5L10.25 19.2V12.8L16 9.5Z"
        stroke="url(#tortuga-grad)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="#10b981"
        fillOpacity="0.22"
      />
      {/* Radiating Carapace Seams */}
      <path d="M16 2.5V9.5" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27.5 8.75L21.75 12.8" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27.5 19.75L21.75 19.2" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 29.5V22.5" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 19.75L10.25 19.2" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 8.75L10.25 12.8" stroke="url(#tortuga-grad)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Center Core Accent */}
      <circle cx="16" cy="16" r="1.5" fill="#34d399" />
    </svg>
  );
}
