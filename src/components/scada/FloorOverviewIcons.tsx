import React from 'react';
import type { AnalogSensor, EquipmentUnit, PowerMeter, ValveUnit } from '../../types/scada.ts';

/**
 * Standardized Read-Only SCADA Equipment Icon Tiles for ALL 10 Architectural Floor Overviews
 * (B5 1F/M1F/2F/M2F, B2 1F/2F/3F/M3F, B3 1F/M1F).
 *  - ZERO animations (strict Read-Only architectural monitor clarity)
 *  - Real SCADA visual symbols: Air-Cooled Chiller, Water Chiller, Heat Fan, Cooling Tower,
 *    Centrifugal Pump, AHU/PAU, FFU, FCU, Coaxial 6-Blade Exhaust Fan, Compressor, Dryer,
 *    Vacuum Pump, Motorized Valve, and PM8000 / MFM383 Power Meter.
 *  - Pruned to ONLY the single most essential KPI per equipment family!
 *  - Double-click triggers `onDoubleClick` to jump straight to the primary interactive screen.
 */

type IconFamily =
  | 'air_chiller'
  | 'water_chiller'
  | 'heat_fan'
  | 'cooling_tower'
  | 'pump'
  | 'ahu'
  | 'ffu'
  | 'fcu'
  | 'fan'
  | 'compressor'
  | 'dryer'
  | 'vacuum';

function detectFamily(eq?: EquipmentUnit): IconFamily {
  if (!eq) return 'pump';
  const t = eq.tag;
  if (t.includes('_HP')) return 'heat_fan';
  if (t.startsWith('B31F_CH') && eq.kind === 'chiller') return 'air_chiller';
  if (eq.kind === 'chiller') return 'water_chiller';
  if (t.includes('CT') && t.includes('FN')) return 'cooling_tower';
  if (t.includes('AHU') || t.includes('PAU')) {
    if (t.includes('PAUCT') || t.includes('PAUO')) return 'fan';
    return 'ahu';
  }
  if (t.includes('FFU')) return 'ffu';
  if (t.includes('FCU')) return 'fcu';
  if (eq.kind === 'ac_vsd' || eq.kind === 'ac_fix') return 'compressor';
  if (eq.kind === 'dryer') return 'dryer';
  if (eq.kind === 'pv') return 'vacuum';
  if (
    eq.subsystem === 'exh' ||
    t.includes('FA11') ||
    t.includes('EAF') ||
    t.includes('FAF') ||
    t.includes('TEF') ||
    t.includes('ERV')
  ) {
    return 'fan';
  }
  return 'pump';
}

function statePalette(eq?: EquipmentUnit): {
  bg: string;
  stroke: string;
  accent: string;
  footerBg: string;
  footerText: string;
  dot: string;
} {
  if (!eq) {
    return {
      bg: '#e2e8f0',
      stroke: '#475569',
      accent: '#94a3b8',
      footerBg: '#334155',
      footerText: '#e2e8f0',
      dot: '#94a3b8',
    };
  }
  if (eq.faulted || eq.status === 'FAULTED') {
    return {
      bg: '#fee2e2',
      stroke: '#dc2626',
      accent: '#ef4444',
      footerBg: '#991b1b',
      footerText: '#ffffff',
      dot: '#ff0000',
    };
  }
  if (eq.status === 'RUNNING') {
    return {
      bg: '#dcfce7',
      stroke: '#15803d',
      accent: '#22c55e',
      footerBg: '#0f172a',
      footerText: '#4ade80',
      dot: '#00ce00',
    };
  }
  if (eq.status === 'STARTING' || eq.status === 'STOPPING') {
    return {
      bg: '#dbeafe',
      stroke: '#2563eb',
      accent: '#3b82f6',
      footerBg: '#1e3a8a',
      footerText: '#bfdbfe',
      dot: '#2563eb',
    };
  }
  return {
    bg: '#f1f5f9',
    stroke: '#475569',
    accent: '#94a3b8',
    footerBg: '#334155',
    footerText: '#cbd5e1',
    dot: '#94a3b8',
  };
}

