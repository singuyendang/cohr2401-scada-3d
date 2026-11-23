import React from 'react';
import type { AnalogSensor, EquipmentUnit, ValveUnit } from '../../types/scada.ts';
import { sensorAlarmColor, statusColor, valveColor } from './scadaColors.ts';

export interface PipeSegment {
  d: string;
  flowing: boolean;
  reverse?: boolean;
}

/**
 * Seamless 4-pass WinCC 3D industrial pipe network.
 * Draws all outer dark casings first, then all fluid interiors on top with round linejoins,
 * eliminating ugly step-seams and black cut lines at every 90° elbow and T-junction!
 */
export const WinccPipeNetwork: React.FC<{
  segments: PipeSegment[];
  color: string;
  strokeWidth?: number;
  flowColor?: string;
}> = ({ segments, color, strokeWidth = 10, flowColor = '#fef08a' }) => (
  <g>
    {/* Pass 1: Unified dark metallic outer casing */}
    {segments.map((seg, i) => (
      <path
        key={`c-${i}`}
        d={seg.d}
        fill="none"
        stroke="#273449"
        strokeWidth={strokeWidth + 2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
    {/* Pass 2: Seamless fluid interior (merges T-junctions & elbows with zero cut lines) */}
    {segments.map((seg, i) => (
      <path
        key={`f-${i}`}
        d={seg.d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={seg.flowing ? 0.98 : 0.65}
      />
    ))}
    {/* Pass 3: 3D cylindrical specular highlight */}
    {segments.map((seg, i) => (
      <path
        key={`h-${i}`}
        d={seg.d}
        fill="none"
        stroke="#ffffff"
        strokeWidth={Math.max(1.6, strokeWidth * 0.24)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.34}
      />
    ))}
    {/* Pass 4: Animated flow pulse on running segments */}
    {segments.map(
      (seg, i) =>
        seg.flowing && (
          <path
            key={`a-${i}`}
            d={seg.d}
            fill="none"
            stroke={flowColor}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={seg.reverse ? 'animate-pipe-flow-reverse' : 'animate-pipe-flow'}
          />
        )
    )}
  </g>
);

/**
 * Machined flanged T-junction fitting (co chữ T) overlaid smoothly on perpendicular pipe joins.
 */
export const PipeTee: React.FC<{
  x: number;
  y: number;
  color: string;
  orientation: 'up' | 'down' | 'left' | 'right';
  size?: number;
}> = ({ x, y, color, orientation, size = 10 }) => {
  const rot =
    orientation === 'down'
      ? 0
      : orientation === 'up'
      ? 180
      : orientation === 'right'
      ? -90
      : 90;
  const r = size / 2;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot})`}>
      {/* Tee body sleeve */}
      <rect x={-(r + 5)} y={-(r + 1)} width={size + 10} height={size + 2} rx={2} fill={color} stroke="#273449" strokeWidth={1.2} />
      <rect x={-(r + 1)} y={-1} width={size + 2} height={r + 6} rx={1.5} fill={color} stroke="#273449" strokeWidth={1.2} />
      {/* Cover inner joint line seamlessly */}
      <rect x={-(r + 3.5)} y={-(r - 0.5)} width={size + 7} height={size - 1} fill={color} />
      <rect x={-(r - 0.5)} y={0} width={size - 1} height={r + 4.5} fill={color} />
      {/* 3D sheen */}
      <line x1={-(r + 3)} y1={-1.5} x2={r + 3} y2={-1.5} stroke="#ffffff" strokeWidth={1.6} opacity={0.4} />
      {/* Flanged collar rings on the 3 ports */}
      <line x1={-(r + 5)} y1={-(r + 2.5)} x2={-(r + 5)} y2={r + 2.5} stroke="#1e293b" strokeWidth={2.2} />
      <line x1={r + 5} y1={-(r + 2.5)} x2={r + 5} y2={r + 2.5} stroke="#1e293b" strokeWidth={2.2} />
      <line x1={-(r + 2.5)} y1={r + 5} x2={r + 2.5} y2={r + 5} stroke="#1e293b" strokeWidth={2.2} />
    </g>
  );
};

/**
 * Machined flanged 4-way cross fitting (co chữ thập) overlaid smoothly on aligned 4-way header junctions.
 */
export const PipeCross: React.FC<{
  x: number;
  y: number;
  color: string;
  size?: number;
}> = ({ x, y, color, size = 10 }) => {
  const r = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-(r + 5)} y={-(r + 1)} width={size + 10} height={size + 2} rx={2} fill={color} stroke="#273449" strokeWidth={1.2} />
      <rect x={-(r + 1)} y={-(r + 5)} width={size + 2} height={size + 10} rx={2} fill={color} stroke="#273449" strokeWidth={1.2} />
      <rect x={-(r + 3.5)} y={-(r - 0.5)} width={size + 7} height={size - 1} fill={color} />
      <rect x={-(r - 0.5)} y={-(r + 3.5)} width={size - 1} height={size + 7} fill={color} />
      <line x1={-(r + 3)} y1={-1.5} x2={r + 3} y2={-1.5} stroke="#ffffff" strokeWidth={1.5} opacity={0.4} />
      <line x1={-(r + 5)} y1={-(r + 2.5)} x2={-(r + 5)} y2={r + 2.5} stroke="#1e293b" strokeWidth={2.2} />
      <line x1={r + 5} y1={-(r + 2.5)} x2={r + 5} y2={r + 2.5} stroke="#1e293b" strokeWidth={2.2} />
      <line x1={-(r + 2.5)} y1={-(r + 5)} x2={r + 2.5} y2={-(r + 5)} stroke="#1e293b" strokeWidth={2.2} />
      <line x1={-(r + 2.5)} y1={r + 5} x2={r + 2.5} y2={r + 5} stroke="#1e293b" strokeWidth={2.2} />
    </g>
  );
};

/**
 * Small yellow WinCC directional flow arrow placed directly on pipes.
 */
export const PipeArrow: React.FC<{
  x: number;
  y: number;
  dir: 'right' | 'left' | 'up' | 'down';
  active?: boolean;
  fill?: string;
}> = ({ x, y, dir, active = true, fill = '#fde047' }) => {
  const rot = dir === 'right' ? 0 : dir === 'down' ? 90 : dir === 'left' ? 180 : -90;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rot})`} opacity={active ? 1 : 0.4}>
      <polygon points="-7,-2.4 1,-2.4 1,-5.2 7.5,0 1,5.2 1,2.4 -7,2.4" fill={fill} stroke="#1e293b" strokeWidth={0.9} />
    </g>
  );
};

/**
 * WinCC Pipe-Mounted Transmitter Symbol (Pressure PT / Temperature TT / Flow FT).
 * Anchor (x, y) MUST lie directly on the pipe centerline!
 */
export const PipeSensorBadge: React.FC<{
  x: number;
  y: number;
  sensor: AnalogSensor;
  shortLabel?: string;
  stemDir?: 'top' | 'bottom' | 'left' | 'right';
  labelPos?: 'top' | 'bottom' | 'left' | 'right';
  onClick: () => void;
}> = ({ x, y, sensor, shortLabel, stemDir = 'top', labelPos = 'bottom', onClick }) => {
  const isAlarm = sensor.alarms.activeLevel !== 'NORMAL';
  const alarmCol = sensorAlarmColor(sensor);
  const isTemp = sensor.kind === 'TIT';
  const lcdBg = sensor.faulted ? '#ef4444' : isAlarm ? '#f59e0b' : '#4ade80';
  const lcdText = sensor.faulted ? '#ffffff' : '#052e16';
  const title = shortLabel ?? sensor.tag;

  const headX = stemDir === 'left' ? -13 : stemDir === 'right' ? 13 : 0;
  const headY = stemDir === 'top' ? -13 : stemDir === 'bottom' ? 13 : 0;

  const boxX =
    labelPos === 'left'
      ? stemDir === 'left'
        ? -98
        : -92
      : labelPos === 'right'
      ? stemDir === 'right'
        ? 25
        : 20
      : -34;
  const boxY =
    labelPos === 'top'
      ? stemDir === 'top'
        ? -45
        : -40
      : labelPos === 'bottom'
      ? stemDir === 'bottom'
        ? 30
        : 14
      : -8;

  return (
    <g data-scada-tag={sensor.tag} transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer group">
      {/* Direct weld boss + stem seated squarely on pipe centerline (0,0) */}
      <circle cx={0} cy={0} r={4} fill="#1e293b" stroke="#cbd5e1" strokeWidth={0.8} />
      <line x1={0} y1={0} x2={headX} y2={headY} stroke="#0f172a" strokeWidth={2.4} />

      {/* WinCC Transmitter Head */}
      {isTemp ? (
        <g transform={`translate(${headX}, ${headY})`}>
          <rect x={-5} y={-4} width={10} height={5} rx={1} fill="#334155" stroke="#0f172a" strokeWidth={1} />
          <line x1={0} y1={1} x2={0} y2={6} stroke="#0f172a" strokeWidth={1.8} />
        </g>
      ) : (
        <g transform={`translate(${headX}, ${headY})`}>
          <rect x={-7} y={-7} width={14} height={12} rx={2} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.2} />
          <circle cx={0} cy={-1} r={4} fill="#ffffff" stroke="#334155" strokeWidth={1} />
          <line x1={0} y1={-1} x2={2.5} y2={-3.5} stroke="#ef4444" strokeWidth={1} />
        </g>
      )}

      {/* Tag label + WinCC LCD Readout Box */}
      <g transform={`translate(${boxX}, ${boxY})`}>
        <text
          x={32}
          y={-3}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="8.5"
          fontFamily="monospace"
          fontWeight="800"
        >
          {title}
        </text>
        <rect
          x={0}
          y={0}
          width={64}
          height={16}
          rx={1.5}
          fill={lcdBg}
          stroke={isAlarm ? alarmCol : '#0f172a'}
          strokeWidth={isAlarm ? 1.8 : 1.1}
          className={isAlarm ? 'animate-alarm-flash' : 'group-hover:stroke-blue-600'}
        />
        <text
          x={32}
          y={11.5}
          textAnchor="middle"
          fill={lcdText}
          fontSize="9.5"
          fontFamily="monospace"
          fontWeight="800"
        >
          {sensor.faulted ? 'FAULT' : sensor.pv.toFixed(sensor.decimals)}
        </text>
        <text x={67} y={11.5} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
          {sensor.unit}
        </text>
        {sensor.manualOverride && (
          <>
            <rect x={50} y={-11} width={19} height={9} rx={1} fill="#f59e0b" />
            <text x={59.5} y={-4} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="800">
              OVR
            </text>
          </>
        )}
      </g>
    </g>
  );
};

