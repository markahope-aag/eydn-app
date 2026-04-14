export function BotanicalOverlay({
  color = "#D4A5A5",
  opacity = 0.1,
}: {
  color?: string;
  opacity?: number;
}) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity }}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Leaf cluster top-right */}
      <g transform="translate(600,80) rotate(25)">
        <ellipse cx="0" cy="0" rx="60" ry="18" fill={color} />
        <ellipse cx="-20" cy="-30" rx="50" ry="14" fill={color} transform="rotate(-30)" />
        <ellipse cx="20" cy="-25" rx="45" ry="12" fill={color} transform="rotate(20)" />
        <line x1="0" y1="18" x2="0" y2="60" stroke={color} strokeWidth="2" />
      </g>
      {/* Leaf cluster bottom-left */}
      <g transform="translate(120,480) rotate(-15)">
        <ellipse cx="0" cy="0" rx="55" ry="16" fill={color} />
        <ellipse cx="25" cy="-28" rx="48" ry="13" fill={color} transform="rotate(35)" />
        <ellipse cx="-15" cy="-22" rx="40" ry="11" fill={color} transform="rotate(-25)" />
        <line x1="0" y1="16" x2="0" y2="55" stroke={color} strokeWidth="2" />
      </g>
      {/* Small accent leaves */}
      <g transform="translate(350,120) rotate(45)">
        <ellipse cx="0" cy="0" rx="30" ry="10" fill={color} />
        <ellipse cx="10" cy="-15" rx="25" ry="8" fill={color} transform="rotate(20)" />
      </g>
      <g transform="translate(680,420) rotate(-40)">
        <ellipse cx="0" cy="0" rx="35" ry="11" fill={color} />
        <ellipse cx="-12" cy="-18" rx="28" ry="9" fill={color} transform="rotate(-30)" />
      </g>
    </svg>
  );
}