/** Static, crisp vector symbol drawn in a centered [-18..18, -14..14] coordinate box */
const EquipmentGlyph: React.FC<{
  family: IconFamily;
  accent: string;
  isHeat?: boolean;
}> = ({ family, accent }) => {
  switch (family) {
    case 'air_chiller':
      return (
        <g>
          <rect x={-17} y={-11} width={34} height={22} rx={2} fill="#e2e8f0" stroke="#1e293b" strokeWidth={1.1} />
          <rect x={-15} y={-13} width={30} height={3.5} rx={1} fill="#475569" />
          <circle cx={-8} cy={-8} r={4.2} fill={accent} stroke="#0f172a" strokeWidth={0.9} />
          <circle cx={8} cy={-8} r={4.2} fill={accent} stroke="#0f172a" strokeWidth={0.9} />
          <polyline points="-14,-1 -8,8 -2,-1 2,-1 8,8 14,-1" fill="none" stroke="#334155" strokeWidth={1.4} />
        </g>
      );
    case 'water_chiller':
      return (
        <g>
          {/* Heavy Chiller Base Skid & Support Saddles */}
          <rect x={-16.5} y={9.5} width={33} height={2.8} rx={0.8} fill="#334155" />
          <rect x={-12} y={7} width={3} height={3} fill="#475569" />
          <rect x={9} y={7} width={3} height={3} fill="#475569" />

          {/* Upper Rear Condenser Shell (Teal-Steel Barrel + End Waterboxes) */}
          <rect x={-14} y={-2.5} width={28} height={6.2} rx={2.2} fill="#0e7490" stroke="#0f172a" strokeWidth={0.95} />
          <line x1={-10} y1={-2.5} x2={-10} y2={3.7} stroke="#0f172a" strokeWidth={0.85} />
          <line x1={10} y1={-2.5} x2={10} y2={3.7} stroke="#0f172a" strokeWidth={0.85} />
          <line x1={-9} y1={-0.8} x2={9} y2={-0.8} stroke="#67e8f9" strokeWidth={0.7} strokeOpacity={0.75} />

          {/* Lower Front Evaporator Shell (Blue Insulated Barrel + End Flanges) */}
          <rect x={-15.5} y={2.2} width={31} height={6.4} rx={2.5} fill="#1d4ed8" stroke="#0f172a" strokeWidth={1.0} />
          <line x1={-11} y1={2.2} x2={-11} y2={8.6} stroke="#0f172a" strokeWidth={0.9} />
          <line x1={11} y1={2.2} x2={11} y2={8.6} stroke="#0f172a" strokeWidth={0.9} />
          <line x1={-9.5} y1={4.0} x2={9.5} y2={4.0} stroke="#93c5fd" strokeWidth={0.85} strokeOpacity={0.8} />

          {/* Suction / Discharge Riser Pipes */}
          <path d="M -8 -2.5 L -8 -7.5 L -4 -7.5" fill="none" stroke="#475569" strokeWidth={2.0} strokeLinecap="round" />
          <path d="M 8 -2.5 L 8 -7.5 L 4 -7.5" fill="none" stroke="#475569" strokeWidth={2.0} strokeLinecap="round" />

          {/* Top-Mounted Centrifugal Compressor & Motor Assembly */}
          <rect x={-9.5} y={-11.2} width={11} height={6.2} rx={1.6} fill={accent} stroke="#0f172a" strokeWidth={0.95} />
          <line x1={-7} y1={-11.2} x2={-7} y2={-5} stroke="#0f172a" strokeWidth={0.6} strokeOpacity={0.5} />
          <line x1={-4.5} y1={-11.2} x2={-4.5} y2={-5} stroke="#0f172a" strokeWidth={0.6} strokeOpacity={0.5} />
          <circle cx={4.2} cy={-8.1} r={3.8} fill={accent} stroke="#0f172a" strokeWidth={0.95} />
          <circle cx={4.2} cy={-8.1} r={1.4} fill="#ffffff" stroke="#0f172a" strokeWidth={0.6} />

          {/* Micro-Control Panel Box on Right */}
          <rect x={11.5} y={-9.5} width={5.2} height={7.2} rx={0.9} fill="#1e293b" stroke="#0f172a" strokeWidth={0.75} />
          <rect x={12.5} y={-8.4} width={3.2} height={2.8} rx={0.4} fill="#38bdf8" />
          <circle cx={14.1} cy={-3.9} r={0.9} fill={accent} />
        </g>
      );
    case 'heat_fan':
      return (
        <g>
          <rect x={-17} y={-11} width={34} height={22} rx={2} fill="#fff1f2" stroke="#9f1239" strokeWidth={1.1} />
          <rect x={-15} y={-13} width={30} height={3} rx={1} fill="#9f1239" />
          <circle cx={-7} cy={1} r={6.5} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={-7} cy={1} r={2} fill="#ffffff" />
          <rect x={2} y={-6} width={13} height={14} rx={1.5} fill="#fda4af" stroke="#9f1239" strokeWidth={0.9} />
          <text x={8.5} y={3} textAnchor="middle" fill="#881337" fontSize="5" fontFamily="monospace" fontWeight="900">
            HT
          </text>
        </g>
      );
    case 'cooling_tower':
      return (
        <g>
          <polygon points="-13,11 -9,-7 9,-7 13,11" fill="#38bdf8" stroke="#0f172a" strokeWidth={1.1} />
          <rect x={-7} y={-12} width={14} height={5} rx={1} fill={accent} stroke="#0f172a" strokeWidth={0.9} />
          <line x1={-9} y1={1} x2={9} y2={1} stroke="#0369a1" strokeWidth={1} />
          <line x1={-11} y1={6} x2={11} y2={6} stroke="#0369a1" strokeWidth={1} />
        </g>
      );
    case 'ahu':
      return (
        <g>
          <rect x={-17} y={-10} width={34} height={20} rx={2} fill="#ffffff" stroke="#1e293b" strokeWidth={1.1} />
          <rect x={-13} y={-7} width={4.5} height={14} fill="#38bdf8" stroke="#0369a1" strokeWidth={0.8} />
          <rect x={-6.5} y={-7} width={4.5} height={14} fill="#f43f5e" stroke="#9f1239" strokeWidth={0.8} />
          <circle cx={8} cy={0} r={6.5} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={8} cy={0} r={2} fill="#ffffff" />
        </g>
      );
    case 'ffu':
      return (
        <g>
          <rect x={-16} y={-9} width={32} height={18} rx={2} fill="#f8fafc" stroke="#1e293b" strokeWidth={1.1} />
          <line x1={-13} y1={5} x2={13} y2={5} stroke="#0284c7" strokeWidth={2} strokeDasharray="3 1.5" />
          <circle cx={0} cy={-2} r={5.2} fill={accent} stroke="#0f172a" strokeWidth={0.9} />
          <circle cx={0} cy={-2} r={1.8} fill="#ffffff" />
        </g>
      );
    case 'fcu':
      return (
        <g>
          <rect x={-16} y={-9} width={32} height={18} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1.1} />
          <line x1={-12} y1={-4} x2={-1} y2={-4} stroke="#0284c7" strokeWidth={1.4} />
          <line x1={-12} y1={0} x2={-1} y2={0} stroke="#0284c7" strokeWidth={1.4} />
          <line x1={-12} y1={4} x2={-1} y2={4} stroke="#0284c7" strokeWidth={1.4} />
          <circle cx={8} cy={0} r={5.5} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={8} cy={0} r={1.8} fill="#ffffff" />
        </g>
      );
    case 'fan':
      return (
        <g>
          <circle cx={0} cy={0} r={11.5} fill="#0f172a" stroke={accent} strokeWidth={1.8} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <path
              key={deg}
              d="M -1.2 -2.6 C -1.6 -6, 0.8 -9, 4.6 -9.4 C 3.2 -6.8, 2.4 -4.5, 1.8 -2.4 Z"
              fill={accent}
              transform={`rotate(${deg})`}
            />
          ))}
          <circle cx={0} cy={0} r={3} fill="#f8fafc" stroke="#0f172a" strokeWidth={0.8} />
        </g>
      );
    case 'compressor':
      return (
        <g>
          <rect x={-16} y={-10} width={32} height={20} rx={2} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.1} />
          <circle cx={-5} cy={0} r={6.2} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={-5} cy={0} r={2} fill="#ffffff" />
          <rect x={5} y={-6} width={8} height={12} rx={1} fill="#0284c7" stroke="#0f172a" strokeWidth={0.8} />
        </g>
      );
    case 'dryer':
      return (
        <g>
          <rect x={-12} y={-10} width={9} height={20} rx={4} fill="#bae6fd" stroke="#0f172a" strokeWidth={1} />
          <rect x={3} y={-10} width={9} height={20} rx={4} fill="#bae6fd" stroke="#0f172a" strokeWidth={1} />
          <circle cx={0} cy={0} r={3.5} fill={accent} stroke="#0f172a" strokeWidth={0.8} />
        </g>
      );
    case 'vacuum':
      return (
        <g>
          <rect x={-16} y={-4} width={22} height={13} rx={4} fill="#c7d2fe" stroke="#312e81" strokeWidth={1.1} />
          <circle cx={8} cy={-2} r={7} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={8} cy={-2} r={2.2} fill="#ffffff" />
        </g>
      );
    case 'pump':
    default:
      return (
        <g>
          <rect x={-12} y={8} width={24} height={3.5} rx={1} fill="#475569" />
          <rect x={2} y={-11} width={11} height={6.5} rx={1} fill={accent} stroke="#0f172a" strokeWidth={1} />
          <circle cx={0} cy={0} r={9.5} fill={accent} stroke="#0f172a" strokeWidth={1.2} />
          <circle cx={0} cy={0} r={3.2} fill="#ffffff" stroke="#0f172a" strokeWidth={0.9} />
        </g>
      );
  }
};

