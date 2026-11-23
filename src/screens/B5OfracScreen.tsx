import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
  WinccPumpSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { statusColor } from '../components/scada/scadaColors.ts';

/**
 * Scr_B5_OFRAC.Pdl — Oil-Free Air Compressor System (Faithful to fds_img_37.png, ZERO Future units)
 *  - Active compressors ONLY: AC-101 (VSD Lead) & AC-102 (Fix Lag) — AC-103 Future removed!
 *  - Wet Receiver V-101A -> Dual Dryer/Filter Trains (AD-101A/B, AD-102A/B) -> Dry Receiver V-101B
 *  - Pipe-mounted PIT10101 (7.0 bar) & AIT10101 (-41.5 °C Dew Point)
 *  - Bottom Cooling Water Loop: Supply RIGHT->LEFT through P-10101A/B (direction="left", DOL Prefix) -> AC-101/102 -> Return
 */
export const B5OfracScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const ac101 = plant.equipment['B51F_AC101'];
  const ac102 = plant.equipment['B51F_AC102'];
  const p101a = plant.equipment['B51F_P10101A'];
  const p101b = plant.equipment['B51F_P10101B'];
  const anyAcRun = ac101.status === 'RUNNING' || ac102.status === 'RUNNING';
  const anyCpRun = p101a.status === 'RUNNING' || p101b.status === 'RUNNING';
  const pit101 = plant.sensors['B51F_PIT10101'];
  const ait101 = plant.sensors['B51F_AIT10101'];

  const compressors = [
    { unit: ac101, code: 'AC-101', role: 'VSD LEAD', y: 152, isVsd: true },
    { unit: ac102, code: 'AC-102', role: 'FIX LAG', y: 294, isVsd: false },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Oil-Free Air Compressor System (`Scr_B5_OFRAC.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Header PIT10101: {pit101.pv.toFixed(2)} bar · Dew Point AIT10101: {ait101.pv.toFixed(1)} °C ·
            Cooling Pumps P-10101A/B: {anyCpRun ? 'RUNNING' : 'STOPPED'} · Demand: {plant.demands.B5OFRAC.status}
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_37.png */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 650" className="w-full min-w-[1100px] h-auto select-none">
          <text x={660} y={28} textAnchor="middle" fill="#0f172a" fontSize="14" fontFamily="sans-serif" fontWeight="900">
            OIL-FREE AIR COMPRESSOR SYSTEM
          </text>

          {/* =============================================================== */}
          {/* 1. COOLING WATER SUPPLY LOOP (BRIGHT CYAN #00cfe8 — 8px)        */}
          {/* Flows RIGHT -> LEFT from HVAC Cooling Tower -> P-10101A/B -> AC */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={8}
            segments={[
              // Supply from HVAC CT (right) -> Suction bus x=826 (y=474..558) -> RIGHT suction of left-facing P-10101B/A -> TOP-LEFT discharge (y=464, 548) -> Bus x=680
              { d: 'M 1094 506 L 826 506', flowing: anyCpRun },
              { d: 'M 826 474 L 826 558', flowing: anyCpRun },
              { d: 'M 826 474 L 768 474', flowing: p101b.status === 'RUNNING' },
              { d: 'M 826 558 L 768 558', flowing: p101a.status === 'RUNNING' },
              { d: 'M 738 464 L 680 464', flowing: p101b.status === 'RUNNING' },
              { d: 'M 738 548 L 680 548', flowing: p101a.status === 'RUNNING' },
              { d: 'M 680 464 L 680 548', flowing: anyCpRun },
              { d: 'M 680 506 L 98 506 L 98 134 L 146 134', flowing: anyCpRun },
              { d: 'M 98 276 L 146 276', flowing: anyCpRun },
            ]}
          />
          <PipeTee x={826} y={506} color="#00cfe8" orientation="right" size={8} />
          <PipeTee x={680} y={506} color="#00cfe8" orientation="left" size={8} />
          <PipeTee x={98} y={276} color="#00cfe8" orientation="right" size={8} />

          {/* =============================================================== */}
          {/* 2. COOLING WATER RETURN LOOP (DARK TEAL #009999 — 8px)          */}
          {/* AC-101/102 Return -> Drop far-left (x=72) -> Bottom RIGHT to CT */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={8}
            segments={[
              { d: 'M 146 170 L 72 170 L 72 612 L 1094 612', flowing: anyCpRun },
              { d: 'M 146 312 L 72 312', flowing: anyCpRun },
            ]}
          />
          <PipeTee x={72} y={312} color="#009999" orientation="right" size={8} />

          {/* =============================================================== */}
          {/* 3. COMPRESSED AIR PIPING NETWORK (SILVER-GRAY #cbd5e1 — 9px)    */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#cbd5e1"
            strokeWidth={9}
            segments={[
              // AC-101 & AC-102 discharge -> vertical bus x=304 -> Wet Receiver V-101A
              { d: 'M 226 152 L 304 152', flowing: ac101.status === 'RUNNING' },
              { d: 'M 226 294 L 304 294', flowing: ac102.status === 'RUNNING' },
              { d: 'M 304 152 L 304 294', flowing: anyAcRun },
              { d: 'M 304 224 L 368 224', flowing: anyAcRun },
              { d: 'M 332 224 L 332 162 L 456 162 L 456 224', flowing: false },
              // V-101A -> Split (x=482) -> 2 Full Parallel Dryer/Filter Trains -> Merge (x=996)
              { d: 'M 424 224 L 482 224', flowing: anyAcRun },
              { d: 'M 482 162 L 482 292', flowing: anyAcRun },
              { d: 'M 482 162 L 996 162', flowing: anyAcRun },
              { d: 'M 482 292 L 996 292', flowing: anyAcRun && plant.equipment['B51F_AD101B'].status === 'RUNNING' },
              { d: 'M 996 162 L 996 292', flowing: anyAcRun },
              // Merge -> Dry Receiver V-101B -> Outlet to RO-DI & B5 2F
              { d: 'M 996 224 L 1054 224', flowing: anyAcRun },
              { d: 'M 1024 224 L 1024 162 L 1138 162 L 1138 224', flowing: false },
              { d: 'M 1110 224 L 1280 224', flowing: anyAcRun },
              { d: 'M 1228 224 L 1228 192 L 1280 192', flowing: anyAcRun },
            ]}
          />
          <PipeTee x={304} y={224} color="#cbd5e1" orientation="right" size={9} />
          <PipeTee x={332} y={224} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={456} y={224} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={482} y={224} color="#cbd5e1" orientation="left" size={9} />
          <PipeTee x={996} y={224} color="#cbd5e1" orientation="right" size={9} />
          <PipeTee x={1024} y={224} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={1138} y={224} color="#cbd5e1" orientation="up" size={9} />
          <PipeTee x={1228} y={224} color="#cbd5e1" orientation="up" size={9} />

          {/* Flow Arrows & Edge Labels */}
          <PipeArrow x={304} y={188} dir="down" active={ac101.status === 'RUNNING'} />
          <PipeArrow x={442} y={224} dir="right" active={anyAcRun} />
          <PipeArrow x={508} y={162} dir="right" active={anyAcRun} />
          <PipeArrow x={508} y={292} dir="right" active={anyAcRun && plant.equipment['B51F_AD101B'].status === 'RUNNING'} />
          <PipeArrow x={968} y={162} dir="right" active={anyAcRun} />
          <PipeArrow x={1030} y={224} dir="right" active={anyAcRun} />
          <PipeArrow x={926} y={506} dir="left" active={anyCpRun} />
          <PipeArrow x={340} y={506} dir="left" active={anyCpRun} />
          <PipeArrow x={72} y={564} dir="down" active={anyCpRun} />
          <PipeArrow x={540} y={612} dir="right" active={anyCpRun} />

          <text x={1286} y={195} textAnchor="end" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
            TO RO-DI WATER PKG
          </text>
          <text x={1286} y={238} textAnchor="end" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
            TO BLD 5 - 2ND FLOOR
          </text>
          <text x={1102} y={503} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">COOLING WATER SUPPLY</text>
          <text x={1102} y={513} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">FROM HVAC COOLING TOWER</text>
          <text x={1102} y={609} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">COOLING WATER RETURN</text>
          <text x={1102} y={619} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">TO HVAC COOLING TOWER</text>

          {/* =============================================================== */}
          {/* 4. 2 ACTIVE OIL-FREE COMPRESSORS (AC-101 VSD & AC-102 FIX)      */}
          {/* =============================================================== */}
          {compressors.map(({ unit, code, role, y, isVsd }) => {
            const isRun = unit.status === 'RUNNING';
            const loaded = isRun && (isVsd ? unit.loadPct > 30 : (unit.telemetry.loaded ?? 0) > 0);
            const rpm = isRun ? Math.round(900 + (unit.loadPct / 100) * 2100) : 0;
            const col = statusColor(unit.status);
            const dataType = isVsd ? 'Fpl_ACVSDData' : 'Fpl_ACFIXData';

            return (
              <g key={unit.tag} transform={`translate(142, ${y})`}>
                <text x={-36} y={-8} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="800">AIR</text>
                <PipeArrow x={-20} y={0} dir="right" active={isRun} />

                <g
                  data-scada-tag={unit.tag}
                  onClick={() => openFaceplate('Fpl_AC', unit.tag, `Fpl_AC · ${unit.tag} (${code})`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={-4}
                    y={-32}
                    width={92}
                    height={64}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : unit.faulted ? '#fecaca' : 'transparent'}
                    fillOpacity={isRun || unit.faulted ? 0.55 : 0}
                    stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : 'transparent'}
                    strokeWidth={1.8}
                    className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-600'}
                  />
                  <image href="/scada/Air compressor.png" x={0} y={-28} width={84} height={56} preserveAspectRatio="xMidYMid meet" />
                  <text x={42} y={40} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                    {code} ({role})
                  </text>
                  <rect x={44} y={-6} width={12} height={13} fill={col} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={50} y={3.5} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {isRun ? '1' : '0'}
                  </text>
                  <rect x={58} y={-6} width={12} height={13} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={64} y={3.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {unit.mode === 'AUTO' ? 'A' : 'M'}
                  </text>
                </g>

                <g
                  transform="translate(88, -52)"
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
                    {(isRun ? pit101.pv + 0.25 : pit101.pv).toFixed(1)} Bar
                  </text>
                </g>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* 5. RECEIVERS (V-101A/B), FILTERS, DRYERS (AD-101A/B, AD-102A/B) */}
          {/* =============================================================== */}
          {[
            { x: 396, y: 224, label: 'V-101A' },
            { x: 1082, y: 224, label: 'V-101B' },
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

          {[
            { code: 'F-101A', x: 552, y: 162 },
            { code: 'F-101C', x: 740, y: 162 },
            { code: 'F-102A', x: 928, y: 162 },
            { code: 'F-101B', x: 552, y: 292 },
            { code: 'F-101D', x: 740, y: 292 },
            { code: 'F-102B', x: 928, y: 292 },
          ].map((flt) => (
            <g key={flt.code} transform={`translate(${flt.x}, ${flt.y})`}>
              <image href="/scada/Filter.png" x={-18} y={-28} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
              <text x={0} y={39} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                {flt.code}
              </text>
            </g>
          ))}

          {[
            { tag: 'B51F_AD101A', code: 'AD-101A', x: 646, y: 162 },
            { tag: 'B51F_AD102A', code: 'AD-102A', x: 834, y: 162 },
            { tag: 'B51F_AD101B', code: 'AD-101B', x: 646, y: 292 },
            { tag: 'B51F_AD102B', code: 'AD-102B', x: 834, y: 292 },
          ].map((d) => {
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
                <text x={0} y={44} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                  {d.code}
                </text>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* 6. COOLING PUMPS P-10101A/B (direction="left", DOL + Prefix)    */}
          {/* =============================================================== */}
          <WinccPumpSymbol
            x={754}
            y={474}
            direction="left"
            unit={p101b}
            shortTag="P-10101B"
            onClick={() => openFaceplate('Fpl_DOL', 'B51F_P10101B', 'Fpl_DOL · B51F_P10101B')}
          />
          <WinccPumpSymbol
            x={754}
            y={558}
            direction="left"
            unit={p101a}
            shortTag="P-10101A"
            onClick={() => openFaceplate('Fpl_DOL', 'B51F_P10101A', 'Fpl_DOL · B51F_P10101A')}
          />
          {/* Flow switches FS-10101A / B */}
          <g transform="translate(704, 464)">
            <circle cx={0} cy={0} r={4} fill={p101b.status === 'RUNNING' ? '#22c55e' : '#64748b'} stroke="#0f172a" strokeWidth={1} />
            <text x={0} y={-10} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="800">FS-10101B</text>
          </g>
          <g transform="translate(704, 548)">
            <circle cx={0} cy={0} r={4} fill={p101a.status === 'RUNNING' ? '#22c55e' : '#64748b'} stroke="#0f172a" strokeWidth={1} />
            <text x={0} y={-10} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="800">FS-10101A</text>
          </g>

          {/* =============================================================== */}
          {/* 7. PIPE-MOUNTED SENSORS (PIT10101 & AIT10101)                   */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={1168}
            y={224}
            sensor={pit101}
            shortLabel="PIT10101"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT10101', 'Fpl_PIT · B51F_PIT10101 (OFRAC Header)')}
          />
          <PipeSensorBadge
            x={1210}
            y={224}
            sensor={ait101}
            shortLabel="AIT10101"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_AIT10101', 'Fpl_AIT · B51F_AIT10101 (Dew Point)')}
          />

          {/* WinCC Blue Settings Buttons (Fpl_Demand_B5OFRAC & Fpl_Prefix_B5OFRAC_Pump) */}
          <g
            transform="translate(336, 52)"
            onClick={() => openFaceplate('Fpl_Demand', 'B5OFRAC', 'Fpl_Demand_B5OFRAC')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-ofrac" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#wincc-btn-ofrac)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={84} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="700">
              Air Compressor Settings
            </text>
          </g>

          <g
            transform="translate(866, 444)"
            onClick={() => openFaceplate('Fpl_Demand', 'B5OFRACCP', 'Fpl_Prefix_B5OFRAC_Pump')}
            className="cursor-pointer group"
          >
            <rect
              x={0}
              y={0}
              width={164}
              height={24}
              rx={3}
              fill="url(#wincc-btn-ofrac)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={82} y={15.5} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">
              Cooling Pump Prefix
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
