import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import type { LocatedTarget } from '../store/b5Store.ts';
import type { AnalogSensor, B5ScreenId, EquipmentUnit, FaceplateType, ValveUnit } from '../types/scada.ts';
import {
  FloorEquipmentIconTile,
  FloorMeterIconTile,
  FloorSensorIconTile,
  FloorValveIconTile,
} from '../components/scada/FloorOverviewIcons.tsx';

/**
 * Building 5 Architectural Floor Overview Monitor Screens
 *  - Grounded in GraCS CAD Drawings 1555601 (1F), 1555602 (M1F), 1555603 (2F), 1555604 (M2F)
 *    and WinCC Scr_B5_1F_Overview.Pdl, Scr_B5_M1F_Overview.Pdl, Scr_B5_2F_Overview.Pdl, Scr_B5_M2F_Overview.Pdl.
 *  - High-contrast zone color separation + structural column grid (5.X1–5.X9 / 5.Y1–5.Y9).
 *  - ZERO animations & ZERO single-click controls (clean monitor view).
 *  - DOUBLE-CLICK any equipment, valve, or sensor tile to jump straight to its primary interactive screen
 *    (prioritizing the screen where that device can be clicked to open its faceplate popup).
 */

// Exact Building 5 Structural Column Grid Coordinates (matching 1555601..1555604)
const X_COLS: { id: string; x: number }[] = [
  { id: '5.X1', x: 56 },
  { id: '5.X2', x: 186 },
  { id: '5.X3', x: 316 },
  { id: '5.X4', x: 446 },
  { id: '5.X5', x: 576 },
  { id: '5.X6', x: 742 },
  { id: '5.X7', x: 908 },
  { id: '5.X8', x: 1084 },
  { id: '5.X9', x: 1260 },
];

const Y_ROWS: { id: string; y: number }[] = [
  { id: '5.Y9', y: 54 },
  { id: '5.Y8', y: 158 },
  { id: '5.Y7', y: 268 },
  { id: '5.Y6', y: 378 },
  { id: '5.Y5', y: 486 },
  { id: '5.Y4', y: 586 },
  { id: '5.Y2', y: 656 },
  { id: '5.Y1', y: 726 },
];

/**
 * Resolves the highest-priority main screen + faceplate popup for any equipment / valve / sensor tag.
 * When a device appears on multiple screens (e.g. CH14 on Chiller & Heat Recovery, AHUs on CW AHU & AIR AHU),
 * prioritizes the primary screen where clicking the device opens its full interactive faceplate popup.
 */
