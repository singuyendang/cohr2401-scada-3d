import React from 'react';
import type { EquipmentStatus } from '../../types/scada.ts';

export type IndustrialFanVariant = 'hvac' | 'exhaust';

interface FanPalette {
  housingBg: string;
  ring: string;
  blade: string;
  bladeStroke: string;
  hubOuter: string;
  hubInner: string;
  badgeBg: string;
  badgeRing: string;
}

function getFanPalette(status: EquipmentStatus, faulted?: boolean): FanPalette {
  if (faulted || status === 'FAULTED') {
    return {
      housingBg: '#450a0a',
      ring: '#ef4444',
      blade: '#f87171',
      bladeStroke: '#450a0a',
      hubOuter: '#7f1d1d',
      hubInner: '#fee2e2',
      badgeBg: '#dc2626',
      badgeRing: '#fecaca',
    };
  }
  if (status === 'RUNNING') {
    return {
      housingBg: '#052e16',
      ring: '#22c55e',
      blade: '#4ade80',
      bladeStroke: '#052e16',
      hubOuter: '#14532d',
      hubInner: '#dcfce7',
      badgeBg: '#16a34a',
      badgeRing: '#bbf7d0',
    };
  }
  if (status === 'STARTING' || status === 'STOPPING') {
    return {
      housingBg: '#172554',
      ring: '#3b82f6',
      blade: '#60a5fa',
      bladeStroke: '#172554',
      hubOuter: '#1e3a8a',
      hubInner: '#dbeafe',
      badgeBg: '#2563eb',
      badgeRing: '#bfdbfe',
    };
  }
  return {
    housingBg: '#1e293b',
    ring: '#94a3b8',
    blade: '#cbd5e1',
    bladeStroke: '#0f172a',
    hubOuter: '#334155',
    hubInner: '#e2e8f0',
    badgeBg: '#475569',
    badgeRing: '#cbd5e1',
  };
}

function getSpinClass(status: EquipmentStatus, faulted?: boolean): string {
  if (faulted || status === 'FAULTED') return '';
  if (status === 'RUNNING') return 'animate-fan-spin';
  if (status === 'STARTING' || status === 'STOPPING') return 'animate-fan-spin-slow';
  return '';
}

/**
 * Standardized Coaxial Industrial Fan Artwork (Mẫu 2 — 6-Blade Backward-Curved Impeller)
 * centered strictly at (0, 0) in a [-40..40] coordinate box for ALL HVAC & Exhaust fans.
 *  - RUNNING: Green @ 1.5s | STARTING/STOPPING: Blue @ 3.2s (slower) | STOPPED: Gray | FAULTED: Red flash
 */
const FanGeometry: React.FC<{
  variant: IndustrialFanVariant;
  status: EquipmentStatus;
  faulted?: boolean;
  isBadge?: boolean;
}> = ({ status, faulted, isBadge = false }) => {
  const p = getFanPalette(status, faulted);
  const spinClass = getSpinClass(status, faulted);
  const isFault = Boolean(faulted || status === 'FAULTED');
  const bladeFill = isBadge ? '#ffffff' : p.blade;
  const bladeStroke = isBadge ? p.housingBg : p.bladeStroke;

  return (
    <g className={isFault ? 'animate-alarm-flash' : ''}>
      {/* Outer Industrial Shroud Ring */}
      <circle
        cx={0}
        cy={0}
        r={36}
        fill={isBadge ? p.badgeBg : p.housingBg}
        stroke={isBadge ? p.badgeRing : p.ring}
        strokeWidth={isBadge ? 5.2 : 4.5}
      />
      <circle cx={0} cy={0} r={31.2} fill="none" stroke={p.ring} strokeOpacity={0.45} strokeWidth={1.2} />

      {/* 4 Industrial Corner Housing Bolts on full-size fans */}
      {!isBadge && (
        <g fill="#94a3b8" stroke="#0f172a" strokeWidth={0.9}>
          <circle cx={-30} cy={-30} r={2.6} />
          <circle cx={30} cy={-30} r={2.6} />
          <circle cx={-30} cy={30} r={2.6} />
          <circle cx={30} cy={30} r={2.6} />
        </g>
      )}

      {/* Strictly Coaxial Rotating 6-Blade Impeller Rotor (Mẫu 2) */}
      <g className={spinClass}>
        {/* Symmetric invisible bounds circle guarantees exact (0,0) center in all browsers */}
        <circle cx={0} cy={0} r={30} fill="transparent" />
        <g fill={bladeFill} stroke={bladeStroke} strokeWidth={1.0} strokeLinejoin="round">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d="M -3 -8 C -4 -18, 2 -27, 13 -28 C 9 -20, 7 -13, 5 -7 Z"
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
        <circle cx={0} cy={0} r={9.5} fill={p.hubOuter} stroke={bladeStroke} strokeWidth={1.8} />
        <circle cx={0} cy={0} r={4.2} fill={p.hubInner} stroke={bladeStroke} strokeWidth={1.0} />
      </g>
    </g>
  );
};

/** Embeddable inside parent <svg> P&ID diagrams at (x, y) with desired visual radius */
export const IndustrialFanSvg: React.FC<{
  x: number;
  y: number;
  radius?: number;
  variant: IndustrialFanVariant;
  status: EquipmentStatus;
  faulted?: boolean;
  isBadge?: boolean;
}> = ({ x, y, radius = 18, variant, status, faulted, isBadge = false }) => {
  const scale = radius / 38;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <FanGeometry variant={variant} status={status} faulted={faulted} isBadge={isBadge} />
    </g>
  );
};

/** Standalone HTML <svg> fan element for auxiliary fan cards (EAF, FAF, ERV, PAUCT, TEF) */
export const IndustrialFanTileIcon: React.FC<{
  variant: IndustrialFanVariant;
  status: EquipmentStatus;
  faulted?: boolean;
  className?: string;
}> = ({ variant, status, faulted, className = 'w-10 h-10 shrink-0' }) => (
  <svg viewBox="-40 -40 80 80" className={className}>
    <FanGeometry variant={variant} status={status} faulted={faulted} isBadge={false} />
  </svg>
);
