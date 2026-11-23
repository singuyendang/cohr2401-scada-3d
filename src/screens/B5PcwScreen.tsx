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

/**
 * Static mechanical dial flow/pressure gauge icon mounted on the overhead bypass loop of FLT-501A/B.
 * Pure static SCADA indicator (no animation).
 */
const StaticDialGaugeIcon: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Stem collar on overhead bypass pipe */}
    <rect x={-3} y={-8} width={6} height={8} fill="#475569" stroke="#0f172a" strokeWidth={0.9} />
    {/* Circular mechanical gauge bezel */}
    <circle cx={0} cy={-16} r={9.5} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.3} />
    <circle cx={0} cy={-16} r={7.2} fill="#ffffff" stroke="#64748b" strokeWidth={0.8} />
    {/* Dial tick marks */}
    <line x1={-5} y1={-16} x2={-3.5} y2={-16} stroke="#334155" strokeWidth={0.8} />
    <line x1={5} y1={-16} x2={3.5} y2={-16} stroke="#334155" strokeWidth={0.8} />
    <line x1={0} y1={-21} x2={0} y2={-19.5} stroke="#334155" strokeWidth={0.8} />
    {/* Static needle */}
    <line x1={0} y1={-16} x2={3.8} y2={-19.8} stroke="#dc2626" strokeWidth={1.2} />
    <circle cx={0} cy={-16} r={1.3} fill="#0f172a" />
  </g>
);

/**
 * Scr_B5_PCW.Pdl — Dedicated Process Cooling Water Screen (100% Faithful to fds_img_39.png)
 *  - Left of E-501A & E-501B (Bright Cyan #00cfe8):
 *      E-501A outlet -> B51F_TT10501 -> merges with E-501B outlet (via B51F_TT10502) -> passes B51F_FIT10501
 *      -> ONLY AFTER FIT10501 splits UP to 2F Supply & DOWN into 2 parallel branches (XV-10503 & XV-10504)
 *      -> BELOW XV-10503/04 turns Dark Teal (#009999), merges together, and joins the far-left Return drop!
 *  - Right of E-501A & E-501B: BOTH upper PCW inlet & lower CHW supply pipes use unified Dark Teal (#009999)
 *  - Filters FLT 501A & FLT 501B include static overhead bypass loops with a mechanical dial gauge icon (no animation)
 *  - P-501A/B/C VFDs direction="left"; RO Water Supply flows strictly RIGHT->LEFT via XV-10502
 *  - P-502 DOL Auto runs ONLY when TK-501 LT10501 >= High (85%) and stops <= Low (35%)
 */
