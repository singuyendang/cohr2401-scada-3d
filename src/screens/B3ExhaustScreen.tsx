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

type B3ExhTab = 'process' | 'aux';

function tabForB3ExhTag(tag?: string): B3ExhTab | null {
  if (!tag) return null;
  if (tag.includes('FA111') || tag.includes('PIT111')) return 'process';
  if (tag.includes('EAF') || tag.includes('TEF')) return 'aux';
  return null;
}

/**
 * Scr_B3_EXH.Pdl & Scr_B3_EAF_Exhaust.Pdl — Building 3 Process & Auxiliary Exhaust
 *  - Process Exhaust Tab:
 *      * B3M1F_FA11101A (VFD + PID tracking B3M1F_PIT11101) — Acid / Wet Bench Scrubber
 *      * B3M1F_FA11102A (VFD + PID tracking B3M1F_PIT11102) — Solvent / Cleanse
 *      * B3M1F_FA11103A (DOL) — Chemical Room Exhaust
 *  - EAF / TEF Tab:
 *      * B31F_EAF01..05 (DOL) & B31F_TEF01 (DOL) — all animated with coaxial Mẫu 2 Industrial Fans
 */
export const B3ExhaustScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const clearLocatedTarget = useB5Store((s) => s.clearLocatedTarget);
  const [selectedTab, setSelectedTab] = useState<B3ExhTab>('process');

  const locatedTab = locatedTarget?.screen === 'b3_exh' ? tabForB3ExhTag(locatedTarget.tag) : null;
  const activeTab: B3ExhTab = locatedTab ?? selectedTab;

  const lines = [
    {
      y: 108,
      fanTag: 'B3M1F_FA11101A',
      short: 'FA-11101A (VFD)',
      isVfd: true,
      pidTag: 'B3M1F_FA11101A_PID',
      sensorTag: 'B3M1F_PIT11101',
      title: 'ACID / WET BENCH PROCESS EXHAUST (SCRUBBER HEADER)',
      tools: ['WET BENCH 1', 'WET BENCH 2', 'WET BENCH 3', 'WET BENCH 4'],
    },
    {
      y: 268,
      fanTag: 'B3M1F_FA11102A',
      short: 'FA-11102A (VFD)',
      isVfd: true,
      pidTag: 'B3M1F_FA11102A_PID',
      sensorTag: 'B3M1F_PIT11102',
      title: 'SOLVENT / CLEANSE ROOM PROCESS EXHAUST',
      tools: ['CLEANSE STATION A', 'CLEANSE STATION B', 'SOLVENT HOOD 1', 'DI RINSE HOOD'],
    },
    {
      y: 428,
      fanTag: 'B3M1F_FA11103A',
      short: 'FA-11103A (DOL)',
      isVfd: false,
      pidTag: '',
      sensorTag: '',
      title: 'CHEMICAL STORAGE & MATERIAL ROOM EXHAUST (FIXED SPEED DOL)',
      tools: ['CHEMICAL STORAGE', 'ACID CABINET', 'SOLVENT CABINET', 'MATERIAL PREP'],
    },
  ];

  const auxGroups = [
    {
      title: 'General Exhaust Fans (EAF — 1st Floor)',
      tags: ['B31F_EAF01', 'B31F_EAF02', 'B31F_EAF03', 'B31F_EAF04', 'B31F_EAF05'],
    },
    {
      title: 'Toilet Exhaust Fan (TEF — 1st Floor)',
      tags: ['B31F_TEF01'],
    },
  ];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Process &amp; General Exhaust System (`Scr_B3_EXH.Pdl` · `FA-11101A/02A/03A + EAF/TEF`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            FA-11101A/02A VFD PID Exhaust + FA-11103A DOL + 5× EAF &amp; TEF-01 · Standardized Coaxial 6-Blade Industrial Fans
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded border border-[#334155] overflow-hidden text-xs font-mono">
            <button
              onClick={() => {
                if (locatedTarget) clearLocatedTarget();
                setSelectedTab('process');
              }}
              className={`px-3 py-1 font-bold cursor-pointer ${
                activeTab === 'process' ? 'bg-rose-600 text-white' : 'bg-[#101c30] text-slate-300 hover:bg-[#1a2c4a]'
              }`}
            >
              Process EXH (FA-11101..03)
            </button>
            <button
              onClick={() => {
                if (locatedTarget) clearLocatedTarget();
                setSelectedTab('aux');
              }}
              className={`px-3 py-1 font-bold cursor-pointer ${
                activeTab === 'aux' ? 'bg-rose-600 text-white' : 'bg-[#101c30] text-slate-300 hover:bg-[#1a2c4a]'
              }`}
            >
              EAF / TEF (6 Fans)
            </button>
          </div>
          <StatusLegend />
        </div>
      </div>

      {activeTab === 'process' ? (
        <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
          <svg viewBox="0 0 1200 520" className="w-full min-w-[980px] h-auto select-none">
            {lines.map((line) => {
              const unit = plant.equipment[line.fanTag];
              const isRun = unit.status === 'RUNNING';
              const col = statusColor(unit.status);
              const sensor = line.sensorTag ? plant.sensors[line.sensorTag] : null;

              return (
                <g key={line.fanTag}>
                  <text x={36} y={line.y - 44} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                    {line.title}
                  </text>

                  {/* Red Exhaust Ductwork */}
                  <WinccPipeNetwork
                    color="#ef4444"
                    strokeWidth={12}
                    segments={[
                      { d: `M 72 ${line.y} L 916 ${line.y}`, flowing: isRun },
                      { d: `M 956 ${line.y} L 1140 ${line.y} L 1140 ${line.y - 36}`, flowing: isRun },
                    ]}
                  />
                  <PipeArrow x={410} y={line.y} dir="right" active={isRun} />
                  <PipeArrow x={730} y={line.y} dir="right" active={isRun} />
                  <PipeArrow x={1075} y={line.y} dir="right" active={isRun} />

                  {/* Roof Stack Label */}
                  <text x={1140} y={line.y - 44} textAnchor="middle" fill="#7f1d1d" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                    ROOF STACK
                  </text>

                  {/* Tool / Room Extraction Hoods */}
                  {line.tools.map((tool, i) => {
                    const tx = 132 + i * 150;
                    return (
                      <g key={tool} transform={`translate(${tx}, ${line.y + 18})`}>
                        <line x1={0} y1={-18} x2={0} y2={0} stroke="#450a0a" strokeWidth={5} />
                        <rect x={-62} y={0} width={124} height={24} rx={3} fill="#e2e8f0" stroke="#475569" strokeWidth={1.1} />
                        <text x={0} y={15} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
                          {tool}
                        </text>
                      </g>
                    );
                  })}

                  {/* Duct Static Pressure Transmitter (for VFD lines) */}
                  {sensor && (
                    <PipeSensorBadge
                      x={790}
                      y={line.y}
                      sensor={sensor}
                      shortLabel={line.sensorTag}
                      stemDir="top"
                      labelPos="top"
                      onClick={() => openFaceplate('Fpl_Sensor', line.sensorTag, `Fpl_PIT · ${line.sensorTag}`)}
                    />
                  )}

                  {/* Industrial Fan Unit (Mẫu 2 Coaxial 6-Blade) */}
                  <g transform={`translate(936, ${line.y})`}>
                    <g
                      data-scada-tag={line.fanTag}
                      onClick={
                        unit.remote === false
                          ? undefined
                          : () =>
                              openFaceplate(
                                line.isVfd ? 'Fpl_VFD' : 'Fpl_DOL',
                                line.fanTag,
                                `${line.isVfd ? 'Fpl_VFD' : 'Fpl_DOL'} · ${line.fanTag}`
                              )
                      }
                      className={unit.remote === false ? 'cursor-not-allowed' : 'cursor-pointer group'}
                    >
                      <text x={0} y={-28} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
                        {line.short}
                      </text>
                      <IndustrialFanSvg x={0} y={0} radius={22} variant="exhaust" status={unit.status} faulted={unit.faulted} />

                      <g transform="translate(-40, 26)">
                        <rect x={0} y={0} width={11} height={13} fill={col} stroke="#0f172a" strokeWidth={0.9} />
                        <text x={5.5} y={10} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
                          {isRun ? '1' : '0'}
                        </text>
                        <rect
                          x={12}
                          y={0}
                          width={12}
                          height={13}
                          fill={unit.mode === 'AUTO' ? '#0284c7' : '#1e293b'}
                          stroke="#0f172a"
                          strokeWidth={0.9}
                        />
                        <text x={18} y={10} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
                          {unit.mode === 'AUTO' ? 'A' : 'M'}
                        </text>
                        <rect x={25} y={0} width={40} height={13} fill={unit.faulted ? '#ef4444' : '#4ade80'} stroke="#0f172a" strokeWidth={0.9} />
                        <text
                          x={45}
                          y={10}
                          textAnchor="middle"
                          fill={unit.faulted ? '#ffffff' : '#052e16'}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="900"
                        >
                          {line.isVfd ? unit.frequencyHz.toFixed(1) : unit.faulted ? 'FLT' : isRun ? 'RUN' : 'STOP'}
                        </text>
                        {line.isVfd && (
                          <text x={68} y={10} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">
                            Hz
                          </text>
                        )}
                      </g>
                      {unit.remote === false && <SvgLocalOverlay x={-40} y={-23} width={82} height={63} rx={4} />}
                    </g>

                    {line.isVfd && line.pidTag && (
                      <PidIconButton
                        x={54}
                        y={-10}
                        labelSide="none"
                        onClick={() => openFaceplate('Fpl_PID', line.pidTag, `Fpl_PID · ${line.pidTag}`)}
                      />
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded p-4 space-y-4 shadow-inner font-mono">
          {auxGroups.map((g) => (
            <div key={g.title} className="space-y-2">
              <div className="text-xs font-black text-slate-900 uppercase border-b border-slate-500 pb-1">
                {g.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {g.tags.map((tag) => {
                  const u = plant.equipment[tag];
                  const isRun = u.status === 'RUNNING';
                  const isTransit = u.status === 'STARTING' || u.status === 'STOPPING';
                  const isLocal = u.remote === false;
                  return (
                    <button
                      key={tag}
                      data-scada-tag={tag}
                      onClick={isLocal ? undefined : () => openFaceplate('Fpl_DOL', tag, `Fpl_DOL · ${u.label}`)}
                      className={`relative flex items-center gap-3 p-2.5 rounded border-2 text-left transition shadow-2xs ${
                        isLocal ? 'cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        u.faulted
                          ? 'bg-red-100 border-red-600 animate-alarm-flash'
                          : isRun
                          ? 'bg-emerald-50 border-emerald-600 hover:bg-emerald-100'
                          : isTransit
                          ? 'bg-blue-50 border-blue-600'
                          : 'bg-white border-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isLocal && <HtmlLocalOverlay size="md" />}
                      <IndustrialFanTileIcon variant="exhaust" status={u.status} faulted={u.faulted} className="w-11 h-11 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-950 truncate">{tag}</div>
                        <div className="text-[10px] text-slate-700 truncate">{u.label}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold">
                          <span
                            className={`px-1.5 py-0.2 rounded text-white ${
                              u.mode === 'AUTO' ? 'bg-sky-600' : 'bg-slate-700'
                            }`}
                          >
                            {u.mode}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded ${
                              u.faulted
                                ? 'bg-red-600 text-white'
                                : isRun
                                ? 'bg-emerald-600 text-white'
                                : isTransit
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-300 text-slate-800'
                            }`}
                          >
                            {u.status}
                          </span>
                          <span className="text-slate-600 ml-auto">{u.runHours.toFixed(0)}h</span>
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
