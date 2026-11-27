import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import { PipeArrow, PipeTee, SvgLocalOverlay, WinccPipeNetwork, WinccValveSymbol } from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Scr_B3_CW_AHU.Pdl — Building 3 Chilled & Hot Water Distribution to 2 AHUs & 8 PLC-Monitored FCUs
 *  - Fed strictly from Building 3 Air-Cooled Chillers (B31F_CHSTS1) & Heat Fans (B31F_HPSTS1)
 *  - 2 AHUs: B3M1F_AHU01 & B3M1F_AHU02 (3-way CWCV/HWCV + Mẫu 2 spinning fans)
 *  - 8 PLC-Monitored FCUs (B31F_FCU03, B3M1F_FCU01..07) with motorized XV valves (`Fpl_XVAL`) + Mẫu 2 spinning fans
 *  - 2 Local Unmonitored FCUs (FCU-B3-1F-01/02): static local units with NO XV valve and ZERO fan animation!
 */
export const B3CwAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyChwpRun = ['B31F_CH21CHWP', 'B31F_CH22CHWP'].some((t) => plant.equipment[t].status === 'RUNNING');
  const anyHppRun = ['B31F_HPP21', 'B31F_HPP22'].some((t) => plant.equipment[t].status === 'RUNNING');

  const ahus = [
    { tag: 'B3M1F_AHU01', code: 'AHU-B3-M1F-01', x: 300 },
    { tag: 'B3M1F_AHU02', code: 'AHU-B3-M1F-02', x: 540 },
  ];

  const fcus = [
    { tag: 'B31F_FCU03', vTag: 'B31F_FCU03V', rt: 'B31F_FCU03RT1', code: 'FCU-1F-03', x: 252 },
    { tag: 'B3M1F_FCU01', vTag: 'B3M1F_FCU01V', rt: 'B3M1F_FCU01RT1', code: 'FCU-M1F-01', x: 376 },
    { tag: 'B3M1F_FCU02', vTag: 'B3M1F_FCU02V', rt: 'B3M1F_FCU02RT1', code: 'FCU-M1F-02', x: 500 },
    { tag: 'B3M1F_FCU03', vTag: 'B3M1F_FCU03V', rt: 'B3M1F_FCU03RT1', code: 'FCU-M1F-03', x: 624 },
    { tag: 'B3M1F_FCU04', vTag: 'B3M1F_FCU04V', rt: 'B3M1F_FCU04RT1', code: 'FCU-M1F-04', x: 748 },
    { tag: 'B3M1F_FCU05', vTag: 'B3M1F_FCU05V', rt: 'B3M1F_FCU05RT1', code: 'FCU-M1F-05', x: 872 },
    { tag: 'B3M1F_FCU06', vTag: 'B3M1F_FCU06V', rt: 'B3M1F_FCU06RT1', code: 'FCU-M1F-06', x: 996 },
    { tag: 'B3M1F_FCU07', vTag: 'B3M1F_FCU07V', rt: 'B3M1F_FCU07RT1', code: 'FCU-M1F-07', x: 1120 },
  ];

  const staticLocalFcus = [
    { code: 'FCU-B3-1F-01', room: 'LOCAL STORAGE', x: 860 },
    { code: 'FCU-B3-1F-02', room: 'LOCAL LOBBY', x: 1030 },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Chilled &amp; Hot Water AHU / FCU Distribution (`Scr_B3_CW_AHU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            B3 CHW Supply: {plant.sensors['B31F_CHSTS1'].pv.toFixed(1)} °C ({plant.sensors['B31F_CHWPS1'].pv.toFixed(2)} bar) ·
            B3 HW Supply (Heat Fans): {plant.sensors['B31F_HPSTS1'].pv.toFixed(1)} °C ({plant.sensors['B31F_HWPS1'].pv.toFixed(2)} bar)
          </p>
        </div>
        <StatusLegend />
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1240 650" className="w-full min-w-[1040px] h-auto select-none">
          {/* =============================================================== */}
          {/* TOP SECTION: 2 AHUs (CHW + HW) + 2 UNMONITORED LOCAL FCUs       */}
          {/* =============================================================== */}
          {/* HW Supply (#eb9ee3) & Return (#e03c86) strictly to AHU-01 & AHU-02 */}
          <WinccPipeNetwork
            color="#eb9ee3"
            strokeWidth={7}
            segments={[
              { d: 'M 140 46 L 560 46', flowing: anyHppRun },
              ...ahus.map((a) => ({ d: `M ${a.x + 18} 46 L ${a.x + 18} 138`, flowing: anyHppRun })),
            ]}
          />
          <WinccPipeNetwork
            color="#e03c86"
            strokeWidth={7}
            segments={[
              { d: 'M 140 70 L 578 70', flowing: anyHppRun, reverse: true },
              ...ahus.map((a) => ({ d: `M ${a.x + 34} 70 L ${a.x + 34} 138`, flowing: anyHppRun, reverse: true })),
            ]}
          />
          {ahus.map((a) => (
            <g key={`hw-t-${a.tag}`}>
              <PipeTee x={a.x + 18} y={46} color="#eb9ee3" orientation="down" size={7} />
              <PipeTee x={a.x + 34} y={70} color="#e03c86" orientation="down" size={7} />
            </g>
          ))}

          {/* CHW Supply (#00cfe8) & Return (#008f91) Main Riser -> Row 1 (AHUs + Local FCUs) & Row 2 (8 PLC FCUs) */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={8}
            segments={[
              { d: 'M 140 98 L 1060 98', flowing: anyChwpRun },
              { d: 'M 176 98 L 176 374 L 1140 374', flowing: anyChwpRun },
              ...ahus.map((a) => ({ d: `M ${a.x - 28} 98 L ${a.x - 28} 138`, flowing: anyChwpRun })),
              ...staticLocalFcus.map((f) => ({ d: `M ${f.x - 16} 98 L ${f.x - 16} 160`, flowing: anyChwpRun })),
              ...fcus.map((f) => ({
                d: `M ${f.x - 18} 374 L ${f.x - 18} 472`,
                flowing: anyChwpRun && plant.valves[f.vTag].openFB,
              })),
            ]}
          />
          <WinccPipeNetwork
            color="#008f91"
            strokeWidth={8}
            segments={[
              { d: 'M 140 122 L 1060 122', flowing: anyChwpRun, reverse: true },
              { d: 'M 196 122 L 196 398 L 1140 398', flowing: anyChwpRun, reverse: true },
              ...ahus.map((a) => ({ d: `M ${a.x - 10} 122 L ${a.x - 10} 138`, flowing: anyChwpRun, reverse: true })),
              ...staticLocalFcus.map((f) => ({ d: `M ${f.x + 16} 122 L ${f.x + 16} 160`, flowing: anyChwpRun, reverse: true })),
              ...fcus.map((f) => ({
                d: `M ${f.x + 18} 398 L ${f.x + 18} 472`,
                flowing: anyChwpRun && plant.valves[f.vTag].openFB,
                reverse: true,
              })),
            ]}
          />

          <PipeArrow x={210} y={46} dir="right" active={anyHppRun} />
          <PipeArrow x={210} y={98} dir="right" active={anyChwpRun} />
          <PipeArrow x={210} y={122} dir="left" active={anyChwpRun} />
          <PipeArrow x={218} y={374} dir="right" active={anyChwpRun} />
          <PipeArrow x={218} y={398} dir="left" active={anyChwpRun} />

          {/* Source Header Badges */}
          <g transform="translate(14, 34)">
            <rect x={0} y={0} width={124} height={46} rx={3} fill="#0f172a" stroke="#eb9ee3" strokeWidth={1.3} />
            <text x={62} y={15} textAnchor="middle" fill="#f5d0fe" fontSize="8" fontFamily="monospace" fontWeight="900">
              B3 HEAT FANS (HW)
            </text>
            <text x={62} y={28} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              {plant.sensors['B31F_HPSTS1'].pv.toFixed(1)} °C / {plant.sensors['B31F_HPRTS2'].pv.toFixed(1)} °C
            </text>
            <text x={62} y={40} textAnchor="middle" fill="#fda4af" fontSize="7.5" fontFamily="monospace" fontWeight="800">
              HWPS1: {plant.sensors['B31F_HWPS1'].pv.toFixed(2)} bar
            </text>
          </g>
          <g transform="translate(14, 88)">
            <rect x={0} y={0} width={124} height={46} rx={3} fill="#0f172a" stroke="#00cfe8" strokeWidth={1.3} />
            <text x={62} y={15} textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="900">
              B3 CHILLERS (CHW)
            </text>
            <text x={62} y={28} textAnchor="middle" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              {plant.sensors['B31F_CHSTS1'].pv.toFixed(1)} °C / {plant.sensors['B31F_CHRTS2'].pv.toFixed(1)} °C
            </text>
            <text x={62} y={40} textAnchor="middle" fill="#67e8f9" fontSize="7.5" fontFamily="monospace" fontWeight="800">
              CHWPS1: {plant.sensors['B31F_CHWPS1'].pv.toFixed(2)} bar
            </text>
          </g>

          {/* 2 AHUs (B3M1F_AHU01 & B3M1F_AHU02) */}
          {ahus.map((a) => {
            const unit = plant.equipment[a.tag];
            const cfg = plant.ahus[a.tag];
            const sat = plant.sensors[cfg.satSensorTag];
            const rat = plant.sensors[cfg.ratSensorTag];
            const rah = plant.sensors[cfg.rahSensorTag];
            const sas = plant.sensors[cfg.sasSensorTag];
            const cwV = plant.valves[cfg.cwValveTag];
            const hwV = plant.valves[cfg.hwValveTag];
            const isRun = unit.status === 'RUNNING';
            const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';

            return (
              <g
                key={a.tag}
                data-scada-tag={a.tag}
                transform={`translate(${a.x}, 168)`}
                onClick={unit.remote === false ? undefined : () => openFaceplate('Fpl_AHU_DewPoint', a.tag, `Fpl_AHU_DewPoint · ${a.code}`)}
                className={unit.remote === false ? 'cursor-not-allowed' : 'cursor-pointer group'}
              >
                <rect
                  x={-58}
                  y={-30}
                  width={116}
                  height={62}
                  rx={4}
                  fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : unit.faulted ? '#fecaca' : '#e2e8f0'}
                  fillOpacity={0.75}
                  stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                  strokeWidth={1.8}
                  className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                />
                <image href="/scada/ahu.png" x={-46} y={-24} width={76} height={50} preserveAspectRatio="xMidYMid meet" />
                <IndustrialFanSvg x={42} y={-16} radius={11.5} variant="hvac" status={unit.status} faulted={unit.faulted} isBadge />
                {unit.remote === false && <SvgLocalOverlay x={-58} y={-30} width={116} height={62} rx={4} />}
                <text x={0} y={44} textAnchor="middle" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
                  {a.code} · {unit.frequencyHz.toFixed(1)} Hz
                </text>

                <g transform="translate(-62, 50)">
                  <rect x={0} y={0} width={124} height={82} rx={2} fill="#f1f5f9" stroke="#334155" strokeWidth={1.1} />
                  <text x={5} y={12} fill="#b45309" fontSize="7.5" fontFamily="monospace" fontWeight="800">Room Temp</text>
                  <text x={119} y={12} textAnchor="end" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">{rat.pv.toFixed(1)} °C</text>
                  <text x={5} y={25} fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="800">Room RH</text>
                  <text x={119} y={25} textAnchor="end" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">{rah.pv.toFixed(0)} %</text>
                  <text x={5} y={38} fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="800">Supply Temp</text>
                  <text x={119} y={38} textAnchor="end" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">{sat.pv.toFixed(1)} °C</text>
                  <text x={5} y={51} fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="800">Static Press</text>
                  <text x={119} y={51} textAnchor="end" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">{sas.pv.toFixed(0)} Pa</text>
                  <text x={5} y={64} fill="#0891b2" fontSize="7.5" fontFamily="monospace" fontWeight="800">3W CWCV</text>
                  <text x={119} y={64} textAnchor="end" fill="#0e7490" fontSize="8" fontFamily="monospace" fontWeight="900">{cwV.positionPct.toFixed(0)} %</text>
                  <text x={5} y={77} fill="#be185d" fontSize="7.5" fontFamily="monospace" fontWeight="800">3W HWCV</text>
                  <text x={119} y={77} textAnchor="end" fill="#be185d" fontSize="8" fontFamily="monospace" fontWeight="900">{hwV.positionPct.toFixed(0)} %</text>
                </g>
              </g>
            );
          })}

          {/* 2 Local Unmonitored FCUs (NO XV valve, NO PLC run feedback -> ZERO fan animation!) */}
          {staticLocalFcus.map((f) => (
            <g key={f.code} transform={`translate(${f.x}, 188)`}>
              <rect x={-52} y={-28} width={104} height={58} rx={4} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.4} strokeDasharray="4 2" />
              <image href="/scada/FCU.png" x={-36} y={-22} width={72} height={46} preserveAspectRatio="xMidYMid meet" />
              <text x={0} y={42} textAnchor="middle" fill="#334155" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                {f.code}
              </text>
              <text x={0} y={54} textAnchor="middle" fill="#64748b" fontSize="7.2" fontFamily="monospace" fontWeight="700">
                LOCAL THERMOSTAT (NO PLC)
              </text>
            </g>
          ))}

          {/* Divider line */}
          <line x1={20} y1={342} x2={1220} y2={342} stroke="#475569" strokeWidth={1.2} strokeDasharray="5 4" />
          <text x={24} y={360} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            PLC-MONITORED BUILDING 3 FCUs (8 UNITS WITH MOTORIZED CHW XV VALVES + RUN FEEDBACK + ROOM TEMP RT1)
          </text>

          {/* =============================================================== */}
          {/* BOTTOM SECTION: 8 PLC-MONITORED FCUs WITH XV VALVES & FANS      */}
          {/* =============================================================== */}
          {fcus.map((f) => {
            const eq = plant.equipment[f.tag];
            const valve = plant.valves[f.vTag];
            const rt = plant.sensors[f.rt];
            const isRun = eq.status === 'RUNNING';
            const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';

            return (
              <g key={f.tag}>
                <WinccValveSymbol
                  x={f.x - 18}
                  y={434}
                  valve={valve}
                  shortLabel={f.vTag.replace(/^B3[0-9M]{1,2}F_/, '')}
                  vertical
                  onClick={() => openFaceplate('Fpl_XVAL', f.vTag, `Fpl_XVAL · ${f.vTag} (${f.code})`)}
                />

                <g
                  data-scada-tag={f.tag}
                  transform={`translate(${f.x}, 506)`}
                  onClick={eq.remote === false ? undefined : () => openFaceplate('Fpl_DOL', f.tag, `Fpl_DOL · ${f.tag}`)}
                  className={eq.remote === false ? 'cursor-not-allowed' : 'cursor-pointer group'}
                >
                  <rect
                    x={-48}
                    y={-32}
                    width={96}
                    height={64}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
                    fillOpacity={0.78}
                    stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                    strokeWidth={1.6}
                    className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                  />
                  <image href="/scada/FCU.png" x={-40} y={-24} width={60} height={46} preserveAspectRatio="xMidYMid meet" />
                  <IndustrialFanSvg x={32} y={-14} radius={10.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
                  <text x={32} y={14} textAnchor="middle" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">
                    {eq.mode === 'AUTO' ? 'A' : 'M'}
                  </text>
                  {eq.remote === false && <SvgLocalOverlay x={-48} y={-32} width={96} height={64} rx={4} />}
                  <text x={0} y={44} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {f.code}
                  </text>
                </g>

                {/* Room Temperature Readout Pill */}
                <g
                  data-scada-tag={f.rt}
                  transform={`translate(${f.x - 36}, 562)`}
                  onClick={() => openFaceplate('Fpl_Sensor', f.rt, `Fpl_TIT · ${f.rt}`)}
                  className="cursor-pointer"
                >
                  <rect x={0} y={0} width={72} height={19} rx={2} fill="#ffffff" stroke="#334155" strokeWidth={1.1} />
                  <text x={36} y={13} textAnchor="middle" fill="#0369a1" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                    {rt.pv.toFixed(1)} °C
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