function resolveEquipmentTarget(eq?: EquipmentUnit): LocatedTarget | null {
  if (!eq) return null;
  const { tag, label, subsystem, kind } = eq;
  let screen: B5ScreenId = 'b5_chiller';
  let faceplateType: FaceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';

  switch (subsystem) {
    case 'chiller':
      screen = 'b5_chiller';
      faceplateType = kind === 'chiller' ? 'Fpl_CH' : kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
      break;
    case 'heat_recovery':
      screen = 'b5_heat_recovery';
      faceplateType = kind === 'chiller' ? 'Fpl_CH' : 'Fpl_VFD';
      break;
    case 'pcw':
      screen = 'b5_pcw';
      faceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
      break;
    case 'di':
      screen = 'b5_di';
      break;
    case 'ofrac':
      screen = 'b5_ofrac';
      faceplateType = kind === 'ac_vsd' || kind === 'ac_fix' ? 'Fpl_AC' : 'Fpl_DOL';
      break;
    case 'oflac':
      screen = 'b5_oflac';
      faceplateType = kind === 'ac_vsd' || kind === 'ac_fix' ? 'Fpl_AC' : 'Fpl_DOL';
      break;
    case 'pv':
      screen = 'b5_pv';
      faceplateType = 'Fpl_PV';
      break;
    case 'ahu':
      screen = 'b5_air_ahu';
      faceplateType = tag.includes('PAU') ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint';
      break;
    case 'exh':
      screen = 'b5_exh';
      faceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
      break;
    case 'pms':
      screen = 'b5_pms';
      faceplateType = 'Fpl_PM8000';
      break;
  }

  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveValveTarget(v?: ValveUnit): LocatedTarget | null {
  if (!v) return null;
  const { tag, label, subsystem, kind } = v;
  if (subsystem === 'ahu') {
    const ahuTag = tag.replace(/_(CWCV|HWCV|CHCV)$/, '');
    const isPau = ahuTag.includes('PAU');
    const fp: FaceplateType = isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint';
    return {
      screen: 'b5_cw_ahu',
      tag: ahuTag,
      label: `${tag} (${label})`,
      faceplateType: fp,
      faceplateTitle: `${fp} · ${ahuTag}`,
    };
  }
  let screen: B5ScreenId = 'b5_pcw';
  if (subsystem === 'chiller') screen = 'b5_chiller';
  else if (subsystem === 'heat_recovery') screen = 'b5_heat_recovery';
  else if (subsystem === 'pcw') screen = 'b5_pcw';
  else if (subsystem === 'di') screen = 'b5_di';
  const faceplateType: FaceplateType = kind === 'CVAL' ? 'Fpl_CVAL' : 'Fpl_XVAL';
  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveSensorTarget(s?: AnalogSensor): LocatedTarget | null {
  if (!s) return null;
  const { tag, label, subsystem } = s;
  let screen: B5ScreenId = 'b5_chiller';
  if (subsystem === 'chiller') screen = 'b5_chiller';
  else if (subsystem === 'heat_recovery') screen = 'b5_heat_recovery';
  else if (subsystem === 'pcw') screen = 'b5_pcw';
  else if (subsystem === 'di') screen = 'b5_di';
  else if (subsystem === 'ofrac') screen = 'b5_ofrac';
  else if (subsystem === 'oflac') screen = 'b5_oflac';
  else if (subsystem === 'pv') screen = 'b5_pv';
  else if (subsystem === 'ahu') screen = 'b5_air_ahu';
  else if (subsystem === 'exh') screen = 'b5_exh';

  // For AHU room sensors, clicking the AHU/room block on AIR AHU opens Fpl_AHU_DewPoint (or Fpl_PAU)
  if (subsystem === 'ahu') {
    const ahuTag = tag.replace(/_(SAT|RAT|RAH|SAS|DP)$/, '');
    const isPau = ahuTag.includes('PAU');
    const fp: FaceplateType = isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint';
    return {
      screen,
      tag: ahuTag,
      label: `${tag} (${label})`,
      faceplateType: fp,
      faceplateTitle: `${fp} · ${ahuTag}`,
    };
  }

  return {
    screen,
    tag,
    label,
    faceplateType: 'Fpl_Sensor',
    faceplateTitle: `Fpl_Sensor · ${tag}`,
  };
}

/** Shared static architectural column grid + high-contrast envelope frame (1555601..1555604) */
const ArchitecturalGrid: React.FC<{
  floorTitle: string;
  drawingNo: string;
  hatchLeftHalf?: boolean;
}> = ({ floorTitle, drawingNo, hatchLeftHalf = false }) => {
  const x1 = X_COLS[0].x;
  const x2 = X_COLS[1].x;
  const x5 = X_COLS[4].x;
  const x8 = X_COLS[7].x;
  const x9 = X_COLS[8].x;
  const y9 = Y_ROWS[0].y;
  const y4 = Y_ROWS[5].y;
  const y1 = Y_ROWS[7].y;

  return (
    <g>
      <defs>
        <pattern id="cad-hatch" width="9" height="9" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#cbd5e1" />
          <line x1="0" y1="0" x2="0" y2="9" stroke="#94a3b8" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Distinct Architectural Drafting Sheet Background (cool drafting gray so colored zones pop!) */}
      <rect x={0} y={0} width={1340} height={768} fill="#d8dee9" />

      {/* Vertical Structural Column Gridlines (5.X1 .. 5.X9) */}
      {X_COLS.map((c) => (
        <g key={c.id}>
          <line x1={c.x} y1={32} x2={c.x} y2={746} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={c.x} cy={19} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={c.x} y={22.5} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {c.id}
          </text>
        </g>
      ))}

      {/* Horizontal Structural Column Gridlines (5.Y9 .. 5.Y1) */}
      {Y_ROWS.map((r) => (
        <g key={r.id}>
          <line x1={32} y1={r.y} x2={1294} y2={r.y} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={1312} cy={r.y} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={1312} y={r.y + 3} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {r.id}
          </text>
        </g>
      ))}

      {/* Main Building 5 Structural Envelope */}
      <rect x={x1} y={y9} width={x9 - x1} height={y4 - y9} fill="#e2e8f0" stroke="#1e293b" strokeWidth={2.5} />
      {/* Bottom-Left Annex */}
      <rect x={x1} y={y4} width={x2 - x1} height={y1 - y4} fill="#cbd5e1" stroke="#1e293b" strokeWidth={2.0} />
      {/* Bottom-Right Office / Staircase SC3 Wing */}
      <rect x={x8} y={y4} width={x9 - x8} height={y1 - y4} fill="#fef3c7" stroke="#1e293b" strokeWidth={2.2} />

      {/* Hatched Left Half (for M1F / 2F / M2F where 5.X1..5.X5 is unused/void) */}
      {hatchLeftHalf && (
        <>
          <rect x={x1 + 1} y={y9 + 1} width={x5 - x1 - 2} height={y4 - y9 - 2} fill="url(#cad-hatch)" />
          <rect x={x1 + 1} y={y4 + 1} width={x2 - x1 - 2} height={y1 - y4 - 2} fill="url(#cad-hatch)" />
          <rect x={146} y={295} width={340} height={44} rx={4} fill="#e2e8f0" stroke="#475569" strokeWidth={1.3} />
          <text x={316} y={314} textAnchor="middle" fill="#1e293b" fontSize="11.5" fontFamily="monospace" fontWeight="800">
            NON-MEZZANINE / FUTURE RESERVE BAY
          </text>
          <text x={316} y={330} textAnchor="middle" fill="#475569" fontSize="9.5" fontFamily="monospace" fontWeight="700">
            Columns 5.X1 – 5.X5
          </text>
        </>
      )}

      {/* Structural Concrete Columns at Grid Intersections */}
      {X_COLS.map((c) =>
        Y_ROWS.slice(0, 6).map((r) => (
          <rect key={`col-${c.id}-${r.id}`} x={c.x - 4.5} y={r.y - 4.5} width={9} height={9} fill="#1e293b" />
        ))
      )}
      {[X_COLS[7], X_COLS[8]].map((c) =>
        Y_ROWS.slice(6).map((r) => (
          <rect key={`col-off-${c.id}-${r.id}`} x={c.x - 4.5} y={r.y - 4.5} width={9} height={9} fill="#1e293b" />
        ))
      )}

      {/* Architectural Drawing Title Block (Bottom-Left Corridor) */}
      <g transform="translate(206, 606)">
        <rect x={0} y={0} width={380} height={122} rx={3} fill="#ffffff" stroke="#1e293b" strokeWidth={1.6} />
        <rect x={0} y={0} width={380} height={24} fill="#0f172a" />
        <text x={10} y={16} fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="800">
          COHERENT COHR2401 · BUILDING 05 (SILICON CARBIDE)
        </text>
        <text x={10} y={42} fill="#0f172a" fontSize="11" fontFamily="monospace" fontWeight="800">
          {floorTitle}
        </text>
        <text x={10} y={57} fill="#334155" fontSize="9.2" fontFamily="monospace" fontWeight="700">
          CAD Ref: {drawingNo} · Double-click device/sensor to locate
        </text>
        <g transform="translate(10, 70)" fontFamily="monospace" fontSize="8.5" fontWeight="700">
          <rect x={0} y={0} width={11} height={11} fill="#00ce00" stroke="#14532d" />
          <text x={15} y={9} fill="#0f172a">RUN / OPEN</text>
          <rect x={84} y={0} width={11} height={11} fill="#e2e8f0" stroke="#334155" />
          <text x={99} y={9} fill="#0f172a">STOP / CLS</text>
          <rect x={168} y={0} width={11} height={11} fill="#ff0000" stroke="#7f1d1d" />
          <text x={183} y={9} fill="#0f172a">FAULT / HHA</text>
          <rect x={262} y={0} width={11} height={11} fill="#facc15" stroke="#854d0e" />
          <text x={277} y={9} fill="#0f172a">WARN (HA/LA)</text>

          <rect x={0} y={20} width={11} height={11} fill="#ffffff" stroke="#15803d" strokeWidth={1.5} />
          <text x={15} y={29} fill="#0f172a">SENSOR NORMAL</text>
          <text x={115} y={29} fill="#1e40af">[A]=AUTO  [M]=MANUAL · 2xClick=Go to Page</text>
        </g>
      </g>
    </g>
  );
};

/** Real SCADA Equipment Icon Tile (Read-Only, Double-Click jumps to primary screen!) */
const MonitorEqBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  eq?: EquipmentUnit;
  extra?: string;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 86, h = 46, name, eq, extra, onJump }) => (
  <FloorEquipmentIconTile
    x={x}
    y={y}
    w={w}
    h={h}
    name={name}
    eq={eq}
    extra={extra}
    onDoubleClick={() => {
      const target = resolveEquipmentTarget(eq);
      if (target) onJump(target);
    }}
  />
);

/** Static Analog Sensor Icon Tile (Double-Click jumps to primary screen!) */
const MonitorSensorBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  name: string;
  sensor?: AnalogSensor;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 86, name, sensor, onJump }) => (
  <FloorSensorIconTile
    x={x}
    y={y}
    w={w}
    h={22}
    name={name}
    sensor={sensor}
    onDoubleClick={() => {
      const target = resolveSensorTarget(sensor);
      if (target) onJump(target);
    }}
  />
);

/** Real SCADA Valve Icon Tile (Double-Click jumps to primary screen!) */
const MonitorValvePill: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  valve?: ValveUnit;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 84, h = 46, name, valve, onJump }) => (
  <FloorValveIconTile
    x={x}
    y={y}
    w={w}
    h={h}
    name={name}
    valve={valve}
    onDoubleClick={() => {
      const target = resolveValveTarget(valve);
      if (target) onJump(target);
    }}
  />
);

/* ============================================================================
 * 1. B5 1F OVERVIEW (Scr_B5_1F_Overview.Pdl + CAD 1555601)
 * ========================================================================== */
