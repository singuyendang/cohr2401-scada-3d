import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PidIconButton,
  PipeArrow,
  PipeCross,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
  WinccPumpSymbol,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';

/** Static mechanical dial gauge mounted on overhead bypass loop of FLT-601A/B */
const StaticDialGaugeIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect x={-3} y={-8} width={6} height={8} fill="#475569" stroke="#0f172a" strokeWidth={0.9} />
    <circle cx={0} cy={-16} r={9.5} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.3} />
    <circle cx={0} cy={-16} r={7.2} fill="#ffffff" stroke="#64748b" strokeWidth={0.8} />
    <line x1={-5} y1={-16} x2={-3.5} y2={-16} stroke="#334155" strokeWidth={0.8} />
    <line x1={5} y1={-16} x2={3.5} y2={-16} stroke="#334155" strokeWidth={0.8} />
    <line x1={0} y1={-21} x2={0} y2={-19.5} stroke="#334155" strokeWidth={0.8} />
    <line x1={0} y1={-16} x2={3.8} y2={-19.8} stroke="#dc2626" strokeWidth={1.2} />
    <circle cx={0} cy={-16} r={1.3} fill="#0f172a" />
  </g>
);

/**
 * Scr_B2_PCW.Pdl — Building 2 Process Cooling Water System (Building 2 ONLY — Zero Building 3 branches!)
 *  - Identical refined geometry & piping convention to Building 5 PCW, upgraded to 4 VFD main pumps P-601A/B/C/D:
 *      * Demand Sequencer: Fpl_Demand_B2PCW tracking B21F_DPT10601 (1.8 bar SP)
 *      * 2 Plate Heat Exchangers E-601A/B (B21F_TCV10601/02 + B21F_TT10601/02/03)
 *      * Filters FLT-601A/B with static overhead dial gauges (no animation)
 *      * Suction pressure hysteresis B21F_PIT10601 -> XV-10602 (RO Makeup) & XV-10601 (Drain)
 *      * Manual-only bypass valves XV-10603 & XV-10604 (Bright Cyan above, Dark Teal below)
 *      * Rejected PCW Tank TK-601 (B21F_LT10601) + DOL Pump P-602 (Auto >= 85% / Stop <= 35%)
 */
