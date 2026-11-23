import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeSensorBadge,
  WinccPipeNetwork,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Scr_B3_AIR_AHU.Pdl — Building 3 Combined Cleanroom AHU + 8 FCU Air Distribution Screen
 *  - Top Half: 2 AHUs (B3M1F_AHU01 & B3M1F_AHU02) with white cleanroom ductwork + dark ocean blue (#1d4ed8) airflow pulse
 *  - Bottom Half: 8 PLC-Monitored FCUs (B31F_FCU03, B3M1F_FCU01..07) with motorized XV valves, Mẫu 2 spinning fans, and RT1 sensors
 *  - Building 3 has NO separate AIR FCU screen (all combined in Scr_B3_AIR_AHU.Pdl)
 */
export const B3AirAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyChwpRun = ['B31F_CH21CHWP', 'B31F_CH22CHWP'].some((t) => plant.equipment[t].status === 'RUNNING');

  const ahuPanels = [
    { tag: 'B3M1F_AHU01', code: 'AHU-B3-M1F-01', zone: 'CLEANSE & PROCESS CLEANROOM (1F)', x: 320 },
    { tag: 'B3M1F_AHU02', code: 'AHU-B3-M1F-02', zone: 'MATERIAL & CHEMICAL ROOMS (1F)', x: 920 },
  ];

  const fcuItems = [
    { tag: 'B31F_FCU03', vTag: 'B31F_FCU03V', rt: 'B31F_FCU03RT1', code: 'FCU-1F-03', room: '1F WAREHOUSE', x: 105 },
    { tag: 'B3M1F_FCU01', vTag: 'B3M1F_FCU01V', rt: 'B3M1F_FCU01RT1', code: 'FCU-M1F-01', room: 'OFFICE NORTH', x: 255 },
    { tag: 'B3M1F_FCU02', vTag: 'B3M1F_FCU02V', rt: 'B3M1F_FCU02RT1', code: 'FCU-M1F-02', room: 'OFFICE CTR', x: 405 },
    { tag: 'B3M1F_FCU03', vTag: 'B3M1F_FCU03V', rt: 'B3M1F_FCU03RT1', code: 'FCU-M1F-03', room: 'OFFICE SOUTH', x: 555 },
    { tag: 'B3M1F_FCU04', vTag: 'B3M1F_FCU04V', rt: 'B3M1F_FCU04RT1', code: 'FCU-M1F-04', room: 'LAB ZONE A', x: 705 },
    { tag: 'B3M1F_FCU05', vTag: 'B3M1F_FCU05V', rt: 'B3M1F_FCU05RT1', code: 'FCU-M1F-05', room: 'LAB ZONE B', x: 855 },
    { tag: 'B3M1F_FCU06', vTag: 'B3M1F_FCU06V', rt: 'B3M1F_FCU06RT1', code: 'FCU-M1F-06', room: 'SWITCHROOM', x: 1005 },
    { tag: 'B3M1F_FCU07', vTag: 'B3M1F_FCU07V', rt: 'B3M1F_FCU07RT1', code: 'FCU-M1F-07', room: 'CORRIDOR', x: 1155 },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Combined Air Handling &amp; Fan Coil Units (`Scr_B3_AIR_AHU.Pdl` · `2 AHU + 8 FCU`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Cleanroom White Ductwork (Dark Ocean Blue Airflow) · Click any AHU (`Fpl_AHU_DewPoint`), FCU (`Fpl_DOL`), XV Valve (`Fpl_XVAL`), or Room Temp (`Fpl_TIT`)
          </p>
        </div>
        <StatusLegend />
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1260 670" className="w-full min-w-[1060px] h-auto select-none">
          {/* =============================================================== */}
          {/* TOP HALF: 2 CLEANROOM AHUs (WHITE DUCT + #1d4ed8 AIRFLOW PULSE) */}
          {/* =============================================================== */}
          {ahuPanels.map((p) => {
            const unit = plant.equipment[p.tag];
            const cfg = plant.ahus[p.tag];
            const isRun = unit.status === 'RUNNING';
            const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';
            const sat = plant.sensors[cfg.satSensorTag];
            const rat = plant.sensors[cfg.ratSensorTag];
            const rah = plant.sensors[cfg.rahSensorTag];
            const sas = plant.sensors[cfg.sasSensorTag];
            const dp = plant.sensors[cfg.dewPointSensorTag];

            return (
              <g key={p.tag}>
                {/* Zone Frame */}
                <rect
                  x={p.x - 285}
                  y={16}
                  width={570}
                  height={286}
                  rx={6}
                  fill="#cbd5e1"
                  fillOpacity={0.55}
                  stroke="#334155"
                  strokeWidth={1.4}
                />
                <text x={p.x} y={34} textAnchor="middle" fill="#0f172a" fontSize="10" fontFamily="monospace" fontWeight="900">
                  {p.code} — {p.zone}
                </text>

                {/* White Cleanroom Supply Ductwork with Dark Ocean Blue (#1d4ed8) animated pulse */}
                <WinccPipeNetwork
                  color="#ffffff"
                  flowColor="#1d4ed8"
                  strokeWidth={14}
                  segments={[
                    { d: `M ${p.x - 245} 122 L ${p.x - 125} 122`, flowing: isRun },
                    { d: `M ${p.x + 25} 122 L ${p.x + 245} 122 L ${p.x + 245} 224 L ${p.x - 210} 224 L ${p.x - 210} 122`, flowing: isRun },
                  ]}
                />
                <PipeArrow x={p.x + 115} y={122} dir="right" active={isRun} fill="#1d4ed8" />
                <PipeArrow x={p.x + 15} y={224} dir="left" active={isRun} fill="#1d4ed8" />

                {/* AHU Machine Tile */}
                <g
                  data-scada-tag={p.tag}
                  transform={`translate(${p.x - 125}, 76)`}
                  onClick={() => openFaceplate('Fpl_AHU_DewPoint', p.tag, `Fpl_AHU_DewPoint · ${p.code}`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={0}
                    y={0}
                    width={150}
                    height={86}
                    rx={5}
                    fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : unit.faulted ? '#fecaca' : '#e2e8f0'}
                    fillOpacity={0.85}
                    stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                    strokeWidth={2}
                    className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                  />
                  <image href="/scada/ahu.png" x={8} y={10} width={96} height={66} preserveAspectRatio="xMidYMid meet" />
                  <IndustrialFanSvg x={126} y={24} radius={13} variant="hvac" status={unit.status} faulted={unit.faulted} isBadge />
                  <text x={126} y={54} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                    {unit.frequencyHz.toFixed(1)}Hz
                  </text>
                  <text x={126} y={70} textAnchor="middle" fill="#1e293b" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {unit.mode === 'AUTO' ? 'AUTO' : 'MAN'}
                  </text>
                </g>

                {/* Live Duct Sensors */}
                <PipeSensorBadge
                  x={p.x + 160}
                  y={122}
                  sensor={sat}
                  shortLabel="SAT"
                  stemDir="top"
                  labelPos="top"
                  onClick={() => openFaceplate('Fpl_Sensor', cfg.satSensorTag, `Fpl_TIT · ${cfg.satSensorTag}`)}
                />
                <PipeSensorBadge
                  x={p.x + 245}
                  y={170}
                  sensor={sas}
                  shortLabel="SAS"
                  stemDir="left"
                  labelPos="left"
                  onClick={() => openFaceplate('Fpl_Sensor', cfg.sasSensorTag, `Fpl_PIT · ${cfg.sasSensorTag}`)}
                />

                {/* Cleanroom Condition Telemetry Strip */}
                <g transform={`translate(${p.x - 245}, 250)`}>
                  <rect x={0} y={0} width={490} height={38} rx={4} fill="#f8fafc" stroke="#334155" strokeWidth={1.2} />
                  <text x={16} y={15} fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="800">ROOM TEMP (RAT)</text>
                  <text x={16} y={30} fill="#0f172a" fontSize="10.5" fontFamily="monospace" fontWeight="900">{rat.pv.toFixed(1)} °C</text>

                  <text x={148} y={15} fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="800">ROOM RH (RAH)</text>
                  <text x={148} y={30} fill="#0369a1" fontSize="10.5" fontFamily="monospace" fontWeight="900">{rah.pv.toFixed(1)} %RH</text>

                  <text x={270} y={15} fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="800">DEW POINT (DP)</text>
                  <text x={270} y={30} fill="#0891b2" fontSize="10.5" fontFamily="monospace" fontWeight="900">{dp.pv.toFixed(1)} °C</text>

                  <text x={390} y={15} fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="800">CWCV / HWCV</text>
                  <text x={390} y={30} fill="#be185d" fontSize="10" fontFamily="monospace" fontWeight="900">
                    {plant.valves[cfg.cwValveTag].positionPct.toFixed(0)}% / {plant.valves[cfg.hwValveTag].positionPct.toFixed(0)}%
                  </text>
                </g>
              </g>
            );
          })}

          {/* Divider */}
          <line x1={24} y1={322} x2={1236} y2={322} stroke="#475569" strokeWidth={1.4} strokeDasharray="5 4" />
          <text x={30} y={342} fill="#0f172a" fontSize="10" fontFamily="monospace" fontWeight="900">
            BUILDING 3 — 1F &amp; M1F FAN COIL UNITS (8 PLC-MONITORED FCUs WITH MOTORIZED CHW XV VALVES + ROOM TEMP RT1)
          </text>

          {/* =============================================================== */}
          {/* BOTTOM HALF: CHW HEADERS + 8 FCUs WITH XV VALVES & FANS         */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={7}
            segments={[
              { d: 'M 40 364 L 1200 364', flowing: anyChwpRun },
              ...fcuItems.map((f) => ({
                d: `M ${f.x - 18} 364 L ${f.x - 18} 472`,
                flowing: anyChwpRun && plant.valves[f.vTag].openFB,
              })),
            ]}
          />
          <WinccPipeNetwork
            color="#008f91"
            strokeWidth={7}
            segments={[
              { d: 'M 40 384 L 1200 384', flowing: anyChwpRun, reverse: true },
              ...fcuItems.map((f) => ({
                d: `M ${f.x + 18} 384 L ${f.x + 18} 472`,
                flowing: anyChwpRun && plant.valves[f.vTag].openFB,
                reverse: true,
              })),
            ]}
          />

          {fcuItems.map((f) => {
            const eq = plant.equipment[f.tag];
            const valve = plant.valves[f.vTag];
            const rt = plant.sensors[f.rt];
            const isRun = eq.status === 'RUNNING';
            const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';

            return (
              <g key={f.tag}>
                <WinccValveSymbol
                  x={f.x - 18}
                  y={424}
                  valve={valve}
                  shortLabel={f.vTag.replace(/^B3[0-9M]{1,2}F_/, '')}
                  vertical
                  onClick={() => openFaceplate('Fpl_XVAL', f.vTag, `Fpl_XVAL · ${f.vTag}`)}
                />

                <rect
                  x={f.x - 66}
                  y={452}
                  width={132}
                  height={196}
                  rx={5}
                  fill="#cbd5e1"
                  fillOpacity={0.55}
                  stroke="#334155"
                  strokeWidth={1.2}
                  strokeDasharray="4 2"
                />
                <text x={f.x} y={468} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                  {f.room}
                </text>

                <g
                  data-scada-tag={f.tag}
                  transform={`translate(${f.x - 54}, 476)`}
                  onClick={() => openFaceplate('Fpl_DOL', f.tag, `Fpl_DOL · ${f.code}`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={0}
                    y={0}
                    width={108}
                    height={66}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
                    fillOpacity={0.82}
                    stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                    strokeWidth={1.6}
                    className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                  />
                  <image href="/scada/FCU.png" x={6} y={10} width={64} height={46} preserveAspectRatio="xMidYMid meet" />
                  <IndustrialFanSvg x={88} y={20} radius={10.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
                  <text x={88} y={44} textAnchor="middle" fill="#0f172a" fontSize="7.2" fontFamily="monospace" fontWeight="900">
                    {eq.mode === 'AUTO' ? 'AUTO' : 'MAN'}
                  </text>
                  <text
                    x={88}
                    y={56}
                    textAnchor="middle"
                    fill={eq.faulted ? '#991b1b' : isRun ? '#14532d' : isTransit ? '#1d4ed8' : '#475569'}
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="900"
                  >
                    {eq.status}
                  </text>
                  <text x={54} y={78} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {f.code}
                  </text>
                </g>

                <PipeSensorBadge
                  x={f.x}
                  y={576}
                  sensor={rt}
                  shortLabel={f.rt.replace(/^B3[0-9M]{1,2}F_/, '')}
                  stemDir="bottom"
                  labelPos="bottom"
                  onClick={() => openFaceplate('Fpl_Sensor', f.rt, `Fpl_TIT · ${f.rt} (${f.room})`)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
