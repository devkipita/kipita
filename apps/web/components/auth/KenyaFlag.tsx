/** Real Kenyan flag — black / white / red / white / green bands with the
 *  Maasai shield and crossed spears. Rounded via the wrapping clip. */
export function KenyaFlag({ size = 22 }: { size?: number }) {
  const h = Math.round((size * 2) / 3);
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: h,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
        flex: "none",
      }}
    >
      <svg viewBox="0 0 30 20" width={size} height={h} aria-label="Kenya">
        <rect width="30" height="20" fill="#fff" />
        <rect width="30" height="6" y="0" fill="#000" />
        <rect width="30" height="6" y="7" fill="#bb0000" />
        <rect width="30" height="6" y="14" fill="#006600" />
        {/* crossed spears */}
        <g stroke="#fff" strokeWidth="1.1">
          <line x1="15" y1="2" x2="15" y2="18" transform="rotate(20 15 10)" />
          <line x1="15" y1="2" x2="15" y2="18" transform="rotate(-20 15 10)" />
        </g>
        {/* shield */}
        <ellipse cx="15" cy="10" rx="3.1" ry="5.2" fill="#bb0000" />
        <ellipse cx="15" cy="10" rx="3.1" ry="5.2" fill="none" stroke="#000" strokeWidth="0.5" />
        <path d="M15 5.2 L17 10 L15 14.8 L13 10 Z" fill="#fff" />
      </svg>
    </span>
  );
}