function computeEssentialMetric(eq?: EquipmentUnit, roomTempSensor?: AnalogSensor, extra?: string): string {
  if (extra) return extra;
  if (roomTempSensor) return `${roomTempSensor.pv.toFixed(1)}°C`;
  if (!eq) return '';
  if (eq.faulted || eq.status === 'FAULTED') return 'FLT';
  if (eq.status === 'STOPPED') return 'STOP';
  if (eq.status === 'STARTING' || eq.status === 'STOPPING') return '...';
  if (eq.kind === 'vfd') return `${eq.frequencyHz.toFixed(0)}Hz`;
  if (eq.kind === 'chiller' || eq.kind === 'ac_vsd' || eq.kind === 'ac_fix' || eq.kind === 'pv') {
    return `${Math.round(eq.loadPct)}%`;
  }
  // DOL fans/pumps/dryers: color already indicates RUN clearly — keep ultra-clean!
  return '';
}

export const FloorEquipmentIconTile: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  eq?: EquipmentUnit;
  roomTempSensor?: AnalogSensor;
  extra?: string;
  onDoubleClick: () => void;
}> = ({ x, y, w = 88, h = 48, name, eq, roomTempSensor, extra, onDoubleClick }) => {
  const family = detectFamily(eq);
  const p = statePalette(eq);
  const metric = computeEssentialMetric(eq, roomTempSensor, extra);
  const compactHorizontal = h < 38;
  const footerLabel = metric ? `${name} · ${metric}` : name;

  if (compactHorizontal) {
    const iconScale = Math.min(0.68, (h - 6) / 26);
    const iconCenterX = Math.max(15, h * 0.52);
    const textX = iconCenterX + 14;
    return (
      <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
        <title>{eq ? `${eq.tag} (${eq.label}) — Double-click to open primary screen` : name}</title>
        <rect x={0} y={0} width={w} height={h} rx={3} fill={p.bg} stroke={p.stroke} strokeWidth={1.35} />
        <g transform={`translate(${iconCenterX}, ${h / 2}) scale(${iconScale})`}>
          <EquipmentGlyph family={family} accent={p.accent} />
        </g>
        <text x={textX} y={metric ? h * 0.44 : h * 0.62} fill="#0f172a" fontSize="7.6" fontFamily="monospace" fontWeight="900">
          {name}
        </text>
        {metric && (
          <text x={textX} y={h * 0.84} fill={p.stroke} fontSize="7.8" fontFamily="monospace" fontWeight="900">
            {metric}
          </text>
        )}
      </g>
    );
  }

  const footerH = h <= 44 ? 13 : 15;
  const bodyH = h - footerH;
  const iconScale = Math.min(1.0, (bodyH - 4) / 26, (w - 8) / 36);
  const fontSize =
    w <= 42
      ? '5.9'
      : footerLabel.length > 15
      ? '6.6'
      : footerLabel.length > 12
      ? '7.0'
      : '7.8';

  return (
    <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
      <title>{eq ? `${eq.tag} (${eq.label}) — Double-click to open primary screen` : name}</title>
      <rect x={0} y={0} width={w} height={h} rx={3.5} fill={p.bg} stroke={p.stroke} strokeWidth={1.5} />
      <g transform={`translate(${w / 2}, ${bodyH / 2 + 0.5}) scale(${iconScale})`}>
        <EquipmentGlyph family={family} accent={p.accent} />
      </g>
      {/* Essential 1-line dark SCADA footer strip */}
      <rect x={0.5} y={bodyH} width={w - 1} height={footerH - 0.5} rx={2} fill={p.footerBg} />
      <text
        x={w / 2}
        y={bodyH + footerH - 3.5}
        textAnchor="middle"
        fill={p.footerText}
        fontSize={fontSize}
        fontFamily="monospace"
        fontWeight="900"
      >
        {footerLabel}
      </text>
    </g>
  );
};

