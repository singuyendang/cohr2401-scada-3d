import React, { useState } from 'react';
import { useB5Store } from '../store/b5Store.ts';
import { PipeArrow, PipeTee, WinccPipeNetwork, WinccValveSymbol } from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

type CwTab = 'f1f2' | 'f3';

function tabForTag(tag?: string): CwTab | null {
  if (!tag) return null;
  if (tag.startsWith('B2M3F_') || tag.startsWith('B22F_PAU') || tag.startsWith('B23F_')) return 'f3';
  if (tag.startsWith('B22F_AHU') || tag.startsWith('B21F_PAU') || tag.startsWith('B21F_FCU')) return 'f1f2';
  return null;
}

/**
 * Scr_B2_CW_AHU.Pdl — Building 2 Chilled & Hot Water Distribution to 21 AHUs, 4 PAUs & 5 FCUs
 *  - Fed live from Building 5 Central Chiller Plant (B51F_CHSTS1/CHWPS1) & Heat Recovery (B51F_HSTS1)
 *  - Tab F1–F2: PAU-B2-1F-01/02 + 10× 2F AHUs (B22F_AHU01..10) + 4× 1F FCUs
 *  - Tab F3:    PAU-B2-2F-01/02 + 11× M3F AHUs (B2M3F_AHU01..11) + FCU-B2-3F-02
 *  - Every AHU/PAU features an external spinning green fan status badge & opens Fpl_AHU_DewPoint / Fpl_PAU
 */
