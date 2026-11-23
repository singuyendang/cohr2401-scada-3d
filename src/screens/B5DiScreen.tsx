import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PidIconButton,
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';

/**
 * Scr_B5_DI.Pdl / Scr_B2_DI.Pdl / Scr_B3_DI.Pdl — Site-Wide Unified 3-Building DI Water Distribution Screen
 *  (100% Faithful to fds_img_39.png — shared across Building 5, Building 2, AND Building 3!)
 *  - TOP-LEFT     : BUILDING 3 - 1ST FLOOR  (B31F_PCV10705 / B31F_PIT10705 / B31F_FIT10705 -> CISTERN)
 *  - BOTTOM-LEFT  : BUILDING 5 - 2ND FLOOR  (B52F_PCV10701 Disco Dicing · B52F_PCV10703 Edge/Auto Grinding & Cleaning · B52F_PCV10702 Sand Blasting / Production)
 *  - TOP-RIGHT    : BUILDING 2 - 2ND & 1ST FLOOR (B22F_PCV10704 / B22F_PIT10704 / B22F_FIT10704 -> Disco Dicing, Grinding & Sozhou, Cleaning/Wax Line, Assembly, Coating, Sand Blasting)
 *  - BOTTOM-RIGHT : SHARED RO-DI WATER PACKAGE (/scada/DI.png + Third-Party PLC Connection Status Signal)
 */