export const FloorValveIconTile: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  valve?: ValveUnit;
  onDoubleClick: () => void;
}> = ({ x, y, w = 84, h = 48, name, valve, onDoubleClick }) => {
  const isFault = Boolean(valve?.faulted);
  const isOpen = valve ? (valve.kind === 'XVAL' ? valve.openFB : valve.positionPct > 3) : false;
  const fill = isFault ? '#ef4444' : isOpen ? '#22c55e' : '#94a3b8';
  const bg = isFault ? '#fee2e2' : isOpen ? '#dcfce7' : '#f1f5f9';
  const stroke = isFault ? '#dc2626' : isOpen ? '#15803d' : '#475569';
  const footerBg = isFault ? '#991b1b' : isOpen ? '#0f172a' : '#334155';
  const footerText = isFault ? '#ffffff' : isOpen ? '#4ade80' : '#cbd5e1';
  const valStr = !valve
    ? '--'
    : isFault
    ? 'FLT'
    : valve.kind === 'XVAL'
    ? valve.openFB
      ? 'OPN'
      : 'CLS'
    : `${Math.round(valve.positionPct)}%`;

  if (h < 38) {
    return (
      <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
        <title>{valve ? `${valve.tag} (${valve.label}) — Double-click to locate` : name}</title>
        <rect x={0} y={0} width={w} height={h} rx={3} fill={bg} stroke={stroke} strokeWidth={1.25} />
        <g transform={`translate(13, ${h / 2 + 2}) scale(0.62)`}>
          <polygon points="-11,-6 0,0 -11,6" fill={fill} stroke="#0f172a" strokeWidth={1.2} />
          <polygon points="11,-6 0,0 11,6" fill={fill} stroke="#0f172a" strokeWidth={1.2} />
          <line x1={0} y1={0} x2={0} y2={-9} stroke="#0f172a" strokeWidth={1.8} />
          <rect x={-6} y={-15} width={12} height={6} rx={1.2} fill="#334155" />
        </g>
        <text x={24} y={h / 2 + 3} fill="#0f172a" fontSize="7.4" fontFamily="monospace" fontWeight="900">
          {name}
        </text>
        <text x={w - 4} y={h / 2 + 3} textAnchor="end" fill={stroke} fontSize="7.5" fontFamily="monospace" fontWeight="900">
          {valStr}
        </text>
      </g>
    );
  }

  const footerH = h <= 44 ? 13 : 15;
  const bodyH = h - footerH;
  const vScale = Math.min(1.0, (bodyH - 4) / 26);
  const footerLabel = `${name} · ${valStr}`;

  return (
    <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
      <title>{valve ? `${valve.tag} (${valve.label}) — Double-click to locate` : name}</title>
      <rect x={0} y={0} width={w} height={h} rx={3.5} fill={bg} stroke={stroke} strokeWidth={1.5} />
      <g transform={`translate(${w / 2}, ${bodyH / 2 + 5}) scale(${vScale})`}>
        <polygon points="-13,-7 0,0 -13,7" fill={fill} stroke="#0f172a" strokeWidth={1.2} />
        <polygon points="13,-7 0,0 13,7" fill={fill} stroke="#0f172a" strokeWidth={1.2} />
        <line x1={0} y1={0} x2={0} y2={-10} stroke="#0f172a" strokeWidth={1.9} />
        <rect x={-7} y={-17} width={14} height={7} rx={1.4} fill="#334155" />
      </g>
      <rect x={0.5} y={bodyH} width={w - 1} height={footerH - 0.5} rx={2} fill={footerBg} />
      <text
        x={w / 2}
        y={bodyH + footerH - 3.5}
        textAnchor="middle"
        fill={footerText}
        fontSize={footerLabel.length > 13 ? '6.8' : '7.6'}
        fontFamily="monospace"
        fontWeight="900"
      >
        {footerLabel}
      </text>
    </g>
  );
};

