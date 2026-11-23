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
 * Building 3 Architectural Floor Overview Monitor Screens (Real SCADA Equipment Icons)
 *  - Grounded in WinCC Scr_B3_1F_Overview.Pdl & Scr_B3_M1F_Overview.Pdl.
 *  - Uses crisp static SCADA Equipment Icons (Air-Cooled Chiller, Heat Fan, Pumps, AHUs,
 *    FCUs with inline room temp, Exhaust Fans, Control Valves, PM8000/MFM383 Meters).
 *  - Pruned to ONLY essential KPIs (redundant isolation valves & duplicate RT boxes removed).
 *  - DOUBLE-CLICK any icon/sensor to jump straight to its primary interactive screen
 *    with the 2.0s steady light-yellow bounding box highlight.
 */

const B3_X_COLS: { id: string; x: number }[] = [
  { id: '3.X1', x: 56 },
  { id: '3.X2', x: 196 },
  { id: '3.X3', x: 336 },
  { id: '3.X4', x: 476 },
  { id: '3.X5', x: 616 },
  { id: '3.X6', x: 768 },
  { id: '3.X7', x: 924 },
  { id: '3.X8', x: 1092 },
  { id: '3.X9', x: 1260 },
];

const B3_Y_ROWS: { id: string; y: number }[] = [
  { id: '3.Y9', y: 54 },
  { id: '3.Y8', y: 158 },
  { id: '3.Y7', y: 268 },
  { id: '3.Y6', y: 378 },
  { id: '3.Y5', y: 486 },
  { id: '3.Y4', y: 586 },
  { id: '3.Y2', y: 656 },
  { id: '3.Y1', y: 726 },
];