/**
 * Small WinCC PID Trend Curve Icon Button (CHWP-PID, CWP-PID, CT-PID).
 */
export const PidIconButton: React.FC<{
  x: number;
  y: number;
  label?: string;
  labelSide?: 'left' | 'bottom' | 'none';
  onClick: () => void;
}> = ({ x, y, label, labelSide = 'left', onClick }) => (
  <g transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer group">
    <rect
      x={0}
      y={0}
      width={22}
      height={20}
      rx={2}
      fill="#f8fafc"
      stroke="#334155"
      strokeWidth={1.2}
      className="group-hover:stroke-blue-600"
    />
    <line x1={3} y1={16} x2={19} y2={16} stroke="#94a3b8" strokeWidth={0.8} />
    <line x1={3} y1={4} x2={3} y2={16} stroke="#94a3b8" strokeWidth={0.8} />
    <path d="M 4 14 Q 8 5, 12 10 T 19 7" fill="none" stroke="#2563eb" strokeWidth={1.3} />
    <path d="M 4 11 Q 9 14, 14 7 T 19 10" fill="none" stroke="#dc2626" strokeWidth={1.1} />
    {label && labelSide === 'left' && (
      <text x={-5} y={13} textAnchor="end" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
        {label}
      </text>
    )}
    {label && labelSide === 'bottom' && (
      <text x={11} y={30} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
        {label}
      </text>
    )}
  </g>
);