export const FloorMeterIconTile: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  meter?: PowerMeter;
  onDoubleClick: () => void;
}> = ({ x, y, w = 136, h = 50, name, meter, onDoubleClick }) => {
  const kwText = meter ? `${meter.activeKw.toFixed(0)}kW` : '--';
  const compactHorizontal = h < 38;

  if (compactHorizontal) {
    return (
      <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
        <title>{meter ? `${meter.tag} (${meter.label}) — Double-click to open PMS` : name}</title>
        <rect x={0} y={0} width={w} height={h} rx={3} fill="#fff7ed" stroke="#c2410c" strokeWidth={1.3} />
        <g transform={`translate(12, ${h / 2})`}>
          <rect x={-8} y={-8} width={16} height={16} rx={1.5} fill="#1e293b" stroke="#0f172a" strokeWidth={0.9} />
          <rect x={-5.5} y={-5.5} width={11} height={6.5} rx={0.8} fill="#38bdf8" />
          <circle cx={-3} cy={4} r={1.1} fill="#22c55e" />
          <circle cx={0} cy={4} r={1.1} fill="#facc15" />
          <circle cx={3} cy={4} r={1.1} fill="#ef4444" />
        </g>
        <text x={24} y={h * 0.44} fill="#7c2d12" fontSize="7.4" fontFamily="monospace" fontWeight="900">
          {name}
        </text>
        <text x={24} y={h * 0.84} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
          {kwText}
        </text>
      </g>
    );
  }

  const footerH = h <= 44 ? 13 : 15;
  const bodyH = h - footerH;
  const mScale = Math.min(1.0, (bodyH - 4) / 24);
  const label = `${name} · ${kwText}`;

  return (
    <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
      <title>{meter ? `${meter.tag} (${meter.label}) — Double-click to open PMS` : name}</title>
      <rect x={0} y={0} width={w} height={h} rx={3.5} fill="#fff7ed" stroke="#c2410c" strokeWidth={1.5} />
      <g transform={`translate(${w / 2}, ${bodyH / 2}) scale(${mScale})`}>
        <rect x={-14} y={-11} width={28} height={22} rx={2} fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
        <rect x={-10} y={-8} width={20} height={10} rx={1} fill="#38bdf8" />
        <text x={0} y={-0.5} textAnchor="middle" fill="#0f172a" fontSize="6" fontFamily="monospace" fontWeight="900">
          {meter?.meterType === 'PM8000' ? 'PM8K' : 'MFM'}
        </text>
        <circle cx={-5} cy={6.5} r={1.4} fill="#22c55e" />
        <circle cx={0} cy={6.5} r={1.4} fill="#facc15" />
        <circle cx={5} cy={6.5} r={1.4} fill="#ef4444" />
      </g>
      <rect x={0.5} y={bodyH} width={w - 1} height={footerH - 0.5} rx={2} fill="#7c2d12" />
      <text
        x={w / 2}
        y={bodyH + footerH - 3.5}
        textAnchor="middle"
        fill="#fed7aa"
        fontSize={label.length > 16 ? '6.8' : '7.5'}
        fontFamily="monospace"
        fontWeight="900"
      >
        {label}
      </text>
    </g>
  );
};

