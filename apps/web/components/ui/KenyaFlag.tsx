export function KenyaFlag({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 27 18"
      width={size}
      height={(size / 27) * 18}
      aria-hidden="true"
      focusable="false"
      style={{
        display: "block",
        borderRadius: 3,
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.08)",
        flex: "none",
      }}
    >
      <rect width="27" height="18" fill="#fff" />
      <rect width="27" height="5.6" fill="#0b0b0b" />
      <rect y="6.4" width="27" height="5.2" fill="#bb0000" />
      <rect y="12.4" width="27" height="5.6" fill="#006b3f" />
      <g stroke="#fff" strokeWidth="1.1" strokeLinecap="round">
        <path d="M10.5 2.4 17 15.6" />
        <path d="M16.5 2.4 10 15.6" />
      </g>
      <path
        d="M13.5 3.2c1.8 1.9 2.6 3.8 2.6 5.8s-.8 3.9-2.6 5.8c-1.8-1.9-2.6-3.8-2.6-5.8s.8-3.9 2.6-5.8Z"
        fill="#bb0000"
        stroke="#fff"
        strokeWidth="0.9"
      />
      <path
        d="M13.5 3.2c.9 1 1.5 1.9 1.9 2.9h-3.8c.4-1 1-1.9 1.9-2.9ZM11.6 11.9c.4 1 1 1.9 1.9 2.9.9-1 1.5-1.9 1.9-2.9h-3.8Z"
        fill="#0b0b0b"
      />
      <path d="M12.6 7.6h1.8v2.8h-1.8Z" fill="#fff" />
    </svg>
  );
}
