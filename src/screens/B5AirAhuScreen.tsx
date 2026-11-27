import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeTee,
  SvgLocalOverlay,
  WinccPipeNetwork,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Scr_B5_AIR_AHU.Pdl — Air Handling & Cleanroom Ductwork Schematic (Faithful to fds_img_36.png)
 *  - PAU-B5-2F-01 fresh air ducting -> AHU-B5-2F-01..04 (Leak Fill, KNN Tech, Production, Spare Part, Metro, Gowning)
 *  - AHU-B5-1F-01 -> Raw Material / IQC / Warehouse (1st Mezzanine)
 *  - Live room boxes displaying Dew Point (°C), Temp (°C), Humidity (%RH), Pressure (Pa)
 *  - Right-side Office & Meeting Room FCU cards (/scada/FCU.png)
 */
export const B5AirAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const pauRun = plant.equipment['B5M2F_PAU01'].status === 'RUNNING';
  const ahu1fRun = plant.equipment['B5M1F_AHU01'].status === 'RUNNING';

  const renderRoomPanel = (
    ahuTag: string,
    title: string,
    x: number,
    y: number,
    showPress = false
  ) => {
    const cfg = plant.ahus[ahuTag];
    const dp = plant.sensors[cfg.dewPointSensorTag];
    const rat = plant.sensors[cfg.ratSensorTag];
    const rah = plant.sensors[cfg.rahSensorTag];
    const sas = plant.sensors[cfg.sasSensorTag];

    return (
      <g
        key={`${ahuTag}-${title}`}
        transform={`translate(${x}, ${y})`}
        onClick={() => openFaceplate('Fpl_AHU_DewPoint', ahuTag, `Fpl_AHU_DewPoint · ${cfg.label}`)}
        className="cursor-pointer group"
      >
        <rect x={0} y={0} width={116} height={showPress ? 74 : 60} rx={2} fill="#cbd5e1" stroke="#334155" strokeWidth={1.1} className="group-hover:stroke-blue-700" />
        <text x={58} y={showPress ? 84 : 70} textAnchor="middle" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">
          {title}
        </text>

        {[
          { lbl: 'Dew Point', val: dp.pv.toFixed(1), u: '°C', yOff: 14 },
          { lbl: 'Temperature', val: rat.pv.toFixed(1), u: '°C', yOff: 29 },
          { lbl: 'Humidity', val: rah.pv.toFixed(1), u: '%', yOff: 44 },
          ...(showPress ? [{ lbl: 'Static Pr.', val: sas.pv.toFixed(0), u: 'Pa', yOff: 59 }] : []),
        ].map((r) => (
          <g key={r.lbl}>
            <rect x={4} y={r.yOff - 9} width={56} height={12} fill="#fef3c7" stroke="#92400e" strokeWidth={0.7} />
            <text x={32} y={r.yOff} textAnchor="middle" fill="#0f172a" fontSize="6.8" fontFamily="monospace" fontWeight="800">
              {r.lbl}
            </text>
            <rect x={63} y={r.yOff - 9} width={34} height={12} fill="#ffffff" stroke="#334155" strokeWidth={0.7} />
            <text x={80} y={r.yOff} textAnchor="middle" fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="900">
              {r.val}
            </text>
            <text x={100} y={r.yOff} fill="#0f172a" fontSize="6.8" fontFamily="monospace" fontWeight="800">
              {r.u}
            </text>
          </g>
        ))}
      </g>
    );
  };

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Cleanroom Air Handling & Ductwork (`Scr_B5_AIR_AHU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Click any AHU, PAU, or Room Panel to adjust Room Temp / Dew Point / SAS Static Press SP & inspect 3-Way Valve PIDs
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_36.png */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 670" className="w-full min-w-[1100px] h-auto select-none">
          {/* Floor Elevation Guides */}
          {[
            { y: 24, label: 'ROOF LEVEL' },
            { y: 274, label: '2ND MEZZ. LEVEL' },
            { y: 392, label: '2ND LEVEL' },
            { y: 558, label: '1ST MEZZ. LEVEL' },
            { y: 652, label: '1ST LEVEL' },
          ].map((lvl) => (
            <g key={lvl.label}>
              <line x1={18} y1={lvl.y} x2={1305} y2={lvl.y} stroke="#475569" strokeWidth={0.9} strokeDasharray="3 3" />
              <text x={20} y={lvl.y - 4} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                {lvl.label}
              </text>
            </g>
          ))}

          {/* =============================================================== */}
          {/* 1. FRESH AIR & SUPPLY DUCTWORK (WHITE/SILVER #e2e8f0 — 8px)     */}
          {/*    High-contrast Dark Ocean Blue (#1d4ed8) animated flow path   */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#e2e8f0"
            strokeWidth={8}
            flowColor="#1d4ed8"
            segments={[
              // Outdoor -> PAU-B5-2F-01 -> Overhead fresh-air distribution header -> AHU-01..04
              { d: 'M 106 86 L 146 86', flowing: pauRun },
              { d: 'M 196 112 L 220 112 L 220 64 L 634 64 L 634 94', flowing: pauRun },
              { d: 'M 256 64 L 256 94', flowing: pauRun },
              { d: 'M 382 64 L 382 94', flowing: pauRun },
              { d: 'M 508 64 L 508 94', flowing: pauRun },
              // Supply air drops from each AHU down to its cleanroom panels
              { d: 'M 278 134 L 278 176', flowing: plant.equipment['B5M2F_AHU01'].status === 'RUNNING' },
              { d: 'M 404 134 L 404 176', flowing: plant.equipment['B5M2F_AHU02'].status === 'RUNNING' },
              { d: 'M 530 134 L 530 176', flowing: plant.equipment['B5M2F_AHU03'].status === 'RUNNING' },
              { d: 'M 656 134 L 656 176', flowing: plant.equipment['B5M2F_AHU04'].status === 'RUNNING' },
              // 1st Mezzanine: Outdoor -> AHU-B5-1F-01 -> Raw Material / Warehouse
              { d: 'M 118 446 L 284 446', flowing: ahu1fRun },
              { d: 'M 332 456 L 384 456 L 384 510 L 352 510', flowing: ahu1fRun },
            ]}
          />
          <PipeTee x={256} y={64} color="#e2e8f0" orientation="down" size={8} />
          <PipeTee x={382} y={64} color="#e2e8f0" orientation="down" size={8} />
          <PipeTee x={508} y={64} color="#e2e8f0" orientation="down" size={8} />

          {/* =============================================================== */}
          {/* 2. RETURN AIR DUCTWORK (STEEL GRAY #64748b — 7px)               */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#64748b"
            strokeWidth={7}
            segments={[
              { d: 'M 314 176 L 314 152 L 336 152 L 336 106 L 314 106', flowing: plant.equipment['B5M2F_AHU01'].status === 'RUNNING' },
              { d: 'M 440 176 L 440 152 L 462 152 L 462 106 L 440 106', flowing: plant.equipment['B5M2F_AHU02'].status === 'RUNNING' },
              { d: 'M 566 176 L 566 152 L 588 152 L 588 106 L 566 106', flowing: plant.equipment['B5M2F_AHU03'].status === 'RUNNING' },
              { d: 'M 692 176 L 692 152 L 714 152 L 714 106 L 692 106', flowing: plant.equipment['B5M2F_AHU04'].status === 'RUNNING' },
              { d: 'M 118 424 L 314 424 L 314 436', flowing: ahu1fRun },
            ]}
          />

          <PipeArrow x={126} y={86} dir="right" active={pauRun} fill="#1d4ed8" />
          <PipeArrow x={318} y={64} dir="right" active={pauRun} fill="#1d4ed8" />
          <PipeArrow x={446} y={64} dir="right" active={pauRun} fill="#1d4ed8" />
          <PipeArrow x={572} y={64} dir="right" active={pauRun} fill="#1d4ed8" />
          <PipeArrow x={202} y={446} dir="right" active={ahu1fRun} fill="#1d4ed8" />
          <PipeArrow x={202} y={424} dir="left" active={ahu1fRun} />

          <text x={58} y={89} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">OUTDOOR</text>
          <text x={58} y={449} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">OUTDOOR</text>
          <text x={32} y={427} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">TO EAF B5-1F-01</text>

          {/* =============================================================== */}
          {/* 3. CLICKABLE PAU & AHU GRAPHICS (/scada/pau.png & /scada/ahu.png)*/}
          {/* =============================================================== */}
          {[
            { tag: 'B5M2F_PAU01', code: 'PAU-B5-2F-01', x: 146, y: 84, isPau: true },
            { tag: 'B5M2F_AHU01', code: 'AHU-B5-2F-01', x: 246, y: 84, isPau: false },
            { tag: 'B5M2F_AHU02', code: 'AHU-B5-2F-02', x: 372, y: 84, isPau: false },
            { tag: 'B5M2F_AHU03', code: 'AHU-B5-2F-03', x: 498, y: 84, isPau: false },
            { tag: 'B5M2F_AHU04', code: 'AHU-B5-2F-04', x: 624, y: 84, isPau: false },
            { tag: 'B5M1F_AHU01', code: 'AHU-B5-1F-01', x: 274, y: 428, isPau: false },
          ].map((u) => {
            const eq = plant.equipment[u.tag];
            const isRun = eq.status === 'RUNNING';
            const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';
            const isLocal = eq.remote === false;
            return (
              <g
                key={u.tag}
                data-scada-tag={u.tag}
                transform={`translate(${u.x}, ${u.y})`}
                onClick={
                  isLocal
                    ? undefined
                    : () => openFaceplate(u.isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint', u.tag, `${u.isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint'} · ${u.code}`)
                }
                className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
              >
                <rect
                  x={-4}
                  y={-4}
                  width={76}
                  height={56}
                  rx={4}
                  fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
                  fillOpacity={0.65}
                  stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                  strokeWidth={1.6}
                  className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                />
                <image href={u.isPau ? '/scada/pau.png' : '/scada/ahu.png'} x={2} y={2} width={64} height={44} preserveAspectRatio="xMidYMid meet" />
                <IndustrialFanSvg x={61} y={8} radius={10.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
                <text x={34} y={62} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                  {u.code} · {eq.frequencyHz.toFixed(0)}Hz
                </text>
                {isLocal && <SvgLocalOverlay x={-4} y={-4} width={76} height={56} rx={4} />}
              </g>
            );
          })}

          {/* =============================================================== */}
          {/* 4. CLEANROOM & WAREHOUSE LIVE TELEMETRY PANELS                  */}
          {/* =============================================================== */}
          {renderRoomPanel('B5M2F_AHU01', 'LEAK FILL / KNN TECH', 214, 178, false)}
          {renderRoomPanel('B5M2F_AHU02', 'PRODUCTION AREA', 344, 178, false)}
          {renderRoomPanel('B5M2F_AHU03', 'SPARE PART / METRO', 474, 178, true)}
          {renderRoomPanel('B5M2F_AHU04', 'GOWNING / KNN TECH', 604, 178, true)}
          {renderRoomPanel('B5M1F_AHU01', 'RAW MATERIAL / IQC / WAREHOUSE', 242, 492, false)}

          {/* =============================================================== */}
          {/* 5. OFFICE & MEETING ROOM FCU ZONE BOXES (RIGHT SIDE fds_img_36) */}
          {/* =============================================================== */}
          {[
            { x: 786, y: 122, w: 92, title: 'MTG RM 5-MF2-2', fcus: ['FCU-B5-2F-M.04'] },
            { x: 890, y: 122, w: 92, title: 'MTG RM 5-MF2-1', fcus: ['FCU-B5-2F-M.03'] },
            { x: 994, y: 122, w: 172, title: 'OFFICE 5-MF2', fcus: ['FCU-B5-2F-M.02', 'FCU-B5-2F-M.01'] },
            { x: 786, y: 294, w: 92, title: 'REST AREA 5-2', fcus: ['FCU-B5-2F-01'] },
            { x: 890, y: 294, w: 164, title: 'OFFICE 5-2', fcus: ['FCU-B5-2F-02', 'FCU-B5-2F-03'] },
            { x: 1066, y: 294, w: 92, title: 'MEETING RM 5-2', fcus: ['FCU-B5-2F-04'] },
            { x: 1170, y: 294, w: 92, title: 'NETWORK CABLING', fcus: ['FCU-B5-2F-05'] },
            { x: 822, y: 452, w: 92, title: 'MTG RM (BMS)', fcus: ['FCU-B5-1F-M03'] },
            { x: 926, y: 452, w: 92, title: 'MANAGER RM (BMS)', fcus: ['FCU-B5-1F-M04'] },
            { x: 1030, y: 452, w: 164, title: 'OFFICE BMS', fcus: ['FCU-B5-1F-M01', 'FCU-B5-1F-M02'] },
            { x: 936, y: 572, w: 176, title: 'OFFICE 1F', fcus: ['FCU-B5-1F-01', 'FCU-B5-1F-02'] },
          ].map((zone) => (
            <g key={zone.title} transform={`translate(${zone.x}, ${zone.y})`}>
              <rect x={0} y={0} width={zone.w} height={68} rx={2} fill="#cbd5e1" fillOpacity={0.45} stroke="#475569" strokeWidth={1} />
              {zone.fcus.map((f, idx) => {
                const cx = zone.fcus.length === 1 ? zone.w / 2 : 42 + idx * 84;
                return (
                  <g key={f} transform={`translate(${cx}, 24)`}>
                    <image href="/scada/FCU.png" x={-22} y={-16} width={44} height={32} preserveAspectRatio="xMidYMid meet" />
                    <text x={0} y={24} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="800">
                      {f}
                    </text>
                  </g>
                );
              })}
              <text x={zone.w / 2} y={62} textAnchor="middle" fill="#0369a1" fontSize="7" fontFamily="monospace" fontWeight="900">
                23.5 °C · {zone.title}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
