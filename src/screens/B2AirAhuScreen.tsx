import React, { useState } from 'react';
import { useB5Store } from '../store/b5Store.ts';
import { PipeArrow, PipeTee, SvgLocalOverlay, WinccPipeNetwork } from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

type AirTab = 'f12' | 'f3m3';

function airTabForTag(tag?: string): AirTab | null {
  if (!tag) return null;
  if (tag.startsWith('B2M3F_') || tag.startsWith('B22F_PAU') || tag === 'B22F_FFU01') return 'f3m3';
  if (tag.startsWith('B22F_AHU') || tag.startsWith('B21F_PAU') || tag.startsWith('B21F_FFU')) return 'f12';
  return null;
}

/**
 * Scr_B21F_AIR_AHU.Pdl & Scr_B22F_AIR_AHU.Pdl — Building 2 Cleanroom Air Handling, PAUs & FFUs
 *  - 100% Verified GraCS PAU -> AHU Independent Duct Routing (ZERO cross-merging between PAUs!):
 *      * Tab 1 (1F–2F · Scr_B21F_AIR_AHU):
 *          - PAU-B2-1F-01 (dedicated header) -> AHU-2F-06, AHU-2F-01, AHU-2F-04, AHU-2F-03, AHU-2F-05 (+ FFU-1F-01..03)
 *          - PAU-B2-1F-02 (dedicated header) -> AHU-2F-02, AHU-2F-07, AHU-2F-08, AHU-2F-10, AHU-2F-09
 *      * Tab 2 (3F–M3F · Scr_B22F_AIR_AHU):
 *          - PAU-B2-2F-01 (dedicated header) -> AHU-M3F-01, AHU-M3F-02, AHU-M3F-03, AHU-M3F-06, AHU-M3F-05 (+ FFU-3F-01)
 *          - PAU-B2-2F-02 (dedicated header) -> AHU-M3F-04, AHU-M3F-08, AHU-M3F-07, AHU-M3F-10, AHU-M3F-09, AHU-M3F-11
 *  - Dark Ocean Blue (#1d4ed8) animated dashed flow lines on white/silver cleanroom air ducts
 *  - External spinning green fan status badges on every PAU, AHU & FFU
 */