export const B5Overview1FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const eq = plant.equipment;
  const sn = plant.sensors;
  const vl = plant.valves;

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — 1st Floor Architectural Overview (`Scr_B5_1F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 5.X1–5.X9 / 5.Y1–5.Y9 · Read-Only Monitor · Double-click any equipment, valve, or sensor to jump to its main control screen
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <ArchitecturalGrid
            floorTitle="1ST FLOOR — ARCHITECTURAL MONITOR (1F)"
            drawingNo="1555601 · Scr_B5_1F_Overview.Pdl"
          />

          {/* ===== LEFT HALF (5.X1 .. 5.X5): WEST RESERVE BAY ===== */}
          <rect x={57} y={55} width={518} height={530} fill="url(#cad-hatch)" stroke="#475569" strokeWidth={1.6} />
          <rect x={146} y={220} width={340} height={46} rx={4} fill="#f1f5f9" stroke="#475569" strokeWidth={1.3} />
          <text x={316} y={240} textAnchor="middle" fill="#1e293b" fontSize="12" fontFamily="monospace" fontWeight="800">
            BUILDING 05 — 1F WEST RESERVE AREA
          </text>
          <text x={316} y={256} textAnchor="middle" fill="#475569" fontSize="9.5" fontFamily="monospace" fontWeight="700">
            Columns 5.X1 – 5.X5 · Open Structural Bay
          </text>

          {/* Staircase SC2 */}
          <rect x={476} y={55} width={99} height={40} fill="#94a3b8" stroke="#1e293b" strokeWidth={1.4} />
          <text x={525} y={73} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">EXISTING</text>
          <text x={525} y={86} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">STAIRCASE SC2</text>

          {/* EMPTY ROOM (RESERVE FOR FUTURE) 962 m² (5.X5..5.X7, upper) */}
          <rect x={576} y={55} width={332} height={240} fill="#cbd5e1" stroke="#334155" strokeWidth={2.0} />
          <rect x={576} y={55} width={332} height={20} fill="#475569" />
          <text x={742} y={68.5} textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            EMPTY ROOM (RESERVE FOR FUTURE · 962 m²)
          </text>
          <text x={742} y={178} textAnchor="middle" fill="#334155" fontSize="11" fontFamily="monospace" fontWeight="700">
            FUTURE EXPANSION SPACE
          </text>

          {/* CORRIDOR / BUFFER between Empty Room & Lift (5.X5..5.X6, mid) */}
          <rect x={576} y={295} width={166} height={177} fill="#d6d3d1" stroke="#475569" strokeWidth={1.6} />
          <text x={659} y={388} textAnchor="middle" fill="#44403c" fontSize="9.5" fontFamily="monospace" fontWeight="700">
            SERVICE ACCESS BAY
          </text>

          {/* RAW MATERIAL / IQC / WAREHOUSE 228 m² (5.X6..5.X7, lower-mid) — HIGH CONTRAST SKY BLUE */}
          <rect x={742} y={295} width={166} height={212} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.2} />
          <rect x={742} y={295} width={166} height={28} fill="#1d4ed8" />
          <text x={825} y={307} textAnchor="middle" fill="#ffffff" fontSize="8.6" fontFamily="monospace" fontWeight="800">
            RAW MATERIAL / IQC /
          </text>
          <text x={825} y={319} textAnchor="middle" fill="#dbeafe" fontSize="8.4" fontFamily="monospace" fontWeight="800">
            WAREHOUSE (228 m²)
          </text>
          <text x={825} y={338} textAnchor="middle" fill="#1e3a8a" fontSize="7.8" fontFamily="monospace" fontWeight="800">
            SA/RA FROM AHU-B5-1F-01
          </text>
          <MonitorSensorBox x={754} y={352} w={142} name="AHU01RT1 (Room T)" sensor={sn['B5M1F_AHU01_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={754} y={384} w={142} name="AHU01RH1 (Room RH)" sensor={sn['B5M1F_AHU01_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={754} y={416} w={142} name="AHU01_DP (Dew Pt)" sensor={sn['B5M1F_AHU01_DP']} onJump={jumpToTarget} />

          {/* STAIRCASE SC1 + CARGO LIFT + LOBBY 5-1F + HALLWAY */}
          <rect x={576} y={472} width={72} height={64} fill="#94a3b8" stroke="#1e293b" strokeWidth={1.5} />
          <text x={612} y={499} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">STAIR</text>
          <text x={612} y={511} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">SC1</text>
          <rect x={648} y={472} width={94} height={64} fill="#a8a29e" stroke="#1e293b" strokeWidth={1.5} />
          <text x={695} y={500} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">CARGO LIFT</text>
          <text x={695} y={512} textAnchor="middle" fill="#1c1917" fontSize="7.5" fontFamily="monospace" fontWeight="700">(EXIST.)</text>
          <rect x={576} y={536} width={166} height={50} fill="#e7e5e4" stroke="#334155" strokeWidth={1.6} />
          <text x={659} y={564} textAnchor="middle" fill="#1c1917" fontSize="9" fontFamily="monospace" fontWeight="800">LOBBY 5-1F (83 m²)</text>
          <rect x={742} y={507} width={166} height={79} fill="#d6d3d1" stroke="#334155" strokeWidth={1.6} />
          <text x={825} y={550} textAnchor="middle" fill="#292524" fontSize="9.5" fontFamily="monospace" fontWeight="800">HALL WAY (SIDE)</text>

          {/* ===== RIGHT UPPER: FACILITY STATION (1251 m²) — HIGH CONTRAST MINT EMERALD ===== */}
          <rect x={908} y={55} width={352} height={240} fill="#bbf7d0" stroke="#14532d" strokeWidth={2.2} />
          <rect x={908} y={55} width={352} height={18} fill="#15803d" />
          <text x={916} y={67.5} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            FACILITY STATION (1251 m²) — CHILLER, HR &amp; COOLING TOWERS
          </text>

          {/* Row 1: 4 Water Chillers + EAF-01 (Vertical SCADA Icon Cards) */}
          <MonitorEqBox x={913} y={76} w={66} h={45} name="CH-11" eq={eq['B51F_CH11']} onJump={jumpToTarget} />
          <MonitorEqBox x={982} y={76} w={66} h={45} name="CH-12" eq={eq['B51F_CH12']} onJump={jumpToTarget} />
          <MonitorEqBox x={1051} y={76} w={66} h={45} name="CH-13" eq={eq['B51F_CH13']} onJump={jumpToTarget} />
          <MonitorEqBox x={1120} y={76} w={66} h={45} name="CH-14" eq={eq['B51F_CH14']} onJump={jumpToTarget} />
          <MonitorEqBox x={1189} y={76} w={66} h={45} name="EAF-01" eq={eq['B51F_EAF01']} onJump={jumpToTarget} />

          {/* Row 2: 4 Primary CHW Pumps + HR Pump */}
          <MonitorEqBox x={913} y={124} w={66} h={44} name="CH11P" eq={eq['B51F_CH11CHWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={982} y={124} w={66} h={44} name="CH12P" eq={eq['B51F_CH12CHWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={1051} y={124} w={66} h={44} name="CH13P" eq={eq['B51F_CH13CHWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={1120} y={124} w={66} h={44} name="CH14P" eq={eq['B51F_CH14CHWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={1189} y={124} w={66} h={44} name="CH11HP" eq={eq['B51F_CH11HWP']} onJump={jumpToTarget} />

          {/* Row 3: 3 Condenser Pumps + FAF-01 */}
          <MonitorEqBox x={913} y={171} w={83} h={44} name="CT11P" eq={eq['B51F_CT11CWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={999} y={171} w={83} h={44} name="CT12P" eq={eq['B51F_CT12CWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={1085} y={171} w={83} h={44} name="CT13P" eq={eq['B51F_CT13CWP']} onJump={jumpToTarget} />
          <MonitorEqBox x={1171} y={171} w={84} h={44} name="FAF-01" eq={eq['B51F_FAF01']} onJump={jumpToTarget} />

          {/* Row 4: 9 Cooling Towers CT11..CT19 */}
          {[11, 12, 13, 14, 15, 16, 17, 18, 19].map((n, i) => {
            const unit = eq[`B51F_CT${n}FN`];
            const cx = 913 + i * 38;
            return (
              <FloorEquipmentIconTile
                key={`ct-${n}`}
                x={cx}
                y={218}
                w={36}
                h={44}
                name={`CT${n}`}
                eq={unit}
                extra={unit?.status === 'RUNNING' ? `${unit.frequencyHz.toFixed(0)}` : undefined}
                onDoubleClick={() => {
                  const target = resolveEquipmentTarget(unit);
                  if (target) jumpToTarget(target);
                }}
              />
            );
          })}

          {/* Row 5: Essential Header Sensors ONLY (CHSTS1, CHWPS1, TT10505, HSTS1) */}
          <MonitorSensorBox x={913} y={266} w={83} name="CHSTS1" sensor={sn['B51F_CHSTS1']} onJump={jumpToTarget} />
          <MonitorSensorBox x={999} y={266} w={83} name="CHWPS1" sensor={sn['B51F_CHWPS1']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1085} y={266} w={83} name="TT10505" sensor={sn['B51F_TT10505']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1171} y={266} w={84} name="HSTS1" sensor={sn['B51F_HSTS1']} onJump={jumpToTarget} />

          {/* ===== RIGHT MID: COMPRESSOR & VACUUM STATION — HIGH CONTRAST AMBER GOLD ===== */}
          <rect x={908} y={296} width={352} height={144} fill="#fde68a" stroke="#92400e" strokeWidth={2.2} />
          <rect x={908} y={296} width={352} height={17} fill="#b45309" />
          <text x={915} y={308} fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            COMPRESSOR &amp; VACUUM STATION (OFRAC / OFLAC / PV)
          </text>

          <MonitorEqBox x={913} y={316} w={66} h={45} name="AC-102" eq={eq['B51F_AC102']} onJump={jumpToTarget} />
          <MonitorEqBox x={982} y={316} w={66} h={45} name="AC-101" eq={eq['B51F_AC101']} onJump={jumpToTarget} />
          <MonitorEqBox x={1051} y={316} w={66} h={45} name="AC-204" eq={eq['B51F_AC204']} onJump={jumpToTarget} />
          <MonitorEqBox x={1120} y={316} w={66} h={45} name="AC-202" eq={eq['B51F_AC202']} onJump={jumpToTarget} />
          <MonitorEqBox x={1189} y={316} w={66} h={45} name="AC-201" eq={eq['B51F_AC201']} onJump={jumpToTarget} />

          <MonitorEqBox x={913} y={364} w={83} h={45} name="P-10101A" eq={eq['B51F_P10101A']} onJump={jumpToTarget} />
          <MonitorEqBox x={999} y={364} w={83} h={45} name="P-10101B" eq={eq['B51F_P10101B']} onJump={jumpToTarget} />
          <MonitorEqBox x={1085} y={364} w={83} h={45} name="PV-1301A" eq={eq['B51F_PV1301A']} onJump={jumpToTarget} />
          <MonitorEqBox x={1171} y={364} w={84} h={45} name="PV-1301B" eq={eq['B51F_PV1301B']} onJump={jumpToTarget} />

          {/* Essential Header Pressures ONLY (OFRAC, OFLAC, PV) */}
          <MonitorSensorBox x={913} y={413} w={112} name="PIT10101 (OFRAC)" sensor={sn['B51F_PIT10101']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1028} y={413} w={112} name="PIT20101 (OFLAC)" sensor={sn['B51F_PIT20101']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1143} y={413} w={112} name="PIT1301 (PV)" sensor={sn['B51F_PIT1301']} onJump={jumpToTarget} />

          {/* ===== RIGHT LOWER: DIW & PCW ROOM (747 m²) — HIGH CONTRAST AQUA CYAN ===== */}
          <rect x={908} y={441} width={352} height={145} fill="#a5f3fc" stroke="#155e75" strokeWidth={2.2} />
          <rect x={908} y={441} width={352} height={17} fill="#0e7490" />
          <text x={915} y={453} fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            DIW &amp; PCW ROOM (747 m²) — PCW SILICON STATION &amp; RO-DI
          </text>

          <MonitorEqBox x={913} y={461} w={83} h={45} name="P-501A" eq={eq['B51F_P501A']} onJump={jumpToTarget} />
          <MonitorEqBox x={999} y={461} w={83} h={45} name="P-501B" eq={eq['B51F_P501B']} onJump={jumpToTarget} />
          <MonitorEqBox x={1085} y={461} w={83} h={45} name="P-501C" eq={eq['B51F_P501C']} onJump={jumpToTarget} />
          <MonitorEqBox x={1171} y={461} w={84} h={45} name="P-502" eq={eq['B51F_P502']} onJump={jumpToTarget} />

          <MonitorValvePill x={913} y={510} w={83} h={45} name="TCV01" valve={vl['B51F_TCV10501']} onJump={jumpToTarget} />
          <MonitorValvePill x={999} y={510} w={83} h={45} name="TCV02" valve={vl['B51F_TCV10502']} onJump={jumpToTarget} />
          <MonitorEqBox x={1085} y={510} w={83} h={45} name="EAF-02" eq={eq['B51F_EAF02']} onJump={jumpToTarget} />
          <MonitorEqBox x={1171} y={510} w={84} h={45} name="FAF-02" eq={eq['B51F_FAF02']} onJump={jumpToTarget} />

          <MonitorSensorBox x={913} y={559} w={83} name="DPT10501" sensor={sn['B51F_DPT10501']} onJump={jumpToTarget} />
          <MonitorSensorBox x={999} y={559} w={83} name="TT10503" sensor={sn['B51F_TT10503']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1085} y={559} w={83} name="LT10501" sensor={sn['B51F_LT10501']} onJump={jumpToTarget} />

          {/* Third-Party RO-DI Package Link Status (Double-Click -> DI Screen) */}
          <g
            transform="translate(1171, 559)"
            onDoubleClick={() =>
              jumpToTarget({
                screen: 'b5_di',
                tag: 'B52F_RODI_COMM',
                label: 'Third-Party RO-DI Water Package',
              })
            }
          >
            <title>RO-DI Package Link — Double-click to open DI Water screen</title>
            <rect
              x={0}
              y={0}
              width={84}
              height={22}
              rx={2}
              fill={plant.sandbox.diPackageConnected ? '#00ce00' : '#ff0000'}
              stroke={plant.sandbox.diPackageConnected ? '#14532d' : '#7f1d1d'}
              strokeWidth={1.2}
            />
            <text x={42} y={9.5} textAnchor="middle" fill={plant.sandbox.diPackageConnected ? '#052e16' : '#ffffff'} fontSize="7.2" fontFamily="monospace" fontWeight="800">
              RO-DI LINK
            </text>
            <text x={42} y={18.5} textAnchor="middle" fill={plant.sandbox.diPackageConnected ? '#052e16' : '#ffffff'} fontSize="7.5" fontFamily="monospace" fontWeight="900">
              {plant.sandbox.diPackageConnected ? 'CONNECTED' : 'LOST'}
            </text>
          </g>

          {/* ===== BOTTOM-RIGHT OFFICE 5-1F & RESTROOM & SC3 — HIGH CONTRAST WARM SAND ===== */}
          <rect x={1084} y={586} width={176} height={140} fill="#fef3c7" stroke="#92400e" strokeWidth={2.0} />
          <rect x={1084} y={586} width={176} height={19} fill="#b45309" />
          <text x={1172} y={599} textAnchor="middle" fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            OFFICE 5-1F (64 m²) &amp; TOILET
          </text>
          <MonitorEqBox x={1110} y={608} w={124} h={44} name="TEF-1F-01" eq={eq['B51F_TEF01']} onJump={jumpToTarget} />
          <rect x={1084} y={656} width={176} height={70} fill="#cbd5e1" stroke="#334155" strokeWidth={1.4} />
          <text x={1172} y={695} textAnchor="middle" fill="#1e293b" fontSize="9" fontFamily="monospace" fontWeight="800">
            EXISTING STAIRCASE SC3
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. B5 M1F OVERVIEW (Scr_B5_M1F_Overview.Pdl + CAD 1555602)
 * ========================================================================== */
export const B5OverviewM1FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const ahu = plant.equipment['B5M1F_AHU01'];
  const sn = plant.sensors;
  const vl = plant.valves;

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — 1st Mezzanine Architectural Overview (`Scr_B5_M1F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 5.X1–5.X9 / 5.Y1–5.Y9 · Read-Only Monitor · Double-click any equipment, valve, or sensor to jump to its main control screen
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <ArchitecturalGrid
            floorTitle="1ST MEZZANINE FLOOR — ARCHITECTURAL MONITOR (M1F)"
            drawingNo="1555602 · Scr_B5_M1F_Overview.Pdl"
            hatchLeftHalf
          />

          {/* High-Bay Void Areas (distinct darker slate-gray vs active MEP blue deck) */}
          <rect x={576} y={55} width={332} height={431} fill="#cbd5e1" stroke="#475569" strokeWidth={1.6} />
          <rect x={908} y={55} width={352} height={213} fill="#d6d3d1" stroke="#475569" strokeWidth={1.6} />
          <rect x={908} y={378} width={352} height={208} fill="#d6d3d1" stroke="#475569" strokeWidth={1.6} />
          <g stroke="#94a3b8" strokeWidth={1.2}>
            <line x1={576} y1={55} x2={908} y2={486} />
            <line x1={908} y1={55} x2={576} y2={486} />
            <line x1={908} y1={55} x2={1260} y2={268} />
            <line x1={1260} y1={55} x2={908} y2={268} />
            <line x1={908} y1={378} x2={1260} y2={586} />
            <line x1={1260} y1={378} x2={908} y2={586} />
          </g>
          <text x={1084} y={166} textAnchor="middle" fill="#475569" fontSize="10.5" fontFamily="monospace" fontWeight="800">
            OPEN VOID TO FACILITY STATION BELOW
          </text>
          <text x={1084} y={488} textAnchor="middle" fill="#475569" fontSize="10.5" fontFamily="monospace" fontWeight="800">
            OPEN VOID TO DIW / PCW ROOM BELOW (+5.000)
          </text>

          {/* MEP SPACE 5-MF1 — HIGH CONTRAST SKY BLUE */}
          <rect x={908} y={268} width={352} height={116} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.4} />
          <rect x={908} y={268} width={352} height={20} fill="#1d4ed8" />
          <text x={918} y={281.5} fill="#ffffff" fontSize="9.8" fontFamily="monospace" fontWeight="800">
            MEP SPACE 5-MF1 — AHU-B5-1F-01 (WAREHOUSE)
          </text>

          {/* Supply & Return Duct Runs */}
          <line x1={742} y1={305} x2={918} y2={305} stroke="#1d4ed8" strokeWidth={4.5} />
          <line x1={742} y1={330} x2={918} y2={330} stroke="#c2410c" strokeWidth={4.5} />
          <rect x={734} y={288} width={170} height={13} rx={2} fill="#eff6ff" stroke="#1d4ed8" strokeWidth={0.8} />
          <text x={738} y={297.5} fill="#1e3a8a" fontSize="8" fontFamily="monospace" fontWeight="800">
            ← 800x500 SA TO WAREHOUSE
          </text>
          <rect x={734} y={335} width={170} height={13} rx={2} fill="#fff7ed" stroke="#c2410c" strokeWidth={0.8} />
          <text x={738} y={344.5} fill="#9a3412" fontSize="8" fontFamily="monospace" fontWeight="800">
            → 800x500 RA FROM WAREHOUSE
          </text>

          <MonitorEqBox x={918} y={293} w={138} h={56} name="AHU-1F-01" eq={ahu} onJump={jumpToTarget} />
          <MonitorValvePill x={1064} y={293} w={90} h={56} name="CWCV" valve={vl['B5M1F_AHU01_CWCV']} onJump={jumpToTarget} />
          <MonitorValvePill x={1160} y={293} w={90} h={56} name="HWCV" valve={vl['B5M1F_AHU01_HWCV']} onJump={jumpToTarget} />

          <MonitorSensorBox x={918} y={355} w={108} name="RAT (Room T)" sensor={sn['B5M1F_AHU01_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1032} y={355} w={108} name="RAH (Room RH)" sensor={sn['B5M1F_AHU01_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1146} y={355} w={104} name="DP (Dew Pt)" sensor={sn['B5M1F_AHU01_DP']} onJump={jumpToTarget} />

          {/* Staircase SC1 & Lift Core */}
          <rect x={576} y={486} width={166} height={100} fill="#94a3b8" stroke="#1e293b" strokeWidth={1.6} />
          <text x={659} y={540} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            STAIRCASE SC1 & LIFT SHAFT
          </text>

          {/* Bottom-Right Office 5-MF1 & SC3 */}
          <rect x={1084} y={586} width={176} height={76} fill="#fef3c7" stroke="#92400e" strokeWidth={2.0} />
          <rect x={1084} y={586} width={176} height={19} fill="#b45309" />
          <text x={1172} y={599} textAnchor="middle" fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            OFFICE 5-MF1 (+3.850)
          </text>
          <text x={1172} y={634} textAnchor="middle" fill="#78350f" fontSize="8.5" fontFamily="monospace" fontWeight="700">
            BMS Meeting & Manager Rooms
          </text>
          <rect x={1084} y={662} width={176} height={64} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1172} y={698} textAnchor="middle" fill="#1e293b" fontSize="9" fontFamily="monospace" fontWeight="800">
            EXISTING STAIRCASE SC3
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. B5 2F OVERVIEW (Scr_B5_2F_Overview.Pdl + CAD 1555603)
 * ========================================================================== */
