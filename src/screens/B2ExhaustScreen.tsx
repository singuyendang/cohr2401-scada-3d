import React, { useState } from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  HtmlLocalOverlay,
  PidIconButton,
  PipeArrow,
  PipeSensorBadge,
  SvgLocalOverlay,
  WinccPipeNetwork,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { statusColor } from '../components/scada/scadaColors.ts';
import { IndustrialFanSvg, IndustrialFanTileIcon } from '../components/scada/IndustrialFanIcon.tsx';

type ExhTab = 'exh1' | 'exh2' | 'aux';

function exhTabForTag(tag?: string): ExhTab | null {
  if (!tag) return null;
  if (
    ['B22F_FA11001A', 'B22F_FA11002A', 'B22F_FA11002C', 'B22F_FA11003A', 'B21F_PIT11003', 'B21F_PIT11004', 'B21F_PIT11005', 'B21F_PIT11006'].includes(tag)
  ) {
    return 'exh1';
  }
  if (['B22F_FA11004A', 'B22F_FA11004B', 'B22F_FA11005A', 'B22F_PIT11001', 'B21F_TIT11001'].includes(tag)) {
    return 'exh2';
  }
  if (tag.includes('EAF') || tag.includes('ERV') || tag.includes('PAUCT') || tag.includes('PAUO') || tag.includes('TEF')) {
    return 'aux';
  }
  return null;
}

/**
 * Scr_B2_EXH_1 / Scr_B2_EXH_2 / Scr_B2_EAF_Exhaust / Scr_B2_PAUCT — Building 2 Exhaust & Ventilation
 *  - EXH 1: 4× Process Exhaust VFDs (FA-11001A Acid, FA-11002A/02C Solvent, FA-11003A Grinding) + PIT11003..06
 *  - EXH 2: 3× Process Exhaust VFDs (FA-11004A/04B Heat, FA-11005A General) + PIT11001 & TIT11001
 *  - EAF / ERV / PAUCT / TEF: All 21 verified DOL auxiliary ventilation fans
 */
