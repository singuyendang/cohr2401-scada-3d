import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeCross,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { statusColor } from '../components/scada/scadaColors.ts';

/**
 * Scr_B5_OFLAC.Pdl — Oil-Flooded Air Compressor System (Faithful to fds_img_38.png, ZERO Future units)
 *  - Active compressors ONLY: AC-201 (Fix Lag), AC-202 (Fix Lag), AC-204 (VSD Lead)
 *  - Wet Receiver V-201A -> Dual Dryer/Filter Trains (AD-201A, AD-202A, AD-202B) -> Dry Receiver V-201B
 *  - Pipe-mounted PIT20101 (7.0 bar) & AIT20101 (-40 °C Dew Point)
 *  - Authentic WinCC assets: /scada/Air compressor.png, /scada/Filter.png, /scada/AD.png
 */
export const B5OflacScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const ac201 = plant.equipment['B51F_AC201'];
  const ac202 = plant.equipment['B51F_AC202'];
  const ac204 = plant.equipment['B51F_AC204'];
  const anyAcRun = [ac201, ac202, ac204].some((u) => u.status === 'RUNNING');
  const pit201 = plant.sensors['B51F_PIT20101'];
  const ait201 = plant.sensors['B51F_AIT20101'];

  const compressors = [
    { unit: ac201, code: 'AC-201', role: 'FIX LAG', y: 122, isVsd: false },
    { unit: ac202, code: 'AC-202', role: 'FIX LAG', y: 268, isVsd: false },
    { unit: ac204, code: 'AC-204', role: 'VSD LEAD', y: 408, isVsd: true },
  ];

  const dryers = [
    { tag: 'B51F_AD201A', code: 'AD-201A', x: 656, y: 196 },
    { tag: 'B51F_AD202A', code: 'AD-202A', x: 846, y: 196 },
    { tag: 'B51F_AD202B', code: 'AD-202B', x: 750, y: 342 },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Oil-Flooded Air Compressor System (`Scr_B5_OFLAC.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Header PIT20101: {pit201.pv.toFixed(2)} bar · Dew Point AIT20101: {ait201.pv.toFixed(1)} °C ·
            AC-204 (VSD Lead): {ac204.loadPct.toFixed(0)}% · Demand: {plant.demands.B5OFLAC.status}
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 530" className="w-full min-w-[1100px] h-auto select-none">
          <text x={660} y={28} textAnchor="middle" fill="#0f172a" fontSize="14" fontFamily="sans-serif" fontWeight="900">
            OIL-FLOODED AIR COMPRESSOR SYSTEM
          </text>

          {/* =============================================================== */}
          {/* COMPRESSED AIR PIPING NETWORK (SILVER-GRAY #cbd5e1 — 9px)       */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#cbd5e1"
            strokeWidth={9}
            segments={[
              // Compressor discharges into vertical collector (x=292); AC-202 aligned strictly at y=268 with V-201A!
              { d: 'M 194 122 L 292 122', flowing: ac201.status === 'RUNNING' },
              { d: 'M 194 268 L 292 268', flowing: ac202.status === 'RUNNING' },
              { d: 'M 194 408 L 292 408', flowing: ac204.status === 'RUNNING' },
              { d: 'M 292 122 L 292 408', flowing: anyAcRun },
              // Main feed to Wet Receiver V-201A (x=396, y=268) + Top Bypass
              { d: 'M 292 268 L 368 268', flowing: anyAcRun },
              { d: 'M 326 268 L 326 196 L 464 196 L 464 268', flowing: false },
              // V-201A Outlet -> Split Manifold (x=492) -> 2 Dryer/Filter Trains -> Merge Manifold (x=1010)
              { d: 'M 424 268 L 492 268', flowing: anyAcRun },
              { d: 'M 492 196 L 492 342', flowing: anyAcRun },
              { d: 'M 492 196 L 1010 196', flowing: anyAcRun },
              { d: 'M 492 342 L 1010 342', flowing: anyAcRun && plant.equipment['B51F_AD202B'].status === 'RUNNING' },
              { d: 'M 1010 196 L 1010 342', flowing: anyAcRun },
              // Merge Manifold -> Dry Receiver V-201B (x=1092, y=268) + Top Bypass -> CDA Distribution
              { d: 'M 1010 268 L 1064 268', flowing: anyAcRun },
              { d: 'M 1034 268 L 1034 196 L 1146 196 L 1146 268', flowing: false },
              { d: 'M 1120 268 L 1286 268', flowing: anyAcRun },
            ]}
          />
          <PipeCross x={292} y={268} color="#cbd5e1" size={9} />
          <PipeTee x={326} y={268} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={464} y={268} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={492} y={268} color="#cbd5e1" orientation="left" size={9} />
          <PipeTee x={1010} y={268} color="#cbd5e1" orientation="right" size={9} />
          <PipeTee x={1034} y={268} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={1146} y={268} color="#cbd5e1" orientation="up" size={9} />

          {/* Flow Arrows */}
          <PipeArrow x={292} y={190} dir="down" active={ac201.status === 'RUNNING'} />
          <PipeArrow x={292} y={338} dir="up" active={ac204.status === 'RUNNING'} />
          <PipeArrow x={450} y={268} dir="right" active={anyAcRun} />
          <PipeArrow x={518} y={196} dir="right" active={anyAcRun} />
          <PipeArrow x={518} y={342} dir="right" active={anyAcRun && plant.equipment['B51F_AD202B'].status === 'RUNNING'} />
          <PipeArrow x={982} y={196} dir="right" active={anyAcRun} />
          <PipeArrow x={1044} y={268} dir="right" active={anyAcRun} />

          <text x={1288} y={258} textAnchor="end" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            TO CDA DISTRIBUTION
          </text>

          {/* =============================================================== */}
          {/* 3 ACTIVE OIL-FLOODED COMPRESSORS (AC-201, AC-202, AC-204)       */}
          {/* =============================================================== */}
          {compressors.map(({ unit, code, role, y, isVsd }) => {
            const isRun = unit.status === 'RUNNING';
            const loaded = isRun && (isVsd ? unit.loadPct > 30 : (unit.telemetry.loaded ?? 0) > 0);
            const rpm = isRun ? Math.round(900 + (unit.loadPct / 100) * 2100) : 0;
            const col = statusColor(unit.status);
            const dataType = isVsd ? 'Fpl_ACVSDData' : 'Fpl_ACFIXData';

            return (
              <g key={unit.tag} transform={`translate(112, ${y})`}>
                {/* Air intake arrow */}
                <text x={-56} y={-6} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">AIR</text>
                <PipeArrow x={-34} y={0} dir="right" active={isRun} />

                {/* Authentic WinCC Compressor Graphic */}
                <g
                  data-scada-tag={unit.tag}
                  onClick={() => openFaceplate('Fpl_AC', unit.tag, `Fpl_AC · ${unit.tag} (${code})`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={-6}
                    y={-32}
                    width={96}
                    height={64}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : unit.faulted ? '#fecaca' : 'transparent'}
                    fillOpacity={isRun || unit.faulted ? 0.55 : 0}
                    stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : 'transparent'}
                    strokeWidth={1.8}
                    className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-600'}
                  />
                  <image href="/scada/Air compressor.png" x={0} y={-28} width={84} height={56} preserveAspectRatio="xMidYMid meet" />
                  <text x={42} y={-35} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                    {code} ({role})
                  </text>
                  {/* WinCC [0/1][A/M] Indicator */}
                  <rect x={44} y={-6} width={12} height={13} fill={col} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={50} y={3.5} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {isRun ? '1' : '0'}
                  </text>
                  <rect x={58} y={-6} width={12} height={13} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={64} y={3.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {unit.mode === 'AUTO' ? 'A' : 'M'}
                  </text>
                </g>

                {/* WinCC Live Telemetry Mini-Table beside Compressor (clean clearance from x=292 pipe) */}
                <g
                  transform="translate(90, -50)"
                  onClick={() => openFaceplate(dataType, unit.tag, `${dataType} · ${unit.tag}`)}
                  className="cursor-pointer group"
                >
                  <rect x={0} y={0} width={78} height={38} rx={2} fill="#e2e8f0" stroke="#334155" strokeWidth={1.1} className="group-hover:stroke-blue-600" />
                  <text x={4} y={10.5} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">
                    {isVsd ? 'Speed' : 'RLA'}
                  </text>
                  <text x={74} y={10.5} textAnchor="end" fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                    {isVsd ? `${rpm} RPM` : `${unit.loadPct.toFixed(0)} %`}
                  </text>
                  <text x={4} y={22} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">State</text>
                  <text x={74} y={22} textAnchor="end" fill={loaded ? '#15803d' : '#1d4ed8'} fontSize="7.5" fontFamily="monospace" fontWeight="900">
                    {loaded ? 'Load' : 'UnLoad'}
                  </text>
                  <text x={4} y={33.5} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">Disc.P</text>
                  <text x={74} y={33.5} textAnchor="end" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                    {(isRun ? pit201.pv + 0.25 : pit201.pv).toFixed(1)} Bar
                  </text>
                </g>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* WET & DRY AIR RECEIVER TANKS (V-201A & V-201B)                  */}
          {/* =============================================================== */}
          {[
            { x: 396, y: 268, label: 'V-201A' },
            { x: 1092, y: 268, label: 'V-201B' },
          ].map((tk) => (
            <g key={tk.label} transform={`translate(${tk.x}, ${tk.y})`}>
              <rect x={-28} y={-44} width={56} height={88} rx={14} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.5} />
              <rect x={-20} y={-38} width={11} height={76} rx={4} fill="#f8fafc" opacity={0.7} />
              <line x1={-16} y1={44} x2={-16} y2={52} stroke="#334155" strokeWidth={3.2} />
              <line x1={16} y1={44} x2={16} y2={52} stroke="#334155" strokeWidth={3.2} />
              <text x={0} y={64} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                {tk.label}
              </text>
            </g>
          ))}

          {/* =============================================================== */}
          {/* INLINE FILTERS (/scada/Filter.png) & DRYERS (/scada/AD.png)     */}
          {/* =============================================================== */}
          {[
            { code: 'F-201A', x: 562, y: 196 },
            { code: 'F-201C', x: 750, y: 196 },
            { code: 'F-202A', x: 938, y: 196 },
            { code: 'F-201B', x: 562, y: 342 },
            { code: 'F-202B', x: 938, y: 342 },
          ].map((flt) => (
            <g key={flt.code} transform={`translate(${flt.x}, ${flt.y})`}>
              <image href="/scada/Filter.png" x={-18} y={-28} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
              <text x={0} y={40} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                {flt.code}
              </text>
            </g>
          ))}

          {dryers.map((d) => {
            const unit = plant.equipment[d.tag];
            const isRun = unit.status === 'RUNNING';
            return (
              <g
                key={d.tag}
                transform={`translate(${d.x}, ${d.y})`}
                onClick={() => openFaceplate('Fpl_DOL', d.tag, `Fpl_DOL · ${d.tag}`)}
                className="cursor-pointer group"
              >
                <rect
                  x={-26}
                  y={-36}
                  width={52}
                  height={72}
                  rx={3}
                  fill={isRun ? '#bbf7d0' : unit.faulted ? '#fecaca' : 'transparent'}
                  fillOpacity={0.5}
                  stroke={isRun ? '#16a34a' : unit.faulted ? '#dc2626' : 'transparent'}
                  strokeWidth={1.5}
                  className="group-hover:stroke-blue-600"
                />
                <image href="/scada/AD.png" x={-24} y={-34} width={48} height={68} preserveAspectRatio="xMidYMid meet" />
                <text x={0} y={46} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                  {d.code}
                </text>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* PIPE-MOUNTED SENSORS (PIT20101 & AIT20101)                      */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={1184}
            y={268}
            sensor={pit201}
            shortLabel="PIT20101"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT20101', 'Fpl_PIT · B51F_PIT20101 (OFLAC Header)')}
          />
          <PipeSensorBadge
            x={1232}
            y={268}
            sensor={ait201}
            shortLabel="AIT20101"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_AIT20101', 'Fpl_AIT · B51F_AIT20101 (Dew Point)')}
          />

          {/* WinCC Blue Air Compressor Settings Button (Fpl_Demand_B5OFLAC) */}
          <g
            transform="translate(330, 48)"
            onClick={() => openFaceplate('Fpl_Demand', 'B5OFLAC', 'Fpl_Demand_B5OFLAC')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-oflac" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect
              x={0}
              y={0}
              width={168}
              height={26}
              rx={3}
              fill="url(#wincc-btn-oflac)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={84} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="700">
              Air Compressor Settings
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