export const B5DiScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const activeBuilding = useB5Store((s) => s.activeBuilding);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const updateSandbox = useB5Store((s) => s.updateSandbox);

  const diConnected = plant.sandbox.diPackageConnected;

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Site-Wide Unified DI Water Distribution — Building 5, Building 2 & Building 3 (`Scr_{activeBuilding}_DI.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            B5: {plant.sensors['B52F_PIT10701'].pv.toFixed(2)} / {plant.sensors['B52F_PIT10702'].pv.toFixed(2)} /{' '}
            {plant.sensors['B52F_PIT10703'].pv.toFixed(2)} bar · B2:{' '}
            <span className="text-cyan-300 font-bold">
              {plant.sensors['B22F_PIT10704'].pv.toFixed(2)} bar ({plant.sensors['B22F_FIT10704'].pv.toFixed(1)} m³/h)
            </span>{' '}
            · B3:{' '}
            <span className="text-amber-300 font-bold">
              {plant.sensors['B31F_PIT10705'].pv.toFixed(2)} bar ({plant.sensors['B31F_FIT10705'].pv.toFixed(1)} m³/h)
            </span>{' '}
            · RO-DI Link:{' '}
            <span className={diConnected ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {diConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateSandbox({ diPackageConnected: !diConnected })}
            title="Click to test Third-Party RO-DI Water Package communication signal (Connected / Disconnected)"
            className={`px-2.5 py-1 rounded border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition ${
              diConnected
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-red-950/90 border-red-500 text-red-300 animate-alarm-flash hover:bg-red-900/90'
            }`}
          >
            {diConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            RO-DI PACKAGE: {diConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </button>
          <StatusLegend />
        </div>
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_39.png (All 3 Buildings on 1 Unified DI Screen!) */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1340 735" className="w-full min-w-[1120px] h-auto select-none">
          {/* =============================================================== */}
          {/* ARCHITECTURAL BUILDING FRAMES (EXACT fds_img_39.png LAYOUT)     */}
          {/* =============================================================== */}
          {/* TOP-LEFT: BUILDING 3 - 1ST FLOOR */}
          <rect
            x={22}
            y={18}
            width={634}
            height={146}
            fill={activeBuilding === 'B3' ? '#fef9c3' : 'none'}
            fillOpacity={activeBuilding === 'B3' ? 0.25 : 0}
            stroke={activeBuilding === 'B3' ? '#b45309' : '#334155'}
            strokeWidth={activeBuilding === 'B3' ? 2.0 : 1.5}
            strokeDasharray="6 3 2 3"
          />
          <text x={34} y={35} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 3 - 1ST FLOOR (CISTERN · PCV10705)
          </text>
          <rect x={242} y={50} width={150} height={84} rx={2} fill="#cbd5e1" fillOpacity={0.45} stroke="#334155" strokeWidth={1.1} strokeDasharray="4 2" />
          <text x={317} y={125} textAnchor="middle" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
            CISTERN (B3-1F)
          </text>

          {/* BOTTOM-LEFT: BUILDING 5 - 2ND FLOOR */}
          <rect
            x={22}
            y={178}
            width={634}
            height={536}
            fill={activeBuilding === 'B5' ? '#dbeafe' : 'none'}
            fillOpacity={activeBuilding === 'B5' ? 0.22 : 0}
            stroke={activeBuilding === 'B5' ? '#1d4ed8' : '#334155'}
            strokeWidth={activeBuilding === 'B5' ? 2.0 : 1.5}
            strokeDasharray="6 3 2 3"
          />
          <text x={34} y={196} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 5 - 2ND FLOOR (PCV10701 / PCV10703 / PCV10702)
          </text>

          {[
            { y: 212, title: 'DISCO DICING ROOM (B5)', sub: 'Loop 1 · B52F_PCV10701' },
            { y: 374, title: 'EDGE / AUTO GRINDING & CLEANING (B5)', sub: 'Loop 3 · B52F_PCV10703' },
            { y: 536, title: 'SAND BLASTING & PRODUCTION (B5)', sub: 'Loop 2 · B52F_PCV10702' },
          ].map((rm) => (
            <g key={rm.title}>
              <rect x={236} y={rm.y} width={384} height={134} rx={2.5} fill="#cbd5e1" fillOpacity={0.4} stroke="#334155" strokeWidth={1.1} strokeDasharray="4 2" />
              <text x={428} y={rm.y + 17} textAnchor="middle" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
                {rm.title}
              </text>
              <text x={428} y={rm.y + 28} textAnchor="middle" fill="#334155" fontSize="7.4" fontFamily="monospace" fontWeight="700">
                {rm.sub}
              </text>
            </g>
          ))}

          {/* TOP-RIGHT: BUILDING 2 - 2ND FLOOR & 1ST FLOOR */}
          <rect
            x={736}
            y={18}
            width={582}
            height={440}
            fill={activeBuilding === 'B2' ? '#e0f2fe' : 'none'}
            fillOpacity={activeBuilding === 'B2' ? 0.25 : 0}
            stroke={activeBuilding === 'B2' ? '#0369a1' : '#334155'}
            strokeWidth={activeBuilding === 'B2' ? 2.0 : 1.5}
            strokeDasharray="6 3 2 3"
          />
          <text x={748} y={35} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 2 - 2ND FLOOR (PCV10704)
          </text>
          <line x1={736} y1={314} x2={1318} y2={314} stroke="#475569" strokeWidth={1.1} strokeDasharray="4 3" />
          <text x={748} y={448} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 2 - 1ST FLOOR
          </text>

          {/* Building 2 Room Boxes matching fds_img_39.png */}
          {[
            { x: 760, y: 74, w: 120, h: 42, lines: ['DISCO DICING', 'ROOM'] },
            { x: 896, y: 74, w: 124, h: 42, lines: ['GRINDING &', 'SOZHOU'] },
            { x: 1036, y: 74, w: 146, h: 42, lines: ['CLEANING LINE &', 'WAX CLEAN LINE'] },
            { x: 756, y: 204, w: 112, h: 40, lines: ['GRINDING', 'AREA 1'] },
            { x: 880, y: 204, w: 112, h: 40, lines: ['GRINDING', 'AREA 2'] },
            { x: 1004, y: 204, w: 146, h: 40, lines: ['ASSEMBLY WORKSHOP', '& GRINDING AREA'] },
            { x: 1162, y: 204, w: 140, h: 40, lines: ['WAX CLEAN LINE &', 'GRINDING AREA'] },
            { x: 768, y: 374, w: 132, h: 42, lines: ['SAND BLASTING', 'ROOM'] },
            { x: 924, y: 344, w: 126, h: 42, lines: ['CLEANING', 'ROOM'] },
            { x: 1068, y: 344, w: 126, h: 42, lines: ['COATING', 'AREA'] },
          ].map((rm, idx) => (
            <g key={`b2rm-${idx}`} transform={`translate(${rm.x}, ${rm.y})`}>
              <rect x={0} y={0} width={rm.w} height={rm.h} rx={2} fill="#cbd5e1" fillOpacity={0.5} stroke="#334155" strokeWidth={1} strokeDasharray="3 2" />
              {rm.lines.map((ln, li) => (
                <text key={li} x={rm.w / 2} y={17 + li * 12} textAnchor="middle" fill="#0f172a" fontSize="7.4" fontFamily="monospace" fontWeight="900">
                  {ln}
                </text>
              ))}
            </g>
          ))}

          {/* =============================================================== */}
          {/* DI SUPPLY PIPING NETWORK (CLEAN WHITE-SILVER #f1f5f9 — 8px)     */}
          {/* Central Supply Riser (x=686) feeds B3 (Top-Left), B5 (Left), B2 (Right)! */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#f1f5f9"
            strokeWidth={8}
            segments={[
              // RO-DI Package Outlet -> Main Vertical Supply Riser (x=686)
              { d: 'M 946 544 L 686 544', flowing: diConnected },
              { d: 'M 686 68 L 686 588', flowing: diConnected },
              // Building 3 Supply Loop (y=68)
              { d: 'M 686 68 L 76 68', flowing: diConnected },
              // Building 5 Supply Loops (y=262, 424, 588)
              { d: 'M 686 262 L 76 262', flowing: diConnected },
              { d: 'M 686 424 L 76 424', flowing: diConnected },
              { d: 'M 686 588 L 76 588', flowing: diConnected },
              // Building 2 Supply Loops (2F y=148 & 1F y=332)
              { d: 'M 686 148 L 1280 148', flowing: diConnected },
              { d: 'M 686 332 L 1280 332', flowing: diConnected },
            ]}
          />
          <PipeTee x={686} y={148} color="#f1f5f9" orientation="right" size={8} />
          <PipeTee x={686} y={262} color="#f1f5f9" orientation="left" size={8} />
          <PipeTee x={686} y={332} color="#f1f5f9" orientation="right" size={8} />
          <PipeTee x={686} y={424} color="#f1f5f9" orientation="left" size={8} />
          <PipeTee x={686} y={544} color="#f1f5f9" orientation="right" size={8} />

          {/* =============================================================== */}
          {/* DI RETURN PIPING NETWORK (STEEL GRAY #64748b — 8px)             */}
          {/* Central Return Riser (x=712) returns ALL 3 buildings -> RO-DI!  */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#64748b"
            strokeWidth={8}
            segments={[
              // B3 Return (y=128) -> Return Riser x=712 -> down to y=650 -> RO-DI Return (y=612)
              { d: 'M 76 68 L 76 128 L 712 128 L 712 650 L 76 650 L 76 588', flowing: diConnected },
              { d: 'M 76 262 L 76 322 L 712 322', flowing: diConnected },
              { d: 'M 76 424 L 76 484 L 712 484', flowing: diConnected },
              // B2 2F & 1F Returns -> Return Riser x=712
              { d: 'M 1280 148 L 1280 184 L 712 184', flowing: diConnected },
              { d: 'M 1280 332 L 1280 364 L 712 364', flowing: diConnected },
              // Return Riser -> RO-DI Package Inlet
              { d: 'M 712 612 L 946 612', flowing: diConnected },
            ]}
          />
          <PipeTee x={712} y={184} color="#64748b" orientation="right" size={8} />
          <PipeTee x={712} y={322} color="#64748b" orientation="left" size={8} />
          <PipeTee x={712} y={364} color="#64748b" orientation="right" size={8} />
          <PipeTee x={712} y={484} color="#64748b" orientation="left" size={8} />
          <PipeTee x={712} y={612} color="#64748b" orientation="right" size={8} />

          {/* Directional Flow Arrows */}
          {[68, 262, 424, 588].map((y) => (
            <g key={`arr-l-${y}`}>
              <PipeArrow x={200} y={y} dir="left" active={diConnected} />
              <PipeArrow x={200} y={y + 60} dir="right" active={diConnected} />
            </g>
          ))}
          <PipeArrow x={796} y={148} dir="right" active={diConnected} />
          <PipeArrow x={796} y={184} dir="left" active={diConnected} />
          <PipeArrow x={796} y={332} dir="right" active={diConnected} />
          <PipeArrow x={796} y={364} dir="left" active={diConnected} />
          <PipeArrow x={828} y={544} dir="left" active={diConnected} />
          <PipeArrow x={828} y={612} dir="right" active={diConnected} />

          {/* =============================================================== */}
          {/* BUILDING 3 LOOP 5 (B31F_PCV10705 / PIT10705 / FIT10705)         */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={132}
            y={68}
            valve={plant.valves['B31F_PCV10705']}
            shortLabel="PCV10705"
            onClick={() => openFaceplate('Fpl_CVAL', 'B31F_PCV10705', 'Fpl_CVAL · B31F_PCV10705 (B3 Cistern)')}
          />
          <PidIconButton
            x={50}
            y={82}
            label="PID"
            labelSide="bottom"
            onClick={() => openFaceplate('Fpl_PID', 'B31F_PCV10705_PID', 'Fpl_PID_Bar · B31F_PCV10705_PID (B3 Cistern)')}
          />
          <PipeSensorBadge
            x={452}
            y={68}
            sensor={plant.sensors['B31F_PIT10705']}
            shortLabel="PIT10705"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_PIT10705', 'Fpl_PIT · B31F_PIT10705 (B3 Cistern)')}
          />
          <PipeSensorBadge
            x={584}
            y={68}
            sensor={plant.sensors['B31F_FIT10705']}
            shortLabel="FIT10705"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_FIT10705', 'Fpl_FIT · B31F_FIT10705 (B3 Cistern)')}
          />

          {/* =============================================================== */}
          {/* BUILDING 5 LOOPS 1, 3, 2 (B52F_PCV10701 / 03 / 02)              */}
          {/* =============================================================== */}
          {(
            [
              { lbl: 'PCV10701', ySup: 262, pcv: 'B52F_PCV10701', pid: 'B52F_PCV10701_PID', pit: 'B52F_PIT10701', fit: 'B52F_FIT10701', room: 'B5 Disco Dicing' },
              { lbl: 'PCV10703', ySup: 424, pcv: 'B52F_PCV10703', pid: 'B52F_PCV10703_PID', pit: 'B52F_PIT10703', fit: 'B52F_FIT10703', room: 'B5 Edge/Auto Grind & Clean' },
              { lbl: 'PCV10702', ySup: 588, pcv: 'B52F_PCV10702', pid: 'B52F_PCV10702_PID', pit: 'B52F_PIT10702', fit: 'B52F_FIT10702', room: 'B5 Sand Blast & Prod' },
            ] as const
          ).map((loop) => (
            <g key={loop.pcv}>
              <WinccValveSymbol
                x={132}
                y={loop.ySup}
                valve={plant.valves[loop.pcv]}
                shortLabel={loop.lbl}
                onClick={() => openFaceplate('Fpl_CVAL', loop.pcv, `Fpl_CVAL · ${loop.pcv} (${loop.room})`)}
              />
              <PidIconButton
                x={50}
                y={loop.ySup + 14}
                label="PID"
                labelSide="bottom"
                onClick={() => openFaceplate('Fpl_PID', loop.pid, `Fpl_PID_Bar · ${loop.pid} (${loop.room})`)}
              />
              <PipeSensorBadge
                x={354}
                y={loop.ySup}
                sensor={plant.sensors[loop.pit]}
                shortLabel={loop.pit.replace('B52F_', '')}
                stemDir="bottom"
                labelPos="bottom"
                onClick={() => openFaceplate('Fpl_Sensor', loop.pit, `Fpl_PIT · ${loop.pit} (${loop.room})`)}
              />
              <PipeSensorBadge
                x={518}
                y={loop.ySup}
                sensor={plant.sensors[loop.fit]}
                shortLabel={loop.fit.replace('B52F_', '')}
                stemDir="bottom"
                labelPos="bottom"
                onClick={() => openFaceplate('Fpl_Sensor', loop.fit, `Fpl_FIT · ${loop.fit} (${loop.room})`)}
              />
            </g>
          ))}

          {/* =============================================================== */}
          {/* BUILDING 2 LOOP 4 (B22F_PCV10704 / PIT10704 / FIT10704)         */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={1240}
            y={148}
            valve={plant.valves['B22F_PCV10704']}
            shortLabel="PCV10704"
            onClick={() => openFaceplate('Fpl_CVAL', 'B22F_PCV10704', 'Fpl_CVAL · B22F_PCV10704 (B2 2F/1F Loop)')}
          />
          <PidIconButton
            x={1282}
            y={94}
            label="PID"
            labelSide="bottom"
            onClick={() => openFaceplate('Fpl_PID', 'B22F_PCV10704_PID', 'Fpl_PID_Bar · B22F_PCV10704_PID (B2 Loop)')}
          />
          <PipeSensorBadge
            x={944}
            y={148}
            sensor={plant.sensors['B22F_PIT10704']}
            shortLabel="PIT10704"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B22F_PIT10704', 'Fpl_PIT · B22F_PIT10704 (B2 DI Loop)')}
          />
          <PipeSensorBadge
            x={1108}
            y={148}
            sensor={plant.sensors['B22F_FIT10704']}
            shortLabel="FIT10704"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B22F_FIT10704', 'Fpl_FIT · B22F_FIT10704 (B2 DI Loop)')}
          />

          {/* =============================================================== */}
          {/* SHARED RO-DI WATER PACKAGE SKID (/scada/DI.png — BOTTOM RIGHT)  */}
          {/* =============================================================== */}
          <g transform="translate(946, 474)">
            <rect x={0} y={0} width={372} height={240} rx={4} fill="#ffffff" stroke="#334155" strokeWidth={1.6} />
            <text x={14} y={20} fill="#0f172a" fontSize="10.5" fontFamily="monospace" fontWeight="900">
              RO-DI WATER PACKAGE (B5 + B2 + B3)
            </text>

            <g
              data-scada-tag="B52F_RODI_COMM"
              transform="translate(234, 6)"
              onClick={() => updateSandbox({ diPackageConnected: !diConnected })}
              className="cursor-pointer group"
            >
              <rect
                x={0}
                y={0}
                width={128}
                height={19}
                rx={3}
                fill={diConnected ? '#dcfce7' : '#fee2e2'}
                stroke={diConnected ? '#15803d' : '#dc2626'}
                strokeWidth={1.2}
                className={diConnected ? 'group-hover:brightness-95' : 'animate-alarm-flash'}
              />
              <circle cx={11} cy={9.5} r={4} fill={diConnected ? '#22c55e' : '#ef4444'} />
              <text
                x={20}
                y={13}
                fill={diConnected ? '#14532d' : '#991b1b'}
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="900"
              >
                {diConnected ? 'PLC CONNECTED' : 'DISCONNECTED'}
              </text>
            </g>

            <image href="/scada/DI.png" x={18} y={30} width={336} height={192} preserveAspectRatio="xMidYMid meet" />
            <text x={186} y={232} textAnchor="middle" fill="#475569" fontSize="7.8" fontFamily="monospace" fontWeight="700">
              Unified Central RO-DI Skid serving Building 5, Building 2 & Building 3 · Click status badge to test link
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
