"use client";

interface GaugeZone {
  start: number;
  end: number;
  color: string;
}

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  zones: GaugeZone[];
  unit?: string;
  label?: string;
  size?: number;
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function getAngle(value: number, min: number, max: number): number {
  return 150 + ((value - min) / (max - min)) * 240;
}

function getStatusColor(value: number, zones: GaugeZone[]): string {
  for (const zone of zones) {
    if (value >= zone.start && value <= zone.end) return zone.color;
  }
  return "#6b7280";
}

export function Gauge({ value, min, max, zones, unit, label, size = 100, className }: GaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 10;
  const strokeWidth = 6;

  const clamped = Math.max(min, Math.min(max, value));
  const angle = getAngle(clamped, min, max);

  const needleLen = r * 0.65;
  const needleTip = polarToCartesian(cx, cy, needleLen, angle);
  const needleBase = polarToCartesian(cx, cy, -8, angle);

  const bgArc = describeArc(cx, cy, r, 150, 390);
  const activeColor = getStatusColor(clamped, zones);

  return (
    <div className={`flex flex-col items-center ${className || ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <path d={bgArc} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="round" />

        <path
          d={bgArc}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${((angle - 150) / 240) * 100} 100`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />

        <line
          x1={needleBase.x}
          y1={needleBase.y}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={activeColor}
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />

        <circle cx={cx} cy={cy} r={3} fill={activeColor} />

        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
          fontSize="12"
          fontWeight="700"
          fontFamily="inherit"
        >
          {typeof value === "number" ? value.toFixed(1) : value}
        </text>
        {unit && (
          <text
            x={cx}
            y={cy + 26}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="8"
            fontFamily="inherit"
          >
            {unit}
          </text>
        )}
      </svg>
      {label && (
        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{label}</p>
      )}
    </div>
  );
}