function resolveB3EquipmentTarget(eq?: EquipmentUnit): LocatedTarget | null {
  if (!eq) return null;
  const { tag, label, subsystem, kind } = eq;
  let screen: B5ScreenId = 'b3_chiller';
  let faceplateType: FaceplateType = kind === 'vfd' ? 'Fpl_VFD' : kind === 'chiller' ? 'Fpl_CH' : 'Fpl_DOL';

  if (subsystem === 'chiller') {
    screen = 'b3_chiller';
    faceplateType = kind === 'chiller' ? 'Fpl_CH' : 'Fpl_VFD';
  } else if (subsystem === 'heat_recovery') {
    screen = 'b3_heat';
    faceplateType = kind === 'chiller' ? 'Fpl_CH' : 'Fpl_VFD';
  } else if (subsystem === 'ahu') {
    screen = 'b3_air_ahu';
    faceplateType = tag.includes('FCU') ? 'Fpl_DOL' : 'Fpl_AHU_DewPoint';
  } else if (subsystem === 'exh') {
    screen = 'b3_exh';
    faceplateType = kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
  } else if (subsystem === 'di') {
    screen = 'b3_di';
  }

  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveB3ValveTarget(v?: ValveUnit): LocatedTarget | null {
  if (!v) return null;
  const { tag, label, subsystem, kind } = v;
  let screen: B5ScreenId = 'b3_chiller';
  if (subsystem === 'heat_recovery') screen = 'b3_heat';
  else if (subsystem === 'di') screen = 'b3_di';
  else if (subsystem === 'ahu') screen = tag.includes('FCU') ? 'b3_air_ahu' : 'b3_cw_ahu';

  const faceplateType: FaceplateType = kind === 'CVAL' ? 'Fpl_CVAL' : 'Fpl_XVAL';
  return {
    screen,
    tag,
    label,
    faceplateType,
    faceplateTitle: `${faceplateType} · ${tag}`,
  };
}

function resolveB3SensorTarget(s?: AnalogSensor): LocatedTarget | null {
  if (!s) return null;
  const { tag, label, subsystem } = s;
  let screen: B5ScreenId = 'b3_chiller';
  if (subsystem === 'heat_recovery') screen = 'b3_heat';
  else if (subsystem === 'di') screen = 'b3_di';
  else if (subsystem === 'exh') screen = 'b3_exh';
  else if (subsystem === 'ahu') {
    if (tag.includes('FCU')) {
      return {
        screen: 'b3_air_ahu',
        tag,
        label,
        faceplateType: 'Fpl_Sensor',
        faceplateTitle: `Fpl_TIT · ${tag}`,
      };
    }
    const ahuTag = tag.replace(/_(SAT|RAT|RAH|SAS|DP)$/, '');
    return {
      screen: 'b3_air_ahu',
      tag: ahuTag,
      label: `${tag} (${label})`,
      faceplateType: 'Fpl_AHU_DewPoint',
      faceplateTitle: `Fpl_AHU_DewPoint · ${ahuTag}`,
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

function resolveB3MeterTarget(m?: PowerMeter): LocatedTarget | null {
  if (!m) return null;
  const fp: FaceplateType = m.meterType === 'PM8000' ? 'Fpl_PM8000' : 'Fpl_PMMFM383AC';
  return {
    screen: 'b3_pms',
    tag: m.tag,
    label: m.label,
    faceplateType: fp,
    faceplateTitle: `${fp} · ${m.label}`,
  };
}

const B3ArchitecturalGrid: React.FC<{ floorTitle: string; drawingNo: string }> = ({ floorTitle, drawingNo }) => {
  const x1 = B3_X_COLS[0].x;
  const x9 = B3_X_COLS[8].x;
  const y9 = B3_Y_ROWS[0].y;
  const y4 = B3_Y_ROWS[5].y;
  const y1 = B3_Y_ROWS[7].y;
  const x8 = B3_X_COLS[7].x;

  return (
    <g>
      <rect x={0} y={0} width={1340} height={768} fill="#d8dee9" />
      {B3_X_COLS.map((c) => (
        <g key={c.id}>
          <line x1={c.x} y1={32} x2={c.x} y2={746} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={c.x} cy={19} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={c.x} y={22.5} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {c.id}
          </text>
        </g>
      ))}
      {B3_Y_ROWS.map((r) => (
        <g key={r.id}>
          <line x1={32} y1={r.y} x2={1294} y2={r.y} stroke="#64748b" strokeWidth={0.85} strokeDasharray="6 3 1.5 3" />
          <circle cx={1312} cy={r.y} r={12} fill="#ffffff" stroke="#1e293b" strokeWidth={1.3} />
          <text x={1312} y={r.y + 3} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">
            {r.id}
          </text>
        </g>
      ))}

      <rect x={x1} y={y9} width={x9 - x1} height={y4 - y9} fill="#e2e8f0" stroke="#1e293b" strokeWidth={2.5} />
      <rect x={x8} y={y4} width={x9 - x8} height={y1 - y4} fill="#fef3c7" stroke="#1e293b" strokeWidth={2.2} />

      {B3_X_COLS.map((c) =>
        B3_Y_ROWS.slice(0, 6).map((r) => (
          <rect key={`b3col-${c.id}-${r.id}`} x={c.x - 4} y={r.y - 4} width={8} height={8} fill="#1e293b" />
        ))
      )}

      <g transform="translate(56, 606)">
        <rect x={0} y={0} width={450} height={116} rx={3} fill="#ffffff" stroke="#1e293b" strokeWidth={1.6} />
        <rect x={0} y={0} width={450} height={24} fill="#0f172a" />
        <text x={10} y={16} fill="#ffffff" fontSize="10.5" fontFamily="monospace" fontWeight="800">
          COHERENT COHR2401 · BUILDING 03 (ADVANCED OPTICS)
        </text>
        <text x={10} y={42} fill="#0f172a" fontSize="11" fontFamily="monospace" fontWeight="800">
          {floorTitle}
        </text>
        <text x={10} y={57} fill="#334155" fontSize="9.2" fontFamily="monospace" fontWeight="700">
          CAD Ref: {drawingNo} · Double-click any equipment icon to locate
        </text>
        <g transform="translate(10, 72)" fontFamily="monospace" fontSize="8.5" fontWeight="700">
          <rect x={0} y={0} width={11} height={11} fill="#22c55e" stroke="#14532d" />
          <text x={15} y={9} fill="#0f172a">RUN / OPEN</text>
          <rect x={88} y={0} width={11} height={11} fill="#cbd5e1" stroke="#334155" />
          <text x={103} y={9} fill="#0f172a">STOP / CLS</text>
          <rect x={176} y={0} width={11} height={11} fill="#ef4444" stroke="#7f1d1d" />
          <text x={191} y={9} fill="#0f172a">FAULT / HHA</text>
          <rect x={274} y={0} width={11} height={11} fill="#3b82f6" stroke="#1e3a8a" />
          <text x={289} y={9} fill="#0f172a">TRANSIT</text>
        </g>
      </g>
    </g>
  );
};

const B3MonitorSensorBox: React.FC<{
  x: number;
  y: number;
  w?: number;
  name: string;
  sensor?: AnalogSensor;
  onJump: (target: LocatedTarget) => void;
}> = ({ x, y, w = 112, name, sensor, onJump }) => (
  <FloorSensorIconTile
    x={x}
    y={y}
    w={w}
    h={22}
    name={name}
    sensor={sensor}
    onDoubleClick={() => {
      const target = resolveB3SensorTarget(sensor);
      if (target) onJump(target);
    }}
  />
);

// =============================================================================
// 1. BUILDING 3 — 1ST FLOOR OVERVIEW (`Scr_B3_1F_Overview.Pdl`)
// =============================================================================
export const B3Overview1FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);

  const eq = (tag: string) => plant.equipment[tag];
  const jumpEq = (tag: string) => () => {
    const t = resolveB3EquipmentTarget(plant.equipment[tag]);
    if (t) jumpToTarget(t);
  };
  const jumpVl = (tag: string) => () => {
    const t = resolveB3ValveTarget(plant.valves[tag]);
    if (t) jumpToTarget(t);
  };
  const jumpMt = (tag: string) => () => {
    const t = resolveB3MeterTarget(plant.meters[tag]);
    if (t) jumpToTarget(t);
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — 1F Architectural Floor Overview (`Scr_B3_1F_Overview.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Air-Cooled Chiller Yard · Heat Fan Yard · Cleanse · Chemical · Material · Warehouse · DI Cistern · Double-click any icon to locate
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#cfd6e0] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B3ArchitecturalGrid floorTitle="BUILDING 3 — 1ST FLOOR (1F) PLANT & PROCESS ZONES" drawingNo="Scr_B3_1F_Overview.Pdl" />

          {/* ZONE 1: AIR-COOLED CHILLER YARD (Top-Left) */}
          <rect x={64} y={64} width={388} height={240} fill="#bae6fd" fillOpacity={0.7} stroke="#0369a1" strokeWidth={1.8} />
          <text x={74} y={82} fill="#0c4a6e" fontSize="10" fontFamily="monospace" fontWeight="900">
            AIR-COOLED CHILLER YARD (CH-21 / CH-22 · NO CT)
          </text>
          <FloorEquipmentIconTile x={76} y={92} w={116} h={54} name="CH-21" eq={eq('B31F_CH21')} onDoubleClick={jumpEq('B31F_CH21')} />
          <FloorEquipmentIconTile x={200} y={92} w={116} h={54} name="CH-22" eq={eq('B31F_CH22')} onDoubleClick={jumpEq('B31F_CH22')} />
          <FloorEquipmentIconTile x={324} y={92} w={116} h={54} name="EAF-05" eq={eq('B31F_EAF05')} onDoubleClick={jumpEq('B31F_EAF05')} />

          <FloorEquipmentIconTile x={76} y={156} w={116} h={52} name="CH21P" eq={eq('B31F_CH21CHWP')} onDoubleClick={jumpEq('B31F_CH21CHWP')} />
          <FloorEquipmentIconTile x={200} y={156} w={116} h={52} name="CH22P" eq={eq('B31F_CH22CHWP')} onDoubleClick={jumpEq('B31F_CH22CHWP')} />
          <FloorValveIconTile x={324} y={156} w={116} h={52} name="BPMV" valve={plant.valves['B31F_BPMV']} onDoubleClick={jumpVl('B31F_BPMV')} />

          <B3MonitorSensorBox x={76} y={222} w={116} name="CHSTS1 Sup" sensor={plant.sensors['B31F_CHSTS1']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={200} y={222} w={116} name="CHRTS2 Ret" sensor={plant.sensors['B31F_CHRTS2']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={324} y={222} w={116} name="CHWPS1 Hdr" sensor={plant.sensors['B31F_CHWPS1']} onJump={jumpToTarget} />

          {/* ZONE 2: HOT WATER HEAT FAN YARD (Bottom-Left) */}
          <rect x={64} y={316} width={388} height={260} fill="#fecdd3" fillOpacity={0.68} stroke="#be123c" strokeWidth={1.8} />
          <text x={74} y={334} fill="#881337" fontSize="10" fontFamily="monospace" fontWeight="900">
            HOT WATER HEAT FAN YARD (HP-01 / HP-02 / HP-03)
          </text>
          <FloorEquipmentIconTile x={76} y={346} w={116} h={54} name="HP-01" eq={eq('B31F_HP01')} onDoubleClick={jumpEq('B31F_HP01')} />
          <FloorEquipmentIconTile x={200} y={346} w={116} h={54} name="HP-02" eq={eq('B31F_HP02')} onDoubleClick={jumpEq('B31F_HP02')} />
          <FloorEquipmentIconTile x={324} y={346} w={116} h={54} name="HP-03" eq={eq('B31F_HP03')} onDoubleClick={jumpEq('B31F_HP03')} />

          <FloorEquipmentIconTile x={76} y={412} w={116} h={52} name="HPP-21" eq={eq('B31F_HPP21')} onDoubleClick={jumpEq('B31F_HPP21')} />
          <FloorEquipmentIconTile x={200} y={412} w={116} h={52} name="HPP-22" eq={eq('B31F_HPP22')} onDoubleClick={jumpEq('B31F_HPP22')} />
          <FloorValveIconTile x={324} y={412} w={116} h={52} name="HPBPMV" valve={plant.valves['B31F_HPBPMV']} onDoubleClick={jumpVl('B31F_HPBPMV')} />

          <B3MonitorSensorBox x={76} y={480} w={116} name="HPSTS1 Sup" sensor={plant.sensors['B31F_HPSTS1']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={200} y={480} w={116} name="HPRTS2 Ret" sensor={plant.sensors['B31F_HPRTS2']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={324} y={480} w={116} name="HWPS1 Hdr" sensor={plant.sensors['B31F_HWPS1']} onJump={jumpToTarget} />

          {/* ZONE 3: CLEANSE & WET BENCH CLEANROOM (Top-Center) */}
          <rect x={464} y={64} width={450} height={240} fill="#bbf7d0" fillOpacity={0.62} stroke="#15803d" strokeWidth={1.8} />
          <text x={476} y={82} fill="#14532d" fontSize="10" fontFamily="monospace" fontWeight="900">
            CLEANSE &amp; WET BENCH ROOM (AHU-01 · WB 0..4)
          </text>
          <B3MonitorSensorBox x={476} y={94} w={132} name="AHU01 Room T" sensor={plant.sensors['B3M1F_AHU01_RAT']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={616} y={94} w={132} name="AHU01 Room RH" sensor={plant.sensors['B3M1F_AHU01_RAH']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={756} y={94} w={144} name="AHU01 DewPt" sensor={plant.sensors['B3M1F_AHU01_DP']} onJump={jumpToTarget} />

          <FloorEquipmentIconTile x={476} y={128} w={132} h={52} name="EAF-01" eq={eq('B31F_EAF01')} onDoubleClick={jumpEq('B31F_EAF01')} />
          <FloorMeterIconTile x={616} y={128} w={132} h={52} name="DB-WB" meter={plant.meters['PMDB_B31F_DBWB']} onDoubleClick={jumpMt('PMDB_B31F_DBWB')} />
          <FloorMeterIconTile x={756} y={128} w={144} h={52} name="DB-WB-1" meter={plant.meters['PMDB_B31F_DBWB1']} onDoubleClick={jumpMt('PMDB_B31F_DBWB1')} />

          <FloorMeterIconTile x={476} y={190} w={132} h={52} name="DB-WB-2" meter={plant.meters['PMDB_B31F_DBWB2']} onDoubleClick={jumpMt('PMDB_B31F_DBWB2')} />
          <FloorMeterIconTile x={616} y={190} w={132} h={52} name="DB-WB-3" meter={plant.meters['PMDB_B31F_DBWB3']} onDoubleClick={jumpMt('PMDB_B31F_DBWB3')} />
          <FloorMeterIconTile x={756} y={190} w={144} h={52} name="DB-WB-4" meter={plant.meters['PMDB_B31F_DBWB4']} onDoubleClick={jumpMt('PMDB_B31F_DBWB4')} />

          {/* ZONE 4: CHEMICAL & MATERIAL ROOMS (Bottom-Center) */}
          <rect x={464} y={316} width={220} height={260} fill="#fde68a" fillOpacity={0.62} stroke="#b45309" strokeWidth={1.8} />
          <text x={474} y={334} fill="#78350f" fontSize="10" fontFamily="monospace" fontWeight="900">
            CHEMICAL ROOM
          </text>
          <FloorEquipmentIconTile x={476} y={350} w={128} h={54} name="EAF-02" eq={eq('B31F_EAF02')} onDoubleClick={jumpEq('B31F_EAF02')} />
          <B3MonitorSensorBox x={476} y={420} w={194} name="AHU02 Room T" sensor={plant.sensors['B3M1F_AHU02_RAT']} onJump={jumpToTarget} />

          <rect x={694} y={316} width={220} height={260} fill="#e9d5ff" fillOpacity={0.65} stroke="#7e22ce" strokeWidth={1.8} />
          <text x={704} y={334} fill="#581c87" fontSize="10" fontFamily="monospace" fontWeight="900">
            MATERIAL ROOM
          </text>
          <FloorEquipmentIconTile x={706} y={350} w={128} h={54} name="EAF-03" eq={eq('B31F_EAF03')} onDoubleClick={jumpEq('B31F_EAF03')} />
          <B3MonitorSensorBox x={706} y={420} w={194} name="AHU02 Room RH" sensor={plant.sensors['B3M1F_AHU02_RAH']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={706} y={452} w={194} name="AHU02 DewPt" sensor={plant.sensors['B3M1F_AHU02_DP']} onJump={jumpToTarget} />

          {/* ZONE 5: CISTERN / DI WATER ROOM (Top-Right) */}
          <rect x={926} y={64} width={324} height={240} fill="#cffafe" fillOpacity={0.72} stroke="#0e7490" strokeWidth={1.8} />
          <text x={938} y={82} fill="#164e63" fontSize="10" fontFamily="monospace" fontWeight="900">
            CISTERN &amp; DI WATER LOOP (PCV10705)
          </text>
          <FloorValveIconTile x={938} y={96} w={144} h={54} name="PCV10705" valve={plant.valves['B31F_PCV10705']} onDoubleClick={jumpVl('B31F_PCV10705')} />
          <FloorEquipmentIconTile x={1092} y={96} w={144} h={54} name="EAF-04" eq={eq('B31F_EAF04')} onDoubleClick={jumpEq('B31F_EAF04')} />
          <B3MonitorSensorBox x={938} y={164} w={144} name="PIT10705 Press" sensor={plant.sensors['B31F_PIT10705']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={1092} y={164} w={144} name="FIT10705 Flow" sensor={plant.sensors['B31F_FIT10705']} onJump={jumpToTarget} />

          {/* ZONE 6: WAREHOUSE & 1F FCU-03 / RESTROOM (Bottom-Right) */}
          <rect x={926} y={316} width={324} height={260} fill="#e2e8f0" fillOpacity={0.82} stroke="#334155" strokeWidth={1.8} />
          <text x={938} y={334} fill="#0f172a" fontSize="10" fontFamily="monospace" fontWeight="900">
            WAREHOUSE &amp; EXISTING REST ROOM
          </text>
          <FloorEquipmentIconTile
            x={938}
            y={352}
            w={144}
            h={56}
            name="FCU-1F-03"
            eq={eq('B31F_FCU03')}
            roomTempSensor={plant.sensors['B31F_FCU03RT1']}
            onDoubleClick={jumpEq('B31F_FCU03')}
          />
          <FloorEquipmentIconTile x={1094} y={352} w={136} h={56} name="TEF-01" eq={eq('B31F_TEF01')} onDoubleClick={jumpEq('B31F_TEF01')} />
          <FloorMeterIconTile x={938} y={426} w={144} h={54} name="DB-OFF-3.1" meter={plant.meters['PMDB_B31F_DBOFF31']} onDoubleClick={jumpMt('PMDB_B31F_DBOFF31')} />
        </svg>
      </div>
    </div>
  );
};

// =============================================================================
// 2. BUILDING 3 — M1F MEZZANINE OVERVIEW (`Scr_B3_M1F_Overview.Pdl`)
// =============================================================================
export const B3OverviewM1FScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);

  const eq = (tag: string) => plant.equipment[tag];
  const jumpEq = (tag: string) => () => {
    const t = resolveB3EquipmentTarget(plant.equipment[tag]);
    if (t) jumpToTarget(t);
  };
  const jumpMt = (tag: string) => () => {
    const t = resolveB3MeterTarget(plant.meters[tag]);
    if (t) jumpToTarget(t);
  };

  const m1fFcus = [
    { tag: 'B3M1F_FCU01', rt: 'B3M1F_FCU01RT1', name: 'FCU-01' },
    { tag: 'B3M1F_FCU02', rt: 'B3M1F_FCU02RT1', name: 'FCU-02' },
    { tag: 'B3M1F_FCU03', rt: 'B3M1F_FCU03RT1', name: 'FCU-03' },
    { tag: 'B3M1F_FCU04', rt: 'B3M1F_FCU04RT1', name: 'FCU-04' },
    { tag: 'B3M1F_FCU05', rt: 'B3M1F_FCU05RT1', name: 'FCU-05' },
    { tag: 'B3M1F_FCU06', rt: 'B3M1F_FCU06RT1', name: 'FCU-06' },
    { tag: 'B3M1F_FCU07', rt: 'B3M1F_FCU07RT1', name: 'FCU-07' },
  ];

  return (
    <div className="p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — M1F Mezzanine Architectural Floor Overview (`Scr_B3_M1F_Overview.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            MEP Space 3-M1F (AHU-01/02 &amp; FA-11101..03) · Office/Lab FCUs (M1F-01..07) · Electrical Switchroom · Double-click any icon to locate
          </p>
        </div>
        <span className="px-2.5 py-1 rounded bg-slate-800 border border-cyan-500/50 text-[10.5px] font-mono text-cyan-300 font-bold">
          MONITOR VIEW · DOUBLE-CLICK TO LOCATE
        </span>
      </div>

      <div className="bg-[#cfd6e0] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1340 768" className="w-full min-w-[1060px] h-auto select-none">
          <B3ArchitecturalGrid floorTitle="BUILDING 3 — MEZZANINE FLOOR (M1F) MEP, OFFICE & SWITCHROOM" drawingNo="Scr_B3_M1F_Overview.Pdl" />

          {/* ZONE 1: MEP SPACE 3-M1F — AHUs & PROCESS EXHAUST (Left Half) */}
          <rect x={64} y={64} width={540} height={512} fill="#bfdbfe" fillOpacity={0.62} stroke="#1d4ed8" strokeWidth={1.8} />
          <text x={76} y={84} fill="#1e3a8a" fontSize="10.5" fontFamily="monospace" fontWeight="900">
            MEP SPACE 3-M1F — AHU-01 / AHU-02 &amp; PROCESS EXHAUST FANS
          </text>

          {/* AHU-01 Card */}
          <rect x={76} y={98} width={250} height={158} rx={4} fill="#ffffff" fillOpacity={0.85} stroke="#2563eb" strokeWidth={1.3} />
          <text x={86} y={114} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">AHU-B3-M1F-01 (CLEANSE)</text>
          <FloorEquipmentIconTile x={86} y={122} w={116} h={58} name="AHU-01" eq={eq('B3M1F_AHU01')} onDoubleClick={jumpEq('B3M1F_AHU01')} />
          <B3MonitorSensorBox x={210} y={124} w={106} name="Room T" sensor={plant.sensors['B3M1F_AHU01_RAT']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={210} y={154} w={106} name="Room RH" sensor={plant.sensors['B3M1F_AHU01_RAH']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={86} y={192} w={116} name="Supply T" sensor={plant.sensors['B3M1F_AHU01_SAT']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={210} y={192} w={106} name="DewPoint" sensor={plant.sensors['B3M1F_AHU01_DP']} onJump={jumpToTarget} />

          {/* AHU-02 Card */}
          <rect x={340} y={98} width={250} height={158} rx={4} fill="#ffffff" fillOpacity={0.85} stroke="#2563eb" strokeWidth={1.3} />
          <text x={350} y={114} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">AHU-B3-M1F-02 (MATERIAL)</text>
          <FloorEquipmentIconTile x={350} y={122} w={116} h={58} name="AHU-02" eq={eq('B3M1F_AHU02')} onDoubleClick={jumpEq('B3M1F_AHU02')} />
          <B3MonitorSensorBox x={474} y={124} w={106} name="Room T" sensor={plant.sensors['B3M1F_AHU02_RAT']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={474} y={154} w={106} name="Room RH" sensor={plant.sensors['B3M1F_AHU02_RAH']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={350} y={192} w={116} name="Supply T" sensor={plant.sensors['B3M1F_AHU02_SAT']} onJump={jumpToTarget} />
          <B3MonitorSensorBox x={474} y={192} w={106} name="DewPoint" sensor={plant.sensors['B3M1F_AHU02_DP']} onJump={jumpToTarget} />

          {/* Process Exhaust Deck */}
          <rect x={76} y={276} width={514} height={284} rx={4} fill="#ffe4e6" fillOpacity={0.85} stroke="#be123c" strokeWidth={1.5} />
          <text x={88} y={296} fill="#881337" fontSize="10" fontFamily="monospace" fontWeight="900">
            PROCESS EXHAUST FAN DECK (FA-11101A / FA-11102A / FA-11103A)
          </text>
          <FloorEquipmentIconTile x={88} y={314} w={156} h={64} name="FA-11101A" eq={eq('B3M1F_FA11101A')} onDoubleClick={jumpEq('B3M1F_FA11101A')} />
          <B3MonitorSensorBox x={88} y={386} w={156} name="PIT11101 Acid" sensor={plant.sensors['B3M1F_PIT11101']} onJump={jumpToTarget} />

          <FloorEquipmentIconTile x={256} y={314} w={156} h={64} name="FA-11102A" eq={eq('B3M1F_FA11102A')} onDoubleClick={jumpEq('B3M1F_FA11102A')} />
          <B3MonitorSensorBox x={256} y={386} w={156} name="PIT11102 Solv" sensor={plant.sensors['B3M1F_PIT11102']} onJump={jumpToTarget} />

          <FloorEquipmentIconTile x={424} y={314} w={154} h={64} name="FA-11103A" eq={eq('B3M1F_FA11103A')} onDoubleClick={jumpEq('B3M1F_FA11103A')} />

          {/* ZONE 2: M1F OFFICE & LAB MEZZANINE (7 FCUs WITH INLINE ROOM TEMP) */}
          <rect x={620} y={64} width={630} height={272} fill="#dcfce7" fillOpacity={0.68} stroke="#15803d" strokeWidth={1.8} />
          <text x={632} y={84} fill="#14532d" fontSize="10.5" fontFamily="monospace" fontWeight="900">
            M1F OFFICE &amp; LAB MEZZANINE (7× FCU WITH LIVE ROOM TEMP)
          </text>
          {m1fFcus.map((f, idx) => {
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const fx = 636 + col * 152;
            const fy = 104 + row * 102;
            return (
              <FloorEquipmentIconTile
                key={f.tag}
                x={fx}
                y={fy}
                w={140}
                h={62}
                name={f.name}
                eq={eq(f.tag)}
                roomTempSensor={plant.sensors[f.rt]}
                onDoubleClick={jumpEq(f.tag)}
              />
            );
          })}

          {/* ZONE 3: M1F ELECTRICAL SWITCHROOM (PM8000 & MFM383 METER ICONS) */}
          <rect x={620} y={350} width={630} height={226} fill="#ffedd5" fillOpacity={0.78} stroke="#c2410c" strokeWidth={1.8} />
          <text x={632} y={370} fill="#7c2d12" fontSize="10.5" fontFamily="monospace" fontWeight="900">
            ELECTRICAL SWITCHROOM (MDB-3.1 / MDB-3.2 / MDB-3.3 &amp; FACILITY SUB-DBs)
          </text>
          <FloorMeterIconTile x={636} y={386} w={190} h={54} name="MDB-3.1" meter={plant.meters['PMDB_B3M1F_MDB31']} onDoubleClick={jumpMt('PMDB_B3M1F_MDB31')} />
          <FloorMeterIconTile x={840} y={386} w={190} h={54} name="MDB-3.2" meter={plant.meters['PMDB_B3M1F_MDB32']} onDoubleClick={jumpMt('PMDB_B3M1F_MDB32')} />
          <FloorMeterIconTile x={1044} y={386} w={190} h={54} name="MDB-3.3" meter={plant.meters['PMDB_B3M1F_MDB33']} onDoubleClick={jumpMt('PMDB_B3M1F_MDB33')} />

          <FloorMeterIconTile x={636} y={454} w={144} h={50} name="DB-AHU-3.1" meter={plant.meters['PMDB_B3M1F_DBAHU31']} onDoubleClick={jumpMt('PMDB_B3M1F_DBAHU31')} />
          <FloorMeterIconTile x={792} y={454} w={144} h={50} name="DB-CTPUMP31" meter={plant.meters['PMDB_B3M1F_DBCTPUMP31']} onDoubleClick={jumpMt('PMDB_B3M1F_DBCTPUMP31')} />
          <FloorMeterIconTile x={948} y={454} w={144} h={50} name="DB-FAN-3.1" meter={plant.meters['PMDB_B3M1F_DBFAN31']} onDoubleClick={jumpMt('PMDB_B3M1F_DBFAN31')} />
          <FloorMeterIconTile x={1104} y={454} w={130} h={50} name="DB-OFF-3.1" meter={plant.meters['PMDB_B31F_DBOFF31']} onDoubleClick={jumpMt('PMDB_B31F_DBOFF31')} />
        </svg>
      </div>
    </div>
  );
};