/**
 * Realistic WinCC 3D Centrifugal Pump Icon (volute scroll + discharge nozzle + spinning impeller + M/A + Hz LCD).
 */
export const WinccPumpSymbol: React.FC<{
  x: number;
  y: number;
  unit: EquipmentUnit;
  shortTag: string;
  direction?: 'right' | 'left';
  onClick: () => void;
}> = ({ x, y, unit, shortTag, direction = 'right', onClick }) => {
  const isRunning = unit.status === 'RUNNING';
  const fill = statusColor(unit.status);
  const bodyGrad = isRunning ? '#86efac' : unit.faulted ? '#fca5a5' : '#e2e8f0';

  return (
    <g data-scada-tag={unit.tag} transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer group">
      <text x={0} y={-20} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
        {shortTag}
      </text>

      {/* Centrifugal pump volute + top discharge nozzle + baseplate (flipped when flow is right-to-left) */}
      <g transform={direction === 'left' ? 'scale(-1, 1)' : undefined}>
        <rect x={-16} y={12} width={32} height={4} rx={1} fill="#475569" stroke="#0f172a" strokeWidth={1} />
        <rect x={2} y={-15} width={14} height={9} rx={1} fill={bodyGrad} stroke="#0f172a" strokeWidth={1.2} />
        <circle
          cx={0}
          cy={0}
          r={14}
          fill={bodyGrad}
          stroke={unit.faulted ? '#dc2626' : '#0f172a'}
          strokeWidth={unit.faulted ? 2.2 : 1.5}
          className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <circle cx={0} cy={0} r={8.5} fill={fill} opacity={0.85} stroke="#0f172a" strokeWidth={0.9} />
        <g className={isRunning ? 'animate-fan-spin' : ''}>
          <line x1={-6} y1={0} x2={6} y2={0} stroke="#0f172a" strokeWidth={1.6} />
          <line x1={0} y1={-6} x2={0} y2={6} stroke="#0f172a" strokeWidth={1.6} />
        </g>
        <circle cx={0} cy={0} r={2.5} fill="#f8fafc" stroke="#0f172a" strokeWidth={0.8} />
      </g>

      <g transform="translate(-38, 18)">
        <rect x={0} y={0} width={11} height={13} fill={unit.faulted ? '#ef4444' : isRunning ? '#22c55e' : '#eab308'} stroke="#0f172a" strokeWidth={0.9} />
        <text x={5.5} y={10} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
          {isRunning ? '1' : '0'}
        </text>
        <rect x={12} y={0} width={12} height={13} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
        <text x={18} y={10} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
          {unit.mode === 'AUTO' ? 'A' : 'M'}
        </text>
        <rect x={25} y={0} width={38} height={13} fill={unit.faulted ? '#ef4444' : '#4ade80'} stroke="#0f172a" strokeWidth={0.9} />
        <text x={44} y={10} textAnchor="middle" fill={unit.faulted ? '#ffffff' : '#052e16'} fontSize="8.5" fontFamily="monospace" fontWeight="800">
          {unit.kind === 'dol'
            ? unit.faulted
              ? 'FLT'
              : isRunning
              ? 'RUN'
              : 'STOP'
            : unit.frequencyHz.toFixed(1)}
        </text>
        {unit.kind !== 'dol' && (
          <text x={65} y={10} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="700">
            Hz
          </text>
        )}
      </g>
    </g>
  );
};