export const B5PcwScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyPcwRun = ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const xvMakeupOpen = plant.valves['B51F_XV10502'].openFB;
  const xvDrainOpen = plant.valves['B51F_XV10501'].openFB;
  const xv03Open = plant.valves['B51F_XV10503'].openFB;
  const xv04Open = plant.valves['B51F_XV10504'].openFB;
  const p502Run = plant.equipment['B51F_P502'].status === 'RUNNING';
  const tcv1Flow = plant.valves['B51F_TCV10501'].positionPct > 2;
  const tcv2Flow = plant.valves['B51F_TCV10502'].positionPct > 2;
  const lt501 = plant.sensors['B51F_LT10501'];
  const lt501Pct = Math.max(0, Math.min(100, lt501.pv));

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Process Cooling Water (`Scr_B5_PCW.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            DPT10501 SP: {plant.pids['B51F_P501A_PID'].sp.toFixed(1)} bar · TT10501/02 SP:{' '}
            {plant.pids['B51F_TCV10501_PID'].sp.toFixed(1)} °C · PIT10501:{' '}
            {plant.sensors['B51F_PIT10501'].pv.toFixed(2)} bar (XV10502:{' '}
            {xvMakeupOpen ? 'OPEN' : 'CLOSED'} · XV10501: {xvDrainOpen ? 'OPEN' : 'CLOSED'}) · TK-501:{' '}
            {lt501.pv.toFixed(1)}% (P-502 Auto H≥{lt501.alarms.haSP}% / L≤{lt501.alarms.laSP}%:{' '}
            {plant.equipment['B51F_P502'].status})
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Gray Canvas matching fds_img_39.png */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 710" className="w-full min-w-[1100px] h-auto select-none">
          {/* Floor Divider Line: BUILDING 5 - 2ND FLOOR / PCW SILICON STATION */}
          <line x1={122} y1={322} x2={1290} y2={322} stroke="#475569" strokeWidth={1.2} strokeDasharray="4 4" />
          <text x={166} y={315} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            BUILDING 5 - 2ND FLOOR
          </text>
          <text x={138} y={692} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
            PCW SILICON STATION
          </text>

          {/* =============================================================== */}
          {/* 1. PCW SUPPLY NETWORK (BRIGHT CYAN #00cfe8 — 9px / 6px)         */}
          {/* E-501A -> TT10501 + E-501B -> TT10502 -> Merge -> FIT10501      */}
          {/* -> AFTER FIT10501 splits UP to 2F & DOWN to XV-10503 / XV-10504 */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={9}
            segments={[
              // E-501A upper-left outlet -> past TT10501 -> merge E-501B -> past FIT10501 -> split node x=158
              { d: 'M 356 392 L 158 392', flowing: anyPcwRun },
              // E-501B upper-left outlet -> past TT10502 -> up x=248 into E-501A supply header (same bright cyan!)
              { d: 'M 356 534 L 248 534 L 248 392', flowing: anyPcwRun },
              // Branch 1 AFTER FIT10501: UP x=158 -> Building 5 - 2nd Floor Supply Header
              { d: 'M 158 392 L 158 28 L 560 28', flowing: anyPcwRun },
              // Branch 2 AFTER FIT10501: Straight DOWN x=158 directly into XV-10503 (x=158, y=480)
              // with 90° right branch at (158, 446) -> XV-10504 (x=208, y=480) — ALL Bright Cyan ABOVE both valves!
              { d: 'M 158 392 L 158 480', flowing: anyPcwRun && xv03Open },
              { d: 'M 158 446 L 208 446 L 208 480', flowing: anyPcwRun && xv04Open },
              // 2F Lower Production Supply Bus & Right Auto/Edge Grind Riser (x=514)
              { d: 'M 158 198 L 514 198', flowing: anyPcwRun },
              { d: 'M 514 28 L 514 268', flowing: anyPcwRun },
              // 4 Auto/Edge Grind Supply Headers (y=42, 96, 150, 226)
              { d: 'M 514 42 L 688 42', flowing: anyPcwRun },
              { d: 'M 514 96 L 688 96', flowing: anyPcwRun },
              { d: 'M 514 150 L 688 150', flowing: anyPcwRun },
              { d: 'M 514 226 L 688 226', flowing: anyPcwRun },
            ]}
          />
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={6}
            segments={[
              { d: 'M 230 28 L 230 106 L 254 106 L 254 44', flowing: anyPcwRun },
              { d: 'M 314 28 L 314 126 L 338 126 L 338 44', flowing: anyPcwRun },
              { d: 'M 398 28 L 398 106 L 422 106 L 422 44', flowing: anyPcwRun },
              { d: 'M 250 198 L 250 272 L 274 272 L 274 214', flowing: anyPcwRun },
              { d: 'M 334 198 L 334 286 L 358 286 L 358 214', flowing: anyPcwRun },
              { d: 'M 418 198 L 418 272 L 442 272 L 442 214', flowing: anyPcwRun },
            ]}
          />
          {/* Flanged Tees on Bright Cyan Supply */}
          <PipeTee x={248} y={392} color="#00cfe8" orientation="down" size={9} />
          <PipeTee x={158} y={392} color="#00cfe8" orientation="right" size={9} />
          {/* 90° Right-facing Tee directly above XV-10503 (straight vertical drop into XV-10503 + right branch to XV-10504) */}
          <PipeTee x={158} y={446} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={158} y={198} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={28} color="#00cfe8" orientation="down" size={9} />
          <PipeTee x={514} y={42} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={96} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={150} color="#00cfe8" orientation="right" size={9} />
          <PipeTee x={514} y={198} color="#00cfe8" orientation="left" size={9} />
          <PipeTee x={514} y={226} color="#00cfe8" orientation="right" size={9} />

          {/* =============================================================== */}
          {/* 2. PCW RETURN & PUMP LOOP NETWORK (DARK TEAL #009999 — 9px)     */}
          {/*  - Below XV-10503 (x=158) & XV-10504 (x=208): Dark Teal merging */}
          {/*    into far-left Return Drop (x=118)                            */}
          {/*  - FLT 501A/B static overhead bypass loops (flowing: false)     */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={9}
            segments={[
              // 2F Return Header -> Main Return Drop far-left (x=118) -> bottom (y=672) -> UP into A-501 (x=768, y=414)
              { d: 'M 560 44 L 118 44 L 118 672 L 768 672 L 768 414', flowing: anyPcwRun },
              // BELOW XV-10503 (x=158) & XV-10504 (x=208): STRICTLY Dark Teal -> Merge at y=514 -> Join far-left Return Drop (x=118)!
              { d: 'M 158 480 L 158 514', flowing: anyPcwRun && xv03Open },
              { d: 'M 208 480 L 208 514 L 118 514', flowing: anyPcwRun && (xv03Open || xv04Open) },
              // RO Water Makeup Line: STRICTLY RIGHT -> LEFT from RO-DI Package (x=1168) -> XV-10502 -> Suction Header (x=768)
              { d: 'M 1168 414 L 768 414', flowing: xvMakeupOpen },
              // 2F Lower Return Bus & Right Auto/Edge Grind Return Collector (x=496)
              { d: 'M 118 214 L 496 214', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 44 L 496 268', flowing: anyPcwRun },
              // 4 Auto/Edge Grind Return Headers (y=62, 116, 170, 254)
              { d: 'M 496 62 L 688 62', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 116 L 688 116', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 170 L 688 170', flowing: anyPcwRun, reverse: true },
              { d: 'M 496 254 L 688 254', flowing: anyPcwRun, reverse: true },
              // Pump Suction Bus (x=708, y=402..566) -> RIGHT suction of left-facing P-501A/B/C -> TOP-LEFT discharge (y=392, 474, 556) -> Bus x=542
              { d: 'M 708 402 L 708 566', flowing: anyPcwRun },
              { d: 'M 768 414 L 708 414', flowing: anyPcwRun },
              { d: 'M 708 402 L 640 402', flowing: plant.equipment['B51F_P501A'].status === 'RUNNING' },
              { d: 'M 708 484 L 640 484', flowing: plant.equipment['B51F_P501B'].status === 'RUNNING' },
              { d: 'M 708 566 L 640 566', flowing: plant.equipment['B51F_P501C'].status === 'RUNNING' },
              { d: 'M 610 392 L 542 392', flowing: plant.equipment['B51F_P501A'].status === 'RUNNING' },
              { d: 'M 610 474 L 542 474', flowing: plant.equipment['B51F_P501B'].status === 'RUNNING' },
              { d: 'M 610 556 L 542 556', flowing: plant.equipment['B51F_P501C'].status === 'RUNNING' },
              { d: 'M 542 392 L 542 556', flowing: anyPcwRun },
              // Filters FLT 501A (y=392) & FLT 501B (y=534) -> Heat Exchangers E-501A & E-501B Upper-Right Inlets (RIGHT -> LEFT)
              { d: 'M 542 392 L 400 392', flowing: anyPcwRun },
              { d: 'M 542 534 L 400 534', flowing: anyPcwRun },
              // Static overhead bypass loops over FLT 501A & FLT 501B (NO animation, carries static dial gauge!)
              { d: 'M 454 392 L 454 344 L 514 344 L 514 392', flowing: false },
              { d: 'M 454 534 L 454 486 L 514 486 L 514 534', flowing: false },
              // TK-502 Expansion Tank Drop (x=868)
              { d: 'M 868 388 L 868 414', flowing: anyPcwRun },
              // Drain Line from Suction Header (x=768, y=506) -> XV-10501 -> TK-501 -> P-502 (LEFT suction y=664, TOP-RIGHT discharge y=654) -> WW Reject
              { d: 'M 768 506 L 888 506 L 888 552', flowing: xvDrainOpen },
              { d: 'M 888 618 L 888 664 L 982 664', flowing: p502Run },
              { d: 'M 1012 654 L 1110 654', flowing: p502Run },
            ]}
          />
          {/* Flanged Tees & Crosses on Dark Teal PCW Return Network */}
          <PipeTee x={118} y={214} color="#009999" orientation="right" size={9} />
          <PipeTee x={118} y={514} color="#009999" orientation="right" size={9} />
          <PipeTee x={158} y={514} color="#009999" orientation="up" size={9} />
          <PipeTee x={454} y={392} color="#009999" orientation="up" size={9} />
          <PipeTee x={514} y={392} color="#009999" orientation="up" size={9} />
          <PipeTee x={454} y={534} color="#009999" orientation="up" size={9} />
          <PipeTee x={514} y={534} color="#009999" orientation="up" size={9} />
          <PipeTee x={496} y={44} color="#009999" orientation="down" size={9} />
          <PipeTee x={496} y={62} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={116} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={170} color="#009999" orientation="right" size={9} />
          <PipeTee x={496} y={214} color="#009999" orientation="left" size={9} />
          <PipeTee x={496} y={254} color="#009999" orientation="right" size={9} />
          <PipeTee x={542} y={392} color="#009999" orientation="down" size={9} />
          <PipeTee x={542} y={474} color="#009999" orientation="right" size={9} />
          <PipeTee x={542} y={534} color="#009999" orientation="left" size={9} />
          <PipeTee x={708} y={414} color="#009999" orientation="right" size={9} />
          <PipeTee x={708} y={484} color="#009999" orientation="left" size={9} />
          <PipeCross x={768} y={414} color="#009999" size={9} />
          <PipeTee x={768} y={506} color="#009999" orientation="right" size={9} />
          <PipeTee x={868} y={414} color="#009999" orientation="up" size={9} />

          {/* =============================================================== */}
          {/* 2B. SEPARATE CHW RETURN PIPELINE (BRIGHT CYAN #00cfe8 — OVER)   */}
          {/* Rendered in its OWN WinccPipeNetwork + clear P&ID overpass halo */}
          {/* at non-intersecting crossings (266, 534) and (118, 610)!        */}
          {/* =============================================================== */}
          {/* Crisp canvas-gray separation breaks at non-intersecting crossings */}
          <line x1={266} y1={520} x2={266} y2={548} stroke="#bcc2cb" strokeWidth={15.5} />
          <line x1={104} y1={610} x2={132} y2={610} stroke="#bcc2cb" strokeWidth={15.5} />
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={9}
            segments={[
              { d: 'M 356 426 L 266 426 L 266 610 L 106 610', flowing: tcv1Flow },
              { d: 'M 356 568 L 266 568', flowing: tcv2Flow },
            ]}
          />
          <PipeTee x={266} y={568} color="#00cfe8" orientation="right" size={9} />

          {/* =============================================================== */}
          {/* 2C. SEPARATE CHW SUPPLY PIPELINE (DARK TEAL #009999 — OVER)     */}
          {/* Rendered in its OWN WinccPipeNetwork + clear P&ID overpass halo */}
          {/* at non-intersecting crossings (118, 642) and (424, 534)!        */}
          {/* =============================================================== */}
          <line x1={104} y1={642} x2={132} y2={642} stroke="#bcc2cb" strokeWidth={15.5} />
          <line x1={424} y1={520} x2={424} y2={548} stroke="#bcc2cb" strokeWidth={15.5} />
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={9}
            segments={[
              { d: 'M 106 642 L 424 642 L 424 426 L 400 426', flowing: tcv1Flow || tcv2Flow },
              { d: 'M 424 568 L 400 568', flowing: tcv2Flow },
            ]}
          />
          <PipeTee x={424} y={568} color="#009999" orientation="left" size={9} />

          {/* =============================================================== */}
          {/* 3. 2F AREA LABELS & MINI BRANCH VALVES                          */}
          {/* =============================================================== */}
          {[
            { x: 242, y: 120, txt: 'PRODUCTION AREA' },
            { x: 326, y: 142, txt: 'PRODUCTION AREA' },
            { x: 410, y: 120, txt: 'PRODUCTION AREA' },
            { x: 262, y: 288, txt: 'PRODUCTION AREA' },
            { x: 346, y: 302, txt: 'PRODUCTION AREA' },
            { x: 430, y: 288, txt: 'PRODUCTION AREA' },
          ].map((p, i) => (
            <g key={`pa-${i}`}>
              <text x={p.x} y={p.y} textAnchor="middle" fill="#0f172a" fontSize="6.5" fontFamily="monospace" fontWeight="800">
                {p.txt}
              </text>
              <text x={p.x} y={p.y + 8} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="700">
                (F-03C;F-01;F-03F)
              </text>
            </g>
          ))}

          {[
            { y: 52, l1: 'AUTO GRIND AREA', l2: '(F-04)' },
            { y: 106, l1: 'AUTO GRIND AREA', l2: '(F-04;C-01;F-07)' },
            { y: 160, l1: 'AUTO GRIND AREA', l2: '(C-01)' },
            { y: 240, l1: 'EDGE GRIND AREA', l2: '(E-01)' },
          ].map((gItem, idx) => (
            <g key={`ag-${idx}`}>
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

          {/* Pipe Flow Arrows & Edge Labels */}
          <PipeArrow x={292} y={28} dir="right" active={anyPcwRun} />
          <PipeArrow x={292} y={44} dir="left" active={anyPcwRun} />
          <PipeArrow x={440} y={672} dir="right" active={anyPcwRun} />
          <PipeArrow x={734} y={672} dir="right" active={anyPcwRun} />
          <PipeArrow x={184} y={610} dir="left" active={tcv1Flow || tcv2Flow} />
          <PipeArrow x={184} y={642} dir="right" active={tcv1Flow || tcv2Flow} />
          <PipeArrow x={1060} y={414} dir="left" active={xvMakeupOpen} />
          <PipeArrow x={914} y={414} dir="left" active={xvMakeupOpen} />
          <PipeArrow x={1060} y={654} dir="right" active={p502Run} />

          <text x={6} y={606} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">CHILLED WATER RETURN</text>
          <text x={6} y={615} fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">TO CHILLER ROOM</text>
          <text x={6} y={638} fill="#0f172a" fontSize="7" fontFamily="monospace" fontWeight="800">CHILLED WATER SUPPLY</text>
          <text x={6} y={647} fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">FROM CHILLER ROOM</text>

          <text x={1174} y={411} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">RO WATER SUPPLY</text>
          <text x={1174} y={421} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">FROM RODI PACKAGE B5</text>
          <text x={1116} y={651} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="800">RO WATER REJECT</text>
          <text x={1116} y={661} fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">WW DISTRIBUTION</text>

          {/* =============================================================== */}
          {/* 4. HEAT EXCHANGERS (E-501A/B) & FILTERS + STATIC DIAL GAUGES    */}
          {/* =============================================================== */}
          <image href="/scada/HE.png" x={356} y={376} width={44} height={64} preserveAspectRatio="xMidYMid meet" />
          <text x={378} y={450} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            E-501A
          </text>

          <image href="/scada/HE.png" x={356} y={518} width={44} height={64} preserveAspectRatio="xMidYMid meet" />
          <text x={378} y={592} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            E-501B
          </text>

          <image href="/scada/Filter.png" x={466} y={362} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
          <text x={484} y={430} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            FLT 501A
          </text>
          <StaticDialGaugeIcon x={484} y={344} />

          <image href="/scada/Filter.png" x={466} y={504} width={36} height={58} preserveAspectRatio="xMidYMid meet" />
          <text x={484} y={572} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            FLT 501B
          </text>
          <StaticDialGaugeIcon x={484} y={486} />

          {/* =============================================================== */}
          {/* 5. 3D AIR SEPARATOR (A-501), EXPANSION TANK (TK 502), TK 501    */}
          {/* =============================================================== */}
          <g transform="translate(768, 414)">
            <rect x={-13} y={-20} width={26} height={38} rx={10} fill="#e2e8f0" stroke="#0f172a" strokeWidth={1.3} />
            <rect x={-9} y={-16} width={5} height={30} rx={2} fill="#ffffff" opacity={0.65} />
            <rect x={-4} y={-25} width={8} height={5} fill="#64748b" stroke="#0f172a" strokeWidth={1} />
            <text x={0} y={-38} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
              A-501
            </text>
            <text x={0} y={-29} textAnchor="middle" fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="800">
              AIR SEPARATOR
            </text>
          </g>

          <g transform="translate(868, 344)">
            <rect x={-22} y={-24} width={44} height={66} rx={8} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.4} />
            <rect x={-16} y={-20} width={9} height={58} rx={3} fill="#f8fafc" opacity={0.65} />
            <line x1={-14} y1={42} x2={-14} y2={50} stroke="#334155" strokeWidth={3} />
            <line x1={14} y1={42} x2={14} y2={50} stroke="#334155" strokeWidth={3} />
            <text x={0} y={-2} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
              TK 502
            </text>
            <text x={0} y={8} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="800">
              EXPANSION TANK
            </text>
            <text x={0} y={16} textAnchor="middle" fill="#334155" fontSize="6" fontFamily="monospace" fontWeight="800">
              1000 LITRES
            </text>
          </g>

          {/* TK 501 Rejected PCW Tank */}
          <g
            transform="translate(888, 586)"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_LT10501', 'Fpl_LIT · B51F_LT10501 (TK-501 Level)')}
            className="cursor-pointer group"
          >
            <rect x={-22} y={-34} width={44} height={68} rx={8} fill="#cbd5e1" stroke="#0f172a" strokeWidth={1.4} className="group-hover:stroke-blue-700" />
            <rect
              x={-18}
              y={30 - (lt501Pct / 100) * 56}
              width={36}
              height={(lt501Pct / 100) * 56}
              rx={3}
              fill="#06b6d4"
              opacity={0.75}
            />
            <line x1={-22} y1={30 - (lt501.alarms.haSP / 100) * 56} x2={22} y2={30 - (lt501.alarms.haSP / 100) * 56} stroke="#dc2626" strokeWidth={1} strokeDasharray="2 2" />
            <line x1={-22} y1={30 - (lt501.alarms.laSP / 100) * 56} x2={22} y2={30 - (lt501.alarms.laSP / 100) * 56} stroke="#ca8a04" strokeWidth={1} strokeDasharray="2 2" />
            <rect x={-16} y={-30} width={7} height={60} rx={2} fill="#ffffff" opacity={0.45} />
            <line x1={-14} y1={34} x2={-14} y2={42} stroke="#334155" strokeWidth={3} />
            <line x1={14} y1={34} x2={14} y2={42} stroke="#334155" strokeWidth={3} />
            <text x={-30} y={-2} textAnchor="end" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              TK 501
            </text>
            <text x={-30} y={8} textAnchor="end" fill="#334155" fontSize="6.5" fontFamily="monospace" fontWeight="700">
              H:{lt501.alarms.haSP}% L:{lt501.alarms.laSP}%
            </text>
          </g>

          {/* =============================================================== */}
          {/* 6. ACTIVE PCW PUMPS (P-501A/B/C direction="left" + P-502 DOL)   */}
          {/* =============================================================== */}
          <WinccPumpSymbol x={626} y={402} direction="left" unit={plant.equipment['B51F_P501A']} shortTag="P-501A" onClick={() => openFaceplate('Fpl_VFD', 'B51F_P501A', 'Fpl_VFD · B51F_P501A')} />
          <WinccPumpSymbol x={626} y={484} direction="left" unit={plant.equipment['B51F_P501B']} shortTag="P-501B" onClick={() => openFaceplate('Fpl_VFD', 'B51F_P501B', 'Fpl_VFD · B51F_P501B')} />
          <WinccPumpSymbol x={626} y={566} direction="left" unit={plant.equipment['B51F_P501C']} shortTag="P-501C" onClick={() => openFaceplate('Fpl_VFD', 'B51F_P501C', 'Fpl_VFD · B51F_P501C')} />

          <WinccPumpSymbol
            x={996}
            y={664}
            direction="right"
            unit={plant.equipment['B51F_P502']}
            shortTag="P-502 (DOL)"
            onClick={() => openFaceplate('Fpl_DOL', 'B51F_P502', 'Fpl_DOL · B51F_P502 (Rejected PCW Pump)')}
          />

          {/* =============================================================== */}
          {/* 7. VALVES (TCV-10501/02 INLINE, XV-10503/04 PARALLEL BRANCHES)  */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={312}
            y={426}
            valve={plant.valves['B51F_TCV10501']}
            shortLabel="TCV-10501"
            onClick={() => openFaceplate('Fpl_CVAL', 'B51F_TCV10501', 'Fpl_CVAL · B51F_TCV10501')}
          />
          <PidIconButton
            x={274}
            y={442}
            labelSide="none"
            onClick={() => openFaceplate('Fpl_PID', 'B51F_TCV10501_PID', 'Fpl_PID · B51F_TCV10501_PID (TT10501)')}
          />

          <WinccValveSymbol
            x={312}
            y={568}
            valve={plant.valves['B51F_TCV10502']}
            shortLabel="TCV-10502"
            onClick={() => openFaceplate('Fpl_CVAL', 'B51F_TCV10502', 'Fpl_CVAL · B51F_TCV10502')}
          />
          <PidIconButton
            x={274}
            y={584}
            labelSide="none"
            onClick={() => openFaceplate('Fpl_PID', 'B51F_TCV10502_PID', 'Fpl_PID · B51F_TCV10502_PID (TT10502)')}
          />

          {/* XV-10503 (directly inline under x=158!) & XV-10504 (parallel at x=208) */}
          <WinccValveSymbol
            x={158}
            y={480}
            valve={plant.valves['B51F_XV10503']}
            shortLabel=""
            vertical
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_XV10503', 'Fpl_XVAL · B51F_XV10503 (Manual Only)')}
          />
          <text x={158} y={530} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            XV-10503
          </text>

          <WinccValveSymbol
            x={208}
            y={480}
            valve={plant.valves['B51F_XV10504']}
            shortLabel=""
            vertical
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_XV10504', 'Fpl_XVAL · B51F_XV10504 (Manual Only)')}
          />
          <text x={208} y={530} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            XV-10504
          </text>

          {/* XV-10502 DI/RO Makeup Valve */}
          <WinccValveSymbol
            x={974}
            y={414}
            valve={plant.valves['B51F_XV10502']}
            shortLabel="XV-10502 (Makeup)"
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_XV10502', 'Fpl_XVAL · B51F_XV10502 (DI Makeup)')}
          />
          {/* XV-10501 Drain/Relief Valve */}
          <WinccValveSymbol
            x={828}
            y={506}
            valve={plant.valves['B51F_XV10501']}
            shortLabel="XV-10501 (Drain)"
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_XV10501', 'Fpl_XVAL · B51F_XV10501 (Drain)')}
          />

          {/* =============================================================== */}
          {/* 8. PIPE-MOUNTED SENSORS (EXACT ORDER: TT10501 -> FIT -> SPLIT)  */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={590}
            y={226}
            sensor={plant.sensors['B51F_DPT10501']}
            shortLabel="B51F_DPT10501"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_DPT10501', 'Fpl_PIT · B51F_DPT10501 (PCW PID)')}
          />
          <PipeSensorBadge
            x={590}
            y={254}
            sensor={plant.sensors['B51F_TT10503']}
            shortLabel="B51F_TT10503"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_TT10503', 'Fpl_TIT · B51F_TT10503')}
          />
          {/* E-501A Outlet: Hits B51F_TT10501 FIRST (x=312), then merges E-501B (x=248), THEN hits B51F_FIT10501 (x=202), THEN splits (x=158)! */}
          <PipeSensorBadge
            x={312}
            y={392}
            sensor={plant.sensors['B51F_TT10501']}
            shortLabel="B51F_TT10501"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_TT10501', 'Fpl_TIT · B51F_TT10501 (TCV10501)')}
          />
          <PipeSensorBadge
            x={202}
            y={392}
            sensor={plant.sensors['B51F_FIT10501']}
            shortLabel="B51F_FIT10501"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_FIT10501', 'Fpl_FIT · B51F_FIT10501')}
          />
          <PipeSensorBadge
            x={312}
            y={534}
            sensor={plant.sensors['B51F_TT10502']}
            shortLabel="B51F_TT10502"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_TT10502', 'Fpl_TIT · B51F_TT10502 (TCV10502)')}
          />
          <PipeSensorBadge
            x={820}
            y={414}
            sensor={plant.sensors['B51F_PIT10501']}
            shortLabel="PIT-10501"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT10501', 'Fpl_PIT · B51F_PIT10501 (XV10501/02)')}
          />
          <PipeSensorBadge
            x={910}
            y={596}
            sensor={plant.sensors['B51F_LT10501']}
            shortLabel="B51F_LT10501"
            stemDir="right"
            labelPos="right"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_LT10501', 'Fpl_LIT · B51F_LT10501')}
          />

          {/* =============================================================== */}
          {/* 9. WINCC PCW PUMPS SETTINGS BUTTON & PCW PID ICON               */}
          {/* =============================================================== */}
          <g
            transform="translate(860, 266)"
            onClick={() => openFaceplate('Fpl_Demand', 'B5PCW', 'Fpl_Demand_B5PCW')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-pcw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect
              x={0}
              y={0}
              width={158}
              height={26}
              rx={3}
              fill="url(#wincc-btn-pcw)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={79} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="700">
              PCW Pumps Settings
            </text>
          </g>

          <PidIconButton
            x={696}
            y={606}
            label="PCW-PID (DPT10501)"
            onClick={() => openFaceplate('Fpl_PID', 'B51F_P501A_PID', 'Fpl_PID · B51F_P501A_PID (DPT10501)')}
          />
        </svg>
      </div>
    </div>
  );
};
