import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import type { LocatedTarget } from '../store/b5Store.ts';
import type { AnalogSensor, B5ScreenId, EquipmentUnit, FaceplateType, PowerMeter, ValveUnit } from '../types/scada.ts';
import {
  FloorEquipmentIconTile,
  FloorMeterIconTile,
  FloorSensorIconTile,
  FloorValveIconTile,
} from '../components/scada/FloorOverviewIcons.tsx';

/**
 * Building 2 Architectural Floor Overview Monitor Screens
 *  - Grounded in WinCC Scr_B2_1F_Overview.Pdl, Scr_B2_2F_Overview.Pdl, Scr_B2_3F_Overview.Pdl, Scr_B2_M3F_Overview.Pdl.
 *  - High-contrast zone color separation + structural column grid (2.X1–2.X9 / 2.Y1–2.Y9).
 *  - ZERO animations & ZERO single-click controls (clean monitor view).
 *  - DOUBLE-CLICK any equipment, valve, meter, or sensor tile to jump straight to its primary interactive screen
 *    with the 2.0s steady light-yellow bounding box highlight.
 */

const B2_X_COLS: { id: string; x: number }[] = [
  { id: '2.X1', x: 56 },
  { id: '2.X2', x: 196 },
  { id: '2.X3', x: 336 },
  { id: '2.X4', x: 476 },
  { id: '2.X5', x: 616 },
  { id: '2.X6', x: 768 },
  { id: '2.X7', x: 924 },
  { id: '2.X8', x: 1092 },
  { id: '2.X9', x: 1260 },
];

const B2_Y_ROWS: { id: string; y: number }[] = [
  { id: '2.Y9', y: 54 },
  { id: '2.Y8', y: 158 },
  { id: '2.Y7', y: 268 },
  { id: '2.Y6', y: 378 },
  { id: '2.Y5', y: 486 },
  { id: '2.Y4', y: 586 },
  { id: '2.Y2', y: 656 },
  { id: '2.Y1', y: 726 },
];

