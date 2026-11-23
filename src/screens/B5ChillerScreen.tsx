import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PidIconButton,
  PipeArrow,
  PipeCross,
  PipeSensorBadge,
  PipeTee,
  WinccChillerSymbol,
  WinccCoolingTowerSymbol,
  WinccPipeNetwork,
  WinccPumpSymbol,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';

/**
 * Scr_B5_ChillerSystem — Reference WinCC GraCS P&ID Standard:
 *  - ZERO Future equipment/pipes/valves
 *  - ZERO cross-system sensors (NO DPT10501 or TT10501 here — those belong strictly to PCW!)
 *  - CHW Pumps (CH11..13CHWP) track B51F_CHWPS1 (4.0 bar SP)
 *  - CWP Pumps (CT11..13CWP) track B51F_PIT10505 (2.2 bar SP)
 *  - CT Fans (CT11..19FN) track B51F_TT10505 (25.0 °C SP)
 *  - Seamless 4-pass rounded pipe networks with flanged T-fittings (PipeTee) at all junctions
 *  - Every sensor mounted squarely ON its physical pipe centerline
 */
export const B5ChillerScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyChwpRun = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const anyCwpRun = ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );
  const ch14Run = plant.equipment['B51F_CH14'].status === 'RUNNING';
  const ch14PumpRun = plant.equipment['B51F_CH14CHWP'].status === 'RUNNING';
  const hwpRun = plant.equipment['B51F_CH11HWP'].status === 'RUNNING';
  const heFlow = anyChwpRun && plant.valves['B51F_HEMV'].positionPct > 2;
  const bypassFlow = anyChwpRun && plant.valves['B51F_BPMV'].positionPct > 2;

  const chTrainFlow = (n: number) =>
    plant.equipment[`B51F_CH${n}CHWP`].status === 'RUNNING' && plant.valves[`B51F_CH${n}CHV`].openFB;
  const condTrainFlow = (n: number) =>
    anyCwpRun && plant.valves[`B51F_CH${n}CDV`].openFB;

  const ctIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Chiller & Cooling Tower System (`Scr_B5_ChillerSystem.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            CHWP Header (CHWPS1 SP: {plant.pids['B51F_CH11CHWP_PID'].sp.toFixed(1)} bar) · CWP Header (PIT10505 SP:{' '}
            {plant.pids['B51F_CT11CWP_PID'].sp.toFixed(1)} bar) · CT Fans (TT10505 SP: {plant.pids['B51F_CT11FN_PID'].sp.toFixed(1)} °C · WB{' '}
            {plant.sandbox.ambientWetBulbC.toFixed(1)} °C)
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Authentic WinCC Industrial Gray Canvas */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1320 680" className="w-full min-w-[1100px] h-auto select-none">
          {/* =============================================================== */}
          {/* 1. CHW SUPPLY NETWORK (BRIGHT CYAN #00cfe8 — UNIFORM 10px)      */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={10}
            segments={[
              { d: 'M 115 48 L 444 48 L 444 548 L 648 548', flowing: anyChwpRun || ch14PumpRun, reverse: true },
              { d: 'M 115 86 L 184 86 L 184 48', flowing: anyChwpRun, reverse: true },
              { d: 'M 184 86 L 184 222 L 154 222', flowing: heFlow },
              { d: 'M 78 198 L 122 198', flowing: anyChwpRun },
              { d: 'M 366 226 L 444 226', flowing: bypassFlow, reverse: true },
              { d: 'M 444 276 L 648 276', flowing: chTrainFlow(11), reverse: true },
              { d: 'M 444 358 L 648 358', flowing: chTrainFlow(12), reverse: true },
              { d: 'M 444 440 L 648 440', flowing: chTrainFlow(13), reverse: true },
            ]}
          />
          {/* Flanged Tees on CHW Supply */}
          <PipeTee x={184} y={48} color="#00cfe8" orientation="down" />
          <PipeTee x={184} y={86} color="#00cfe8" orientation="left" />
          <PipeTee x={444} y={226} color="#00cfe8" orientation="left" />
          <PipeTee x={444} y={276} color="#00cfe8" orientation="right" />
          <PipeTee x={444} y={358} color="#00cfe8" orientation="right" />
          <PipeTee x={444} y={440} color="#00cfe8" orientation="right" />

          {/* =============================================================== */}
          {/* 2. CHW RETURN NETWORK (DARK TEAL #008f91 — UNIFORM 10px)        */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#008f91"
            strokeWidth={10}
            segments={[
              // CHW Return Header -> vertical drop x=366 -> jog left y=270 -> CHWP Suction Manifold x=310 (y=270..578)
              { d: 'M 115 128 L 366 128 L 366 270 L 310 270 L 310 578', flowing: anyChwpRun || ch14PumpRun },
              { d: 'M 115 162 L 210 162 L 210 128', flowing: anyChwpRun },
              { d: 'M 210 162 L 210 198 L 154 198', flowing: heFlow },
              { d: 'M 78 232 L 122 232', flowing: anyChwpRun, reverse: true },
              // CHWP Pump Suction Inlets (LEFT side of pump volute, y = yDisch + 10)
              { d: 'M 310 306 L 352 306', flowing: plant.equipment['B51F_CH11CHWP'].status === 'RUNNING' },
              { d: 'M 310 388 L 352 388', flowing: plant.equipment['B51F_CH12CHWP'].status === 'RUNNING' },
              { d: 'M 310 470 L 352 470', flowing: plant.equipment['B51F_CH13CHWP'].status === 'RUNNING' },
              { d: 'M 310 578 L 352 578', flowing: ch14PumpRun },
              // CHWP Pump Discharge Outlets (TOP-RIGHT nozzle aligned cleanly to y=296, 378, 460, 568)
              { d: 'M 382 296 L 420 296', flowing: plant.equipment['B51F_CH11CHWP'].status === 'RUNNING' },
              { d: 'M 382 378 L 420 378', flowing: plant.equipment['B51F_CH12CHWP'].status === 'RUNNING' },
              { d: 'M 382 460 L 420 460', flowing: plant.equipment['B51F_CH13CHWP'].status === 'RUNNING' },
              { d: 'M 382 568 L 648 568', flowing: ch14PumpRun },
              { d: 'M 420 296 L 420 460', flowing: anyChwpRun },
              // Discharge Bus -> Chillers CHI1-1..CHI1-3 Evaporator Inlet
              { d: 'M 420 296 L 648 296', flowing: chTrainFlow(11) },
              { d: 'M 420 378 L 648 378', flowing: chTrainFlow(12) },
              { d: 'M 420 460 L 648 460', flowing: chTrainFlow(13) },
            ]}
          />
          {/* Flanged Tees & Cross on CHW Return */}
          <PipeTee x={210} y={128} color="#008f91" orientation="down" />
          <PipeTee x={210} y={162} color="#008f91" orientation="left" />
          <PipeTee x={366} y={226} color="#008f91" orientation="right" />
          <PipeTee x={310} y={306} color="#008f91" orientation="right" />
          <PipeTee x={310} y={388} color="#008f91" orientation="right" />
          <PipeTee x={310} y={470} color="#008f91" orientation="right" />
          <PipeTee x={420} y={296} color="#008f91" orientation="down" />
          <PipeCross x={420} y={378} color="#008f91" />
          <PipeTee x={420} y={460} color="#008f91" orientation="up" />

          {/* =============================================================== */}
          {/* 3. CONDENSER RETURN TO CT (DEEP ROYAL BLUE #2c5ec4 — 10px/8px)  */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#2c5ec4"
            strokeWidth={10}
            segments={[
              { d: 'M 882 440 L 882 214 L 484 214 L 484 24 L 1154 24', flowing: anyCwpRun },
              { d: 'M 740 276 L 882 276', flowing: condTrainFlow(11) },
              { d: 'M 740 358 L 882 358', flowing: condTrainFlow(12) },
              { d: 'M 740 440 L 882 440', flowing: condTrainFlow(13) },
            ]}
          />
          <WinccPipeNetwork
            color="#2c5ec4"
            strokeWidth={8}
            segments={ctIndices.map((idx) => {
              const cx = 530 + (idx - 1) * 78;
              const n = 10 + idx;
              const ctFlow = plant.valves[`B51F_CT${n}IV`].openFB && plant.valves[`B51F_CT${n}OV`].openFB && anyCwpRun;
              return { d: `M ${cx} 24 L ${cx} 86`, flowing: ctFlow };
            })}
          />
          <PipeTee x={882} y={276} color="#2c5ec4" orientation="left" />
          <PipeTee x={882} y={358} color="#2c5ec4" orientation="left" />
          {ctIndices.slice(0, 8).map((idx) => (
            <PipeTee key={`ti-${idx}`} x={530 + (idx - 1) * 78} y={24} color="#2c5ec4" orientation="down" size={8} />
          ))}

          {/* =============================================================== */}
          {/* 4. CONDENSER SUPPLY FROM CT (SKY BLUE #5da0e8 — 10px/8px)       */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#5da0e8"
            strokeWidth={8}
            segments={ctIndices.map((idx) => {
              const cx = 530 + (idx - 1) * 78;
              const n = 10 + idx;
              const ctFlow = plant.valves[`B51F_CT${n}IV`].openFB && plant.valves[`B51F_CT${n}OV`].openFB && anyCwpRun;
              return { d: `M ${cx} 152 L ${cx} 200`, flowing: ctFlow };
            })}
          />
          <WinccPipeNetwork
            color="#5da0e8"
            strokeWidth={10}
            segments={[
              // CT Outlet Supply Header -> CWP Suction Manifold x=1208 (y=200..470)
              { d: 'M 530 200 L 1208 200 L 1208 470', flowing: anyCwpRun },
              // CWP Pump Suction Inlets (RIGHT side of left-facing pump volute, y = yDisch + 10)
              { d: 'M 1089 306 L 1208 306', flowing: plant.equipment['B51F_CT11CWP'].status === 'RUNNING', reverse: true },
              { d: 'M 1089 388 L 1208 388', flowing: plant.equipment['B51F_CT12CWP'].status === 'RUNNING', reverse: true },
              { d: 'M 1089 470 L 1208 470', flowing: plant.equipment['B51F_CT13CWP'].status === 'RUNNING', reverse: true },
              // CWP Pump Discharge Outlets (TOP-LEFT nozzle aligned cleanly to y=296, 378, 460 -> Bus x=942)
              { d: 'M 942 296 L 1059 296', flowing: plant.equipment['B51F_CT11CWP'].status === 'RUNNING', reverse: true },
              { d: 'M 942 378 L 1059 378', flowing: plant.equipment['B51F_CT12CWP'].status === 'RUNNING', reverse: true },
              { d: 'M 942 460 L 1059 460', flowing: plant.equipment['B51F_CT13CWP'].status === 'RUNNING', reverse: true },
              { d: 'M 942 296 L 942 460', flowing: anyCwpRun },
              { d: 'M 740 296 L 942 296', flowing: condTrainFlow(11), reverse: true },
              { d: 'M 740 378 L 942 378', flowing: condTrainFlow(12), reverse: true },
              { d: 'M 740 460 L 942 460', flowing: condTrainFlow(13), reverse: true },
            ]}
          />
          {ctIndices.slice(1).map((idx) => (
            <PipeTee key={`to-${idx}`} x={530 + (idx - 1) * 78} y={200} color="#5da0e8" orientation="up" size={8} />
          ))}
          <PipeTee x={1208} y={306} color="#5da0e8" orientation="left" />
          <PipeTee x={1208} y={388} color="#5da0e8" orientation="left" />
          <PipeTee x={942} y={296} color="#5da0e8" orientation="down" />
          <PipeCross x={942} y={378} color="#5da0e8" />
          <PipeTee x={942} y={460} color="#5da0e8" orientation="up" />

          {/* =============================================================== */}
          {/* 5. CHI1-4 HEAT RECOVERY HOT PIPES (DEEP RED-PINK & LIGHT PINK!) */}
          {/* Strictly separated from blue Cooling Tower pipes!               */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#d9387a"
            strokeWidth={10}
            segments={[
              { d: 'M 740 548 L 1246 548', flowing: ch14Run && hwpRun },
              { d: 'M 1174 548 L 1174 576 L 1246 576', flowing: ch14Run && hwpRun },
            ]}
          />
          <PipeTee x={1174} y={548} color="#d9387a" orientation="down" />

          <WinccPipeNetwork
            color="#f39ac1"
            strokeWidth={10}
            segments={[
              { d: 'M 740 568 L 1054 568 L 1054 636 L 1246 636', flowing: ch14Run && hwpRun, reverse: true },
              { d: 'M 1174 636 L 1174 608 L 1246 608', flowing: ch14Run && hwpRun, reverse: true },
            ]}
          />
          <PipeTee x={1174} y={636} color="#f39ac1" orientation="up" />

          {/* Directional Flow Arrows & Building Labels */}
          <PipeArrow x={144} y={48} dir="left" active={anyChwpRun} />
          <PipeArrow x={312} y={48} dir="left" active={anyChwpRun} />
          <PipeArrow x={144} y={86} dir="left" active={anyChwpRun} />
          <PipeArrow x={144} y={128} dir="right" active={anyChwpRun} />
          <PipeArrow x={144} y={162} dir="right" active={anyChwpRun} />
          {[
            { n: 11, yT: 276, yB: 296 },
            { n: 12, yT: 358, yB: 378 },
            { n: 13, yT: 440, yB: 460 },
          ].map(({ n, yT, yB }) => (
            <g key={`arr-${n}`}>
              <PipeArrow x={526} y={yT} dir="left" active={chTrainFlow(n)} />
              <PipeArrow x={526} y={yB} dir="right" active={chTrainFlow(n)} />
              <PipeArrow x={838} y={yT} dir="right" active={condTrainFlow(n)} />
              <PipeArrow x={838} y={yB} dir="left" active={condTrainFlow(n)} />
            </g>
          ))}
          <PipeArrow x={526} y={548} dir="left" active={ch14PumpRun} />
          <PipeArrow x={526} y={568} dir="right" active={ch14PumpRun} />
          <PipeArrow x={840} y={548} dir="right" active={ch14Run} />
          <PipeArrow x={840} y={568} dir="left" active={ch14Run} />
          <PipeArrow x={1210} y={548} dir="right" active={ch14Run} />
          <PipeArrow x={1210} y={576} dir="right" active={ch14Run} />
          <PipeArrow x={1210} y={608} dir="left" active={ch14Run} />
          <PipeArrow x={1210} y={636} dir="left" active={ch14Run} />

          <text x={14} y={51} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">To AC Building 5</text>
          <text x={14} y={89} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">To AC Building 2</text>
          <text x={10} y={131} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">From AC Building 5</text>
          <text x={10} y={165} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">From AC Building 2</text>
          <text x={10} y={201} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="700">To PCW Sys</text>
          <text x={8} y={235} fill="#0f172a" fontSize="7.5" fontFamily="monospace" fontWeight="700">From PCW Sys</text>
          <text x={1252} y={551} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">To AC Bld 2</text>
          <text x={1252} y={579} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">To AC Bld 5</text>
          <text x={1252} y={611} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">From AC Bld 2</text>
          <text x={1252} y={639} fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="800">From AC Bld 5</text>

          {/* =============================================================== */}
          {/* 6. PLATE HEAT EXCHANGER (REAL WINCC HE.png) + HEMV              */}
          {/* =============================================================== */}
          <image href="/scada/HE.png" x={115} y={184} width={44} height={60} preserveAspectRatio="xMidYMid meet" />
          <text x={137} y={252} textAnchor="middle" fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            HE
          </text>
          <WinccValveSymbol
            x={184}
            y={222}
            valve={plant.valves['B51F_HEMV']}
            shortLabel="B51F_HEMV"
            onClick={() => openFaceplate('Fpl_CVAL', 'B51F_HEMV', 'Fpl_CVAL · B51F_HEMV (Manual)')}
          />

          {/* =============================================================== */}
          {/* 7. COOLING TOWERS CT1..CT9 (HORIZONTAL ACROSS TOP RIGHT)        */}
          {/* =============================================================== */}
          {ctIndices.map((idx) => {
            const tx = 502 + (idx - 1) * 78;
            const n = 10 + idx;
            const fnTag = `B51F_CT${n}FN`;
            const ivTag = `B51F_CT${n}IV`;
            const ovTag = `B51F_CT${n}OV`;
            return (
              <WinccCoolingTowerSymbol
                key={n}
                x={tx}
                y={86}
                index={idx}
                fan={plant.equipment[fnTag]}
                inValve={plant.valves[ivTag]}
                outValve={plant.valves[ovTag]}
                onClickFan={() => openFaceplate('Fpl_VFD', fnTag, `Fpl_VFD · ${fnTag}`)}
                onClickInValve={() => openFaceplate('Fpl_XVAL', ivTag, `Fpl_XVAL · ${ivTag}`)}
                onClickOutValve={() => openFaceplate('Fpl_XVAL', ovTag, `Fpl_XVAL · ${ovTag}`)}
                onClickPid={() => openFaceplate('Fpl_PID', 'B51F_CT11FN_PID', 'Fpl_PID · B51F_CT11FN_PID (TT10505)')}
              />
            );
          })}

          {/* =============================================================== */}
          {/* 8. ACTIVE CHILLERS STACKED VERTICALLY (CHI1-1..CHI1-4 ONLY!)    */}
          {/* =============================================================== */}
          {[
            { n: 11, code: 'CHI1-1', y: 258 },
            { n: 12, code: 'CHI1-2', y: 340 },
            { n: 13, code: 'CHI1-3', y: 422 },
          ].map(({ n, code, y }) => {
            const chTag = `B51F_CH${n}`;
            return (
              <g key={chTag}>
                <WinccValveSymbol
                  x={586}
                  y={y + 18}
                  valve={plant.valves[`${chTag}CHV`]}
                  shortLabel={`CHV1-${n - 10}`}
                  onClick={() => openFaceplate('Fpl_XVAL', `${chTag}CHV`, `Fpl_XVAL · ${chTag}CHV`)}
                />
                <WinccChillerSymbol
                  x={648}
                  y={y}
                  unit={plant.equipment[chTag]}
                  displayCode={code}
                  onClickControl={() => openFaceplate('Fpl_CH', chTag, `Fpl_CH · ${chTag}`)}
                  onClickData={() => openFaceplate('Fpl_CHData', chTag, `Fpl_CHData · ${chTag}`)}
                />
                <WinccValveSymbol
                  x={786}
                  y={y + 18}
                  valve={plant.valves[`${chTag}CDV`]}
                  shortLabel={`CDV1-${n - 10}`}
                  onClick={() => openFaceplate('Fpl_XVAL', `${chTag}CDV`, `Fpl_XVAL · ${chTag}CDV`)}
                />
              </g>
            );
          })}

          {/* CHI1-4 Heat Recovery (Real B51F_CH14) */}
          <WinccValveSymbol
            x={586}
            y={548}
            valve={plant.valves['B51F_CH14CHV']}
            shortLabel="CHV1-4"
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_CH14CHV', 'Fpl_XVAL · B51F_CH14CHV')}
          />
          <WinccChillerSymbol
            x={648}
            y={530}
            unit={plant.equipment['B51F_CH14']}
            displayCode="CHI1-4"
            subtitle="Heat Recovery"
            onClickControl={() => openFaceplate('Fpl_CH', 'B51F_CH14', 'Fpl_CH · B51F_CH14 (Heat Recovery)')}
            onClickData={() => openFaceplate('Fpl_CHData', 'B51F_CH14', 'Fpl_CHData · B51F_CH14')}
          />

          {/* =============================================================== */}
          {/* 9. ACTIVE PUMPS (CHWP VERTICAL LEFT, CWP VERTICAL RIGHT)        */}
          {/* Centered at yDisch + 10 so Suction meets volute & Discharge     */}
          {/* aligns dead-on with the top tangential nozzle!                  */}
          {/* =============================================================== */}
          <WinccPumpSymbol x={366} y={306} unit={plant.equipment['B51F_CH11CHWP']} shortTag="B51F_CH11CHWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH11CHWP', 'Fpl_VFD · B51F_CH11CHWP')} />
          <WinccPumpSymbol x={366} y={388} unit={plant.equipment['B51F_CH12CHWP']} shortTag="B51F_CH12CHWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH12CHWP', 'Fpl_VFD · B51F_CH12CHWP')} />
          <WinccPumpSymbol x={366} y={470} unit={plant.equipment['B51F_CH13CHWP']} shortTag="B51F_CH13CHWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH13CHWP', 'Fpl_VFD · B51F_CH13CHWP')} />
          <WinccPumpSymbol x={366} y={578} unit={plant.equipment['B51F_CH14CHWP']} shortTag="B51F_CH14CHWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH14CHWP', 'Fpl_VFD · B51F_CH14CHWP')} />

          <WinccPumpSymbol x={1075} y={306} direction="left" unit={plant.equipment['B51F_CT11CWP']} shortTag="B51F_CT11CWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CT11CWP', 'Fpl_VFD · B51F_CT11CWP')} />
          <WinccPumpSymbol x={1075} y={388} direction="left" unit={plant.equipment['B51F_CT12CWP']} shortTag="B51F_CT12CWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CT12CWP', 'Fpl_VFD · B51F_CT12CWP')} />
          <WinccPumpSymbol x={1075} y={470} direction="left" unit={plant.equipment['B51F_CT13CWP']} shortTag="B51F_CT13CWP" onClick={() => openFaceplate('Fpl_VFD', 'B51F_CT13CWP', 'Fpl_VFD · B51F_CT13CWP')} />

          {/* Manual Bypass Valve B51F_BPMV mounted ON bypass bridge */}
          <WinccValveSymbol
            x={405}
            y={226}
            valve={plant.valves['B51F_BPMV']}
            shortLabel="B51F_BPMV"
            onClick={() => openFaceplate('Fpl_CVAL', 'B51F_BPMV', 'Fpl_CVAL · B51F_BPMV (Manual Only)')}
          />

          {/* =============================================================== */}
          {/* 10. SENSORS ANCHORED SQUARELY ON THEIR EXACT PIPE CENTERLINES!  */}
          {/* =============================================================== */}
          {/* B51F_CHSTS1 on top CHW Supply pipe (y=48) */}
          <PipeSensorBadge
            x={246}
            y={48}
            sensor={plant.sensors['B51F_CHSTS1']}
            shortLabel="B51F_CHSTS1"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_CHSTS1', 'Fpl_TIT · B51F_CHSTS1')}
          />
          {/* B51F_CHRTS2 on CHW Return pipe (y=128) */}
          <PipeSensorBadge
            x={246}
            y={128}
            sensor={plant.sensors['B51F_CHRTS2']}
            shortLabel="B51F_CHRTS2"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_CHRTS2', 'Fpl_TIT · B51F_CHRTS2')}
          />
          {/* B51F_BPPS2 on left bypass vertical pipe (x=366) */}
          <PipeSensorBadge
            x={366}
            y={174}
            sensor={plant.sensors['B51F_BPPS2']}
            shortLabel="B51F_BPPS2"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_BPPS2', 'Fpl_PIT · B51F_BPPS2')}
          />
          {/* B51F_BPPS1 on right bypass vertical pipe (x=444), facing left into open gap above return */}
          <PipeSensorBadge
            x={444}
            y={94}
            sensor={plant.sensors['B51F_BPPS1']}
            shortLabel="B51F_BPPS1"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_BPPS1', 'Fpl_PIT · B51F_BPPS1')}
          />
          {/* B51F_BPTS3 on bypass return pipe (x=366) */}
          <PipeSensorBadge
            x={366}
            y={248}
            sensor={plant.sensors['B51F_BPTS3']}
            shortLabel="B51F_BPTS3"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_BPTS3', 'Fpl_TIT · B51F_BPTS3')}
          />
          {/* B51F_CHWPS1 directly ON CHWP common discharge header (x=492, y=296) — Controls CH11..13CHWP PID! */}
          <PipeSensorBadge
            x={492}
            y={296}
            sensor={plant.sensors['B51F_CHWPS1']}
            shortLabel="B51F_CHWPS1"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_CHWPS1', 'Fpl_PIT · B51F_CHWPS1 (CHWP PID)')}
          />
          {/* B51F_HCHPS1 directly ON CH14CHWP discharge horizontal pipe (x=492, y=568) */}
          <PipeSensorBadge
            x={492}
            y={568}
            sensor={plant.sensors['B51F_HCHPS1']}
            shortLabel="B51F_HCHPS1"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HCHPS1', 'Fpl_PIT · B51F_HCHPS1')}
          />
          {/* B51F_PIT10505 directly ON CT11CWP discharge header pipe (x=992, y=296) — Controls CWP PID! */}
          <PipeSensorBadge
            x={992}
            y={296}
            sensor={plant.sensors['B51F_PIT10505']}
            shortLabel="B51F_PIT10505"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_PIT10505', 'Fpl_PIT · B51F_PIT10505 (CWP PID)')}
          />
          {/* B51F_TT10505 directly ON CT Outlet Supply drop pipe (x=1208, y=240) — Controls ALL 9 CT Fans! */}
          <PipeSensorBadge
            x={1208}
            y={240}
            sensor={plant.sensors['B51F_TT10505']}
            shortLabel="B51F_TT10505"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_TT10505', 'Fpl_TIT · B51F_TT10505 (CT Fan PID)')}
          />

          {/* =============================================================== */}
          {/* 11. WINCC SETTINGS BUTTONS & PID CURVE ICONS                    */}
          {/* =============================================================== */}
          {(
            [
              { y: 292, id: 'B5CT', label: 'Cooling Tower Settings' },
              { y: 326, id: 'B5CH', label: 'Chiller Settings' },
              { y: 360, id: 'B5CHWP', label: 'CHWP Settings' },
              { y: 394, id: 'B5CWP', label: 'CWP Settings' },
            ] as const
          ).map((btn) => (
            <g
              key={btn.id}
              transform={`translate(22, ${btn.y})`}
              onClick={() => openFaceplate('Fpl_Demand', btn.id, `Fpl_Demand_${btn.id}`)}
              className="cursor-pointer group"
            >
              <defs>
                <linearGradient id={`wincc-btn-${btn.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
              <rect
                x={0}
                y={0}
                width={152}
                height={24}
                rx={3}
                fill={`url(#wincc-btn-${btn.id})`}
                stroke="#1e3a8a"
                strokeWidth={1.3}
                className="group-hover:brightness-110"
              />
              <text x={76} y={15.5} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">
                {btn.label}
              </text>
            </g>
          ))}

          <PidIconButton x={246} y={322} label="CHWP11-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CH11CHWP_PID', 'Fpl_PID · B51F_CH11CHWP_PID (CHWPS1)')} />
          <PidIconButton x={246} y={352} label="CHWP12-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CH11CHWP_PID', 'Fpl_PID · B51F_CH11CHWP_PID (CHWPS1)')} />
          <PidIconButton x={246} y={382} label="CHWP13-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CH11CHWP_PID', 'Fpl_PID · B51F_CH11CHWP_PID (CHWPS1)')} />
          <PidIconButton x={344} y={622} label="CHWP14-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CH14CHWP_PID', 'Fpl_PID · B51F_CH14CHWP_PID (HCHPS1)')} />

          <PidIconButton x={1284} y={292} label="CWP11-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CT11CWP_PID', 'Fpl_PID · B51F_CT11CWP_PID (PIT10505)')} />
          <PidIconButton x={1284} y={326} label="CWP12-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CT11CWP_PID', 'Fpl_PID · B51F_CT11CWP_PID (PIT10505)')} />
          <PidIconButton x={1284} y={360} label="CWP13-PID" onClick={() => openFaceplate('Fpl_PID', 'B51F_CT11CWP_PID', 'Fpl_PID · B51F_CT11CWP_PID (PIT10505)')} />
        </svg>
      </div>
    </div>
  );
};