export const B2AirAhuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const clearLocatedTarget = useB5Store((s) => s.clearLocatedTarget);
  const [selectedTab, setSelectedTab] = useState<AirTab>('f12');

  const locatedTab = locatedTarget?.screen === 'b2_air_ahu' ? airTabForTag(locatedTarget.tag) : null;
  const activeTab: AirTab = locatedTab ?? selectedTab;

  // Exact GraCS independent PAU -> AHU assignments!
  const upperZone =
    activeTab === 'f12'
      ? {
          pauTag: 'B21F_PAU01',
          pauCode: 'PAU-B2-1F-01',
          banner: 'INDEPENDENT ZONE A: PAU-B2-1F-01 → AHU-2F-06, 01, 04, 03, 05 (DEDICATED DUCT — NOT MERGED WITH PAU-1F-02)',
          ahus: [
            { tag: 'B22F_AHU06', code: 'AHU-B2-2F-06', room: 'CLEANING LINE', x: 358 },
            { tag: 'B22F_AHU01', code: 'AHU-B2-2F-01', room: 'GOWNING / AREA 01-02', x: 544 },
            { tag: 'B22F_AHU04', code: 'AHU-B2-2F-04', room: 'COATING AREA', x: 730 },
            { tag: 'B22F_AHU03', code: 'AHU-B2-2F-03', room: 'AREA 03 / CNC', x: 916 },
            { tag: 'B22F_AHU05', code: 'AHU-B2-2F-05', room: 'SAND BLASTING', x: 1102 },
          ],
        }
      : {
          pauTag: 'B22F_PAU01',
          pauCode: 'PAU-B2-2F-01',
          banner: 'INDEPENDENT ZONE A: PAU-B2-2F-01 → AHU-M3F-01, 02, 03, 06, 05 (DEDICATED DUCT — NOT MERGED WITH PAU-2F-02)',
          ahus: [
            { tag: 'B2M3F_AHU01', code: 'AHU-B2-M3F-01', room: 'ASSEMBLY / POLISHING', x: 358 },
            { tag: 'B2M3F_AHU02', code: 'AHU-B2-M3F-02', room: 'GRINDING AREA 1', x: 544 },
            { tag: 'B2M3F_AHU03', code: 'AHU-B2-M3F-03', room: 'OPTICAL / GRINDING', x: 730 },
            { tag: 'B2M3F_AHU06', code: 'AHU-B2-M3F-06', room: '3F CLEAN LINE', x: 916 },
            { tag: 'B2M3F_AHU05', code: 'AHU-B2-M3F-05', room: 'CLEANING ROOM', x: 1102 },
          ],
        };

  const lowerZone =
    activeTab === 'f12'
      ? {
          pauTag: 'B21F_PAU02',
          pauCode: 'PAU-B2-1F-02',
          banner: 'INDEPENDENT ZONE B: PAU-B2-1F-02 → AHU-2F-02, 07, 08, 10, 09 (DEDICATED DUCT — SEPARATE FROM PAU-1F-01)',
          ahus: [
            { tag: 'B22F_AHU02', code: 'AHU-B2-2F-02', room: 'AREA 04', x: 358 },
            { tag: 'B22F_AHU07', code: 'AHU-B2-2F-07', room: '1F CLEAN LINE', x: 544 },
            { tag: 'B22F_AHU08', code: 'AHU-B2-2F-08', room: 'POLISHING AREA', x: 730 },
            { tag: 'B22F_AHU10', code: 'AHU-B2-2F-10', room: 'AREA 04 PROCESS', x: 916 },
            { tag: 'B22F_AHU09', code: 'AHU-B2-2F-09', room: 'CNC & LAPPING AREA', x: 1102 },
          ],
        }
      : {
          pauTag: 'B22F_PAU02',
          pauCode: 'PAU-B2-2F-02',
          banner: 'INDEPENDENT ZONE B: PAU-B2-2F-02 → AHU-M3F-04, 08, 07, 10, 09, 11 (DEDICATED DUCT — SEPARATE FROM PAU-2F-01)',
          ahus: [
            { tag: 'B2M3F_AHU04', code: 'AHU-B2-M3F-04', room: 'HAND CLEANING 02', x: 326 },
            { tag: 'B2M3F_AHU08', code: 'AHU-B2-M3F-08', room: 'WAX CLEANING LINE', x: 492 },
            { tag: 'B2M3F_AHU07', code: 'AHU-B2-M3F-07', room: 'POLISH/GRIND & CNC', x: 658 },
            { tag: 'B2M3F_AHU10', code: 'AHU-B2-M3F-10', room: '3F ASSEMBLY WKSHP', x: 824 },
            { tag: 'B2M3F_AHU09', code: 'AHU-B2-M3F-09', room: 'POLISHING AREA', x: 990 },
            { tag: 'B2M3F_AHU11', code: 'AHU-B2-M3F-11', room: 'DISCO DICING ROOM', x: 1156 },
          ],
        };

  const ffus =
    activeTab === 'f12'
      ? [
          { tag: 'B21F_FFU01', code: 'FFU-B2-1F-01', x: 244 },
          { tag: 'B21F_FFU02', code: 'FFU-B2-1F-02', x: 430 },
          { tag: 'B21F_FFU03', code: 'FFU-B2-1F-03', x: 616 },
        ]
      : [{ tag: 'B22F_FFU01', code: 'FFU-B2-3F-01', x: 430 }];

  const upperPauRun = plant.equipment[upperZone.pauTag].status === 'RUNNING';
  const lowerPauRun = plant.equipment[lowerZone.pauTag].status === 'RUNNING';

  const renderPau = (pauTag: string, pauCode: string, yPau: number) => {
    const eq = plant.equipment[pauTag];
    const sat = plant.sensors[`${pauTag}_SAT`];
    const isRun = eq.status === 'RUNNING';
    const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';
    const isLocal = eq.remote === false;
    return (
      <g
        key={pauTag}
        data-scada-tag={pauTag}
        transform={`translate(116, ${yPau})`}
        onClick={isLocal ? undefined : () => openFaceplate('Fpl_PAU', pauTag, `Fpl_PAU · ${pauCode}`)}
        className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
      >
        <rect
          x={-4}
          y={-4}
          width={86}
          height={56}
          rx={4}
          fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
          fillOpacity={0.72}
          stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
          strokeWidth={1.6}
          className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
        />
        <image href="/scada/pau.png" x={4} y={2} width={64} height={44} preserveAspectRatio="xMidYMid meet" />
        <IndustrialFanSvg x={71} y={8} radius={10.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
        {isLocal && <SvgLocalOverlay x={-4} y={-4} width={86} height={56} rx={4} />}
        <text x={39} y={63} textAnchor="middle" fill="#0f172a" fontSize="7.6" fontFamily="monospace" fontWeight="900">
          {pauCode} · {eq.frequencyHz.toFixed(0)}Hz
        </text>
        <text x={39} y={74} textAnchor="middle" fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="900">
          SAT: {sat ? sat.pv.toFixed(1) : '--'} °C
        </text>
      </g>
    );
  };

  const renderAhuWithRoom = (ahuTag: string, code: string, room: string, x: number, yAhu: number) => {
    const eq = plant.equipment[ahuTag];
    const cfg = plant.ahus[ahuTag];
    if (!eq || !cfg) return null;
    const isRun = eq.status === 'RUNNING';
    const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';
    const isLocal = eq.remote === false;
    const dp = plant.sensors[cfg.dewPointSensorTag];
    const rat = plant.sensors[cfg.ratSensorTag];
    const rah = plant.sensors[cfg.rahSensorTag];
    const sas = plant.sensors[cfg.sasSensorTag];

    return (
      <g key={ahuTag}>
        <g
          data-scada-tag={ahuTag}
          transform={`translate(${x - 38}, ${yAhu})`}
          onClick={isLocal ? undefined : () => openFaceplate('Fpl_AHU_DewPoint', ahuTag, `Fpl_AHU_DewPoint · ${code}`)}
          className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
        >
          <rect
            x={-4}
            y={-4}
            width={84}
            height={54}
            rx={4}
            fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
            fillOpacity={0.7}
            stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
            strokeWidth={1.6}
            className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
          />
          <image href="/scada/ahu.png" x={4} y={2} width={62} height={42} preserveAspectRatio="xMidYMid meet" />
          <IndustrialFanSvg x={69} y={8} radius={10.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
          {isLocal && <SvgLocalOverlay x={-4} y={-4} width={84} height={54} rx={4} />}
          <text x={38} y={60} textAnchor="middle" fill="#0f172a" fontSize="7.4" fontFamily="monospace" fontWeight="900">
            {code} · {eq.frequencyHz.toFixed(0)}Hz
          </text>
        </g>

        <g
          transform={`translate(${x - 68}, ${yAhu + 88})`}
          onClick={() => openFaceplate('Fpl_AHU_DewPoint', ahuTag, `Fpl_AHU_DewPoint · ${cfg.label}`)}
          className="cursor-pointer group"
        >
          <rect x={0} y={0} width={136} height={74} rx={2.5} fill="#cbd5e1" stroke="#334155" strokeWidth={1.1} className="group-hover:stroke-blue-700" />
          <text x={68} y={85} textAnchor="middle" fill="#0f172a" fontSize="7.3" fontFamily="monospace" fontWeight="900">
            {room}
          </text>
          {[
            { lbl: 'Dew Point', val: dp.pv.toFixed(1), u: '°C', yOff: 14 },
            { lbl: 'Room Temp', val: rat.pv.toFixed(1), u: '°C', yOff: 30 },
            { lbl: 'Humidity', val: rah.pv.toFixed(1), u: '%', yOff: 46 },
            { lbl: 'Static Pr', val: sas.pv.toFixed(0), u: 'Pa', yOff: 62 },
          ].map((r) => (
            <g key={r.lbl}>
              <rect x={5} y={r.yOff - 9.5} width={58} height={12.5} fill="#fef3c7" stroke="#92400e" strokeWidth={0.7} />
              <text x={34} y={r.yOff} textAnchor="middle" fill="#0f172a" fontSize="6.8" fontFamily="monospace" fontWeight="800">
                {r.lbl}
              </text>
              <rect x={66} y={r.yOff - 9.5} width={44} height={12.5} fill="#ffffff" stroke="#334155" strokeWidth={0.7} />
              <text x={88} y={r.yOff} textAnchor="middle" fill="#0369a1" fontSize="7.5" fontFamily="monospace" fontWeight="900">
                {r.val}
              </text>
              <text x={114} y={r.yOff} fill="#0f172a" fontSize="6.8" fontFamily="monospace" fontWeight="800">
                {r.u}
              </text>
            </g>
          ))}
        </g>
      </g>
    );
  };

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — Advanced Optics · Cleanroom Air Handling & Independent PAU Branches (`Scr_B2_AIR_AHU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Verified GraCS PAU→AHU topology: each PAU supplies its own dedicated AHU group (no cross-merging) · Dark Ocean Blue clean-air flow paths
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded overflow-hidden border border-cyan-500/60 bg-[#0d1626] font-mono text-xs">
            <button
              onClick={() => {
                clearLocatedTarget();
                setSelectedTab('f12');
              }}
              className={`px-3 py-1 font-bold cursor-pointer transition ${
                activeTab === 'f12' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              1F–2F (`Scr_B21F_AIR_AHU`: PAU-1F-01 / 02)
            </button>
            <button
              onClick={() => {
                clearLocatedTarget();
                setSelectedTab('f3m3');
              }}
              className={`px-3 py-1 font-bold cursor-pointer transition ${
                activeTab === 'f3m3' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              3F–M3F (`Scr_B22F_AIR_AHU`: PAU-2F-01 / 02)
            </button>
          </div>
          <StatusLegend />
        </div>
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 740" className="w-full min-w-[1100px] h-auto select-none">
          {/* Independent Zone Framing — Clearly Separates PAU 1 Bank vs PAU 2 Bank */}
          <rect x={16} y={14} width={1288} height={292} rx={5} fill="#cbd5e1" fillOpacity={0.3} stroke="#1d4ed8" strokeWidth={1.4} strokeDasharray="6 3" />
          <text x={28} y={31} fill="#1e3a8a" fontSize="8.8" fontFamily="monospace" fontWeight="900">
            {upperZone.banner}
          </text>

          <rect x={16} y={322} width={1288} height={292} rx={5} fill="#cbd5e1" fillOpacity={0.3} stroke="#0e7490" strokeWidth={1.4} strokeDasharray="6 3" />
          <text x={28} y={339} fill="#155e75" fontSize="8.8" fontFamily="monospace" fontWeight="900">
            {lowerZone.banner}
          </text>

          {/* =============================================================== */}
          {/* 1A. UPPER PAU INDEPENDENT FRESH AIR DUCTWORK (ZERO MERGE!)      */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#e2e8f0"
            strokeWidth={8}
            flowColor="#1d4ed8"
            segments={[
              { d: 'M 66 112 L 116 112', flowing: upperPauRun },
              {
                d: `M 198 112 L 236 112 L 236 58 L ${upperZone.ahus[upperZone.ahus.length - 1].x} 58`,
                flowing: upperPauRun,
              },
              ...upperZone.ahus.map((u) => ({ d: `M ${u.x} 58 L ${u.x} 90`, flowing: upperPauRun })),
              ...upperZone.ahus.map((u) => ({
                d: `M ${u.x - 14} 140 L ${u.x - 14} 180`,
                flowing: plant.equipment[u.tag].status === 'RUNNING',
              })),
            ]}
          />
          {upperZone.ahus.slice(0, -1).map((u) => (
            <PipeTee key={`ut-${u.tag}`} x={u.x} y={58} color="#e2e8f0" orientation="down" size={8} />
          ))}

          {/* =============================================================== */}
          {/* 1B. LOWER PAU INDEPENDENT FRESH AIR DUCTWORK (ZERO MERGE!)      */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#e2e8f0"
            strokeWidth={8}
            flowColor="#1d4ed8"
            segments={[
              { d: 'M 66 420 L 116 420', flowing: lowerPauRun },
              {
                d: `M 198 420 L 236 420 L 236 366 L ${lowerZone.ahus[lowerZone.ahus.length - 1].x} 366`,
                flowing: lowerPauRun,
              },
              ...lowerZone.ahus.map((u) => ({ d: `M ${u.x} 366 L ${u.x} 398`, flowing: lowerPauRun })),
              ...lowerZone.ahus.map((u) => ({
                d: `M ${u.x - 14} 448 L ${u.x - 14} 488`,
                flowing: plant.equipment[u.tag].status === 'RUNNING',
              })),
            ]}
          />
          {lowerZone.ahus.slice(0, -1).map((u) => (
            <PipeTee key={`lt-${u.tag}`} x={u.x} y={366} color="#e2e8f0" orientation="down" size={8} />
          ))}

          {/* 2. RETURN AIR DUCTWORK (#64748b — 6px) */}
          <WinccPipeNetwork
            color="#64748b"
            strokeWidth={6}
            segments={[
              ...upperZone.ahus.map((u) => ({
                d: `M ${u.x + 22} 180 L ${u.x + 22} 158 L ${u.x + 54} 158 L ${u.x + 54} 118 L ${u.x + 42} 118`,
                flowing: plant.equipment[u.tag].status === 'RUNNING',
              })),
              ...lowerZone.ahus.map((u) => ({
                d: `M ${u.x + 22} 488 L ${u.x + 22} 466 L ${u.x + 54} 466 L ${u.x + 54} 426 L ${u.x + 42} 426`,
                flowing: plant.equipment[u.tag].status === 'RUNNING',
              })),
            ]}
          />

          {/* Flow Arrows (Dark Ocean Blue on Fresh Air Headers) */}
          <PipeArrow x={90} y={112} dir="right" active={upperPauRun} fill="#1d4ed8" />
          <PipeArrow x={450} y={58} dir="right" active={upperPauRun} fill="#1d4ed8" />
          <PipeArrow x={820} y={58} dir="right" active={upperPauRun} fill="#1d4ed8" />

          <PipeArrow x={90} y={420} dir="right" active={lowerPauRun} fill="#1d4ed8" />
          <PipeArrow x={450} y={366} dir="right" active={lowerPauRun} fill="#1d4ed8" />
          <PipeArrow x={820} y={366} dir="right" active={lowerPauRun} fill="#1d4ed8" />

          <text x={24} y={115} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">OUTDOOR</text>
          <text x={24} y={423} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">OUTDOOR</text>

          {/* 3. INDEPENDENT PAU UNITS */}
          {renderPau(upperZone.pauTag, upperZone.pauCode, 88)}
          {renderPau(lowerZone.pauTag, lowerZone.pauCode, 396)}

          {/* 4. ALL AHUs + LIVE CLEANROOM TELEMETRY PANELS */}
          {upperZone.ahus.map((u) => renderAhuWithRoom(u.tag, u.code, u.room, u.x, 92))}
          {lowerZone.ahus.map((u) => renderAhuWithRoom(u.tag, u.code, u.room, u.x, 400))}

          {/* 5. BOTTOM CLEANROOM FFU STRIP (/scada/FFU.png) */}
          <rect x={16} y={626} width={1288} height={98} rx={5} fill="#cbd5e1" fillOpacity={0.5} stroke="#334155" strokeWidth={1.3} strokeDasharray="4 2" />
          <text x={32} y={646} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
            CLEANROOM FAN FILTER UNITS (FFU — VFD)
          </text>
          {ffus.map((f) => {
            const eq = plant.equipment[f.tag];
            const isRun = eq.status === 'RUNNING';
            const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';
            const isLocal = eq.remote === false;
            return (
              <g
                key={f.tag}
                data-scada-tag={f.tag}
                transform={`translate(${f.x}, 652)`}
                onClick={isLocal ? undefined : () => openFaceplate('Fpl_VFD', f.tag, `Fpl_VFD · ${f.tag}`)}
                className={isLocal ? 'cursor-not-allowed' : 'cursor-pointer group'}
              >
                <rect
                  x={0}
                  y={0}
                  width={168}
                  height={62}
                  rx={4}
                  fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
                  fillOpacity={0.8}
                  stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
                  strokeWidth={1.5}
                  className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
                />
                <image href="/scada/FFU.png" x={6} y={7} width={48} height={48} preserveAspectRatio="xMidYMid meet" />
                <IndustrialFanSvg x={152} y={15} radius={10.2} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
                <text x={60} y={23} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
                  {f.code}
                </text>
                <text x={60} y={38} fill="#052e16" fontSize="8.5" fontFamily="monospace" fontWeight="800">
                  {eq.status} · {eq.frequencyHz.toFixed(1)} Hz
                </text>
                <text x={60} y={52} fill="#334155" fontSize="7.5" fontFamily="monospace" fontWeight="700">
                  Mode: {eq.mode}
                </text>
                {isLocal && <SvgLocalOverlay x={0} y={0} width={168} height={62} rx={4} />}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