function resolveB2EquipmentTarget(eq?: EquipmentUnit): LocatedTarget | null {
  if (!eq) return null;
  const { tag, label, subsystem, kind } = eq;
  let screen: B5ScreenId = 'b2_pcw';
  let faceplateType: FaceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';

  if (subsystem === 'pcw') {
    screen = 'b2_pcw';
    faceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
  } else if (subsystem === 'ahu') {
    if (tag.includes('FCU')) {
      screen = 'b2_air_fcu';
      faceplateType = 'Fpl_DOL';
    } else if (tag.includes('FFU')) {
      screen = 'b2_air_ahu';
      faceplateType = 'Fpl_VFD';
    } else if (tag.includes('PAU')) {
      screen = 'b2_air_ahu';
      faceplateType = 'Fpl_PAU';
    } else {
      screen = 'b2_air_ahu';
      faceplateType = 'Fpl_AHU_DewPoint';
    }
  } else if (subsystem === 'exh') {
    screen = 'b2_exh';
    faceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
  } else if (subsystem === 'pv') {
    screen = 'b2_pv';
    faceplateType = 'Fpl_PV';
  } else if (subsystem === 'di') {
    screen = 'b2_di';
  }

  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveB2ValveTarget(v?: ValveUnit): LocatedTarget | null {
  if (!v) return null;
  const { tag, label, subsystem, kind } = v;
  if (subsystem === 'ahu') {
    if (tag.includes('FCU')) {
      return {
        screen: 'b2_air_fcu',
        tag,
        label,
        faceplateType: 'Fpl_XVAL',
        faceplateTitle: `Fpl_XVAL · ${tag}`,
      };
    }
    const ahuTag = tag.replace(/_(CWCV|HWCV|CHCV)$/, '');
    const isPau = ahuTag.includes('PAU');
    const fp: FaceplateType = isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint';
    return {
      screen: 'b2_cw_ahu',
      tag: ahuTag,
      label: `${tag} (${label})`,
      faceplateType: fp,
      faceplateTitle: `${fp} · ${ahuTag}`,
    };
  }
  const screen: B5ScreenId = subsystem === 'di' ? 'b2_di' : 'b2_pcw';
  const faceplateType: FaceplateType = kind === 'CVAL' ? 'Fpl_CVAL' : 'Fpl_XVAL';
  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveB2SensorTarget(s?: AnalogSensor): LocatedTarget | null {
  if (!s) return null;
  const { tag, label, subsystem } = s;
  if (subsystem === 'ahu') {
    if (tag.includes('FCU')) {
      return {
        screen: 'b2_air_fcu',
        tag,
        label,
        faceplateType: 'Fpl_Sensor',
        faceplateTitle: `Fpl_TIT · ${tag}`,
      };
    }
    const ahuTag = tag.replace(/_(SAT|RAT|RAH|SAS|DP)$/, '');
    const isPau = ahuTag.includes('PAU');
    const fp: FaceplateType = isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint';
    return {
      screen: 'b2_air_ahu',
      tag: ahuTag,
      label: `${tag} (${label})`,
      faceplateType: fp,
      faceplateTitle: `${fp} · ${ahuTag}`,
    };
  }
  let screen: B5ScreenId = 'b2_pcw';
  if (subsystem === 'di') screen = 'b2_di';
  else if (subsystem === 'pv') screen = 'b2_pv';
  else if (subsystem === 'exh') screen = 'b2_exh';

  return {
    screen,
    tag,
    label,
    faceplateType: 'Fpl_Sensor',
    faceplateTitle: `Fpl_Sensor · ${tag}`,
  };
}

function resolveB2MeterTarget(m?: PowerMeter): LocatedTarget | null {
  if (!m) return null;
  const fp: FaceplateType = m.meterType === 'PM8000' ? 'Fpl_PM8000' : 'Fpl_PMMFM383AC';
  return {
    screen: 'b2_pms',
    tag: m.tag,
    label: m.label,
    faceplateType: fp,
    faceplateTitle: `${fp} · ${m.label}`,
  };
}

const B2ArchitecturalGrid: React.FC<{ floorTitle: string; drawingNo: string }> = ({ floorTitle, drawingNo }) => {
  const x1 = B2_X_COLS[0].x;
  const x9 = B2_X_COLS[8].x;
  const y9 = B2_Y_ROWS[0].y;
  const y4 = B2_Y_ROWS[5].y;
  const y1 = B2_Y_ROWS[7].y;
  const x8 = B2_X_COLS[7].x;

  return (
    <g>
      <rect x={0} y={0} width={1340} height={768} fill="#d8dee9" />
      {B2_X_COLS.map((c) => (
        <g key={c.id}>
          <line x1={c.x} y1={32} x2={c.x} y2={746} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={c.x} cy={19} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={c.x} y={22.5} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {c.id}
          </text>
        </g>
      ))}
      {B2_Y_ROWS.map((r) => (
        <g key={r.id}>
          <line x1={32} y1={r.y} x2={1294} y2={r.y} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={1312} cy={r.y} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={1312} y={r.y + 3} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {r.id}
          </text>
        </g>
      ))}

      {/* Main Building 2 Structural Envelope */}
      <rect x={x1} y={y9} width={x9 - x1} height={y4 - y9} fill="#e2e8f0" stroke="#1e293b" strokeWidth={2.5} />
      {/* Bottom-Right Office / Staircase Wing */}
      <rect x={x8} y={y4} width={x9 - x8} height={y1 - y4} fill="#fef3c7" stroke="#1e293b" strokeWidth={2.2} />

      {/* Concrete Columns */}
      {B2_X_COLS.map((c) =>
        B2_Y_ROWS.slice(0, 6).map((r) => (
          <rect key={`b2col-${c.id}-${r.id}`} x={c.x - 4} y={r.y - 4} width={8} height={8} fill="#1e293b" />
        ))
      )}

      {/* Architectural Drawing Title Block */}
      <g transform="translate(56, 606)">
        <rect x={0} y={0} width={430} height={122} rx={3} fill="#ffffff" stroke="#1e293b" strokeWidth={1.6} />
        <rect x={0} y={0} width={430} height={24} fill="#0f172a" />
        <text x={10} y={16} fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="800">
          COHERENT COHR2401 · BUILDING 02 (ADVANCED OPTICS)
        </text>
        <text x={10} y={42} fill="#0f172a" fontSize="11" fontFamily="monospace" fontWeight="800">
          {floorTitle}
        </text>
        <text x={10} y={57} fill="#334155" fontSize="9.2" fontFamily="monospace" fontWeight="700">
          CAD Ref: {drawingNo} · Double-click any device/sensor to locate
        </text>
        <g transform="translate(10, 70)" fontFamily="monospace" fontSize="8.5" fontWeight="700">
          <rect x={0} y={0} width={11} height={11} fill="#00ce00" stroke="#14532d" />
          <text x={15} y={9} fill="#0f172a">RUN / OPEN</text>
          <rect x={88} y={0} width={11} height={11} fill="#e2e8f0" stroke="#334155" />
          <text x={103} y={9} fill="#0f172a">STOP / CLS</text>
          <rect x={176} y={0} width={11} height={11} fill="#ff0000" stroke="#7f1d1d" />
          <text x={191} y={9} fill="#0f172a">FAULT / HHA</text>
          <rect x={274} y={0} width={11} height={11} fill="#facc15" stroke="#854d0e" />
          <text x={289} y={9} fill="#0f172a">WARN (HA/LA)</text>

          <rect x={0} y={20} width={11} height={11} fill="#ffffff" stroke="#15803d" strokeWidth={1.5} />
          <text x={15} y={29} fill="#0f172a">SENSOR NORMAL</text>
          <text x={120} y={29} fill="#1e40af">[A]=AUTO  [M]=MANUAL · 2xClick=Go to Page</text>
        </g>
      </g>
    </g>
  );
};

const B2MonitorEqBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  eq?: EquipmentUnit;
  roomTempSensor?: AnalogSensor;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 88, h = 48, name, eq, roomTempSensor, onJump }) => (
  <FloorEquipmentIconTile
    x={x}
    y={y}
    w={w}
    h={h}
    name={name}
    eq={eq}
    roomTempSensor={roomTempSensor}
    onDoubleClick={() => {
      const target = resolveB2EquipmentTarget(eq);
      if (target) onJump(target);
    }}
  />
);

const B2MonitorSensorBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  name: string;
  sensor?: AnalogSensor;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 88, name, sensor, onJump }) => (
  <FloorSensorIconTile
    x={x}
    y={y}
    w={w}
    h={22}
    name={name}
    sensor={sensor}
    onDoubleClick={() => {
      const target = resolveB2SensorTarget(sensor);
      if (target) onJump(target);
    }}
  />
);