type SensorIconKind = 'temp' | 'humidity' | 'dewpoint' | 'pressure' | 'flow' | 'level';

function detectSensorKind(sensor?: AnalogSensor, name = ''): SensorIconKind {
  const tag = (sensor?.tag ?? '').toUpperCase();
  const unit = (sensor?.unit ?? '').toLowerCase();
  const nm = name.toUpperCase();
  if (tag.includes('_DP') || nm.includes('DEW') || nm.includes('_DP') || tag.includes('AIT')) return 'dewpoint';
  if (unit.includes('rh') || tag.includes('RAH') || tag.includes('RH') || nm.includes('RH')) return 'humidity';
  if (unit.includes('°c') || unit.includes('c') && (tag.includes('TT') || tag.includes('RT') || tag.includes('STS') || tag.includes('RTS') || tag.includes('TIT') || tag.includes('SAT') || tag.includes('RAT'))) {
    return 'temp';
  }
  if (tag.includes('FIT') || unit.includes('m3') || unit.includes('l/') || unit.includes('lpm') || nm.includes('FLOW')) return 'flow';
  if (tag.includes('LT') || (unit === '%' && (tag.includes('LT') || nm.includes('TK-') || nm.includes('LT')))) return 'level';
  if (
    unit.includes('bar') ||
    unit.includes('pa') ||
    tag.includes('PIT') ||
    tag.includes('DPT') ||
    tag.includes('WPS') ||
    tag.includes('PS') ||
    tag.includes('SAS')
  ) {
    return 'pressure';
  }
  return 'temp';
}

