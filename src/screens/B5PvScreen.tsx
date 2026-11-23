import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { statusColor } from '../components/scada/scadaColors.ts';

/**
 * Scr_B5_PV.Pdl — Process Vacuum System (Faithful to fds_img_41.png, ZERO Future units)
 *  - Olive-gold vacuum piping (#a8a228) serving Building 5 2nd Floor tools + Building 2 tie-in
 *  - Receiver V-1301 + B51F_PIT1301 (-75 kPa main header) + B52F_PIT1303 (-74.2 kPa 2F end-of-line)
 *  - Active Vacuum Pumps PV-1301A & PV-1301B using real WinCC /scada/PV.png
 *  - WinCC Blue Process Vacuum Settings button -> Fpl_Demand_B5PV
 */
export const B5PvScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const activeScreen = useB5Store((s) => s.activeScreen);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const pva = plant.equipment['B51F_PV1301A'];
  const pvb = plant.equipment['B51F_PV1301B'];
  const anyPvRun = pva.status === 'RUNNING' || pvb.status === 'RUNNING';
  const pit1301 = plant.sensors['B51F_PIT1301'];
  const pit1303 = plant.sensors['B52F_PIT1303'];
  const pit1302 = plant.sensors['B23F_PIT1302'];
  const isB2 = activeScreen === 'b2_pv';

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            {isB2
              ? 'Building 2 — Advanced Optics · Shared Process Vacuum System (`Scr_B2_PV.Pdl`)'
              : 'Building 5 — Silicons Carbide · Process Vacuum System (`Scr_B5_PV.Pdl`)'}
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Main Header PIT1301: {pit1301.pv.toFixed(1)} kPa · B5 2F EoL PIT1303: {pit1303.pv.toFixed(1)} kPa · B2 EoL
            PIT1302: <span className="text-cyan-300 font-bold">{pit1302.pv.toFixed(1)} kPa</span> · PV-1301A:{' '}
            {pva.status} · PV-1301B: {pvb.status} · Demand: {plant.demands.B5PV.status}
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_41.png */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1280 650" className="w-full min-w-[1050px] h-auto select-none">
          {/* Building 5 - 2nd Floor Architectural Frame */}
          <rect
            x={28}
            y={22}
            width={408}
            height={294}
            fill="none"
            stroke="#334155"
            strokeWidth={1.4}
            strokeDasharray="6 3 2 3"
          />
          <text x={42} y={302} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
            Building 5 - 2nd Floor
          </text>

          {/* Building 2 Tie-In Architectural Frame (visual manifold matching fds_img_41.png) */}
          <rect
            x={710}
            y={22}
            width={542}
            height={294}
            fill="none"
            stroke="#334155"
            strokeWidth={1.4}
            strokeDasharray="6 3 2 3"
          />
          <line x1={710} y1={174} x2={1252} y2={174} stroke="#334155" strokeWidth={1.2} strokeDasharray="5 3" />
          <text x={724} y={40} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            Building 2 - 2nd Floor (Tie-In)
          </text>
          <text x={724} y={192} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            Building 2 - 1st Floor (Tie-In)
          </text>

          {/* =============================================================== */}
          {/* OLIVE-GOLD VACUUM PIPING NETWORK (#a8a228 — 9px / 6px)          */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#a8a228"
            strokeWidth={9}
            segments={[
              // B5 2F Header -> Main vertical drop (x=378) -> Receiver V-1301 inlet (y=536)
              { d: 'M 72 96 L 378 96 L 378 536 L 468 536', flowing: anyPvRun },
              // B2 Tie-In Headers -> Join main drop at (x=378, y=362)
              { d: 'M 1218 86 L 742 86 L 742 362 L 378 362', flowing: anyPvRun },
              { d: 'M 1038 224 L 742 224', flowing: anyPvRun },
              // Receiver V-1301 Top Bypass
              { d: 'M 378 446 L 566 446 L 566 514', flowing: false },
              // Receiver V-1301 Outlet -> Pump Suction Bus (x=632) -> PV-1301A (y=468) & PV-1301B (y=578)
              { d: 'M 524 514 L 632 514', flowing: anyPvRun },
              { d: 'M 632 468 L 632 578', flowing: anyPvRun },
              { d: 'M 632 468 L 758 468', flowing: pva.status === 'RUNNING' },
              { d: 'M 632 578 L 758 578', flowing: pvb.status === 'RUNNING' },
              // Pump Exhaust Discharge -> Common Stack (x=992) -> UP to Vent
              { d: 'M 836 468 L 992 468', flowing: pva.status === 'RUNNING' },
              { d: 'M 836 578 L 992 578 L 992 414', flowing: anyPvRun },
            ]}
          />
          {/* Tool Branch Taps (6px) */}
          <WinccPipeNetwork
            color="#a8a228"
            strokeWidth={6}
            segments={[
              { d: 'M 106 96 L 106 124', flowing: anyPvRun },
              { d: 'M 184 96 L 184 124', flowing: anyPvRun },
              { d: 'M 264 96 L 264 124', flowing: anyPvRun },
              { d: 'M 804 86 L 804 114', flowing: anyPvRun },
              { d: 'M 906 86 L 906 114', flowing: anyPvRun },
              { d: 'M 988 86 L 988 114', flowing: anyPvRun },
              { d: 'M 1072 86 L 1072 114', flowing: anyPvRun },
              { d: 'M 1178 86 L 1178 114', flowing: anyPvRun },
              { d: 'M 804 224 L 804 252', flowing: anyPvRun },
              { d: 'M 896 224 L 896 252', flowing: anyPvRun },
            ]}
          />

          {/* Flanged Tees */}
          <PipeTee x={378} y={362} color="#a8a228" orientation="right" size={9} />
          <PipeTee x={378} y={446} color="#a8a228" orientation="right" size={9} />
          <PipeTee x={566} y={514} color="#a8a228" orientation="up" size={9} />
          <PipeTee x={632} y={514} color="#a8a228" orientation="left" size={9} />
          <PipeTee x={742} y={224} color="#a8a228" orientation="right" size={9} />
          <PipeTee x={992} y={468} color="#a8a228" orientation="left" size={9} />

          {/* Flow Direction Arrows */}
          <PipeArrow x={320} y={96} dir="right" active={anyPvRun} />
          <PipeArrow x={378} y={230} dir="down" active={anyPvRun} />
          <PipeArrow x={564} y={362} dir="left" active={anyPvRun} />
          <PipeArrow x={690} y={468} dir="right" active={pva.status === 'RUNNING'} />
          <PipeArrow x={690} y={578} dir="right" active={pvb.status === 'RUNNING'} />
          <PipeArrow x={920} y={468} dir="right" active={pva.status === 'RUNNING'} />
          <PipeArrow x={992} y={432} dir="up" active={anyPvRun} />

          {/* =============================================================== */}
          {/* PROCESS TOOL BOXES (matching fds_img_41.png)                    */}
          {/* =============================================================== */}
          {[
            { x: 64, y: 124, w: 82, lines: ['N SPEC - MPD', 'SCANNER C-05', '(2 SETS)'] },
            { x: 152, y: 124, w: 66, lines: ['LASER MARKER', 'C-01', '(4 SETS)'] },
            { x: 224, y: 124, w: 80, lines: ['KOCOS EDGE', 'PROFILER E-05', '(8 SETS)'] },
            { x: 766, y: 114, w: 76, lines: ['TRIAXIAL CNC', 'CL-3MGC', '(6 SETS)'] },
            { x: 852, y: 114, w: 106, lines: ['SINGLE SPINDLE', 'CHAMFER Y250', '(7 SETS)'] },
            { x: 966, y: 114, w: 46, lines: ['TLC', '(1 SET)'] },
            { x: 1020, y: 114, w: 104, lines: ['SINGLE SPINDLE', 'CHAMFER ZY250-1', '(7 SETS)'] },
            { x: 1134, y: 114, w: 88, lines: ['BEVELING MACHINE', 'FENGYUAN', '(6 SETS)'] },
            { x: 766, y: 252, w: 76, lines: ['TRIAXIAL CNC', 'CL-3MGC', '(2 SETS)'] },
            { x: 852, y: 252, w: 88, lines: ['CNC MACHINE', 'TL-GPR1A-PA', '(2 SETS)'] },
          ].map((box, idx) => (
            <g key={`tb-${idx}`} transform={`translate(${box.x}, ${box.y})`}>
              <rect x={0} y={0} width={box.w} height={40} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1.1} />
              {box.lines.map((ln, li) => (
                <text
                  key={li}
                  x={box.w / 2}
                  y={12 + li * 10}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="6.8"
                  fontFamily="monospace"
                  fontWeight={li === 0 ? '900' : '700'}
                >
                  {ln}
                </text>
              ))}
            </g>
          ))}

          {/* =============================================================== */}
          {/* VACUUM RECEIVER TANK V-1301                                     */}
          {/* =============================================================== */}
          <g transform="translate(496, 514)">
            <rect x={-28} y={-44} width={56} height={88} rx={14} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.5} />
            <rect x={-20} y={-38} width={11} height={76} rx={4} fill="#f8fafc" opacity={0.7} />
            <line x1={-16} y1={44} x2={-16} y2={52} stroke="#334155" strokeWidth={3.2} />
            <line x1={16} y1={44} x2={16} y2={52} stroke="#334155" strokeWidth={3.2} />
            <text x={0} y={66} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
              V-1301
            </text>
          </g>

          {/* =============================================================== */}
          {/* 2 ACTIVE PROCESS VACUUM PUMPS (PV-1301A & PV-1301B, /scada/PV.png) */}
          {/* =============================================================== */}
          {[
            { unit: pva, code: 'PV-1301A', y: 468 },
            { unit: pvb, code: 'PV-1301B', y: 578 },
          ].map(({ unit, code, y }) => {
            const isRun = unit.status === 'RUNNING';
            const col = statusColor(unit.status);
            return (
              <g key={unit.tag} transform={`translate(756, ${y})`}>
                <g
                  data-scada-tag={unit.tag}
                  onClick={() => openFaceplate('Fpl_PV', unit.tag, `Fpl_PV · ${unit.tag} (${code})`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={-4}
                    y={-30}
                    width={88}
                    height={60}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : unit.faulted ? '#fecaca' : 'transparent'}
                    fillOpacity={isRun || unit.faulted ? 0.55 : 0}
                    stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : 'transparent'}
                    strokeWidth={1.8}
                    className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-600'}
                  />
                  <image href="/scada/PV.png" x={0} y={-26} width={80} height={52} preserveAspectRatio="xMidYMid meet" />
                  <rect x={22} y={8} width={12} height={13} fill={col} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={28} y={17.5} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {isRun ? '1' : '0'}
                  </text>
                  <rect x={36} y={8} width={12} height={13} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
                  <text x={42} y={17.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {unit.mode === 'AUTO' ? 'A' : 'M'}
                  </text>
                  <text x={40} y={41} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                    {code} · {unit.loadPct.toFixed(0)}%
                  </text>
                </g>

                {/* DATA Button -> Fpl_PVData */}
                <g
                  transform="translate(88, -22)"
                  onClick={() => openFaceplate('Fpl_PVData', unit.tag, `Fpl_PVData · ${unit.tag}`)}
                  className="cursor-pointer group"
                >
                  <rect x={0} y={0} width={36} height={15} rx={2} fill="#1e3a8a" stroke="#0f172a" strokeWidth={0.9} className="group-hover:brightness-125" />
                  <text x={18} y={10.5} textAnchor="middle" fill="#e0f2fe" fontSize="8" fontFamily="monospace" fontWeight="800">
                    DATA
                  </text>
                </g>
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* PIPE-MOUNTED SENSORS (B52F_PIT1303, B23F_PIT1302, B51F_PIT1301) */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={136}
            y={96}
            sensor={pit1303}
            shortLabel="B52F_PIT1303"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B52F_PIT1303', 'Fpl_PIT_kPa · B52F_PIT1303 (B5 2F EoL Vacuum)')}
          />
          <PipeSensorBadge
            x={988}
            y={86}
            sensor={pit1302}
            shortLabel="B23F_PIT1302"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B23F_PIT1302', 'Fpl_PIT_kPa · B23F_PIT1302 (B2 2F/3F EoL Vacuum)')}
          />
          <PipeSensorBadge
            x={424}
            y={536}
            sensor={pit1301}
            shortLabel="B51F_PIT1301"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT1301', 'Fpl_PIT_kPa · B51F_PIT1301 (Main Vacuum)')}
          />

          {/* WinCC Blue Process Vacuum Settings Button (Fpl_Demand_B5PV) */}
          <g
            transform="translate(712, 386)"
            onClick={() => openFaceplate('Fpl_Demand', 'B5PV', 'Fpl_Demand_B5PV')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-pv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect
              x={0}
              y={0}
              width={166}
              height={26}
              rx={3}
              fill="url(#wincc-btn-pv)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={83} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="700">
              Process Vacuum Settings
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
