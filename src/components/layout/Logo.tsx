import Link from "next/link";

// Відтворення логотипу з макета: серифне «LVIV IMPORT» і коробка з зірками ЄС.
export function Logo({ inverted = false, className = "" }: { inverted?: boolean; className?: string }) {
  const ink = inverted ? "#ffffff" : "#132d63";
  return (
    <Link href="/" aria-label="Lviv Import — на головну" className={`inline-flex shrink-0 ${className}`}>
      <svg viewBox="0 0 176 60" className="h-full w-auto" role="img" aria-hidden="true">
        <g fill={ink} fontFamily="Georgia, 'Times New Roman', serif">
          <text x="0" y="50" fontSize="54">L</text>
          <text x="27" y="25" fontSize="21" letterSpacing="1">VIV</text>
          <text x="25" y="52" fontSize="31">I</text>
          <text x="37" y="51" fontSize="20" letterSpacing="0.5">MPORT</text>
        </g>
        <g transform="translate(118 8)">
          <path d="M4 20 L27 12 L50 20 L27 28 Z" fill="#2f6bf0" />
          <path d="M4 20 L27 28 L27 52 L4 44 Z" fill="#1745b8" />
          <path d="M50 20 L27 28 L27 52 L50 44 Z" fill="#1c56e0" />
          <path d="M4 20 L-4 12 L19 4 L27 12 Z" fill="#2f6bf0" opacity=".85" />
          <path d="M50 20 L58 12 L35 4 L27 12 Z" fill="#1745b8" opacity=".85" />
          <text x="10" y="44" fontSize="13" fontFamily="Georgia, serif" fill="#f5b82e" fontWeight="700">
            LI
          </text>
          {[
            [16, -1], [23, -5], [31, -5], [38, -1], [43, 5],
          ].map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              transform={`translate(${x} ${y}) scale(.32)`}
              d="M0 -10 L2.9 -3.1 L10 -3.1 L4.3 1.3 L6.2 8.1 L0 4 L-6.2 8.1 L-4.3 1.3 L-10 -3.1 L-2.9 -3.1 Z"
              fill="#f5b82e"
            />
          ))}
        </g>
      </svg>
    </Link>
  );
}