const SensorGlyph: React.FC<{ kind: SensorIconKind; isAlarm: boolean }> = ({ kind, isAlarm }) => {
  const stroke = isAlarm ? '#ffffff' : '#0f172a';
  switch (kind) {
    case 'temp':
      return (
        <g>
          {/* Industrial Thermometer */}
          <rect x={-1.8} y={-6.5} width={3.6} height={8.5} rx={1.8} fill="#ffffff" stroke={stroke} strokeWidth={0.9} />
          <circle cx={0} cy={4} r={3.0} fill={isAlarm ? '#fef08a' : '#ef4444'} stroke={stroke} strokeWidth={0.9} />
          <line x1={0} y1={-3.5} x2={0} y2={3.6} stroke={isAlarm ? '#dc2626' : '#ef4444'} strokeWidth={1.6} strokeLinecap="round" />
          <line x1={2.6} y1={-4.5} x2={4.4} y2={-4.5} stroke={stroke} strokeWidth={0.8} />
          <line x1={2.6} y1={-2.0} x2={4.0} y2={-2.0} stroke={stroke} strokeWidth={0.8} />
          <line x1={2.6} y1={0.5} x2={4.4} y2={0.5} stroke={stroke} strokeWidth={0.8} />
        </g>
      );
    case 'humidity':
      return (
        <g>
          {/* Humidity Water Drop */}
          <path
            d="M 0 -6.4 C 2.2 -3.2, 5.0 -0.2, 5.0 2.5 A 5.0 5.0 0 1 1 -5.0 2.5 C -5.0 -0.2, -2.2 -3.2, 0 -6.4 Z"
            fill={isAlarm ? '#fef08a' : '#0ea5e9'}
            stroke={stroke}
            strokeWidth={0.95}
          />
          <path d="M -2.2 2.4 A 2.4 2.4 0 0 0 0.2 4.8" fill="none" stroke="#ffffff" strokeWidth={1.0} strokeLinecap="round" />
          <text x={0.2} y={3.1} textAnchor="middle" fill="#ffffff" fontSize="4.6" fontFamily="monospace" fontWeight="900">
            %
          </text>
        </g>
      );
    case 'dewpoint':
      return (
        <g>
          {/* Dew Point Cold Droplet + Frost Star */}
          <path
            d="M -1.4 -6.0 C 0.5 -3.0, 3.0 -0.4, 3.0 2.0 A 4.4 4.4 0 1 1 -5.8 2.0 C -5.8 -0.4, -3.3 -3.0, -1.4 -6.0 Z"
            fill={isAlarm ? '#fef08a' : '#06b6d4'}
            stroke={stroke}
            strokeWidth={0.9}
          />
          <g transform="translate(3.6, -2.4)" stroke={isAlarm ? '#ffffff' : '#0284c7'} strokeWidth={1.0} strokeLinecap="round">
            <line x1={0} y1={-2.8} x2={0} y2={2.8} />
            <line x1={-2.5} y1={-1.4} x2={2.5} y2={1.4} />
            <line x1={-2.5} y1={1.4} x2={2.5} y2={-1.4} />
          </g>
        </g>
      );
    case 'pressure':
      return (
        <g>
          {/* Dial Pressure Gauge */}
          <circle cx={0} cy={-0.6} r={5.8} fill="#ffffff" stroke={stroke} strokeWidth={1.05} />
          <path d="M -3.8 1.2 A 4.2 4.2 0 1 1 3.8 1.2" fill="none" stroke="#0284c7" strokeWidth={1.0} />
          <line x1={0} y1={-0.6} x2={3.0} y2={-3.4} stroke="#dc2626" strokeWidth={1.25} strokeLinecap="round" />
          <circle cx={0} cy={-0.6} r={1.2} fill="#0f172a" />
          <rect x={-1.5} y={5.0} width={3.0} height={2.2} fill="#475569" />
        </g>
      );
    case 'flow':
      return (
        <g>
          {/* Inline Pipe Flowmeter */}
          <rect x={-6.4} y={-3.0} width={12.8} height={6.0} rx={1.2} fill="#e0f2fe" stroke={stroke} strokeWidth={0.95} />
          <path d="M -4.2 0 L 2.2 0 M 0.4 -2.2 L 3.4 0 L 0.4 2.2" fill="none" stroke="#0284c7" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
          <line x1={0} y1={-3.0} x2={0} y2={-5.8} stroke={stroke} strokeWidth={1.0} />
          <rect x={-2.6} y={-7.0} width={5.2} height={2.4} rx={0.6} fill="#334155" />
        </g>
      );
    case 'level':
      return (
        <g>
          {/* Tank Level Transmitter */}
          <rect x={-4.8} y={-5.8} width={9.6} height={11.6} rx={1.5} fill="#f8fafc" stroke={stroke} strokeWidth={1.0} />
          <rect x={-4.0} y={-0.6} width={8.0} height={5.6} rx={0.8} fill="#38bdf8" />
          <line x1={-4.0} y1={-0.6} x2={4.0} y2={-0.6} stroke="#0284c7" strokeWidth={1.0} />
          <line x1={-2.4} y1={-3.4} x2={2.4} y2={-3.4} stroke="#64748b" strokeWidth={0.8} />
        </g>
      );
  }
};