const B2MonitorValvePill: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  valve?: ValveUnit;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 84, h = 48, name, valve, onJump }) => (
  <FloorValveIconTile
    x={x}
    y={y}
    w={w}
    h={h}
    name={name}
    valve={valve}
    onDoubleClick={() => {
      const target = resolveB2ValveTarget(valve);
      if (target) onJump(target);
    }}
  />
);

const B2MonitorMeterBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  h?: number;
  name: string;
  meter?: PowerMeter;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 148, h = 50, name, meter, onJump }) => (
  <FloorMeterIconTile
    x={x}
    y={y}
    w={w}
    h={h}
    name={name}
    meter={meter}
    onDoubleClick={() => {
      const target = resolveB2MeterTarget(meter);
      if (target) onJump(target);
    }}
  />
);

/* ============================================================================
 * 1. B2 1F OVERVIEW (Scr_B2_1F_Overview.Pdl)
 * ========================================================================== */
export const B2Overview1FScreen: React.FC = () => {
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
            Building 2 — 1st Floor Architectural Overview (`Scr_B2_1F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 2.X1–2.X9 / 2.Y1–2.Y9 · Read-Only Monitor · Double-click any equipment, valve, or sensor to jump to its main control screen
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B2ArchitecturalGrid floorTitle="BUILDING 2 — 1ST FLOOR PRODUCTION & PCW STATION (1F)" drawingNo="Scr_B2_1F_Overview.Pdl" />

          {/* AREA 1 & AREA 2 CLEANROOMS (2.X1..2.X3, Upper) — SKY BLUE */}
          <rect x={57} y={55} width={278} height={212} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.2} />
          <rect x={57} y={55} width={278} height={20} fill="#1d4ed8" />
          <text x={66} y={68.5} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            AREA 1 &amp; AREA 2 CLEANROOMS (AHU-1F-01 / 02)
          </text>
          <B2MonitorSensorBox x={66} y={82} w={126} name="AREA1 Temp" sensor={sn['B22F_AHU01_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={198} y={82} w={128} name="AREA1 RH" sensor={sn['B22F_AHU01_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={66} y={110} w={126} name="AREA2 Temp" sensor={sn['B22F_AHU02_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={198} y={110} w={128} name="AREA2 RH" sensor={sn['B22F_AHU02_RAH']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={66} y={142} w={126} h={52} name="FFU-1F-01" eq={eq['B21F_FFU01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={198} y={142} w={128} h={52} name="FFU-1F-02" eq={eq['B21F_FFU02']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={66} y={202} w={126} h={52} name="FFU-1F-03" eq={eq['B21F_FFU03']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={198} y={202} w={128} h={52} name="EAF-1F-01" eq={eq['B21F_EAF01']} onJump={jumpToTarget} />

          {/* AREA 3 CNC & COATING AREA (2.X3..2.X6, Upper) — MINT EMERALD */}
          <rect x={336} y={55} width={432} height={212} fill="#bbf7d0" stroke="#14532d" strokeWidth={2.2} />
          <rect x={336} y={55} width={432} height={20} fill="#15803d" />
          <text x={346} y={68.5} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            AREA 3 / CNC · COATING AREA &amp; COATING MATERIAL (AHU-03 / 04 / 08)
          </text>
          <B2MonitorSensorBox x={346} y={84} w={132} name="CNC Temp (03)" sensor={sn['B22F_AHU03_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={486} y={84} w={132} name="Coating T (04)" sensor={sn['B22F_AHU04_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={626} y={84} w={132} name="Coat Mat T (08)" sensor={sn['B22F_AHU08_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={346} y={114} w={132} name="CNC RH (03)" sensor={sn['B22F_AHU03_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={486} y={114} w={132} name="Coating RH" sensor={sn['B22F_AHU04_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={626} y={114} w={132} name="Coat Mat RH" sensor={sn['B22F_AHU08_RAH']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={346} y={154} w={100} h={58} name="PAU-1F-01" eq={eq['B21F_PAU01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={452} y={154} w={100} h={58} name="PAU-1F-02" eq={eq['B21F_PAU02']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={558} y={154} w={98} h={58} name="EAF-1F-02" eq={eq['B21F_EAF02']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={662} y={154} w={96} h={58} name="EAF-1F-03" eq={eq['B21F_EAF03']} onJump={jumpToTarget} />

          {/* POLISHING, CLEANING LINE, SAND BLASTING, AREA 4 & GOWNING (2.X1..2.X6, Lower) — VIOLET / ROSE */}
          <rect x={57} y={268} width={356} height={318} fill="#e9d5ff" stroke="#581c87" strokeWidth={2.2} />
          <rect x={57} y={268} width={356} height={20} fill="#7e22ce" />
          <text x={66} y={281.5} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            POLISHING AREA &amp; 1F CLEAN LINE (AHU-1F-05..10)
          </text>
          <B2MonitorSensorBox x={68} y={306} w={162} name="Polishing T (AHU06)" sensor={sn['B22F_AHU06_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={240} y={306} w={162} name="Polishing RH (AHU06)" sensor={sn['B22F_AHU06_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={68} y={346} w={162} name="Clean Line T (AHU07)" sensor={sn['B22F_AHU07_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={240} y={346} w={162} name="Clean Line RH (AHU07)" sensor={sn['B22F_AHU07_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={68} y={386} w={162} name="Sand Blast T (AHU05)" sensor={sn['B22F_AHU05_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={240} y={386} w={162} name="Sand Blast RH" sensor={sn['B22F_AHU05_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={68} y={426} w={162} name="Area 4 T (AHU10)" sensor={sn['B22F_AHU10_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={240} y={426} w={162} name="Area 4 RH (AHU10)" sensor={sn['B22F_AHU10_RAH']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={68} y={466} w={162} name="Gowning T (AHU09)" sensor={sn['B22F_AHU09_RAT']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={240} y={466} w={162} name="Gowning RH (AHU09)" sensor={sn['B22F_AHU09_RAH']} onJump={jumpToTarget} />

          {/* 1F HALLWAY & OFFICE / LOBBY FCU ZONE (2.X4..2.X6, Lower) — MERGED FCU + ROOM TEMP! */}
          <rect x={414} y={268} width={354} height={318} fill="#fde68a" stroke="#92400e" strokeWidth={2.2} />
          <rect x={414} y={268} width={354} height={20} fill="#b45309" />
          <text x={424} y={281.5} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            1F OFFICE · LOBBY · MEETING (4× FCU WITH LIVE ROOM TEMP)
          </text>
          <B2MonitorEqBox x={428} y={304} w={156} h={62} name="FCU-1F-01" eq={eq['B21F_FCU01']} roomTempSensor={sn['B21F_FCU01RT1']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={596} y={304} w={156} h={62} name="FCU-1F-02" eq={eq['B21F_FCU02']} roomTempSensor={sn['B21F_FCU02RT1']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={428} y={380} w={156} h={62} name="FCU-1F-03" eq={eq['B21F_FCU03']} roomTempSensor={sn['B21F_FCU03RT1']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={596} y={380} w={156} h={62} name="FCU-1F-04" eq={eq['B21F_FCU04']} roomTempSensor={sn['B21F_FCU04RT1']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={428} y={466} w={156} h={56} name="TEF-1F-01" eq={eq['B21F_TEF01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={596} y={466} w={156} h={56} name="TEF-1F-02" eq={eq['B21F_TEF02']} onJump={jumpToTarget} />

          {/* RIGHT SIDE: BUILDING 2 PCW STATION (2.X6..2.X9, Full Height) — AQUA CYAN */}
          <rect x={768} y={55} width={492} height={531} fill="#a5f3fc" stroke="#155e75" strokeWidth={2.4} />
          <rect x={768} y={55} width={492} height={22} fill="#0e7490" />
          <text x={780} y={70} fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            BUILDING 2 PCW STATION (4× VFD PUMPS P-601A..D · E-601A/B · TK-601)
          </text>

          <B2MonitorEqBox x={782} y={88} w={112} h={52} name="P-601A" eq={eq['B21F_P601A']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={902} y={88} w={112} h={52} name="P-601B" eq={eq['B21F_P601B']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1022} y={88} w={112} h={52} name="P-601C" eq={eq['B21F_P601C']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1142} y={88} w={108} h={52} name="P-601D" eq={eq['B21F_P601D']} onJump={jumpToTarget} />

          <B2MonitorEqBox x={782} y={150} w={112} h={50} name="P-602" eq={eq['B21F_P602']} onJump={jumpToTarget} />
          <B2MonitorValvePill x={902} y={150} w={112} h={50} name="TCV10601" valve={vl['B21F_TCV10601']} onJump={jumpToTarget} />
          <B2MonitorValvePill x={1022} y={150} w={112} h={50} name="TCV10602" valve={vl['B21F_TCV10602']} onJump={jumpToTarget} />
          <B2MonitorValvePill x={1142} y={150} w={108} h={50} name="XV10602" valve={vl['B21F_XV10602']} onJump={jumpToTarget} />

          <B2MonitorSensorBox x={782} y={214} w={148} name="DPT10601 (PID)" sensor={sn['B21F_DPT10601']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={942} y={214} w={148} name="PIT10601 (Suct)" sensor={sn['B21F_PIT10601']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={1102} y={214} w={148} name="LT10601 (TK-601)" sensor={sn['B21F_LT10601']} onJump={jumpToTarget} />

          <B2MonitorSensorBox x={782} y={246} w={148} name="TT10601 (E601A)" sensor={sn['B21F_TT10601']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={942} y={246} w={148} name="TT10602 (E601B)" sensor={sn['B21F_TT10602']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={1102} y={246} w={148} name="TT10603 (Ret)" sensor={sn['B21F_TT10603']} onJump={jumpToTarget} />

          {/* Shared B5 Central Utility Feed Status inside PCW/Utility Bay */}
          <rect x={782} y={292} width={468} height={270} rx={4} fill="#e0f2fe" stroke="#0369a1" strokeWidth={1.6} />
          <rect x={782} y={292} width={468} height={20} fill="#0369a1" />
          <text x={792} y={305.5} fill="#ffffff" fontSize="8.8" fontFamily="monospace" fontWeight="800">
            SHARED UTILITY TIE-INS FROM BUILDING 5 CENTRAL PLANT (LIVE)
          </text>
          <text x={794} y={336} fill="#0c4a6e" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            CHW Supply (B51F_CHSTS1): {sn['B51F_CHSTS1'].pv.toFixed(1)} °C · Pressure: {sn['B51F_CHWPS1'].pv.toFixed(2)} bar
          </text>
          <text x={794} y={362} fill="#0c4a6e" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            Heat Recovery HW (B51F_HSTS1): {sn['B51F_HSTS1'].pv.toFixed(1)} °C · Pressure: {sn['B51F_HBPPS1'].pv.toFixed(2)} bar
          </text>
          <text x={794} y={388} fill="#0c4a6e" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            OFLAC Oil-Flood Air (B51F_PIT20101): {sn['B51F_PIT20101'].pv.toFixed(2)} bar · DP: {sn['B51F_AIT20101'].pv.toFixed(1)} °C
          </text>
          <text x={794} y={414} fill="#0c4a6e" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            Process Vacuum Main (B51F_PIT1301): {sn['B51F_PIT1301'].pv.toFixed(1)} kPa · B2 EoL: {sn['B23F_PIT1302'].pv.toFixed(1)} kPa
          </text>
          <text x={794} y={440} fill="#0c4a6e" fontSize="8.2" fontFamily="monospace" fontWeight="800">
            RO-DI Water Package: {plant.sandbox.diPackageConnected ? 'CONNECTED' : 'DISCONNECTED'} · B2 DI: {sn['B22F_PIT10704'].pv.toFixed(2)} bar
          </text>

          {/* Bottom-Right Staircase */}
          <rect x={1092} y={586} width={168} height={140} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1176} y={660} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            B2 STAIRCASE & LIFT
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. B2 2F OVERVIEW (Scr_B2_2F_Overview.Pdl) — MEP Deck: 10 AHUs + EXH + DI + ERV/PAUCT
 * ========================================================================== */
export const B2Overview2FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const eq = plant.equipment;
  const sn = plant.sensors;
  const vl = plant.valves;

  const ahu2fList = [
    { tag: 'B22F_AHU01', lbl: 'AHU-1F-01' },
    { tag: 'B22F_AHU02', lbl: 'AHU-1F-02' },
    { tag: 'B22F_AHU03', lbl: 'AHU-1F-03' },
    { tag: 'B22F_AHU04', lbl: 'AHU-1F-04' },
    { tag: 'B22F_AHU05', lbl: 'AHU-2F-05' },
    { tag: 'B22F_AHU06', lbl: 'AHU-1F-06' },
    { tag: 'B22F_AHU07', lbl: 'AHU-1F-07' },
    { tag: 'B22F_AHU08', lbl: 'AHU-2F-08' },
    { tag: 'B22F_AHU09', lbl: 'AHU-2F-09' },
    { tag: 'B22F_AHU10', lbl: 'AHU-2F-10' },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — 2nd Floor Mechanical & Service Deck Overview (`Scr_B2_2F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 2.X1–2.X9 / 2.Y1–2.Y9 · 10× 2F AHUs, 7× Process Exhaust VFDs, DI Loop 4, ERV/PAUCT/EAF/TEF · Double-click to locate
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B2ArchitecturalGrid floorTitle="BUILDING 2 — 2ND FLOOR MECHANICAL & EXHAUST DECK (2F)" drawingNo="Scr_B2_2F_Overview.Pdl" />

          {/* LEFT & CENTER UPPER: 10× 2F AHU DECK — SKY BLUE (Vertical AHU Icon Cards, pruned CW/HW/SAT/SAS) */}
          <rect x={57} y={55} width={711} height={323} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.2} />
          <rect x={57} y={55} width={711} height={22} fill="#1d4ed8" />
          <text x={68} y={70} fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            2ND FLOOR AHU &amp; PAU GALLERY (B22F_AHU01 .. B22F_AHU10 + PAU-1F-01/02)
          </text>

          {ahu2fList.map((a, idx) => {
            const col = idx % 5;
            const row = Math.floor(idx / 5);
            const x = 68 + col * 138;
            const y = 86 + row * 94;
            return (
              <g key={a.tag}>
                <B2MonitorEqBox x={x} y={y} w={130} h={56} name={a.lbl} eq={eq[a.tag]} onJump={jumpToTarget} />
                <B2MonitorSensorBox x={x} y={y + 60} w={130} name="Room T" sensor={sn[`${a.tag}_RAT`]} onJump={jumpToTarget} />
              </g>
            );
          })}

          <B2MonitorEqBox x={68} y={292} w={152} h={58} name="PAU-1F-01" eq={eq['B21F_PAU01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={230} y={292} w={152} h={58} name="PAU-1F-02" eq={eq['B21F_PAU02']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={392} y={292} w={116} h={58} name="FFU-1F-01" eq={eq['B21F_FFU01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={516} y={292} w={116} h={58} name="FFU-1F-02" eq={eq['B21F_FFU02']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={640} y={292} w={118} h={58} name="FFU-1F-03" eq={eq['B21F_FFU03']} onJump={jumpToTarget} />

          {/* LEFT & CENTER LOWER: ERV / PAUCT / EAF / TEF GALLERY — MINT EMERALD (14 Vertical 6-Blade Fan Icons) */}
          <rect x={57} y={379} width={711} height={207} fill="#bbf7d0" stroke="#14532d" strokeWidth={2.2} />
          <rect x={57} y={379} width={711} height={20} fill="#15803d" />
          <text x={68} y={393} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            2F AUXILIARY VENTILATION (ERV-01..04 · PAUCT-01..04 · PAUO-01 · EAF-01/02 · TEF-01..03)
          </text>
          {(
            [
              'B22F_ERV01', 'B22F_ERV02', 'B22F_ERV03', 'B22F_ERV04', 'B22F_PAUO01', 'B22F_PAUCT01', 'B22F_PAUCT02',
            ] as const
          ).map((t, i) => (
            <B2MonitorEqBox key={t} x={68 + i * 99} y={416} w={93} h={58} name={t.replace('B22F_', '')} eq={eq[t]} onJump={jumpToTarget} />
          ))}
          {(
            [
              'B22F_PAUCT03', 'B22F_PAUCT04', 'B22F_EAF01', 'B22F_EAF02', 'B22F_TEF01', 'B22F_TEF02', 'B22F_TEF03',
            ] as const
          ).map((t, i) => (
            <B2MonitorEqBox key={t} x={68 + i * 99} y={492} w={93} h={58} name={t.replace('B22F_', '')} eq={eq[t]} onJump={jumpToTarget} />
          ))}

          {/* RIGHT UPPER: PROCESS EXHAUST GALLERY (EXH 1 & EXH 2) — CORAL ROSE (7 Vertical 6-Blade Fan VFD Icons) */}
          <rect x={769} y={55} width={491} height={368} fill="#fecdd3" stroke="#9f1239" strokeWidth={2.2} />
          <rect x={769} y={55} width={491} height={22} fill="#be123c" />
          <text x={780} y={70} fill="#ffffff" fontSize="9.2" fontFamily="monospace" fontWeight="800">
            PROCESS EXHAUST FAN ROOM (EXH 1 &amp; EXH 2 · 7× VFD FANS)
          </text>

          <B2MonitorEqBox x={782} y={90} w={112} h={58} name="FA11001A" eq={eq['B22F_FA11001A']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={900} y={90} w={112} h={58} name="FA11002A" eq={eq['B22F_FA11002A']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1018} y={90} w={112} h={58} name="FA11002C" eq={eq['B22F_FA11002C']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1136} y={90} w={112} h={58} name="FA11003A" eq={eq['B22F_FA11003A']} onJump={jumpToTarget} />

          <B2MonitorEqBox x={782} y={162} w={148} h={58} name="FA11004A" eq={eq['B22F_FA11004A']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={940} y={162} w={148} h={58} name="FA11004B" eq={eq['B22F_FA11004B']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1098} y={162} w={150} h={58} name="FA11005A" eq={eq['B22F_FA11005A']} onJump={jumpToTarget} />

          <B2MonitorSensorBox x={782} y={240} w={148} name="PIT11003 (Acid)" sensor={sn['B21F_PIT11003']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={940} y={240} w={148} name="PIT11004 (Solv A)" sensor={sn['B21F_PIT11004']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={1098} y={240} w={150} name="PIT11005 (Solv C)" sensor={sn['B21F_PIT11005']} onJump={jumpToTarget} />

          <B2MonitorSensorBox x={782} y={276} w={148} name="PIT11006 (Grind)" sensor={sn['B21F_PIT11006']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={940} y={276} w={148} name="PIT11001 (EXH-2)" sensor={sn['B22F_PIT11001']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={1098} y={276} w={150} name="TIT11001 (Oven)" sensor={sn['B21F_TIT11001']} onJump={jumpToTarget} />

          {/* RIGHT LOWER: BUILDING 2 DI WATER LOOP 4 SKID — AQUA CYAN */}
          <rect x={769} y={424} width={491} height={162} fill="#a5f3fc" stroke="#155e75" strokeWidth={2.2} />
          <rect x={769} y={424} width={491} height={20} fill="#0e7490" />
          <text x={780} y={438} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="800">
            BUILDING 2 — 2F DI WATER DISTRIBUTION LOOP (FROM B5 RO-DI PACKAGE)
          </text>
          <B2MonitorValvePill x={782} y={466} w={146} h={56} name="PCV10704" valve={vl['B22F_PCV10704']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={940} y={482} w={148} name="B22F_PIT10704" sensor={sn['B22F_PIT10704']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={1098} y={482} w={150} name="B22F_FIT10704" sensor={sn['B22F_FIT10704']} onJump={jumpToTarget} />

          <rect x={1092} y={586} width={168} height={140} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1176} y={660} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            B2 STAIRCASE &amp; LIFT
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. B2 3F OVERVIEW (Scr_B2_3F_Overview.Pdl) — 3F Optics Cleanrooms + PV EoL + 3F FCU
 * ========================================================================== */
export const B2Overview3FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const eq = plant.equipment;
  const sn = plant.sensors;

  const rooms3f = [
    { x: 57, y: 55, w: 298, h: 174, bg: '#bfdbfe', hdr: '#1d4ed8', bd: '#1e3a8a', title: 'DISCO DICING RM (M3F-AHU01)', ahu: 'B2M3F_AHU01' },
    { x: 356, y: 55, w: 300, h: 174, bg: '#bbf7d0', hdr: '#15803d', bd: '#14532d', title: 'GRINDING AREA 1 (M3F-AHU02)', ahu: 'B2M3F_AHU02' },
    { x: 657, y: 55, w: 300, h: 174, bg: '#bbf7d0', hdr: '#15803d', bd: '#14532d', title: 'GRINDING AREA 2 (M3F-AHU03)', ahu: 'B2M3F_AHU03' },
    { x: 958, y: 55, w: 302, h: 174, bg: '#a5f3fc', hdr: '#0e7490', bd: '#155e75', title: 'WAX CLEAN LINE (M3F-AHU04)', ahu: 'B2M3F_AHU04' },

    { x: 57, y: 230, w: 298, h: 174, bg: '#a5f3fc', hdr: '#0e7490', bd: '#155e75', title: 'CLEANING ROOM (M3F-AHU05)', ahu: 'B2M3F_AHU05' },
    { x: 356, y: 230, w: 300, h: 174, bg: '#e9d5ff', hdr: '#7e22ce', bd: '#581c87', title: '3F CLEAN LINE (M3F-AHU06)', ahu: 'B2M3F_AHU06' },
    { x: 657, y: 230, w: 300, h: 174, bg: '#fed7aa', hdr: '#c2410c', bd: '#7c2d12', title: 'ASSEMBLY WORKSHOP (M3F-AHU07)', ahu: 'B2M3F_AHU07' },
    { x: 958, y: 230, w: 302, h: 174, bg: '#fed7aa', hdr: '#c2410c', bd: '#7c2d12', title: 'ASSEMBLY INSPECTION (M3F-AHU08)', ahu: 'B2M3F_AHU08' },

    { x: 57, y: 405, w: 398, h: 181, bg: '#bfdbfe', hdr: '#1d4ed8', bd: '#1e3a8a', title: 'OPTICAL MOUNTING (M3F-AHU09 + FFU-3F-01)', ahu: 'B2M3F_AHU09' },
    { x: 456, y: 405, w: 398, h: 181, bg: '#e9d5ff', hdr: '#7e22ce', bd: '#581c87', title: '3F POLISHING AREA (M3F-AHU10 + PV EoL)', ahu: 'B2M3F_AHU10' },
    { x: 855, y: 405, w: 405, h: 181, bg: '#fde68a', hdr: '#b45309', bd: '#92400e', title: 'HAND CLEAN / CHANGING / 3F OFFICE (AHU11 & FCU02)', ahu: 'B2M3F_AHU11' },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — 3rd Floor Cleanroom Production Overview (`Scr_B2_3F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 2.X1–2.X9 / 2.Y1–2.Y9 · 11 Cleanroom Zones served by M3F AHUs + B23F_PIT1302 PV EoL + FCU-3F-02 · Double-click to locate
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B2ArchitecturalGrid floorTitle="BUILDING 2 — 3RD FLOOR CLEANROOM PRODUCTION (3F)" drawingNo="Scr_B2_3F_Overview.Pdl" />

          {rooms3f.map((rm) => (
            <g key={rm.title}>
              <rect x={rm.x} y={rm.y} width={rm.w} height={rm.h} fill={rm.bg} stroke={rm.bd} strokeWidth={2.0} />
              <rect x={rm.x} y={rm.y} width={rm.w} height={20} fill={rm.hdr} />
              <text x={rm.x + 8} y={rm.y + 13.5} fill="#ffffff" fontSize="8.6" fontFamily="monospace" fontWeight="800">
                {rm.title}
              </text>
              <B2MonitorSensorBox x={rm.x + 12} y={rm.y + 34} w={132} name="Room Temp" sensor={sn[`${rm.ahu}_RAT`]} onJump={jumpToTarget} />
              <B2MonitorSensorBox x={rm.x + 154} y={rm.y + 34} w={132} name="Room RH" sensor={sn[`${rm.ahu}_RAH`]} onJump={jumpToTarget} />
            </g>
          ))}

          {/* Extra 3F room equipment embedded inside bottom 3 rooms (Vertical SCADA Icons, merged FCU+RT!) */}
          <B2MonitorEqBox x={69} y={482} w={164} h={58} name="FFU-3F-01" eq={eq['B22F_FFU01']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={468} y={496} w={196} name="B23F_PIT1302 (PV EoL)" sensor={sn['B23F_PIT1302']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={867} y={482} w={132} h={58} name="FCU-3F-02" eq={eq['B23F_FCU02']} roomTempSensor={sn['B23F_FCU02RT1']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1008} y={482} w={116} h={58} name="TEF-3F-01" eq={eq['B23F_TEF01']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={1132} y={482} w={116} h={58} name="TEF-3F-02" eq={eq['B23F_TEF02']} onJump={jumpToTarget} />

          <rect x={1092} y={586} width={168} height={140} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1176} y={660} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            B2 STAIRCASE &amp; LIFT
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. B2 M3F OVERVIEW (Scr_B2_M3F_Overview.Pdl) — 11 M3F AHUs + PAU-2F-01/02 + MSB Room
 * ========================================================================== */
export const B2OverviewM3FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const eq = plant.equipment;
  const sn = plant.sensors;
  const mt = plant.meters;

  const m3fAhus = [
    'B2M3F_AHU01', 'B2M3F_AHU02', 'B2M3F_AHU03', 'B2M3F_AHU04', 'B2M3F_AHU05', 'B2M3F_AHU06',
    'B2M3F_AHU07', 'B2M3F_AHU08', 'B2M3F_AHU09', 'B2M3F_AHU10', 'B2M3F_AHU11',
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — M3F Mezzanine Mechanical &amp; MSB Room Overview (`Scr_B2_M3F_Overview`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Structural Grid 2.X1–2.X9 / 2.Y1–2.Y9 · 11× M3F AHUs + PAU-2F-01/02 + MSB Room (MDB-2.1 &amp; MDB-A0.7) · Double-click to locate
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#bac3d0] border-2 border-[#334155] rounded-lg p-2 overflow-x-auto shadow-inner">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B2ArchitecturalGrid floorTitle="BUILDING 2 — M3F MECHANICAL GALLERY & MSB ROOM (M3F)" drawingNo="Scr_B2_M3F_Overview.Pdl" />

          {/* MEP SPACE M3F: 11× M3F AHUs + 2× PAU-2F + FFU-3F — SKY BLUE (Pruned CW/HW/SAT/SAS clutter) */}
          <rect x={57} y={55} width={867} height={531} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={2.2} />
          <rect x={57} y={55} width={867} height={22} fill="#1d4ed8" />
          <text x={68} y={70} fill="#ffffff" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            MEP SPACE M3F — 11× M3F CLEANROOM AHUs (B2M3F_AHU01..11) + PAU-2F-01/02
          </text>

          {m3fAhus.map((tag, idx) => {
            const col = idx % 6;
            const row = Math.floor(idx / 6);
            const x = 68 + col * 141;
            const y = 94 + row * 124;
            const shortName = tag.replace('B2M3F_', 'M3F-');
            return (
              <g key={tag}>
                <B2MonitorEqBox x={x} y={y} w={133} h={60} name={shortName} eq={eq[tag]} onJump={jumpToTarget} />
                <B2MonitorSensorBox x={x} y={y + 66} w={133} name="Room T" sensor={sn[`${tag}_RAT`]} onJump={jumpToTarget} />
              </g>
            );
          })}

          {/* PAU-2F-01/02 & FFU-3F-01 Strip at bottom of M3F MEP deck */}
          <B2MonitorEqBox x={68} y={376} w={180} h={62} name="PAU-2F-01" eq={eq['B22F_PAU01']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={68} y={446} w={180} name="PAU-2F-01 SAT" sensor={sn['B22F_PAU01_SAT']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={264} y={376} w={180} h={62} name="PAU-2F-02" eq={eq['B22F_PAU02']} onJump={jumpToTarget} />
          <B2MonitorSensorBox x={264} y={446} w={180} name="PAU-2F-02 SAT" sensor={sn['B22F_PAU02_SAT']} onJump={jumpToTarget} />
          <B2MonitorEqBox x={460} y={376} w={180} h={62} name="FFU-3F-01" eq={eq['B22F_FFU01']} onJump={jumpToTarget} />

          {/* RIGHT SIDE: BUILDING 2 MSB ELECTRICAL SWITCHROOM — AMBER GOLD (Vertical PM8000 / MFM383 Icon Cards) */}
          <rect x={925} y={55} width={335} height={531} fill="#fde68a" stroke="#92400e" strokeWidth={2.4} />
          <rect x={925} y={55} width={335} height={22} fill="#b45309" />
          <text x={936} y={70} fill="#ffffff" fontSize="9.2" fontFamily="monospace" fontWeight="800">
            MSB ELECTRICAL ROOM (MDB-2.1 &amp; MDB-A0.7)
          </text>

          <B2MonitorMeterBox x={940} y={88} w={148} h={56} name="MDB-2.1" meter={mt['PMDB_B2_MDB21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={88} w={148} h={56} name="MDB-A0.7" meter={mt['PMDB_B2_MDBA07']} onJump={jumpToTarget} />

          <B2MonitorMeterBox x={940} y={160} w={148} h={52} name="DB-AHU-2.1" meter={mt['B2M3F_DBAHU21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={160} w={148} h={52} name="DB-AHU-2.2" meter={mt['B2M3F_DBAHU22']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={940} y={222} w={148} h={52} name="DB-PCW-2.1" meter={mt['B21F_DBPCW21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={222} w={148} h={52} name="DB-FAN-2.1" meter={mt['B22FB_DBFAN21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={940} y={284} w={148} h={52} name="DB-OFF-2.1" meter={mt['B22FB_DBOFF21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={284} w={148} h={52} name="DB-AIR-2.1" meter={mt['B21F_DBAIR21']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={940} y={346} w={148} h={52} name="DB-CT-1" meter={mt['B21FA_DBCT1']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={346} w={148} h={52} name="DB-CL-2" meter={mt['B23F_DBCL2']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={940} y={408} w={148} h={52} name="DB-SU-1" meter={mt['B23F_DBSU1']} onJump={jumpToTarget} />
          <B2MonitorMeterBox x={1097} y={408} w={148} h={52} name="DB-PO-2.1" meter={mt['B23F_DBPO21']} onJump={jumpToTarget} />

          <rect x={1092} y={586} width={168} height={140} fill="#cbd5e1" stroke="#334155" strokeWidth={1.6} />
          <text x={1176} y={660} textAnchor="middle" fill="#1e293b" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            B2 STAIRCASE &amp; LIFT
          </text>
        </svg>
      </div>
    </div>
  );
};