/**
 * Realistic WinCC 3D Motorized Valve (Actuator top + stem + flanged valve body inline on pipe).
 */
export const WinccValveSymbol: React.FC<{
  x: number;
  y: number;
  valve: ValveUnit;
  shortLabel?: string;
  vertical?: boolean;
  onClick: () => void;
}> = ({ x, y, valve, shortLabel, vertical = false, onClick }) => {
  const fill = valveColor(valve);
  const isCval = valve.kind === 'CVAL';
  const label = shortLabel ?? valve.tag.replace(/^B5[0-9M]?F_/, '');

  return (
    <g data-scada-tag={valve.tag} transform={`translate(${x}, ${y})`} onClick={onClick} className="cursor-pointer group">
      <g transform={vertical ? 'rotate(90)' : undefined}>
        <line x1={-11} y1={-7} x2={-11} y2={7} stroke="#0f172a" strokeWidth={2.2} />
        <line x1={11} y1={-7} x2={11} y2={7} stroke="#0f172a" strokeWidth={2.2} />
        <polygon points="-10,-6 0,0 -10,6" fill={fill} stroke="#0f172a" strokeWidth={1.1} />
        <polygon points="10,-6 0,0 10,6" fill={fill} stroke="#0f172a" strokeWidth={1.1} />
        <line x1={0} y1={0} x2={0} y2={-12} stroke="#0f172a" strokeWidth={1.8} />
        {isCval ? (
          <path d="M -9,-12 A 9,8 0 0,1 9,-12 Z" fill="#334155" stroke="#0f172a" strokeWidth={1.1} />
        ) : (
          <rect x={-7} y={-20} width={14} height={9} rx={1.5} fill="#475569" stroke="#0f172a" strokeWidth={1.1} />
        )}
      </g>

      <g transform={vertical ? 'translate(-24, -6)' : 'translate(-22, -21)'}>
        <rect x={0} y={0} width={11} height={11} fill={valve.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.8} />
        <text x={5.5} y={8.5} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontFamily="monospace" fontWeight="800">
          {valve.mode === 'AUTO' ? 'A' : 'M'}
        </text>
      </g>

      {label && (
        <text
          x={vertical ? -17 : 13}
          y={vertical ? 14 : -13}
          textAnchor={vertical ? 'end' : 'start'}
          fill="#0f172a"
          fontSize="8"
          fontFamily="monospace"
          fontWeight="800"
        >
          {label}
        </text>
      )}

      {isCval && (
        <g transform="translate(-17, 10)">
          <rect x={0} y={0} width={34} height={13} fill="#4ade80" stroke="#0f172a" strokeWidth={0.9} />
          <text x={17} y={10} textAnchor="middle" fill="#052e16" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {valve.positionPct.toFixed(0)}%
          </text>
        </g>
      )}
    </g>
  );
};