export const B2CwAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const clearLocatedTarget = useB5Store((s) => s.clearLocatedTarget);
  const [selectedTab, setSelectedTab] = useState<CwTab>('f1f2');

  const locatedTab = locatedTarget?.screen === 'b2_cw_ahu' ? tabForTag(locatedTarget.tag) : null;
  const activeTab: CwTab = locatedTab ?? selectedTab;

  const anyChwpRun = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const hwpRun = plant.equipment['B51F_CH11HWP'].status === 'RUNNING';

  const f1f2Row1 = [
    { tag: 'B21F_PAU01', code: 'PAU-1F-01', x: 244, isPau: true },
    { tag: 'B21F_PAU02', code: 'PAU-1F-02', x: 398, isPau: true },
    { tag: 'B22F_AHU01', code: 'AHU-1F-01', x: 552, isPau: false },
    { tag: 'B22F_AHU02', code: 'AHU-1F-02', x: 706, isPau: false },
    { tag: 'B22F_AHU03', code: 'AHU-1F-03', x: 860, isPau: false },
    { tag: 'B22F_AHU04', code: 'AHU-1F-04', x: 1014, isPau: false },
    { tag: 'B22F_AHU05', code: 'AHU-2F-05', x: 1168, isPau: false },
  ];
  const f1f2Row2 = [
    { tag: 'B22F_AHU06', code: 'AHU-1F-06', x: 244, isPau: false },
    { tag: 'B22F_AHU07', code: 'AHU-1F-07', x: 398, isPau: false },
    { tag: 'B22F_AHU08', code: 'AHU-2F-08', x: 552, isPau: false },
    { tag: 'B22F_AHU09', code: 'AHU-2F-09', x: 706, isPau: false },
    { tag: 'B22F_AHU10', code: 'AHU-2F-10', x: 860, isPau: false },
  ];

  const f3Row1 = [
    { tag: 'B22F_PAU01', code: 'PAU-2F-01', x: 234, isPau: true },
    { tag: 'B22F_PAU02', code: 'PAU-2F-02', x: 382, isPau: true },
    { tag: 'B2M3F_AHU01', code: 'AHU-M3F-01', x: 530, isPau: false },
    { tag: 'B2M3F_AHU02', code: 'AHU-M3F-02', x: 678, isPau: false },
    { tag: 'B2M3F_AHU03', code: 'AHU-M3F-03', x: 826, isPau: false },
    { tag: 'B2M3F_AHU04', code: 'AHU-M3F-04', x: 974, isPau: false },
    { tag: 'B2M3F_AHU05', code: 'AHU-M3F-05', x: 1122, isPau: false },
  ];
  const f3Row2 = [
    { tag: 'B2M3F_AHU06', code: 'AHU-M3F-06', x: 234, isPau: false },
    { tag: 'B2M3F_AHU07', code: 'AHU-M3F-07', x: 382, isPau: false },
    { tag: 'B2M3F_AHU08', code: 'AHU-M3F-08', x: 530, isPau: false },
    { tag: 'B2M3F_AHU09', code: 'AHU-M3F-09', x: 678, isPau: false },
    { tag: 'B2M3F_AHU10', code: 'AHU-M3F-10', x: 826, isPau: false },
    { tag: 'B2M3F_AHU11', code: 'AHU-M3F-11', x: 974, isPau: false },
  ];

  const row1 = activeTab === 'f1f2' ? f1f2Row1 : f3Row1;
  const row2 = activeTab === 'f1f2' ? f1f2Row2 : f3Row2;
  const fcus =
    activeTab === 'f1f2'
      ? [
          { tag: 'B21F_FCU01', vTag: 'B21F_FCU01V', rt: 'B21F_FCU01RT1', code: 'FCU-1F-01', x: 998 },
          { tag: 'B21F_FCU02', vTag: 'B21F_FCU02V', rt: 'B21F_FCU02RT1', code: 'FCU-1F-02', x: 1084 },
          { tag: 'B21F_FCU03', vTag: 'B21F_FCU03V', rt: 'B21F_FCU03RT1', code: 'FCU-1F-03', x: 1170 },
          { tag: 'B21F_FCU04', vTag: 'B21F_FCU04V', rt: 'B21F_FCU04RT1', code: 'FCU-1F-04', x: 1254 },
        ]
      : [{ tag: 'B23F_FCU02', vTag: 'B23F_FCU02V', rt: 'B23F_FCU02RT1', code: 'FCU-3F-02', x: 1168 }];

  const renderUnit = (tag: string, code: string, x: number, y: number, isPau: boolean) => {
    const unit = plant.equipment[tag];
    const cfg = plant.ahus[tag];
    if (!unit || !cfg) return null;
    const sat = plant.sensors[cfg.satSensorTag];
    const rat = plant.sensors[cfg.ratSensorTag];
    const rah = plant.sensors[cfg.rahSensorTag];
    const sas = plant.sensors[cfg.sasSensorTag];
    const cwV = plant.valves[cfg.cwValveTag];
    const hwV = cfg.hwValveTag ? plant.valves[cfg.hwValveTag] : undefined;
    const isRun = unit.status === 'RUNNING';
    const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';

    return (
      <g
        key={tag}
        data-scada-tag={tag}
        transform={`translate(${x}, ${y})`}
        onClick={() => openFaceplate(isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint', tag, `${isPau ? 'Fpl_PAU' : 'Fpl_AHU_DewPoint'} · ${code}`)}
        className="cursor-pointer group"
      >
        <rect
          x={-44}
          y={-28}
          width={88}
          height={54}
          rx={4}
          fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : unit.faulted ? '#fecaca' : '#e2e8f0'}
          fillOpacity={0.68}
          stroke={unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
          strokeWidth={1.6}
          className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <image href={isPau ? '/scada/pau.png' : '/scada/ahu.png'} x={-34} y={-24} width={64} height={46} preserveAspectRatio="xMidYMid meet" />
        <IndustrialFanSvg x={33} y={-18} radius={10.5} variant="hvac" status={unit.status} faulted={unit.faulted} isBadge />
        <text x={0} y={36} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
          {code} · {unit.frequencyHz.toFixed(0)}Hz
        </text>

        {/* Compact WinCC Readout Table */}
        <g transform="translate(-54, 41)">
          <rect x={0} y={0} width={108} height={isPau ? 46 : 78} rx={2} fill="#f1f5f9" stroke="#334155" strokeWidth={1} />
          {!isPau && (
            <>
              <text x={4} y={10.5} fill="#b45309" fontSize="6.6" fontFamily="monospace" fontWeight="800">Ret Temp</text>
              <text x={104} y={10.5} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{rat.pv.toFixed(1)} °C</text>
              <text x={4} y={22} fill="#0369a1" fontSize="6.6" fontFamily="monospace" fontWeight="800">Room RH</text>
              <text x={104} y={22} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{rah.pv.toFixed(0)} %</text>
            </>
          )}
          <text x={4} y={isPau ? 12 : 34} fill="#0369a1" fontSize="6.6" fontFamily="monospace" fontWeight="800">Sup Temp</text>
          <text x={104} y={isPau ? 12 : 34} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{sat.pv.toFixed(1)} °C</text>

          <text x={4} y={isPau ? 25 : 46} fill="#0369a1" fontSize="6.6" fontFamily="monospace" fontWeight="800">Sup Press</text>
          <text x={104} y={isPau ? 25 : 46} textAnchor="end" fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="900">{sas.pv.toFixed(0)} Pa</text>

          <text x={4} y={isPau ? 38 : 58} fill="#0891b2" fontSize="6.6" fontFamily="monospace" fontWeight="800">3W CWCV</text>
          <text x={104} y={isPau ? 38 : 58} textAnchor="end" fill="#0e7490" fontSize="7" fontFamily="monospace" fontWeight="900">{cwV.positionPct.toFixed(0)} %</text>

          {!isPau && hwV && (
            <>
              <text x={4} y={70} fill="#be185d" fontSize="6.6" fontFamily="monospace" fontWeight="800">3W HWCV</text>
              <text x={104} y={70} textAnchor="end" fill="#be185d" fontSize="7" fontFamily="monospace" fontWeight="900">{hwV.positionPct.toFixed(0)} %</text>
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
            Building 2 — Advanced Optics · CW / HW Distribution to AHUs & FCUs (`Scr_B2_CW_AHU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            CHW from B5 CHSTS1: {plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} °C · CHWPS1:{' '}
            {plant.sensors['B51F_CHWPS1'].pv.toFixed(2)} bar · HW from B5 HSTS1:{' '}
            {plant.sensors['B51F_HSTS1'].pv.toFixed(1)} °C · All 21 AHUs use 3-way CWCV/HWCV valves
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-cyan-500/60 bg-[#0d1626] font-mono text-xs">
            <button
              onClick={() => {
                clearLocatedTarget();
                setSelectedTab('f1f2');
              }}
              className={`px-3 py-1 font-bold cursor-pointer transition ${
                activeTab === 'f1f2' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              F1–F2 (2 PAU · 10 AHU · 4 FCU)
            </button>
            <button
              onClick={() => {
                clearLocatedTarget();
                setSelectedTab('f3');
              }}
              className={`px-3 py-1 font-bold cursor-pointer transition ${
                activeTab === 'f3' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              F3–M3F (2 PAU · 11 AHU · 1 FCU)
            </button>
          </div>
          <StatusLegend />
        </div>
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 690" className="w-full min-w-[1100px] h-auto select-none">
          {/* Floor Elevation Guides */}
          {[
            { y: 24, label: activeTab === 'f1f2' ? '2ND FLOOR MECHANICAL LEVEL (UPPER BANK)' : 'M3F MECHANICAL LEVEL (UPPER BANK)' },
            { y: 318, label: activeTab === 'f1f2' ? '2ND FLOOR / 1ST FLOOR CLEANROOM COILS (LOWER BANK)' : 'M3F / 3RD FLOOR CLEANROOM COILS (LOWER BANK)' },
            { y: 668, label: 'MAIN RISERS FROM BUILDING 5 CHILLER & HEAT RECOVERY PLANT' },
          ].map((lvl) => (
            <g key={lvl.label}>
              <line x1={18} y1={lvl.y} x2={1305} y2={lvl.y} stroke="#475569" strokeWidth={0.9} strokeDasharray="3 3" />
              <text x={20} y={lvl.y - 4} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                {lvl.label}
              </text>
            </g>
          ))}

          {/* 1. CHILLED WATER SUPPLY (#00cfe8 — 8px) */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={8}
            segments={[
              { d: 'M 218 656 L 68 656 L 68 78', flowing: anyChwpRun },
              { d: 'M 68 78 L 1220 78', flowing: anyChwpRun },
              ...row1.map((u) => ({ d: `M ${u.x - 18} 78 L ${u.x - 18} 118`, flowing: anyChwpRun })),
              { d: 'M 68 380 L 1272 380', flowing: anyChwpRun },
              ...row2.map((u) => ({ d: `M ${u.x - 18} 380 L ${u.x - 18} 420`, flowing: anyChwpRun })),
              ...fcus.map((f) => ({ d: `M ${f.x - 10} 380 L ${f.x - 10} 454`, flowing: anyChwpRun })),
            ]}
          />
          <PipeTee x={68} y={380} color="#00cfe8" orientation="right" size={8} />

          {/* 2. CHILLED WATER RETURN (#009999 — 8px) */}
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={8}
            segments={[
              { d: 'M 218 640 L 90 640 L 90 94', flowing: anyChwpRun, reverse: true },
              { d: 'M 90 94 L 1220 94', flowing: anyChwpRun, reverse: true },
              ...row1.map((u) => ({ d: `M ${u.x - 4} 94 L ${u.x - 4} 118`, flowing: anyChwpRun })),
              { d: 'M 90 396 L 1272 396', flowing: anyChwpRun, reverse: true },
              ...row2.map((u) => ({ d: `M ${u.x - 4} 396 L ${u.x - 4} 420`, flowing: anyChwpRun })),
              ...fcus.map((f) => ({ d: `M ${f.x + 10} 396 L ${f.x + 10} 454`, flowing: anyChwpRun })),
            ]}
          />
          <PipeTee x={90} y={396} color="#009999" orientation="right" size={8} />

          {/* 3. HEAT RECOVERY HOT WATER SUPPLY (#eb9ee3) & RETURN (#e03c86) */}
          <WinccPipeNetwork
            color="#eb9ee3"
            strokeWidth={7}
            segments={[
              { d: 'M 218 616 L 116 616 L 116 42', flowing: hwpRun },
              { d: 'M 116 42 L 1220 42', flowing: hwpRun },
              ...row1.filter((u) => !u.isPau).map((u) => ({ d: `M ${u.x + 10} 42 L ${u.x + 10} 118`, flowing: hwpRun })),
              { d: 'M 116 344 L 1004 344', flowing: hwpRun },
              ...row2.map((u) => ({ d: `M ${u.x + 10} 344 L ${u.x + 10} 420`, flowing: hwpRun })),
            ]}
          />
          <PipeTee x={116} y={344} color="#eb9ee3" orientation="right" size={7} />

          <WinccPipeNetwork
            color="#e03c86"
            strokeWidth={7}
            segments={[
              { d: 'M 218 600 L 136 600 L 136 58', flowing: hwpRun, reverse: true },
              { d: 'M 136 58 L 1220 58', flowing: hwpRun, reverse: true },
              ...row1.filter((u) => !u.isPau).map((u) => ({ d: `M ${u.x + 22} 58 L ${u.x + 22} 118`, flowing: hwpRun })),
              { d: 'M 136 360 L 1004 360', flowing: hwpRun, reverse: true },
              ...row2.map((u) => ({ d: `M ${u.x + 22} 360 L ${u.x + 22} 420`, flowing: hwpRun })),
            ]}
          />
          <PipeTee x={136} y={360} color="#e03c86" orientation="right" size={7} />

          <PipeArrow x={182} y={656} dir="left" active={anyChwpRun} />
          <PipeArrow x={182} y={640} dir="right" active={anyChwpRun} />
          <PipeArrow x={182} y={616} dir="left" active={hwpRun} />
          <PipeArrow x={182} y={600} dir="right" active={hwpRun} />
          <PipeArrow x={68} y={240} dir="up" active={anyChwpRun} />
          <PipeArrow x={90} y={240} dir="down" active={anyChwpRun} />

          <text x={226} y={603} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">TO B5 HEAT RECOVERY (HW RETURN)</text>
          <text x={226} y={619} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">FROM B5 HEAT RECOVERY (HW SUPPLY)</text>
          <text x={226} y={643} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">TO B5 CHILLER PLANT (CHW RETURN)</text>
          <text x={226} y={659} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">FROM B5 CHILLER PLANT (CHW SUPPLY)</text>

          {/* 4. PAU & AHU GRAPHICS */}
          {row1.map((u) => renderUnit(u.tag, u.code, u.x, 140, u.isPau))}
          {row2.map((u) => renderUnit(u.tag, u.code, u.x, 442, u.isPau))}

          {/* 5. CLICKABLE FCU BANK + UPSTREAM MOTORIZED CHW XV VALVES */}
          {fcus.map((f) => {
            const unit = plant.equipment[f.tag];
            const valve = plant.valves[f.vTag];
            const rt = plant.sensors[f.rt];
            const isRun = unit?.status === 'RUNNING';
            const isTransit = unit?.status === 'STARTING' || unit?.status === 'STOPPING';
            return (
              <g key={f.tag}>
                {valve && (
                  <WinccValveSymbol
                    x={f.x - 10}
                    y={434}
                    valve={valve}
                    shortLabel=""
                    vertical
                    onClick={() => openFaceplate('Fpl_XVAL', f.vTag, `Fpl_XVAL · ${f.vTag} (${f.code})`)}
                  />
                )}
                <g
                  data-scada-tag={f.tag}
                  transform={`translate(${f.x}, 488)`}
                  onClick={() => openFaceplate('Fpl_DOL', f.tag, `Fpl_DOL · ${f.tag}`)}
                  className="cursor-pointer group"
                >
                  <rect
                    x={-34}
                    y={-22}
                    width={68}
                    height={44}
                    rx={4}
                    fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : unit?.faulted ? '#fecaca' : '#e2e8f0'}
                    fillOpacity={0.7}
                    stroke={unit?.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                    strokeWidth={1.5}
                    className={unit?.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                  />
                  <image href="/scada/FCU.png" x={-26} y={-16} width={52} height={34} preserveAspectRatio="xMidYMid meet" />
                  {unit && (
                    <IndustrialFanSvg
                      x={26}
                      y={-14}
                      radius={9.5}
                      variant="hvac"
                      status={unit.status}
                      faulted={unit.faulted}
                      isBadge
                    />
                  )}
                  <text x={0} y={33} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                    {f.code}
                  </text>
                  <rect x={-30} y={38} width={60} height={15} rx={2} fill="#ffffff" stroke="#334155" strokeWidth={0.9} />
                  <text x={0} y={48.5} textAnchor="middle" fill="#0369a1" fontSize="8" fontFamily="monospace" fontWeight="900">
                    {rt ? `${rt.pv.toFixed(1)} °C` : '--'}
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