export const B2ExhaustScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const clearLocatedTarget = useB5Store((s) => s.clearLocatedTarget);
  const [selectedTab, setSelectedTab] = useState<ExhTab>('exh1');

  const locatedTab = locatedTarget?.screen === 'b2_exh' ? exhTabForTag(locatedTarget.tag) : null;
  const activeTab: ExhTab = locatedTab ?? selectedTab;

  const renderExhaustFan = (tag: string, shortName: string, pidTag: string, x: number, y: number) => {
    const unit = plant.equipment[tag];
    const isRun = unit.status === 'RUNNING';
    const isLocal = unit.remote === false;
    const col = statusColor(unit.status);

    return (
      <g key={tag} transform={`translate(${x}, ${y})`}>
        <g
          data-scada-tag={tag}
          onClick={isLocal ? undefined : () => openFaceplate('Fpl_VFD', tag, `Fpl_VFD · ${tag}`)}
          className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
        >
          <text x={0} y={-24} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            {shortName}
          </text>
          <IndustrialFanSvg x={0} y={0} radius={19} variant="exhaust" status={unit.status} faulted={unit.faulted} />

          <g transform="translate(-38, 22)">
            <rect x={0} y={0} width={11} height={13} fill={col} stroke="#0f172a" strokeWidth={0.9} />
            <text x={5.5} y={10} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
              {isRun ? '1' : '0'}
            </text>
            <rect x={12} y={0} width={12} height={13} fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'} stroke="#0f172a" strokeWidth={0.9} />
            <text x={18} y={10} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
              {unit.mode === 'AUTO' ? 'A' : 'M'}
            </text>
            <rect x={25} y={0} width={38} height={13} fill="#4ade80" stroke="#0f172a" strokeWidth={0.9} />
            <text x={44} y={10} textAnchor="middle" fill="#052e16" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              {unit.frequencyHz.toFixed(1)}
            </text>
            <text x={66} y={10} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">Hz</text>
          </g>
          {isLocal && <SvgLocalOverlay x={-38} y={-20} width={78} height={56} rx={4} />}
        </g>

        <PidIconButton
          x={52}
          y={-10}
          labelSide="none"
          onClick={() => openFaceplate('Fpl_PID', pidTag, `Fpl_PID · ${pidTag}`)}
        />
      </g>
    );
  };

  const exh1Lines = [
    {
      y: 96,
      fanTag: 'B22F_FA11001A',
      short: 'FA-11001A',
      sensor: 'B21F_PIT11003',
      title: 'ACID / CLEANING LINE EXHAUST (1F & 3F)',
      tools: ['ACID WET BENCH', 'ULTRASONIC CLEAN', 'DI RINSE STATION', 'CHEM CABINETS'],
    },
    {
      y: 232,
      fanTag: 'B22F_FA11002A',
      short: 'FA-11002A',
      sensor: 'B21F_PIT11004',
      title: 'SOLVENT LINE A EXHAUST (COATING & WAX)',
      tools: ['COATING CHAMBER 1', 'COATING CHAMBER 2', 'WAX CLEAN LINE', 'SOLVENT HOOD A'],
    },
    {
      y: 368,
      fanTag: 'B22F_FA11002C',
      short: 'FA-11002C',
      sensor: 'B21F_PIT11005',
      title: 'SOLVENT LINE C EXHAUST (OPTICAL MOUNTING)',
      tools: ['COATING CHAMBER 3', 'HAND CLEANING RM', 'OPTICAL MOUNTING', 'SOLVENT HOOD C'],
    },
    {
      y: 504,
      fanTag: 'B22F_FA11003A',
      short: 'FA-11003A',
      sensor: 'B21F_PIT11006',
      title: 'GRINDING & SAND BLASTING EXHAUST',
      tools: ['DISCO DICING RM', 'GRINDING AREA 1', 'GRINDING AREA 2', 'SAND BLASTING'],
    },
  ];

  const exh2Lines = [
    {
      y: 120,
      fanTag: 'B22F_FA11004A',
      short: 'FA-11004A',
      title: 'HEAT / OVEN EXHAUST BRANCH A',
      tools: ['CURING OVEN 1–2', 'BAKE STATION A', 'COATING THERMAL A'],
    },
    {
      y: 296,
      fanTag: 'B22F_FA11004B',
      short: 'FA-11004B',
      title: 'HEAT / OVEN EXHAUST BRANCH B',
      tools: ['CURING OVEN 3–4', 'BAKE STATION B', 'COATING THERMAL B'],
    },
    {
      y: 472,
      fanTag: 'B22F_FA11005A',
      short: 'FA-11005A',
      title: 'GENERAL PROCESS EXHAUST BRANCH',
      tools: ['CNC AREA 1–3', 'POLISHING AREA', 'ASSEMBLY WORKSHOP'],
    },
  ];

  const auxGroups = [
    {
      title: 'General Exhaust Fans (EAF — 1F & 2F)',
      tags: ['B21F_EAF01', 'B21F_EAF02', 'B21F_EAF03', 'B22F_EAF01', 'B22F_EAF02'],
    },
    {
      title: 'Energy Recovery Ventilators (ERV — 2F)',
      tags: ['B22F_ERV01', 'B22F_ERV02', 'B22F_ERV03', 'B22F_ERV04'],
    },
    {
      title: 'Clean Tunnel & Office Fresh Air Units (PAUCT / PAUO — 2F)',
      tags: ['B22F_PAUCT01', 'B22F_PAUCT02', 'B22F_PAUCT03', 'B22F_PAUCT04', 'B22F_PAUO01'],
    },
    {
      title: 'Toilet Exhaust Fans (TEF — 1F, 2F & 3F)',
      tags: ['B21F_TEF01', 'B21F_TEF02', 'B22F_TEF01', 'B22F_TEF02', 'B22F_TEF03', 'B23F_TEF01', 'B23F_TEF02'],
    },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — Advanced Optics · Process Exhaust & Ventilation (`Scr_B2_EXH`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            EXH 1: PIT11003..06 ({plant.sensors['B21F_PIT11003'].pv.toFixed(2)} / {plant.sensors['B21F_PIT11004'].pv.toFixed(2)} /{' '}
            {plant.sensors['B21F_PIT11005'].pv.toFixed(2)} / {plant.sensors['B21F_PIT11006'].pv.toFixed(2)} kPa) · EXH 2: PIT11001{' '}
            {plant.sensors['B22F_PIT11001'].pv.toFixed(2)} kPa / TIT11001 {plant.sensors['B21F_TIT11001'].pv.toFixed(1)} °C
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-cyan-500/60 bg-[#0d1626] font-mono text-xs">
            {(
              [
                ['exh1', 'EXH 1 (FA-11001A..03A)'],
                ['exh2', 'EXH 2 (FA-11004A..05A)'],
                ['aux', 'EAF / ERV / PAUCT / TEF (21)'],
              ] as const
            ).map(([id, lbl]) => (
              <button
                key={id}
                onClick={() => {
                  clearLocatedTarget();
                  setSelectedTab(id);
                }}
                className={`px-3 py-1 font-bold cursor-pointer transition ${
                  activeTab === id ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <StatusLegend />
        </div>
      </div>

      {activeTab === 'exh1' && (
        <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
          <svg viewBox="0 0 1320 600" className="w-full min-w-[1100px] h-auto select-none">
            <WinccPipeNetwork
              color="#dc2626"
              strokeWidth={8}
              segments={exh1Lines.map((ln) => ({
                d: `M 42 ${ln.y} L 1252 ${ln.y}`,
                flowing: plant.equipment[ln.fanTag].status === 'RUNNING',
              }))}
            />
            <WinccPipeNetwork
              color="#dc2626"
              strokeWidth={5.5}
              segments={exh1Lines.flatMap((ln) =>
                [146, 336, 526, 716].map((tx) => ({
                  d: `M ${tx} ${ln.y} L ${tx} ${ln.y + 34}`,
                  flowing: plant.equipment[ln.fanTag].status === 'RUNNING',
                }))
              )}
            />

            {exh1Lines.map((ln) => {
              const isRun = plant.equipment[ln.fanTag].status === 'RUNNING';
              return (
                <g key={ln.fanTag}>
                  <text x={44} y={ln.y - 12} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                    {ln.title}
                  </text>
                  <PipeArrow x={1020} y={ln.y} dir="right" active={isRun} />
                  <PipeArrow x={1224} y={ln.y} dir="right" active={isRun} />

                  {ln.tools.map((tool, i) => {
                    const tx = 80 + i * 190;
                    return (
                      <g key={tool} transform={`translate(${tx}, ${ln.y + 32})`}>
                        <rect x={0} y={0} width={132} height={24} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1} />
                        <text x={66} y={15} textAnchor="middle" fill="#0f172a" fontSize="7.4" fontFamily="monospace" fontWeight="800">
                          {tool}
                        </text>
                      </g>
                    );
                  })}

                  <PipeSensorBadge
                    x={914}
                    y={ln.y}
                    sensor={plant.sensors[ln.sensor]}
                    shortLabel={ln.sensor}
                    stemDir="top"
                    labelPos="bottom"
                    onClick={() => openFaceplate('Fpl_Sensor', ln.sensor, `Fpl_PIT_kPa · ${ln.sensor}`)}
                  />
                  {renderExhaustFan(ln.fanTag, ln.short, `${ln.fanTag}_PID`, 1126, ln.y)}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {activeTab === 'exh2' && (
        <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
          <svg viewBox="0 0 1320 585" className="w-full min-w-[1100px] h-auto select-none">
            <WinccPipeNetwork
              color="#dc2626"
              strokeWidth={8}
              segments={[
                ...exh2Lines.map((ln) => ({
                  d: `M 42 ${ln.y} L 1252 ${ln.y}`,
                  flowing: plant.equipment[ln.fanTag].status === 'RUNNING',
                })),
                // Common manifold tie linking the 3 EXH-2 headers to B22F_PIT11001
                {
                  d: 'M 848 120 L 848 472',
                  flowing: exh2Lines.some((ln) => plant.equipment[ln.fanTag].status === 'RUNNING'),
                },
              ]}
            />
            <WinccPipeNetwork
              color="#dc2626"
              strokeWidth={5.5}
              segments={exh2Lines.flatMap((ln) =>
                [170, 410, 650].map((tx) => ({
                  d: `M ${tx} ${ln.y} L ${tx} ${ln.y + 38}`,
                  flowing: plant.equipment[ln.fanTag].status === 'RUNNING',
                }))
              )}
            />

            {exh2Lines.map((ln) => {
              const isRun = plant.equipment[ln.fanTag].status === 'RUNNING';
              return (
                <g key={ln.fanTag}>
                  <text x={44} y={ln.y - 12} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
                    {ln.title}
                  </text>
                  <PipeArrow x={1010} y={ln.y} dir="right" active={isRun} />
                  <PipeArrow x={1224} y={ln.y} dir="right" active={isRun} />

                  {ln.tools.map((tool, i) => {
                    const tx = 86 + i * 240;
                    return (
                      <g key={tool} transform={`translate(${tx}, ${ln.y + 36})`}>
                        <rect x={0} y={0} width={168} height={26} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1} />
                        <text x={84} y={16} textAnchor="middle" fill="#0f172a" fontSize="7.8" fontFamily="monospace" fontWeight="800">
                          {tool}
                        </text>
                      </g>
                    );
                  })}

                  {renderExhaustFan(ln.fanTag, ln.short, `${ln.fanTag}_PID`, 1126, ln.y)}
                </g>
              );
            })}

            {/* Common Header Sensors: B22F_PIT11001 & B21F_TIT11001 */}
            <PipeSensorBadge
              x={924}
              y={296}
              sensor={plant.sensors['B22F_PIT11001']}
              shortLabel="B22F_PIT11001"
              stemDir="top"
              labelPos="bottom"
              onClick={() => openFaceplate('Fpl_Sensor', 'B22F_PIT11001', 'Fpl_PIT_kPa · B22F_PIT11001 (EXH-2 Common)')}
            />
            <PipeSensorBadge
              x={924}
              y={120}
              sensor={plant.sensors['B21F_TIT11001']}
              shortLabel="B21F_TIT11001"
              stemDir="top"
              labelPos="bottom"
              onClick={() => openFaceplate('Fpl_Sensor', 'B21F_TIT11001', 'Fpl_TIT · B21F_TIT11001 (Oven Duct Temp)')}
            />
          </svg>
        </div>
      )}

      {activeTab === 'aux' && (
        <div className="space-y-3">
          {auxGroups.map((grp) => (
            <div key={grp.title} className="bg-[#101c30] border border-[#223552] rounded-lg p-3 space-y-2">
              <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase">{grp.title}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
                {grp.tags.map((tag) => {
                  const u = plant.equipment[tag];
                  if (!u) return null;
                  const isRun = u.status === 'RUNNING';
                  const isTransit = u.status === 'STARTING' || u.status === 'STOPPING';
                  const isLocal = u.remote === false;
                  return (
                    <button
                      key={tag}
                      data-scada-tag={tag}
                      onClick={isLocal ? undefined : () => openFaceplate('Fpl_DOL', tag, `Fpl_DOL · ${tag}`)}
                      className={`relative p-2.5 rounded-md border text-left transition flex items-center gap-2.5 ${
                        isLocal ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-125'
                      } ${
                        u.faulted
                          ? 'bg-red-950/60 border-red-500 animate-alarm-flash'
                          : isRun
                          ? 'bg-emerald-950/40 border-emerald-500/70'
                          : isTransit
                          ? 'bg-blue-950/50 border-blue-500'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    >
                      {isLocal && <HtmlLocalOverlay size="md" />}
                      <IndustrialFanTileIcon variant="exhaust" status={u.status} faulted={u.faulted} />

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between font-bold text-white text-[11px]">
                          <span className="truncate">{tag}</span>
                          <span className="text-cyan-300 shrink-0">{u.mode === 'AUTO' ? 'A' : 'M'}</span>
                        </div>
                        <div className="text-[9.5px] text-slate-400 truncate">{u.label}</div>
                        <div className="mt-1 flex justify-between text-[10.5px]">
                          <span
                            className={
                              u.faulted
                                ? 'text-red-400 font-bold'
                                : isRun
                                ? 'text-emerald-400 font-bold'
                                : isTransit
                                ? 'text-blue-400 font-bold'
                                : 'text-slate-400'
                            }
                          >
                            {u.status}
                          </span>
                          <span className="text-slate-200 font-bold">DOL · {u.ratedKw} kW</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
