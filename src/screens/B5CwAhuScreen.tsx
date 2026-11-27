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
 * Scr_B5_CW_AHU.Pdl — Chilled & Hot Water Distribution to AHUs, PAU & FCUs (Faithful to fds_img_35.png)
 *  - Authentic floor elevation bands: ROOF, 2ND MEZZ, 2ND LEVEL, 1ST MEZZ, 1ST LEVEL
 *  - Separate CHW Supply (#00cfe8), CHW Return (#009999), HW Supply (#eb9ee3), HW Return (#e03c86) risers
 *  - Authentic WinCC assets: /scada/pau.png, /scada/ahu.png, /scada/FCU.png
 *  - Click any AHU/PAU -> opens Fpl_AHU_DewPoint / Fpl_PAU (3-way CWCV/HWCV valves + PIDs)
 */
export const B5CwAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyChwpRun = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const hwpRun = plant.equipment['B51F_CH11HWP'].status === 'RUNNING';

  const topUnits = [
    { tag: 'B5M2F_PAU01', code: 'PAU-B5-2F-01', x: 266, isPau: true },
    { tag: 'B5M2F_AHU03', code: 'AHU-B5-2F-03', x: 376, isPau: false },
    { tag: 'B5M2F_AHU02', code: 'AHU-B5-2F-02', x: 472, isPau: false },
    { tag: 'B5M2F_AHU01', code: 'AHU-B5-2F-01', x: 568, isPau: false },
    { tag: 'B5M2F_AHU04', code: 'AHU-B5-2F-04', x: 664, isPau: false },
  ];

  const fcuRows = [
    { yPipeSup: 88, yPipeRet: 104, yUnit: 158, labels: ['FCU-B5-2F-M.05', 'FCU-B5-2F-M.04', 'FCU-B5-2F-M.03', 'FCU-B5-2F-M.02', 'FCU-B5-2F-M.01'], startX: 834, step: 92 },
    { yPipeSup: 256, yPipeRet: 272, yUnit: 324, labels: ['FCU-B5-2F-01', 'FCU-B5-2F-02', 'FCU-B5-2F-03', 'FCU-B5-2F-04', 'FCU-B5-2F-05', 'AHU-B5-2F-06'], startX: 822, step: 82 },
    { yPipeSup: 404, yPipeRet: 420, yUnit: 486, labels: ['FCU-B5-1F-M03', 'FCU-B5-1F-M04', 'FCU-B5-1F-M06', 'FCU-B5-1F-M05'], startX: 866, step: 96 },
    { yPipeSup: 562, yPipeRet: 578, yUnit: 634, labels: ['FCU-B5-1F-01', 'FCU-B5-1F-02'], startX: 984, step: 102 },
  ];

  const renderUnitReadout = (tag: string, code: string, x: number, y: number, isPau: boolean) => {
    const unit = plant.equipment[tag];
    const cfg = plant.ahus[tag];
    const sat = plant.sensors[cfg.satSensorTag];
    const rat = plant.sensors[cfg.ratSensorTag];
    const rah = plant.sensors[cfg.rahSensorTag];
    const sas = plant.sensors[cfg.sasSensorTag];
    const cwV = plant.valves[cfg.cwValveTag];
    const hwV = cfg.hwValveTag ? plant.valves[cfg.hwValveTag] : undefined;
    const isRun = unit.status === 'RUNNING';
    const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';
    const isLocal = unit.remote === false;

    return (
      <g
        key={tag}
        data-scada-tag={tag}
        transform={`translate(${x}, ${y})`}
        onClick={
          isLocal
            ? undefined
            : () => openFaceplate(isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint', tag, `${isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint'} · ${code}`)
        }
        className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
      >
        {/* Status halo behind authentic WinCC image */}
        <rect
          x={-36}
          y={-28}
          width={72}
          height={54}
          rx={4}
          fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : unit.faulted ? '#fecaca' : '#e2e8f0'}
          fillOpacity={0.65}
          stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
          strokeWidth={1.6}
          className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <image href={isPau ? '/scada/pau.png' : '/scada/ahu.png'} x={-32} y={-24} width={64} height={46} preserveAspectRatio="xMidYMid meet" />
        {/* Industrial 6-Blade HVAC Fan Status Badge (1.5s RUN / 3.2s Blue START-STOP) */}
        <IndustrialFanSvg x={26} y={-18} radius={10.5} variant="hvac" status={unit.status} faulted={unit.faulted} isBadge />
        {isLocal && <SvgLocalOverlay x={-36} y={-28} width={72} height={54} rx={4} />}
        <text x={0} y={36} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
          {code}
        </text>

        {/* WinCC Compact Readout Table underneath AHU/PAU (fds_img_35.png) */}
        <g transform="translate(-44, 41)">
          <rect x={0} y={0} width={88} height={isPau ? 42 : 76} rx={2} fill="#f1f5f9" stroke="#334155" strokeWidth={1} />
          {!isPau && (
            <>
              <text x={4} y={10} fill="#b45309" fontSize="6.5" fontFamily="monospace" fontWeight="800">Ret Temp</text>
              <text x={84} y={10} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{rat.pv.toFixed(1)} °C</text>
              <text x={4} y={21} fill="#0369a1" fontSize="6.5" fontFamily="monospace" fontWeight="800">Room RH</text>
              <text x={84} y={21} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{rah.pv.toFixed(0)} %</text>
            </>
          )}
          <text x={4} y={isPau ? 11 : 33} fill="#0369a1" fontSize="6.5" fontFamily="monospace" fontWeight="800">Sup Temp</text>
          <text x={84} y={isPau ? 11 : 33} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{sat.pv.toFixed(1)} °C</text>

          <text x={4} y={isPau ? 23 : 45} fill="#0369a1" fontSize="6.5" fontFamily="monospace" fontWeight="800">Sup Press</text>
          <text x={84} y={isPau ? 23 : 45} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{sas.pv.toFixed(0)} Pa</text>

          <text x={4} y={isPau ? 35 : 57} fill="#0891b2" fontSize="6.5" fontFamily="monospace" fontWeight="800">3W CWCV</text>
          <text x={84} y={isPau ? 35 : 57} textAnchor="end" fill="#0e7490" fontSize="7" fontFamily="monospace" fontWeight="900">{cwV.positionPct.toFixed(0)} %</text>

          {!isPau && hwV && (
            <>
              <text x={4} y={69} fill="#be185d" fontSize="6.5" fontFamily="monospace" fontWeight="800">3W HWCV</text>
              <text x={84} y={69} textAnchor="end" fill="#be185d" fontSize="7" fontFamily="monospace" fontWeight="900">{hwV.positionPct.toFixed(0)} %</text>
            </>
          )}
        </g>
      </g>
    );
  };

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · CW / HW Distribution to AHUs & FCUs (`Scr_B5_CW_AHU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            CHW Supply CHSTS1: {plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} °C · CHWPS1:{' '}
            {plant.sensors['B51F_CHWPS1'].pv.toFixed(2)} bar · HW Supply HSTS1:{' '}
            {plant.sensors['B51F_HSTS1'].pv.toFixed(1)} °C · All AHU CWCV/HWCV are 3-way bypass valves
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_35.png */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 700" className="w-full min-w-[1100px] h-auto select-none">
          {/* Floor Elevation Guides */}
          {[
            { y: 24, label: 'ROOF LEVEL' },
            { y: 242, label: '2ND MEZZ. LEVEL' },
            { y: 378, label: '2ND LEVEL' },
            { y: 552, label: '1ST MEZZ. LEVEL' },
            { y: 682, label: '1ST LEVEL' },
          ].map((lvl) => (
            <g key={lvl.label}>
              <line x1={18} y1={lvl.y} x2={1305} y2={lvl.y} stroke="#475569" strokeWidth={0.9} strokeDasharray="3 3" />
              <text x={20} y={lvl.y - 4} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                {lvl.label}
              </text>
            </g>
          ))}

          {/* =============================================================== */}
          {/* 1. CHILLED WATER SUPPLY (BRIGHT CYAN #00cfe8 — 8px)             */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={8}
            segments={[
              // Far-left main CHW Supply riser from Chiller Area
              { d: 'M 218 670 L 82 670 L 82 28', flowing: anyChwpRun },
              // 2nd Mezzanine CHW Supply header feeding PAU & 4 AHUs
              { d: 'M 82 88 L 714 88', flowing: anyChwpRun },
              ...topUnits.map((u) => ({ d: `M ${u.x - 16} 88 L ${u.x - 16} 118`, flowing: anyChwpRun })),
              // 1st Mezzanine CHW Supply header -> AHU-B5-1F-01 + right FCU vertical riser (x=1274)
              { d: 'M 82 404 L 1274 404', flowing: anyChwpRun },
              { d: 'M 332 404 L 332 436', flowing: anyChwpRun },
              // Right FCU Supply Riser (x=1274) & 4 Floor FCU Branches
              { d: 'M 1274 48 L 1274 562', flowing: anyChwpRun },
              { d: 'M 1274 88 L 774 88', flowing: anyChwpRun },
              { d: 'M 1274 256 L 774 256', flowing: anyChwpRun },
              { d: 'M 1274 562 L 774 562', flowing: anyChwpRun },
              // FCU vertical drops
              ...fcuRows.flatMap((row) =>
                row.labels.map((_, i) => ({
                  d: `M ${row.startX + i * row.step - 8} ${row.yPipeSup} L ${row.startX + i * row.step - 8} ${row.yUnit}`,
                  flowing: anyChwpRun,
                }))
              ),
            ]}
          />
          <PipeTee x={82} y={88} color="#00cfe8" orientation="right" size={8} />
          <PipeTee x={82} y={404} color="#00cfe8" orientation="right" size={8} />
          <PipeTee x={1274} y={88} color="#00cfe8" orientation="left" size={8} />
          <PipeTee x={1274} y={256} color="#00cfe8" orientation="left" size={8} />
          <PipeTee x={1274} y={404} color="#00cfe8" orientation="left" size={8} />

          {/* =============================================================== */}
          {/* 2. CHILLED WATER RETURN (DARK TEAL #009999 — 8px)               */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={8}
            segments={[
              { d: 'M 218 654 L 104 654 L 104 28', flowing: anyChwpRun, reverse: true },
              { d: 'M 104 104 L 714 104', flowing: anyChwpRun, reverse: true },
              ...topUnits.map((u) => ({ d: `M ${u.x - 4} 104 L ${u.x - 4} 118`, flowing: anyChwpRun })),
              { d: 'M 104 420 L 1258 420', flowing: anyChwpRun, reverse: true },
              { d: 'M 344 420 L 344 436', flowing: anyChwpRun },
              { d: 'M 1258 48 L 1258 578', flowing: anyChwpRun },
              { d: 'M 1258 104 L 774 104', flowing: anyChwpRun, reverse: true },
              { d: 'M 1258 272 L 774 272', flowing: anyChwpRun, reverse: true },
              { d: 'M 1258 578 L 774 578', flowing: anyChwpRun, reverse: true },
              ...fcuRows.flatMap((row) =>
                row.labels.map((_, i) => ({
                  d: `M ${row.startX + i * row.step + 8} ${row.yPipeRet} L ${row.startX + i * row.step + 8} ${row.yUnit}`,
                  flowing: anyChwpRun,
                }))
              ),
            ]}
          />
          <PipeTee x={104} y={104} color="#009999" orientation="right" size={8} />
          <PipeTee x={104} y={420} color="#009999" orientation="right" size={8} />
          <PipeTee x={1258} y={104} color="#009999" orientation="left" size={8} />
          <PipeTee x={1258} y={272} color="#009999" orientation="left" size={8} />
          <PipeTee x={1258} y={420} color="#009999" orientation="left" size={8} />

          {/* =============================================================== */}
          {/* 3. HEAT RECOVERY HOT WATER SUPPLY (#eb9ee3) & RETURN (#e03c86)  */}
          {/* Serves AHU 3-Way HWCV Reheat Coils ONLY (Not PAU, Not FCUs!)    */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#eb9ee3"
            strokeWidth={7}
            segments={[
              { d: 'M 218 630 L 130 630 L 130 34', flowing: hwpRun },
              { d: 'M 130 50 L 714 50', flowing: hwpRun },
              ...topUnits.filter((u) => !u.isPau).map((u) => ({ d: `M ${u.x + 12} 50 L ${u.x + 12} 118`, flowing: hwpRun })),
              { d: 'M 130 364 L 714 364', flowing: hwpRun },
              { d: 'M 360 364 L 360 436', flowing: hwpRun },
            ]}
          />
          <PipeTee x={130} y={50} color="#eb9ee3" orientation="right" size={7} />
          <PipeTee x={130} y={364} color="#eb9ee3" orientation="right" size={7} />

          <WinccPipeNetwork
            color="#e03c86"
            strokeWidth={7}
            segments={[
              { d: 'M 218 614 L 150 614 L 150 34', flowing: hwpRun, reverse: true },
              { d: 'M 150 66 L 714 66', flowing: hwpRun, reverse: true },
              ...topUnits.filter((u) => !u.isPau).map((u) => ({ d: `M ${u.x + 22} 66 L ${u.x + 22} 118`, flowing: hwpRun })),
              { d: 'M 150 380 L 714 380', flowing: hwpRun, reverse: true },
              { d: 'M 370 380 L 370 436', flowing: hwpRun },
            ]}
          />
          <PipeTee x={150} y={66} color="#e03c86" orientation="right" size={7} />
          <PipeTee x={150} y={380} color="#e03c86" orientation="right" size={7} />

          {/* Directional Flow Arrows & Chiller Area Labels */}
          <PipeArrow x={188} y={670} dir="right" active={anyChwpRun} />
          <PipeArrow x={188} y={654} dir="left" active={anyChwpRun} />
          <PipeArrow x={188} y={630} dir="right" active={hwpRun} />
          <PipeArrow x={188} y={614} dir="left" active={hwpRun} />
          <PipeArrow x={82} y={294} dir="up" active={anyChwpRun} />
          <PipeArrow x={104} y={294} dir="down" active={anyChwpRun} />
          <PipeArrow x={612} y={404} dir="right" active={anyChwpRun} />
          <PipeArrow x={612} y={420} dir="left" active={anyChwpRun} />

          <text x={228} y={617} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">FROM CHILLER AREA (HR HOT)</text>
          <text x={228} y={633} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">TO CHILLER AREA (HR RETURN)</text>
          <text x={228} y={657} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">FROM CHILLER AREA (CHW SUPPLY)</text>
          <text x={228} y={673} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">TO CHILLER AREA (CHW RETURN)</text>

          {/* =============================================================== */}
          {/* 4. AUTHENTIC WINCC PAU & AHUs (CLICKABLE FACEPLATES!)           */}
          {/* =============================================================== */}
          {topUnits.map((u) => renderUnitReadout(u.tag, u.code, u.x, 134, u.isPau))}
          {renderUnitReadout('B5M1F_AHU01', 'AHU-B5-1F-01', 350, 456, false)}

          {/* =============================================================== */}
          {/* 5. AUTHENTIC WINCC FCU BANKS ON RIGHT (/scada/FCU.png)          */}
          {/* =============================================================== */}
          {fcuRows.map((row, rIdx) =>
            row.labels.map((lbl, i) => {
              const fx = row.startX + i * row.step;
              return (
                <g key={`fcu-${rIdx}-${i}`} transform={`translate(${fx}, ${row.yUnit})`}>
                  <image href="/scada/FCU.png" x={-26} y={-14} width={52} height={36} preserveAspectRatio="xMidYMid meet" />
                  <text x={0} y={30} textAnchor="middle" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">
                    {lbl}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};