export const B5Overview2FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const sn = plant.sensors;
  const vl = plant.valves;
  const eq = plant.equipment;

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — 2nd Floor Cleanroom Architectural Overview (`Scr_B5_2F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 5.X1–5.X9 / 5.Y1–5.Y9 · Read-Only Monitor · Double-click any equipment, valve, or sensor to jump to its main control screen
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <ArchitecturalGrid
            floorTitle="2ND FLOOR — CLEANROOM ARCHITECTURAL MONITOR (2F)"
            drawingNo="1555603 · Scr_B5_2F_Overview.Pdl"
            hatchLeftHalf
          />

          {/* Top Corridor: HALL WAY 5-2F-1 */}
          <rect x={576} y={55} width={684} height={24} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={918} y={71} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            HALL WAY 5-2F-1
          </text>

          {/* GOWNING RM (6 m²) — HIGH CONTRAST TEAL */}
          <rect x={576} y={79} width={332} height={58} fill="#99f6e4" stroke="#0f766e" strokeWidth={2.0} />
          <rect x={576} y={79} width={332} height={17} fill="#0f766e" />
          <text x={584} y={91} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            GOWNING ROOM (6 m²) — AHU-B5-2F-04
          </text>
          <MonitorSensorBox x={584} y={102} w={102} name="AHU04RT1 (T)" sensor={sn['B5M2F_AHU04_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={690} y={102} w={102} name="AHU04RH1 (RH)" sensor={sn['B5M2F_AHU04_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={796} y={102} w={104} name="AHU04_DP (DP)" sensor={sn['B5M2F_AHU04_DP']} onJump={jumpToTarget} />

          {/* KNN ETCH ROOM (44 m²) — HIGH CONTRAST ROSE CORAL */}
          <rect x={576} y={137} width={156} height={114} fill="#fecaca" stroke="#991b1b" strokeWidth={2.0} />
          <rect x={576} y={137} width={156} height={26} fill="#b91c1c" />
          <text x={654} y={149} textAnchor="middle" fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            KNN ETCH ROOM
          </text>
          <text x={654} y={160} textAnchor="middle" fill="#fee2e2" fontSize="7.8" fontFamily="monospace" fontWeight="700">
            44 m² · AHU-B5-2F-01
          </text>
          <MonitorSensorBox x={586} y={175} w={136} name="AHU01RT2 (Temp)" sensor={sn['B5M2F_AHU01_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={586} y={206} w={136} name="AHU01RH2 (RH)" sensor={sn['B5M2F_AHU01_RAH']} onJump={jumpToTarget} />

          {/* PRE LEAK FILL METRO ROOM (49 m²) — HIGH CONTRAST INDIGO */}
          <rect x={732} y={137} width={176} height={114} fill="#c7d2fe" stroke="#3730a3" strokeWidth={2.0} />
          <rect x={732} y={137} width={176} height={26} fill="#4338ca" />
          <text x={820} y={149} textAnchor="middle" fill="#ffffff" fontSize="8.4" fontFamily="monospace" fontWeight="800">
            PRE LEAK FILL METRO
          </text>
          <text x={820} y={160} textAnchor="middle" fill="#e0e7ff" fontSize="7.8" fontFamily="monospace" fontWeight="700">
            49 m² · AHU-B5-2F-04
          </text>
          <MonitorSensorBox x={742} y={175} w={156} name="AHU04RT (Room T)" sensor={sn['B5M2F_AHU04_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={742} y={206} w={156} name="AHU04RH (Room RH)" sensor={sn['B5M2F_AHU04_RAH']} onJump={jumpToTarget} />

          {/* LEAK FILL ROOM (132 m²) — HIGH CONTRAST SKY BLUE */}
          <rect x={576} y={251} width={332} height={175} fill="#bae6fd" stroke="#0369a1" strokeWidth={2.2} />
          <rect x={576} y={251} width={332} height={20} fill="#0369a1" />
          <text x={742} y={264.5} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            LEAK FILL ROOM (132 m²) — AHU-B5-2F-01
          </text>
          <MonitorSensorBox x={588} y={284} w={100} name="AHU01RT1" sensor={sn['B5M2F_AHU01_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={692} y={284} w={100} name="AHU01RH1" sensor={sn['B5M2F_AHU01_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={796} y={284} w={100} name="AHU01_DP" sensor={sn['B5M2F_AHU01_DP']} onJump={jumpToTarget} />

          {/* 2F Process Vacuum & Exhaust Sub-panel */}
          <rect x={590} y={336} width={304} height={74} rx={3} fill="#fde68a" stroke="#92400e" strokeWidth={1.6} />
          <rect x={590} y={336} width={304} height={18} rx={2} fill="#b45309" />
          <text x={598} y={348.5} fill="#ffffff" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            2F PROCESS VACUUM &amp; EXHAUST HEADER
          </text>
          <MonitorSensorBox x={598} y={366} w={92} name="PIT1303(PV)" sensor={sn['B52F_PIT1303']} onJump={jumpToTarget} />
          <MonitorSensorBox x={696} y={366} w={92} name="PIT11201" sensor={sn['B51F_PIT11201']} onJump={jumpToTarget} />
          <MonitorSensorBox x={794} y={366} w={92} name="PIT11202" sensor={sn['B51F_PIT11202']} onJump={jumpToTarget} />

          {/* PRODUCTION AREA (940 m²) — HIGH CONTRAST MINT GREEN */}
          <rect x={908} y={79} width={352} height={476} fill="#bbf7d0" stroke="#14532d" strokeWidth={2.4} />
          <rect x={908} y={79} width={352} height={28} fill="#15803d" />
          <text x={1084} y={92} textAnchor="middle" fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="800">
            PRODUCTION AREA (940 m²)
          </text>
          <text x={1084} y={103} textAnchor="middle" fill="#dcfce7" fontSize="8" fontFamily="monospace" fontWeight="700">
            AHU-B5-2F-02 · 2F PCW &amp; RO-DI Cleanroom Distribution
          </text>

          {/* AHU-02 Sub-zone (pruned SAT/SAS secondary sensors) */}
          <rect x={918} y={114} width={332} height={54} rx={3} fill="#dcfce7" stroke="#15803d" strokeWidth={1.5} />
          <text x={926} y={128} fill="#14532d" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            CLEANROOM ENVIRONMENTAL (AHU-B5-2F-02):
          </text>
          <MonitorSensorBox x={926} y={136} w={102} name="AHU02RT1 (T)" sensor={sn['B5M2F_AHU02_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1033} y={136} w={102} name="AHU02RH1 (RH)" sensor={sn['B5M2F_AHU02_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1140} y={136} w={102} name="AHU02_DP" sensor={sn['B5M2F_AHU02_DP']} onJump={jumpToTarget} />

          {/* 2F PCW Sub-zone */}
          <rect x={918} y={176} width={332} height={54} rx={3} fill="#a5f3fc" stroke="#0e7490" strokeWidth={1.6} />
          <text x={926} y={190} fill="#155e75" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            2F PCW PROCESS COOLING (AUTO / EDGE GRIND):
          </text>
          <MonitorSensorBox x={926} y={198} w={102} name="DPT10501" sensor={sn['B51F_DPT10501']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1033} y={198} w={102} name="TT10503" sensor={sn['B51F_TT10503']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1140} y={198} w={102} name="FIT10501" sensor={sn['B51F_FIT10501']} onJump={jumpToTarget} />

          {/* 2F DI Water Branches Sub-zone with Vertical Motorized Valve Icon Cards */}
          <rect x={918} y={238} width={332} height={306} rx={3} fill="#e0f2fe" stroke="#0284c7" strokeWidth={1.8} />
          <rect x={918} y={238} width={332} height={18} rx={2} fill="#0284c7" />
          <text x={926} y={250.5} fill="#ffffff" fontSize="8.6" fontFamily="monospace" fontWeight="800">
            2F DI WATER DISTRIBUTION LOOPS (RO-DI):
          </text>

          <text x={928} y={272} fill="#0c4a6e" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            1. DISCO DICING ROOM
          </text>
          <MonitorValvePill x={926} y={278} w={102} h={46} name="PCV10701" valve={vl['B52F_PCV10701']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1034} y={278} w={102} name="PIT10701" sensor={sn['B52F_PIT10701']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1140} y={278} w={102} name="FIT10701" sensor={sn['B52F_FIT10701']} onJump={jumpToTarget} />

          <text x={928} y={342} fill="#0c4a6e" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            2. SAND BLASTING ROOM
          </text>
          <MonitorValvePill x={926} y={348} w={102} h={46} name="PCV10702" valve={vl['B52F_PCV10702']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1034} y={348} w={102} name="PIT10702" sensor={sn['B52F_PIT10702']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1140} y={348} w={102} name="FIT10702" sensor={sn['B52F_FIT10702']} onJump={jumpToTarget} />

          <text x={928} y={412} fill="#0c4a6e" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            3. CLEANING ROOM
          </text>
          <MonitorValvePill x={926} y={418} w={102} h={46} name="PCV10703" valve={vl['B52F_PCV10703']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1034} y={418} w={102} name="PIT10703" sensor={sn['B52F_PIT10703']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1140} y={418} w={102} name="FIT10703" sensor={sn['B52F_FIT10703']} onJump={jumpToTarget} />

          {/* Third-party DI Link Bar */}
          <g
            onDoubleClick={() =>
              jumpToTarget({
                screen: 'b5_di',
                tag: 'B52F_RODI_COMM',
                label: 'Third-Party RO-DI Water Package',
              })
            }
          >
            <title>RO-DI Package Comm — Double-click to open DI Water screen</title>
            <rect
              x={926}
              y={498}
              width={316}
              height={30}
              rx={2}
              fill={plant.sandbox.diPackageConnected ? '#00ce00' : '#ff0000'}
              stroke={plant.sandbox.diPackageConnected ? '#14532d' : '#7f1d1d'}
              strokeWidth={1.3}
            />
            <text
              x={1084}
              y={517}
              textAnchor="middle"
              fill={plant.sandbox.diPackageConnected ? '#052e16' : '#ffffff'}
              fontSize="9"
              fontFamily="monospace"
              fontWeight="900"
            >
              RO-DI PACKAGE COMM: {plant.sandbox.diPackageConnected ? 'CONNECTED (PLC OK)' : 'DISCONNECTED (FAULT)'}
            </text>
          </g>

          {/* SPARE PARTS STOREROOM (73 m²) — HIGH CONTRAST AMBER */}
          <rect x={742} y={426} width={166} height={129} fill="#fde68a" stroke="#92400e" strokeWidth={2.0} />
          <rect x={742} y={426} width={166} height={26} fill="#b45309" />
          <text x={825} y={438} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            SPARE PARTS STOREROOM
          </text>
          <text x={825} y={449} textAnchor="middle" fill="#fef3c7" fontSize="7.8" fontFamily="monospace" fontWeight="700">
            73 m² · AHU-B5-2F-03
          </text>
          <MonitorSensorBox x={754} y={460} w={142} name="AHU03RT1 (Temp)" sensor={sn['B5M2F_AHU03_RAT']} onJump={jumpToTarget} />
          <MonitorSensorBox x={754} y={490} w={142} name="AHU03RH1 (RH)" sensor={sn['B5M2F_AHU03_RAH']} onJump={jumpToTarget} />
          <MonitorSensorBox x={754} y={520} w={142} name="AHU03_DP (DP)" sensor={sn['B5M2F_AHU03_DP']} onJump={jumpToTarget} />

          {/* NETWORK CABLING / PANTRY / REST AREA — DISTINCT SLATE/STONE */}
          <rect x={576} y={426} width={166} height={129} fill="#e2e8f0" stroke="#334155" strokeWidth={1.8} />
          <text x={659} y={446} textAnchor="middle" fill="#1e293b" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            NETWORK CABLING (18 m²)
          </text>
          <line x1={576} y1={460} x2={742} y2={460} stroke="#64748b" strokeWidth={1.2} />
          <text x={659} y={482} textAnchor="middle" fill="#1e293b" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            PANTRY 5-2F (13 m²)
          </text>
          <line x1={576} y1={496} x2={742} y2={496} stroke="#64748b" strokeWidth={1.2} />
          <text x={659} y={518} textAnchor="middle" fill="#1e293b" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            HALL WAY 5-2F-2 / REST AREA
          </text>
          <text x={659} y={540} textAnchor="middle" fill="#475569" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            STAIRCASE SC1
          </text>

          {/* Bottom Corridor */}
          <rect x={576} y={555} width={684} height={31} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={918} y={574} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            HALL WAY 5-2F-1
          </text>

          {/* BOTTOM-RIGHT OFFICE 5-2F, MEETING RM, TOILET & SC3 */}
          <rect x={1084} y={586} width={176} height={82} fill="#fef3c7" stroke="#92400e" strokeWidth={2.0} />
          <rect x={1084} y={586} width={176} height={19} fill="#b45309" />
          <text x={1172} y={599} textAnchor="middle" fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            OFFICE 5-2F (70 m²) &amp; TOILET
          </text>
          <MonitorEqBox x={1110} y={608} w={124} h={44} name="TEF-2F-01" eq={eq['B52F_TEF01']} onJump={jumpToTarget} />
          <text x={1172} y={663} textAnchor="middle" fill="#78350f" fontSize="8" fontFamily="monospace" fontWeight="800">
            MEETING RM 5-2F
          </text>
          <rect x={1084} y={668} width={176} height={58} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1172} y={701} textAnchor="middle" fill="#1e293b" fontSize="9" fontFamily="monospace" fontWeight="800">
            EXISTING STAIRCASE SC3
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. B5 M2F OVERVIEW (Scr_B5_M2F_Overview.Pdl + CAD 1555604)
 * ========================================================================== */
export const B5OverviewM2FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const eq = plant.equipment;
  const sn = plant.sensors;
  const mt = plant.meters;

  const totalKw =
    (mt['PMDB_B5M2F_MDB51']?.activeKw ?? 0) +
    (mt['PMDB_B5M2F_MDB52']?.activeKw ?? 0) +
    (mt['PMDB_B5M2F_MDB53']?.activeKw ?? 0);

  const airUnits = [
    { tag: 'B5M2F_AHU01', title: 'AHU-B5-2F-01', zone: 'Leak Fill / KNN', isPau: false },
    { tag: 'B5M2F_AHU02', title: 'AHU-B5-2F-02', zone: 'Production Area', isPau: false },
    { tag: 'B5M2F_AHU03', title: 'AHU-B5-2F-03', zone: 'Spare Parts', isPau: false },
    { tag: 'B5M2F_AHU04', title: 'AHU-B5-2F-04', zone: 'Metro / Gowning', isPau: false },
    { tag: 'B5M2F_PAU01', title: 'PAU-B5-2F-01', zone: 'Fresh Air Intake', isPau: true },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — 2nd Mezzanine Architectural Overview (`Scr_B5_M2F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 5.X1–5.X9 / 5.Y1–5.Y9 · Read-Only Monitor · Double-click any equipment, meter, or sensor to jump to its main control screen
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <ArchitecturalGrid
            floorTitle="2ND MEZZANINE FLOOR — ARCHITECTURAL MONITOR (M2F)"
            drawingNo="1555604 · Scr_B5_M2F_Overview.Pdl"
            hatchLeftHalf
          />

          {/* Open Mezzanine Service Deck */}
          <rect x={576} y={298} width={220} height={188} fill="#d6d3d1" stroke="#475569" strokeWidth={1.6} />
          <text x={686} y={396} textAnchor="middle" fill="#44403c" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            MEZZANINE WALKWAY / DECK
          </text>

          {/* MSB ROOM 5-MF2 (146 m²) — HIGH CONTRAST WARM ORANGE (Vertical PM8000 Icon Cards) */}
          <rect x={576} y={55} width={220} height={242} fill="#fed7aa" stroke="#9a3412" strokeWidth={2.2} />
          <rect x={576} y={55} width={220} height={26} fill="#c2410c" />
          <text x={686} y={67} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            MSB ROOM 5-MF2 (146 m²)
          </text>
          <text x={686} y={78} textAnchor="middle" fill="#ffedd5" fontSize="7.8" fontFamily="monospace" fontWeight="700">
            Main Switchboards · +15.500
          </text>

          {[
            { tag: 'PMDB_B5M2F_MDB51', label: 'MDB-5.1', y: 88 },
            { tag: 'PMDB_B5M2F_MDB52', label: 'MDB-5.2', y: 142 },
            { tag: 'PMDB_B5M2F_MDB53', label: 'MDB-5.3', y: 196 },
          ].map((m) => (
            <FloorMeterIconTile
              key={m.label}
              x={590}
              y={m.y}
              w={192}
              h={48}
              name={m.label}
              meter={mt[m.tag]}
              onDoubleClick={() =>
                jumpToTarget({
                  screen: 'b5_pms',
                  tag: m.tag,
                  label: `${m.label} Main Switchboard`,
                  faceplateType: 'Fpl_PM8000',
                  faceplateTitle: `Fpl_PM8000 · ${m.label}`,
                })
              }
            />
          ))}
          <rect x={590} y={252} width={192} height={36} rx={2} fill="#0f172a" />
          <text x={686} y={267} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="monospace" fontWeight="700">
            BUILDING 5 TOTAL LOAD
          </text>
          <text x={686} y={282} textAnchor="middle" fill="#facc15" fontSize="11.5" fontFamily="monospace" fontWeight="900">
            {totalKw.toFixed(1)} kW
          </text>

          {/* MEP SPACE 5-MF2 — HIGH CONTRAST SKY BLUE (Pruned CWCV/HWCV/SAT clutter!) */}
          <rect x={796} y={55} width={464} height={224} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.2} />
          <rect x={796} y={55} width={464} height={20} fill="#1d4ed8" />
          <text x={806} y={68.5} fill="#ffffff" fontSize="9.8" fontFamily="monospace" fontWeight="800">
            MEP SPACE 5-MF2 — CLEANROOM AIR HANDLING UNITS &amp; PAU (FA INTAKE →)
          </text>

          {airUnits.map((u, idx) => {
            const x = 804 + idx * 90;
            const unit = eq[u.tag];
            return (
              <g key={u.tag} transform={`translate(${x}, 84)`}>
                <rect x={0} y={0} width={86} height={184} rx={3} fill="#eff6ff" stroke="#1d4ed8" strokeWidth={1.4} />
                <text x={43} y={14} textAnchor="middle" fill="#1e3a8a" fontSize="8.2" fontFamily="monospace" fontWeight="900">
                  {u.title}
                </text>
                <text x={43} y={25} textAnchor="middle" fill="#475569" fontSize="7" fontFamily="monospace" fontWeight="700">
                  {u.zone}
                </text>
                <MonitorEqBox x={4} y={32} w={78} h={58} name={u.tag.replace('B5M2F_', '')} eq={unit} onJump={jumpToTarget} />
                {u.isPau ? (
                  <MonitorSensorBox x={4} y={102} w={78} name="SAT" sensor={sn[`${u.tag}_SAT`]} onJump={jumpToTarget} />
                ) : (
                  <>
                    <MonitorSensorBox x={4} y={98} w={78} name="Room T" sensor={sn[`${u.tag}_RAT`]} onJump={jumpToTarget} />
                    <MonitorSensorBox x={4} y={126} w={78} name="Room RH" sensor={sn[`${u.tag}_RAH`]} onJump={jumpToTarget} />
                    <MonitorSensorBox x={4} y={154} w={78} name="DewPt" sensor={sn[`${u.tag}_DP`]} onJump={jumpToTarget} />
                  </>
                )}
              </g>
            );
          })}

          {/* PROCESS EXHAUST FAN BAY — HIGH CONTRAST ROSE RED */}
          <rect x={796} y={298} width={464} height={188} fill="#fecdd3" stroke="#9f1239" strokeWidth={2.2} />
          <rect x={796} y={298} width={464} height={20} fill="#be123c" />
          <text x={806} y={311.5} fill="#ffffff" fontSize="9.8" fontFamily="monospace" fontWeight="800">
            PROCESS EXHAUST DECK (M2F / ROOF) — FA-11201A / 03A / 04A
          </text>

          <MonitorEqBox x={810} y={334} w={138} h={60} name="FA-11201A" eq={eq['B5M2F_FA11201A']} onJump={jumpToTarget} />
          <MonitorSensorBox x={810} y={404} w={138} name="PIT11201 (Duct 1)" sensor={sn['B51F_PIT11201']} onJump={jumpToTarget} />

          <MonitorEqBox x={960} y={334} w={138} h={60} name="FA-11203A" eq={eq['B5M2F_FA11203A']} onJump={jumpToTarget} />
          <MonitorSensorBox x={960} y={404} w={138} name="PIT11202 (Duct 2)" sensor={sn['B51F_PIT11202']} onJump={jumpToTarget} />

          <MonitorEqBox x={1110} y={334} w={138} h={60} name="FA-11204A" eq={eq['B5M2F_FA11204A']} onJump={jumpToTarget} />
          <MonitorSensorBox x={1110} y={404} w={138} name="TIT11201 (Amb T)" sensor={sn['B51F_TIT11201']} onJump={jumpToTarget} />

          <text x={1028} y={456} textAnchor="middle" fill="#881337" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            Serving Cleanroom Process Tools, Grinding Stations &amp; Hard Bake Ovens
          </text>

          {/* Staircase SC1 & Lift Core */}
          <rect x={576} y={486} width={166} height={100} fill="#94a3b8" stroke="#1e293b" strokeWidth={1.6} />
          <text x={659} y={540} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            STAIRCASE SC1 & LIFT SHAFT
          </text>

          {/* Bottom-Right Office 5-MF2 & SC3 */}
          <rect x={1084} y={586} width={176} height={76} fill="#fef3c7" stroke="#92400e" strokeWidth={2.0} />
          <rect x={1084} y={586} width={176} height={19} fill="#b45309" />
          <text x={1172} y={599} textAnchor="middle" fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            OFFICE 5-MF2 (89 m²)
          </text>
          <text x={1172} y={634} textAnchor="middle" fill="#78350f" fontSize="8.5" fontFamily="monospace" fontWeight="700">
            Meeting Rooms 5-MF2-1 / 2
          </text>
          <rect x={1084} y={662} width={176} height={64} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1172} y={698} textAnchor="middle" fill="#1e293b" fontSize="9" fontFamily="monospace" fontWeight="800">
            EXISTING STAIRCASE SC3
          </text>
        </svg>
      </div>
    </div>
  );
};