/**
 * Realistic WinCC 3D Industrial Chiller Machine Graphic (CHI1-1..CHI1-4).
 */
export const WinccChillerSymbol: React.FC<{
  x: number;
  y: number;
  unit: EquipmentUnit;
  displayCode: string;
  subtitle?: string;
  onClickControl: () => void;
  onClickData: () => void;
}> = ({ x, y, unit, displayCode, subtitle, onClickControl, onClickData }) => {
  const isRunning = unit.status === 'RUNNING';
  const isFault = unit.faulted;
  const col = statusColor(unit.status);
  const vesselFill = isRunning ? '#bbf7d0' : isFault ? '#fecaca' : '#e2e8f0';

  return (
    <g data-scada-tag={unit.tag} transform={`translate(${x}, ${y})`}>
      <g onClick={onClickControl} className="cursor-pointer group">
        {/* Base support legs */}
        <rect x={8} y={44} width={8} height={8} fill="#475569" stroke="#0f172a" strokeWidth={1} />
        <rect x={76} y={44} width={8} height={8} fill="#475569" stroke="#0f172a" strokeWidth={1} />

        {/* Upper Compressor & Control Panel Unit */}
        <rect x={16} y={-2} width={32} height={22} rx={2} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.2} />
        <rect x={21} y={2} width={22} height={14} rx={1} fill="#94a3b8" stroke="#334155" strokeWidth={0.9} />
        <rect x={52} y={0} width={30} height={20} rx={3} fill={isRunning ? '#86efac' : '#cbd5e1'} stroke="#0f172a" strokeWidth={1.2} />
        <line x1={57} y1={4} x2={77} y2={4} stroke="#475569" strokeWidth={1} />
        <line x1={57} y1={8} x2={77} y2={8} stroke="#475569" strokeWidth={1} />
        <line x1={57} y1={12} x2={77} y2={12} stroke="#475569" strokeWidth={1} />
        <line x1={57} y1={16} x2={77} y2={16} stroke="#475569" strokeWidth={1} />

        {/* Lower Main Evaporator/Condenser Horizontal Cylindrical Vessel */}
        <rect
          x={4}
          y={20}
          width={84}
          height={25}
          rx={6}
          fill={vesselFill}
          stroke={isFault ? '#dc2626' : '#0f172a'}
          strokeWidth={isFault ? 2.4 : 1.5}
          className={isFault ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <rect x={8} y={23} width={76} height={4} rx={2} fill="#ffffff" opacity={0.5} />
        <line x1={12} y1={20} x2={12} y2={45} stroke="#475569" strokeWidth={1.1} />
        <line x1={80} y1={20} x2={80} y2={45} stroke="#475569" strokeWidth={1.1} />

        <text x={46} y={36} textAnchor="middle" fill="#0f172a" fontSize="10.5" fontFamily="monospace" fontWeight="900">
          {displayCode}
        </text>

        <g transform="translate(8, 2)">
          <rect x={0} y={0} width={11} height={12} fill={col} stroke="#0f172a" strokeWidth={0.9} />
          <text x={5.5} y={9.5} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
            {isRunning ? '1' : '0'}
          </text>
          <rect x={12} y={0} width={11} height={12} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
          <text x={17.5} y={9.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
            {unit.mode === 'AUTO' ? 'A' : 'M'}
          </text>
        </g>

        <text x={46} y={56} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
          {subtitle ? `${subtitle} · ${unit.loadPct.toFixed(0)}%` : `${unit.loadPct.toFixed(0)}% FLA`}
        </text>
      </g>

      <g onClick={onClickData} className="cursor-pointer">
        <rect x={89} y={2} width={28} height={13} rx={2} fill="#1e3a8a" stroke="#0f172a" strokeWidth={0.9} />
        <text x={103} y={11.5} textAnchor="middle" fill="#e0f2fe" fontSize="7.5" fontFamily="monospace" fontWeight="800">
          DATA
        </text>
      </g>
    </g>
  );
};

/**
 * Realistic WinCC 3D FRP Industrial Cooling Tower Graphic (CT1..CT9).
 */
export const WinccCoolingTowerSymbol: React.FC<{
  x: number;
  y: number;
  index: number;
  fan: EquipmentUnit;
  inValve: ValveUnit;
  outValve: ValveUnit;
  onClickFan: () => void;
  onClickInValve: () => void;
  onClickOutValve: () => void;
  onClickPid: () => void;
}> = ({ x, y, index, fan, inValve, outValve, onClickFan, onClickInValve, onClickOutValve, onClickPid }) => {
  const isRunning = fan.status === 'RUNNING';
  const isFault = fan.faulted;
  const bodyTint = isRunning ? '#bbf7d0' : isFault ? '#fecaca' : '#d8dee9';

  return (
    <g transform={`translate(${x}, ${y})`}>
      <PidIconButton x={-10} y={-54} onClick={onClickPid} />

      <WinccValveSymbol
        x={28}
        y={-32}
        valve={inValve}
        shortLabel={`IV1${index}`}
        vertical
        onClick={onClickInValve}
      />

      <g data-scada-tag={fan.tag} onClick={onClickFan} className="cursor-pointer group">
        <rect x={16} y={-8} width={24} height={12} rx={2} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.2} />
        <g transform="translate(28, -2)">
          <g className={isRunning ? 'animate-fan-spin' : ''}>
            <line x1={-7} y1={0} x2={7} y2={0} stroke={isRunning ? '#15803d' : '#475569'} strokeWidth={2} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke={isRunning ? '#15803d' : '#475569'} strokeWidth={2} />
          </g>
        </g>

        <path
          d="M 10 4 L 46 4 L 52 54 L 4 54 Z"
          fill={bodyTint}
          stroke={isFault ? '#dc2626' : '#0f172a'}
          strokeWidth={isFault ? 2.2 : 1.4}
          className={isFault ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <line x1={10} y1={14} x2={46} y2={14} stroke="#64748b" strokeWidth={0.9} />
        <line x1={9} y1={22} x2={47} y2={22} stroke="#64748b" strokeWidth={0.9} />
        <rect x={3} y={54} width={50} height={10} rx={2} fill="#94a3b8" stroke="#0f172a" strokeWidth={1.2} />

        <text x={2} y={3} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
          FN1{index}
        </text>

        <rect x={14} y={24} width={11} height={11} fill={isRunning ? '#22c55e' : isFault ? '#ef4444' : '#eab308'} stroke="#0f172a" strokeWidth={0.8} />
        <text x={19.5} y={32.5} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="800">
          {isRunning ? '1' : '0'}
        </text>
        <rect x={27} y={24} width={12} height={11} fill={fan.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.8} />
        <text x={33} y={32.5} textAnchor="middle" fill="#ffffff" fontSize="7.5" fontFamily="monospace" fontWeight="800">
          {fan.mode === 'AUTO' ? 'A' : 'M'}
        </text>
        <rect x={8} y={38} width={38} height={13} fill="#4ade80" stroke="#0f172a" strokeWidth={0.9} />
        <text x={27} y={47.5} textAnchor="middle" fill="#052e16" fontSize="8.5" fontFamily="monospace" fontWeight="800">
          {fan.frequencyHz.toFixed(1)}
        </text>
        <text x={47} y={47.5} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="700">
          Hz
        </text>

        <text x={28} y={76} textAnchor="middle" fill="#0f172a" fontSize="10" fontFamily="monospace" fontWeight="900">
          CT{index}
        </text>
      </g>

      <WinccValveSymbol
        x={28}
        y={94}
        valve={outValve}
        shortLabel={`OV1${index}`}
        vertical
        onClick={onClickOutValve}
      />
    </g>
  );
};