export const B2PcwScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyPcwRun = ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const xvMakeupOpen = plant.valves['B21F_XV10602'].openFB;
  const xvDrainOpen = plant.valves['B21F_XV10601'].openFB;
  const xv03Open = plant.valves['B21F_XV10603'].openFB;
  const xv04Open = plant.valves['B21F_XV10604'].openFB;
  const p602Run = plant.equipment['B21F_P602'].status === 'RUNNING';
  const tcv1Flow = plant.valves['B21F_TCV10601'].positionPct > 2;
  const tcv2Flow = plant.valves['B21F_TCV10602'].positionPct > 2;
  const lt601 = plant.sensors['B21F_LT10601'];
  const lt601Pct = Math.max(0, Math.min(100, lt601.pv));

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — Advanced Optics · Process Cooling Water (`Scr_B2_PCW.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            DPT10601 SP: {plant.pids['B21F_P601A_PID'].sp.toFixed(1)} bar · TT10601/02 SP:{' '}
            {plant.pids['B21F_TCV10601_PID'].sp.toFixed(1)} °C · PIT10601:{' '}
            {plant.sensors['B21F_PIT10601'].pv.toFixed(2)} bar (XV10602:{' '}
            {xvMakeupOpen ? 'OPEN' : 'CLOSED'} · XV10601: {xvDrainOpen ? 'OPEN' : 'CLOSED'}) · TK-601:{' '}
            {lt601.pv.toFixed(1)}% (P-602 Auto H≥{lt601.alarms.haSP}% / L≤{lt601.alarms.laSP}%:{' '}
            {plant.equipment['B21F_P602'].status})
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 735" className="w-full min-w-[1100px] h-auto select-none">
          {/* Floor Divider Line: BUILDING 2 - 1F/3F PROCESS AREAS / PCW STATION */}
          <line x1={122} y1={314} x2={1290} y2={314} stroke="#475569" strokeWidth={1.2} strokeDasharray="4 4" />
          <text x={166} y={306} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            BUILDING 2 — 1F & 3F OPTICS PROCESS AREAS (BUILDING 2 ONLY)
          </text>
          <text x={138} y={718} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
            BUILDING 2 PCW STATION (4× VFD MAIN PUMPS P-601A..D)
          </text>

          {/* =============================================================== */}
          {/* 1. PCW SUPPLY NETWORK (BRIGHT CYAN #00cfe8 — 9px / 6px)         */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={9}
            segments={[
              // E-601A outlet -> TT10601 -> merge E-601B -> FIT10601 -> split node x=158
              { d: 'M 356 382 L 158 382', flowing: anyPcwRun },
              // E-601B outlet -> TT10602 -> up x=248 into E-601A supply header
              { d: 'M 356 544 L 248 544 L 248 382', flowing: anyPcwRun },
              // Branch 1 AFTER FIT10601: UP x=158 -> Building 2 Distribution Supply Header
              { d: 'M 158 382 L 158 28 L 560 28', flowing: anyPcwRun },
              // Branch 2 AFTER FIT10601: DOWN x=158 -> XV-10603 (158, 474) + 90° Right Tee -> XV-10604 (208, 474)
              { d: 'M 158 382 L 158 474', flowing: anyPcwRun && xv03Open },
              { d: 'M 158 440 L 208 440 L 208 474', flowing: anyPcwRun && xv04Open },
              // B2 1F Lower Supply Bus & Right 3F Grinding/Polishing Riser (x=514)
              { d: 'M 158 192 L 514 192', flowing: anyPcwRun },
              { d: 'M 514 28 L 514 260', flowing: anyPcwRun },
              // 4 Building 2 Right Zone Supply Headers (y=42, 96, 150, 224)
              { d: 'M 514 42 L 688 42', flowing: anyPcwRun },
              { d: 'M 514 96 L 688 96', flowing: anyPcwRun },
              { d: 'M 514 150 L 688 150', flowing: anyPcwRun },
              { d: 'M 514 224 L 688 224', flowing: anyPcwRun },
            ]}
          />
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={6}
            segments={[
              { d: 'M 230 28 L 230 104 L 254 104 L 254 44', flowing: anyPcwRun },
              { d: 'M 314 28 L 314 124 L 338 124 L 338 44', flowing: anyPcwRun },
              { d: 'M 398 28 L 398 104 L 422 104 L 422 44', flowing: anyPcwRun },
              { d: 'M 250 192 L 250 266 L 274 266 L 274 208', flowing: anyPcwRun },
              { d: 'M 334 192 L 334 280 L 358 280 L 358 208', flowing: anyPcwRun },
              { d: 'M 418 192 L 418 266 L 442 266 L 442 208', flowing: anyPcwRun },
            ]}
          />
          <PipeTee x={248} y={382} color="#00cfe8" orientation="down" size={9} />
          <PipeTee x={158} y={382} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={158} y={440} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={158} y={192} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={28} color="#00cfe8" orientation="down" size={9} />
          <PipeTee x={514} y={42} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={96} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={150} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={192} color="#00cfe8" orientation="left" size={9} />
          <PipeTee x={514} y={224} color="#00cfe8" orientation="right" size={9} />

          {/* =============================================================== */}
          {/* 2. PCW RETURN & 4-PUMP LOOP NETWORK (DARK TEAL #009999 — 9px)   */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={9}
            segments={[
              // B2 Return Header -> Far-Left Drop (x=118) -> Bottom (y=696) -> UP into A-601 (x=768, y=406)
              { d: 'M 560 44 L 118 44 L 118 696 L 768 696 L 768 406', flowing: anyPcwRun },
              // Below XV-10603 & XV-10604 -> Dark Teal -> Join far-left Return Drop
              { d: 'M 158 474 L 158 508', flowing: anyPcwRun && xv03Open },
              { d: 'M 208 474 L 208 508 L 118 508', flowing: anyPcwRun && (xv03Open || xv04Open) },
              // RO Water Makeup Line: RIGHT -> LEFT from RO-DI Package -> XV-10602 -> Suction Header
              { d: 'M 1168 406 L 768 406', flowing: xvMakeupOpen },
              // B2 Lower Return Bus & Right Collector (x=496)
              { d: 'M 118 208 L 496 208', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 44 L 496 260', flowing: anyPcwRun },
              { d: 'M 496 62 L 688 62', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 116 L 688 116', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 170 L 688 170', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 250 L 688 250', flowing: anyPcwRun, reverse: true },
              // 4-Pump Suction Bus (x=708, y=376..610) -> RIGHT suction of left-facing P-601A..D -> TOP-LEFT discharge (y=366,444,522,600) -> Bus x=542
              { d: 'M 708 376 L 708 610', flowing: anyPcwRun },
              { d: 'M 768 406 L 708 406', flowing: anyPcwRun },
              { d: 'M 708 376 L 640 376', flowing: plant.equipment['B21F_P601A'].status === 'RUNNING' },
              { d: 'M 708 454 L 640 454', flowing: plant.equipment['B21F_P601B'].status === 'RUNNING' },
              { d: 'M 708 532 L 640 532', flowing: plant.equipment['B21F_P601C'].status === 'RUNNING' },
              { d: 'M 708 610 L 640 610', flowing: plant.equipment['B21F_P601D'].status === 'RUNNING' },
              { d: 'M 610 366 L 542 366', flowing: plant.equipment['B21F_P601A'].status === 'RUNNING' },
              { d: 'M 610 444 L 542 444', flowing: plant.equipment['B21F_P601B'].status === 'RUNNING' },
              { d: 'M 610 522 L 542 522', flowing: plant.equipment['B21F_P601C'].status === 'RUNNING' },
              { d: 'M 610 600 L 542 600', flowing: plant.equipment['B21F_P601D'].status === 'RUNNING' },
              { d: 'M 542 366 L 542 600', flowing: anyPcwRun },
              // Filters FLT 601A (y=382) & FLT 601B (y=544) -> E-601A & E-601B Upper-Right Inlets
              { d: 'M 542 382 L 400 382', flowing: anyPcwRun },
              { d: 'M 542 544 L 400 544', flowing: anyPcwRun },
              // Static overhead bypass loops over FLT 601A & FLT 601B (NO animation, static dial gauge!)
              { d: 'M 454 382 L 454 334 L 514 334 L 514 382', flowing: false },
              { d: 'M 454 544 L 454 496 L 514 496 L 514 544', flowing: false },
              // TK-602 Expansion Tank Drop (x=868)
              { d: 'M 868 380 L 868 406', flowing: anyPcwRun },
              // Drain Line -> XV-10601 -> TK-601 -> P-602 (LEFT suction y=676, TOP-RIGHT discharge y=666) -> WW Reject
              { d: 'M 768 506 L 888 506 L 888 558', flowing: xvDrainOpen },
              { d: 'M 888 624 L 888 676 L 982 676', flowing: p602Run },
              { d: 'M 1012 666 L 1110 666', flowing: p602Run },
            ]}
          />
          <PipeTee x={118} y={208} color="#009999" orientation="right" size={9} />
          <PipeTee x={118} y={508} color="#009999" orientation="right" size={9} />
          <PipeTee x={158} y={508} color="#009999" orientation="up" size={9} />
          <PipeTee x={454} y={382} color="#009999" orientation="up" size={9} />
          <PipeTee x={514} y={382} color="#009999" orientation="up" size={9} />
          <PipeTee x={454} y={544} color="#009999" orientation="up" size={9} />
          <PipeTee x={514} y={544} color="#009999" orientation="up" size={9} />
          <PipeTee x={496} y={44} color="#009999" orientation="down" size={9} />
          <PipeTee x={496} y={62} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={116} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={170} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={208} color="#009999" orientation="left" size={9} />
          <PipeTee x={496} y={250} color="#009999" orientation="right" size={9} />
          <PipeTee x={542} y={382} color="#009999" orientation="left" size={9} />
          <PipeTee x={542} y={444} color="#009999" orientation="right" size={9} />
          <PipeTee x={542} y={522} color="#009999" orientation="right" size={9} />
          <PipeTee x={542} y={544} color="#009999" orientation="left" size={9} />
          <PipeTee x={708} y={406} color="#009999" orientation="right" size={9} />
          <PipeTee x={708} y={454} color="#009999" orientation="left" size={9} />
          <PipeTee x={708} y={532} color="#009999" orientation="left" size={9} />
          <PipeCross x={768} y={406} color="#009999" size={9} />
          <PipeTee x={768} y={506} color="#009999" orientation="right" size={9} />
          <PipeTee x={868} y={406} color="#009999" orientation="up" size={9} />

          {/* 2B. CHW RETURN PIPELINE (BRIGHT CYAN — OVERPASS HALOS) */}
          <line x1={266} y1={530} x2={266} y2={558} stroke="#bcc2cb" strokeWidth={15.5} />
          <line x1={104} y1={624} x2={132} y2={624} stroke="#bcc2cb" strokeWidth={15.5} />
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={9}
            segments={[
              { d: 'M 356 416 L 266 416 L 266 624 L 106 624', flowing: tcv1Flow },
              { d: 'M 356 578 L 266 578', flowing: tcv2Flow },
            ]}
          />
          <PipeTee x={266} y={578} color="#00cfe8" orientation="right" size={9} />

          {/* 2C. CHW SUPPLY PIPELINE (DARK TEAL — OVERPASS HALOS) */}
          <line x1={104} y1={658} x2={132} y2={658} stroke="#bcc2cb" strokeWidth={15.5} />
          <line x1={424} y1={530} x2={424} y2={558} stroke="#bcc2cb" strokeWidth={15.5} />
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={9}
            segments={[
              { d: 'M 106 658 L 424 658 L 424 416 L 400 416', flowing: tcv1Flow || tcv2Flow },
              { d: 'M 424 578 L 400 578', flowing: tcv2Flow },
            ]}
          />
          <PipeTee x={424} y={578} color="#009999" orientation="left" size={9} />

          {/* 3. BUILDING 2 PRODUCTION ZONE LABELS */}
          {[
            { x: 242, y: 118, txt: 'B2 1F COATING AREA', sub: '(CT-1..CT-3)' },
            { x: 326, y: 140, txt: 'B2 1F CNC & AREA 1-3', sub: '(FX / EQ)' },
            { x: 410, y: 118, txt: 'B2 1F POLISHING', sub: '(AREA 4)' },
            { x: 262, y: 282, txt: 'B2 3F DISCO DICING', sub: '(CLEAN LINE)' },
            { x: 346, y: 296, txt: 'B2 3F GRINDING 1 & 2', sub: '(SU-1..SU-3)' },
            { x: 430, y: 282, txt: 'B2 3F WAX / CLEANING', sub: '(CL-2 / PO-2.1)' },
          ].map((p, i) => (
            <g key={`b2-pa-${i}`}>
              <text x={p.x} y={p.y} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="800">
                {p.txt}
              </text>
              <text x={p.x} y={p.y + 8} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="700">
                {p.sub}
              </text>
            </g>
          ))}

          {[
            { y: 52, l1: 'B2 1F COATING CHAMBERS', l2: '(COATING 1–3)' },
            { y: 106, l1: 'B2 3F SURFACE GRINDING', l2: '(GRINDING 01–02)' },
            { y: 160, l1: 'B2 3F OPTICAL POLISHING', l2: '(POLISHING AREA)' },
            { y: 236, l1: 'B2 3F END-OF-LINE LOOP', l2: '(DPT10601 / TT10603)' },
          ].map((gItem, idx) => (
            <g key={`b2-ag-${idx}`}>
              <line x1={688} y1={gItem.y - 12} x2={688} y2={gItem.y + 12} stroke="#0f172a" strokeWidth={1.8} />
              <circle cx={688} cy={gItem.y} r={5} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.1} />
              <text x={702} y={gItem.y - 1} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="800">
                {gItem.l1}
              </text>
              <text x={702} y={gItem.y + 8} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">
                {gItem.l2}
              </text>
            </g>
          ))}

          {/* Flow Arrows & Edge Labels */}
          <PipeArrow x={292} y={28} dir="right" active={anyPcwRun} />
          <PipeArrow x={292} y={44} dir="left" active={anyPcwRun} />
          <PipeArrow x={440} y={696} dir="right" active={anyPcwRun} />
          <PipeArrow x={734} y={696} dir="right" active={anyPcwRun} />
          <PipeArrow x={184} y={624} dir="left" active={tcv1Flow || tcv2Flow} />
          <PipeArrow x={184} y={658} dir="right" active={tcv1Flow || tcv2Flow} />
          <PipeArrow x={1060} y={406} dir="left" active={xvMakeupOpen} />
          <PipeArrow x={914} y={406} dir="left" active={xvMakeupOpen} />
          <PipeArrow x={1060} y={666} dir="right" active={p602Run} />

          <text x={6} y={620} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">CHILLED WATER RETURN</text>
          <text x={6} y={629} fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">TO B5 CHILLER PLANT</text>
          <text x={6} y={654} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">CHILLED WATER SUPPLY</text>
          <text x={6} y={663} fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">FROM B5 CHILLER PLANT</text>

          <text x={1174} y={403} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">RO WATER SUPPLY</text>
          <text x={1174} y={413} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">FROM RODI PACKAGE B5</text>
          <text x={1116} y={663} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">RO WATER REJECT</text>
          <text x={1116} y={673} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">WW DISTRIBUTION</text>

          {/* 4. HEAT EXCHANGERS (E-601A/B) & FILTERS + STATIC DIAL GAUGES */}
          <image href="/scada/HE.png" x={356} y={366} width={44} height={64} preserveAspectRatio="xMidYMid meet" />
          <text x={378} y={440} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            E-601A
          </text>

          <image href="/scada/HE.png" x={356} y={528} width={44} height={64} preserveAspectRatio="xMidYMid meet" />
          <text x={378} y={602} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            E-601B
          </text>

          <image href="/scada/Filter.png" x={466} y={352} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
          <text x={484} y={420} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            FLT 601A
          </text>
          <StaticDialGaugeIcon x={484} y={334} />

          <image href="/scada/Filter.png" x={466} y={514} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
          <text x={484} y={582} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            FLT 601B
          </text>
          <StaticDialGaugeIcon x={484} y={496} />

          {/* 5. AIR SEPARATOR (A-601), EXPANSION TANK (TK-602), REJECT TANK (TK-601) */}
          <g transform="translate(768, 406)">
            <rect x={-13} y={-20} width={26} height={38} rx={10} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.3} />
            <rect x={-9} y={-16} width={5} height={30} rx={2} fill="#ffffff" opacity={0.65} />
            <rect x={-4} y={-25} width={8} height={5} fill="#64748b" stroke="#0f172a" strokeWidth={1} />
            <text x={0} y={-38} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
              A-601
            </text>
            <text x={0} y={-29} textAnchor="middle" fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="800">
              AIR SEPARATOR
            </text>
          </g>

          <g transform="translate(868, 336)">
            <rect x={-22} y={-24} width={44} height={66} rx={8} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.4} />
            <rect x={-16} y={-20} width={9} height={58} rx={3} fill="#f8fafc" opacity={0.65} />
            <line x1={-14} y1={42} x2={-14} y2={50} stroke="#334155" strokeWidth={3} />
            <line x1={14} y1={42} x2={14} y2={50} stroke="#334155" strokeWidth={3} />
            <text x={0} y={-2} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
              TK 602
            </text>
            <text x={0} y={8} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="800">
              EXPANSION TANK
            </text>
            <text x={0} y={16} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="800">
              1000 LITRES
            </text>
          </g>

          <g
            transform="translate(888, 592)"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_LT10601', 'Fpl_LIT · B21F_LT10601 (TK-601 Level)')}
            className="cursor-pointer group"
          >
            <rect x={-22} y={-34} width={44} height={68} rx={8} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.4} className="group-hover:stroke-blue-700" />
            <rect
              x={-18}
              y={30 - (lt601Pct / 100) * 56}
              width={36}
              height={(lt601Pct / 100) * 56}
              rx={3}
              fill="#06b6d4"
              opacity={0.75}
            />
            <line x1={-22} y1={30 - (lt601.alarms.haSP / 100) * 56} x2={22} y2={30 - (lt601.alarms.haSP / 100) * 56} stroke="#dc2626" strokeWidth={1} strokeDasharray="2 2" />
            <line x1={-22} y1={30 - (lt601.alarms.laSP / 100) * 56} x2={22} y2={30 - (lt601.alarms.laSP / 100) * 56} stroke="#ca8a04" strokeWidth={1} strokeDasharray="2 2" />
            <rect x={-16} y={-30} width={7} height={60} rx={2} fill="#ffffff" opacity={0.45} />
            <line x1={-14} y1={34} x2={-14} y2={42} stroke="#334155" strokeWidth={3} />
            <line x1={14} y1={34} x2={14} y2={42} stroke="#334155" strokeWidth={3} />
            <text x={-30} y={-2} textAnchor="end" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              TK 601
            </text>
            <text x={-30} y={8} textAnchor="end" fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">
              H:{lt601.alarms.haSP}% L:{lt601.alarms.laSP}%
            </text>
          </g>

          {/* 6. 4 ACTIVE PCW VFD PUMPS (P-601A/B/C/D direction="left") + P-602 DOL */}
          <WinccPumpSymbol x={626} y={376} direction="left" unit={plant.equipment['B21F_P601A']} shortTag="P-601A" onClick={() => openFaceplate('Fpl_VFD', 'B21F_P601A', 'Fpl_VFD · B21F_P601A')} />
          <WinccPumpSymbol x={626} y={454} direction="left" unit={plant.equipment['B21F_P601B']} shortTag="P-601B" onClick={() => openFaceplate('Fpl_VFD', 'B21F_P601B', 'Fpl_VFD · B21F_P601B')} />
          <WinccPumpSymbol x={626} y={532} direction="left" unit={plant.equipment['B21F_P601C']} shortTag="P-601C" onClick={() => openFaceplate('Fpl_VFD', 'B21F_P601C', 'Fpl_VFD · B21F_P601C')} />
          <WinccPumpSymbol x={626} y={610} direction="left" unit={plant.equipment['B21F_P601D']} shortTag="P-601D" onClick={() => openFaceplate('Fpl_VFD', 'B21F_P601D', 'Fpl_VFD · B21F_P601D')} />

          <WinccPumpSymbol
            x={996}
            y={676}
            direction="right"
            unit={plant.equipment['B21F_P602']}
            shortTag="P-602 (DOL)"
            onClick={() => openFaceplate('Fpl_DOL', 'B21F_P602', 'Fpl_DOL · B21F_P602 (Rejected PCW Pump)')}
          />

          {/* 7. VALVES (TCV-10601/02, XV-10601..04) */}
          <WinccValveSymbol
            x={312}
            y={416}
            valve={plant.valves['B21F_TCV10601']}
            shortLabel="TCV-10601"
            onClick={() => openFaceplate('Fpl_CVAL', 'B21F_TCV10601', 'Fpl_CVAL · B21F_TCV10601')}
          />
          <PidIconButton
            x={274}
            y={432}
            labelSide="none"
            onClick={() => openFaceplate('Fpl_PID', 'B21F_TCV10601_PID', 'Fpl_PID · B21F_TCV10601_PID (TT10601)')}
          />

          <WinccValveSymbol
            x={312}
            y={578}
            valve={plant.valves['B21F_TCV10602']}
            shortLabel="TCV-10602"
            onClick={() => openFaceplate('Fpl_CVAL', 'B21F_TCV10602', 'Fpl_CVAL · B21F_TCV10602')}
          />
          <PidIconButton
            x={274}
            y={594}
            labelSide="none"
            onClick={() => openFaceplate('Fpl_PID', 'B21F_TCV10602_PID', 'Fpl_PID · B21F_TCV10602_PID (TT10602)')}
          />

          <WinccValveSymbol
            x={158}
            y={474}
            valve={plant.valves['B21F_XV10603']}
            shortLabel=""
            vertical
            onClick={() => openFaceplate('Fpl_XVAL', 'B21F_XV10603', 'Fpl_XVAL · B21F_XV10603 (Manual Only)')}
          />
          <text x={158} y={524} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            XV-10603
          </text>

          <WinccValveSymbol
            x={208}
            y={474}
            valve={plant.valves['B21F_XV10604']}
            shortLabel=""
            vertical
            onClick={() => openFaceplate('Fpl_XVAL', 'B21F_XV10604', 'Fpl_XVAL · B21F_XV10604 (Manual Only)')}
          />
          <text x={208} y={524} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            XV-10604
          </text>

          <WinccValveSymbol
            x={974}
            y={406}
            valve={plant.valves['B21F_XV10602']}
            shortLabel="XV-10602 (Makeup)"
            onClick={() => openFaceplate('Fpl_XVAL', 'B21F_XV10602', 'Fpl_XVAL · B21F_XV10602 (DI Makeup)')}
          />
          <WinccValveSymbol
            x={828}
            y={506}
            valve={plant.valves['B21F_XV10601']}
            shortLabel="XV-10601 (Drain)"
            onClick={() => openFaceplate('Fpl_XVAL', 'B21F_XV10601', 'Fpl_XVAL · B21F_XV10601 (Drain)')}
          />

          {/* 8. PIPE-MOUNTED SENSORS */}
          <PipeSensorBadge
            x={590}
            y={224}
            sensor={plant.sensors['B21F_DPT10601']}
            shortLabel="B21F_DPT10601"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_DPT10601', 'Fpl_PIT · B21F_DPT10601 (B2 PCW PID)')}
          />
          <PipeSensorBadge
            x={590}
            y={250}
            sensor={plant.sensors['B21F_TT10603']}
            shortLabel="B21F_TT10603"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_TT10603', 'Fpl_TIT · B21F_TT10603')}
          />
          <PipeSensorBadge
            x={312}
            y={382}
            sensor={plant.sensors['B21F_TT10601']}
            shortLabel="B21F_TT10601"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_TT10601', 'Fpl_TIT · B21F_TT10601 (TCV10601)')}
          />
          <PipeSensorBadge
            x={202}
            y={382}
            sensor={plant.sensors['B21F_FIT10601']}
            shortLabel="B21F_FIT10601"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_FIT10601', 'Fpl_FIT · B21F_FIT10601')}
          />
          <PipeSensorBadge
            x={312}
            y={544}
            sensor={plant.sensors['B21F_TT10602']}
            shortLabel="B21F_TT10602"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_TT10602', 'Fpl_TIT · B21F_TT10602 (TCV10602)')}
          />
          <PipeSensorBadge
            x={820}
            y={406}
            sensor={plant.sensors['B21F_PIT10601']}
            shortLabel="PIT-10601"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_PIT10601', 'Fpl_PIT · B21F_PIT10601 (XV10601/02)')}
          />
          <PipeSensorBadge
            x={910}
            y={602}
            sensor={plant.sensors['B21F_LT10601']}
            shortLabel="B21F_LT10601"
            stemDir="right"
            labelPos="right"
            onClick={() => openFaceplate('Fpl_Sensor', 'B21F_LT10601', 'Fpl_LIT · B21F_LT10601')}
          />

          {/* 9. WINCC B2 PCW PUMPS SETTINGS BUTTON & PCW PID ICON */}
          <g
            transform="translate(860, 260)"
            onClick={() => openFaceplate('Fpl_Demand', 'B2PCW', 'Fpl_Demand_B2PCW (4 Pumps)')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-b2pcw" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#wincc-btn-b2pcw)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={84} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="700">
              B2 PCW Pumps Settings
            </text>
          </g>

          <PidIconButton
            x={696}
            y={654}
            label="B2 PCW-PID (DPT10601)"
            onClick={() => openFaceplate('Fpl_PID', 'B21F_P601A_PID', 'Fpl_PID · B21F_P601A_PID (DPT10601)')}
          />
        </svg>
      </div>
    </div>
  );
};