export const FloorSensorIconTile: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  sensor?: AnalogSensor;
  onDoubleClick: () => void;
}> = ({ x, y, w = 96, h = 24, name, sensor, onDoubleClick }) => {
  const lvl = sensor?.alarms.activeLevel;
  const isCritical = lvl === 'FAULT' || lvl === 'HHA' || lvl === 'LLA';
  const isWarn = lvl === 'HA' || lvl === 'LA';

  const fill = isCritical ? '#ef4444' : isWarn ? '#fef08a' : '#ffffff';
  const stroke = isCritical ? '#991b1b' : isWarn ? '#a16207' : '#15803d';
  const text = isCritical ? '#ffffff' : '#052e16';
  const iconBg = isCritical ? '#b91c1c' : isWarn ? '#fde047' : '#ecfdf5';
  const iconDivider = isCritical ? '#7f1d1d' : isWarn ? '#ca8a04' : '#86efac';

  const valStr = sensor ? `${sensor.pv.toFixed(sensor.decimals)} ${sensor.unit}` : '--';
  const kind = detectSensorKind(sensor, name);
  const iconW = w <= 86 ? 17 : 20;
  const labelFont = w <= 86 ? '6.6' : '7.2';
  const valFont = w <= 86 ? '7.8' : '8.4';

  return (
    <g transform={`translate(${x}, ${y})`} onDoubleClick={onDoubleClick} className="cursor-default">
      <title>{sensor ? `${sensor.tag} (${sensor.label}) — Double-click to open primary screen` : name}</title>
      <rect x={0} y={0} width={w} height={h} rx={2.5} fill={fill} stroke={stroke} strokeWidth={1.25} />
      {/* Left Instrumentation Icon Badge */}
      <rect x={0.7} y={0.7} width={iconW} height={h - 1.4} rx={1.8} fill={iconBg} />
      <line x1={iconW + 0.7} y1={1} x2={iconW + 0.7} y2={h - 1} stroke={iconDivider} strokeWidth={0.9} />
      <g transform={`translate(${iconW / 2 + 0.7}, ${h / 2}) scale(${w <= 86 ? 0.82 : 0.92})`}>
        <SensorGlyph kind={kind} isAlarm={isCritical} />
      </g>
      <text x={iconW + 3.5} y={9.5} fill={text} fontSize={labelFont} fontFamily="monospace" fontWeight="800">
        {name}
      </text>
      <text x={w - 3.5} y={h - 3.8} textAnchor="end" fill={text} fontSize={valFont} fontFamily="monospace" fontWeight="900">
        {valStr}
      </text>
    </g>
  );
};
