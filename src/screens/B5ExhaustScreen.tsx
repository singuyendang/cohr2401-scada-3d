import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  HtmlLocalOverlay,
  PidIconButton,
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  SvgLocalOverlay,
  WinccPipeNetwork,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { statusColor } from '../components/scada/scadaColors.ts';
import { IndustrialFanSvg, IndustrialFanTileIcon } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Scr_B5_EXH.Pdl — Process Exhaust & Plant Ventilation System (Faithful to fds_img_42.png, ZERO Future branches!)
 *  - Red process exhaust headers (#dc2626) serving all cleanroom process benches -> FA-11201A, FA-11203A, FA-11204A VFDs
 *  - Pipe-mounted B51F_PIT11201 (kPa), B51F_PIT11202 (kPa), B51F_TIT11201 (°C)
 *  - Bottom Plant Room Fresh Air / Exhaust & Toilet Exhaust Strip (FAF01/02, EAF01/02, TEF01 1F/2F)
 */
export const B5ExhaustScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const fa1 = plant.equipment['B5M2F_FA11201A'];
  const fa3 = plant.equipment['B5M2F_FA11203A'];
  const fa4 = plant.equipment['B5M2F_FA11204A'];
  const pit1 = plant.sensors['B51F_PIT11201'];
  const pit2 = plant.sensors['B51F_PIT11202'];
  const tit1 = plant.sensors['B51F_TIT11201'];

  const renderExhaustFan = (
    tag: string,
    shortName: string,
    pidTag: string,
    x: number,
    y: number
  ) => {
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

          {/* Status + Mode + Hz LCD */}
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

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Process Exhaust & Ventilation (`Scr_B5_EXH.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Duct 1 PIT11201: {pit1.pv.toFixed(2)} kPa (FA-11201A: {fa1.frequencyHz.toFixed(1)} Hz) · Duct 2 PIT11202:{' '}
            {pit2.pv.toFixed(2)} kPa (FA-11203A/04A: {fa3.frequencyHz.toFixed(1)} / {fa4.frequencyHz.toFixed(1)} Hz) ·
            Plant Room TIT11201: {tit1.pv.toFixed(1)} °C
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_42.png (ZERO Future branches!) */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 620" className="w-full min-w-[1100px] h-auto select-none">
          {/* =============================================================== */}
          {/* RED PROCESS EXHAUST DUCTWORK (#dc2626 — 8px / 6px)              */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#dc2626"
            strokeWidth={8}
            segments={[
              // Header 1 -> FA-11201A (y=114 -> step up to fan y=74)
              { d: 'M 42 114 L 972 114 L 972 74 L 1252 74', flowing: fa1.status === 'RUNNING' },
              // Header 2 -> FA-11203A (y=346 -> step up to fan y=286)
              { d: 'M 42 346 L 972 346 L 972 286 L 1252 286', flowing: fa3.status === 'RUNNING' },
              // Header 3 -> FA-11204A (y=556 -> step up to fan y=506)
              { d: 'M 454 556 L 972 556 L 972 506 L 1252 506', flowing: fa4.status === 'RUNNING' },
            ]}
          />
          {/* Tool Branch Taps (6px) */}
          <WinccPipeNetwork
            color="#dc2626"
            strokeWidth={5.5}
            segments={[
              // Header 1 tool drops
              { d: 'M 66 114 L 66 174 L 92 174', flowing: fa1.status === 'RUNNING' },
              { d: 'M 66 142 L 92 142', flowing: fa1.status === 'RUNNING' },
              { d: 'M 214 114 L 214 174 L 242 174', flowing: fa1.status === 'RUNNING' },
              { d: 'M 326 114 L 326 62 L 352 62', flowing: fa1.status === 'RUNNING' },
              { d: 'M 374 114 L 374 174 L 402 174', flowing: fa1.status === 'RUNNING' },
              { d: 'M 374 142 L 402 142', flowing: fa1.status === 'RUNNING' },
              { d: 'M 548 114 L 548 148', flowing: fa1.status === 'RUNNING' },
              { d: 'M 644 114 L 644 62 L 672 62', flowing: fa1.status === 'RUNNING' },
              { d: 'M 678 114 L 678 174 L 704 174', flowing: fa1.status === 'RUNNING' },
              { d: 'M 848 114 L 848 148', flowing: fa1.status === 'RUNNING' },
              // Header 2: 6 cleanroom bay vertical risers (x=66..686)
              ...[66, 190, 314, 438, 562, 686].map((bx) => ({
                d: `M ${bx} 240 L ${bx} 454`,
                flowing: fa3.status === 'RUNNING',
              })),
            ]}
          />
          {[66, 190, 314, 438, 562, 686].map((bx) => (
            <PipeTee key={`ex2-${bx}`} x={bx} y={346} color="#dc2626" orientation="up" size={8} />
          ))}

          {/* Flow Arrows */}
          <PipeArrow x={1060} y={74} dir="right" active={fa1.status === 'RUNNING'} />
          <PipeArrow x={1226} y={74} dir="right" active={fa1.status === 'RUNNING'} />
          <PipeArrow x={1060} y={286} dir="right" active={fa3.status === 'RUNNING'} />
          <PipeArrow x={1226} y={286} dir="right" active={fa3.status === 'RUNNING'} />
          <PipeArrow x={1060} y={506} dir="right" active={fa4.status === 'RUNNING'} />
          <PipeArrow x={1226} y={506} dir="right" active={fa4.status === 'RUNNING'} />

          {/* =============================================================== */}
          {/* PROCESS TOOL LABELS (MATCHING fds_img_42.png)                   */}
          {/* =============================================================== */}
          {[
            { x: 92, y: 126, w: 72, h: 24, lines: ['SPIN COATER', 'E-09 (2 SETS)'] },
            { x: 92, y: 158, w: 80, h: 26, lines: ['DAITRON EDGE', 'GRIND E-01 (5)'] },
            { x: 242, y: 158, w: 88, h: 26, lines: ['LEAK FILL VACUUM', 'E-07 (6 SETS)'] },
            { x: 352, y: 46, w: 72, h: 26, lines: ['SPIN COATER', 'E-09 (2 SETS)'] },
            { x: 402, y: 126, w: 72, h: 24, lines: ['LASER MARKER', 'C-01 (2 SETS)'] },
            { x: 402, y: 158, w: 80, h: 26, lines: ['DAITRON EDGE', 'GRIND E-01 (5)'] },
            { x: 500, y: 148, w: 98, h: 32, lines: ['POST SURFACE GRIND', 'WAFER CLEAN E-04A'] },
            { x: 672, y: 46, w: 72, h: 26, lines: ['LASER MARKER', 'C-01 (2 SETS)'] },
            { x: 704, y: 158, w: 76, h: 26, lines: ['ETCH KILN KNN', 'S-03 (4 SETS)'] },
            { x: 798, y: 148, w: 98, h: 32, lines: ['POST SURFACE GRIND', 'WAFER CLEAN E-04'] },
            { x: 396, y: 564, w: 118, h: 30, lines: ['HARD BAKE OVEN', 'SHELLAB SM010HP-2 (8)'] },
          ].map((b, i) => (
            <g key={`et-${i}`} transform={`translate(${b.x}, ${b.y})`}>
              <rect x={0} y={0} width={b.w} height={b.h} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1} />
              {b.lines.map((ln, li) => (
                <text key={li} x={b.w / 2} y={10 + li * 10} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="800">
                  {ln}
                </text>
              ))}
            </g>
          ))}

          {/* Header 2 Cleanroom Grinder/Splitter Bays */}
          {[66, 190, 314, 438, 562, 686].map((bx, i) => (
            <g key={`bay-${i}`}>
              {[
                { y: 230, txt: 'KABRA SPLITTER F-02' },
                { y: 262, txt: 'MANUAL GRINDER-FINE' },
                { y: 294, txt: 'VACUUM UNIT F-05' },
                { y: 368, txt: 'MANUAL GRINDER-CRS' },
                { y: 400, txt: 'VACUUM UNIT F-05' },
                { y: 432, txt: 'KABRA SPLITTER F-02' },
              ].map((cell) => (
                <g key={cell.y} transform={`translate(${bx + 6}, ${cell.y})`}>
                  <rect x={0} y={0} width={96} height={22} rx={1.5} fill="#f8fafc" stroke="#334155" strokeWidth={0.9} />
                  <text x={48} y={13.5} textAnchor="middle" fill="#0f172a" fontSize="6.2" fontFamily="monospace" fontWeight="800">
                    {cell.txt}
                  </text>
                </g>
              ))}
            </g>
          ))}

          {/* =============================================================== */}
          {/* 3 ACTIVE PROCESS EXHAUST VFD FANS (FA-11201A / 03A / 04A)       */}
          {/* =============================================================== */}
          {renderExhaustFan('B5M2F_FA11201A', 'FA-11201A', 'B5M2F_FA11201A_PID', 1142, 74)}
          {renderExhaustFan('B5M2F_FA11203A', 'FA-11203A', 'B5M2F_FA11203A_PID', 1142, 286)}
          {renderExhaustFan('B5M2F_FA11204A', 'FA-11204A', 'B5M2F_FA11204A_PID', 1142, 506)}

          {/* =============================================================== */}
          {/* PIPE-MOUNTED SENSORS (PIT11201, PIT11202, TIT11201)             */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={918}
            y={114}
            sensor={pit1}
            shortLabel="B51F_PIT11201"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT11201', 'Fpl_PIT_kPa · B51F_PIT11201')}
          />
          <PipeSensorBadge
            x={918}
            y={346}
            sensor={pit2}
            shortLabel="B51F_PIT11202"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT11202', 'Fpl_PIT_kPa · B51F_PIT11202')}
          />
          <PipeSensorBadge
            x={918}
            y={556}
            sensor={tit1}
            shortLabel="B51F_TIT11201"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_TIT11201', 'Fpl_TIT · B51F_TIT11201')}
          />
        </svg>
      </div>

      {/* Plant Room Ventilation & Toilet Exhaust Strip (B51F_FAF01/02, EAF01/02, TEF01 1F/2F) */}
      <div className="bg-[#101c30] border border-[#223552] rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase">
          Building 5 Plant Room Ventilation & Toilet Exhaust (`Scr_B5_Toilet_Exhaust` & 1F Fans)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-xs">
          {[
            'B51F_FAF01',
            'B51F_FAF02',
            'B51F_EAF01',
            'B51F_EAF02',
            'B51F_TEF01',
            'B52F_TEF01',
          ].map((tag) => {
            const u = plant.equipment[tag];
            const isRun = u.status === 'RUNNING';
            const isTransit = u.status === 'STARTING' || u.status === 'STOPPING';
            const isLocal = u.remote === false;
            const fpl = u.kind === 'vfd' ? 'Fpl_VFD' : 'Fpl_DOL';
            return (
              <button
                key={tag}
                data-scada-tag={tag}
                onClick={isLocal ? undefined : () => openFaceplate(fpl, tag, `${fpl} · ${tag}`)}
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
                    <span className="truncate">{tag.replace(/^B5[0-9]F_/, '')}</span>
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
                    <span className="text-slate-200 font-bold">
                      {u.kind === 'vfd' ? `${u.frequencyHz.toFixed(1)} Hz` : 'DOL'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
