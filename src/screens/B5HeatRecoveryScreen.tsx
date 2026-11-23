import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PidIconButton,
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  WinccChillerSymbol,
  WinccPipeNetwork,
  WinccPumpSymbol,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';

/**
 * Scr_B5_HeatRecovery.Pdl — Faithful to fds_img_34.png (WinCC GraCS)
 *  - ZERO Future equipment/pipes (Future 2nd HWP & Future 2nd Chiller removed)
 *  - Hot Water Supply (light pink #eb9ee3) vs Hot Water Return (deep magenta-pink #e03c86)
 *  - NO Cooling Tower routing — hot condenser water goes exclusively to AHU reheat coils
 *  - Every sensor (HSTS1, HRTS2, HBPPS1, HBPPS2, HBPTS3, HCLPS1) welded squarely ON its pipe centerline
 *  - HBPMV strictly Manual-only
 */
export const B5HeatRecoveryScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const ch14 = plant.equipment['B51F_CH14'];
  const hwp = plant.equipment['B51F_CH11HWP'];
  const ch14Chwp = plant.equipment['B51F_CH14CHWP'];
  const cdv14 = plant.valves['B51F_CH14CDV'];
  const hbpmv = plant.valves['B51F_HBPMV'];

  const hotFlow = hwp.status === 'RUNNING' && cdv14.openFB;
  const bypassFlow = hwp.status === 'RUNNING' && hbpmv.positionPct > 2;

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Silicons Carbide · Heat Recovery System (`Scr_B5_HeatRecovery.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Hot Supply HSTS1: {plant.sensors['B51F_HSTS1'].pv.toFixed(1)} °C · Return HRTS2:{' '}
            {plant.sensors['B51F_HRTS2'].pv.toFixed(1)} °C · HWP1-1 PID (HBPPS1 SP:{' '}
            {plant.pids['B51F_CH11HWP_PID'].sp.toFixed(1)} bar) · Coupled to AHU 3-Way HWCV Reheat (No CT Routing)
          </p>
        </div>
        <StatusLegend />
      </div>

      {/* Dual-end Quick Bar linking CH14 Cold-End Pump & HEMV for complete operator visibility */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <button
          onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH14CHWP', 'Fpl_VFD · B51F_CH14CHWP (Cold-End Pump)')}
          className="px-2.5 py-1 rounded bg-[#101c30] border border-[#223552] hover:border-cyan-400 text-slate-200 flex items-center gap-2 cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              ch14Chwp.faulted ? 'bg-red-500' : ch14Chwp.status === 'RUNNING' ? 'bg-green-500' : 'bg-slate-500'
            }`}
          />
          <span>CH14 Cold-End Pump (`B51F_CH14CHWP`):</span>
          <span className="text-cyan-300 font-bold">{ch14Chwp.frequencyHz.toFixed(1)} Hz</span>
          <span className="text-slate-400">| HCHPS1: {plant.sensors['B51F_HCHPS1'].pv.toFixed(2)} bar</span>
        </button>
        <button
          onClick={() => openFaceplate('Fpl_PID', 'B51F_CH14CHWP_PID', 'Fpl_PID · B51F_CH14CHWP_PID (HCHPS1)')}
          className="px-2.5 py-1 rounded bg-[#101c30] border border-[#223552] hover:border-cyan-400 text-cyan-300 cursor-pointer"
        >
          CH14CHWP PID (SP {plant.pids['B51F_CH14CHWP_PID'].sp.toFixed(1)} bar)
        </button>
        <button
          onClick={() => openFaceplate('Fpl_CVAL', 'B51F_HEMV', 'Fpl_CVAL · B51F_HEMV (Manual Only)')}
          className="px-2.5 py-1 rounded bg-[#101c30] border border-[#223552] hover:border-amber-400 text-amber-300 cursor-pointer"
        >
          B51F_HEMV (Manual): {plant.valves['B51F_HEMV'].positionPct.toFixed(0)}%
        </button>
      </div>

      {/* Authentic WinCC Industrial Gray Canvas — exact layout of fds_img_34.png without Future units */}
      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1080 540" className="w-full min-w-[900px] h-auto select-none">
          {/* =============================================================== */}
          {/* 1. HOT WATER SUPPLY NETWORK (LIGHT PINK #eb9ee3 — 10px)         */}
          {/* CHI1-4 Upper Port -> CDV1-4 -> Vertical Riser -> TS1 -> Bld 2/5 */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#eb9ee3"
            strokeWidth={10}
            segments={[
              // Top header from vertical supply riser left to Building 2
              { d: 'M 184 56 L 626 56 L 626 392 L 774 392', flowing: hotFlow, reverse: true },
              // Branch to AC Building 5
              { d: 'M 184 96 L 268 96 L 268 56', flowing: hotFlow, reverse: true },
            ]}
          />
          <PipeTee x={268} y={56} color="#eb9ee3" orientation="down" />

          {/* =============================================================== */}
          {/* 2. HOT WATER RETURN NETWORK (DEEP MAGENTA #e03c86 — 10px)       */}
          {/* From AC Bld 2/5 -> TS2 -> PS2/TS3 -> HWP1-1 -> HCLPS1 -> CHI1-4 */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#e03c86"
            strokeWidth={10}
            segments={[
              // Return header from Building 2 -> down past PS2 & TS3 -> jog left -> LEFT suction of HWP1-1 (y=408)
              {
                d: 'M 184 156 L 516 156 L 516 322 L 360 322 L 360 408 L 430 408',
                flowing: hwp.status === 'RUNNING',
              },
              // HWP1-1 TOP-RIGHT discharge nozzle (y=398) -> up -> right -> CHI1-4 condenser inlet
              {
                d: 'M 460 398 L 532 398 L 532 356 L 592 356 L 592 414 L 774 414',
                flowing: hwp.status === 'RUNNING',
              },
              // Return branch from AC Building 5
              { d: 'M 184 196 L 268 196 L 268 156', flowing: hwp.status === 'RUNNING' },
            ]}
          />
          <PipeTee x={268} y={156} color="#e03c86" orientation="down" />

          {/* =============================================================== */}
          {/* 3. BYPASS BRIDGE (METALLIC GRAY #94a3b8 — 10px) + HBPMV         */}
          {/* Connects Return vertical drop (x=516) to Supply riser (x=626)   */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#94a3b8"
            strokeWidth={10}
            segments={[{ d: 'M 516 258 L 626 258', flowing: bypassFlow, reverse: true }]}
          />
          <PipeTee x={516} y={258} color="#e03c86" orientation="right" />
          <PipeTee x={626} y={258} color="#eb9ee3" orientation="left" />

          {/* =============================================================== */}
          {/* 4. FLOW DIRECTION ARROWS & BUILDING LABELS                      */}
          {/* =============================================================== */}
          <PipeArrow x={218} y={56} dir="left" active={hotFlow} />
          <PipeArrow x={480} y={56} dir="left" active={hotFlow} />
          <PipeArrow x={218} y={96} dir="left" active={hotFlow} />
          <PipeArrow x={218} y={156} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={480} y={156} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={218} y={196} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={516} y={292} dir="down" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={626} y={292} dir="up" active={hotFlow} />
          <PipeArrow x={388} y={408} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={500} y={398} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={654} y={392} dir="left" active={hotFlow} />
          <PipeArrow x={744} y={392} dir="left" active={hotFlow} />
          <PipeArrow x={654} y={414} dir="right" active={hwp.status === 'RUNNING'} />
          <PipeArrow x={744} y={414} dir="right" active={hwp.status === 'RUNNING'} />

          <text x={82} y={59} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            To AC Building 2
          </text>
          <text x={82} y={99} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            To AC Building 5
          </text>
          <text x={72} y={159} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            From AC Building 2
          </text>
          <text x={72} y={199} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="800">
            From AC Building 5
          </text>

          {/* =============================================================== */}
          {/* 5. VALVES (HBPMV Manual-Only + CDV1-4 Condenser Isolation)      */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={571}
            y={258}
            valve={hbpmv}
            shortLabel="HBPMV"
            onClick={() => openFaceplate('Fpl_CVAL', 'B51F_HBPMV', 'Fpl_CVAL · B51F_HBPMV (Manual Only)')}
          />
          <WinccValveSymbol
            x={700}
            y={392}
            valve={cdv14}
            shortLabel="CDV1-4"
            onClick={() => openFaceplate('Fpl_XVAL', 'B51F_CH14CDV', 'Fpl_XVAL · B51F_CH14CDV')}
          />

          {/* =============================================================== */}
          {/* 6. HOT WATER PUMP HWP1-1 (B51F_CH11HWP) + HWP-PID ICON          */}
          {/* =============================================================== */}
          <WinccPumpSymbol
            x={444}
            y={408}
            unit={hwp}
            shortTag="HWP1-1 (CH11HWP)"
            onClick={() => openFaceplate('Fpl_VFD', 'B51F_CH11HWP', 'Fpl_VFD · B51F_CH11HWP')}
          />
          <PidIconButton
            x={433}
            y={464}
            label="HWP-PID"
            onClick={() => openFaceplate('Fpl_PID', 'B51F_CH11HWP_PID', 'Fpl_PID · B51F_CH11HWP_PID (HBPPS1)')}
          />

          {/* =============================================================== */}
          {/* 7. HEAT RECOVERY CHILLER CHI1-4 (B51F_CH14)                     */}
          {/* =============================================================== */}
          <WinccChillerSymbol
            x={774}
            y={374}
            unit={ch14}
            displayCode="CHI1-4"
            subtitle="Heat Recovery"
            onClickControl={() => openFaceplate('Fpl_CH', 'B51F_CH14', 'Fpl_CH · B51F_CH14 (Heat Recovery)')}
            onClickData={() => openFaceplate('Fpl_CHData', 'B51F_CH14', 'Fpl_CHData · B51F_CH14')}
          />

          {/* =============================================================== */}
          {/* 8. PIPE-MOUNTED SENSORS (100% WELDED ON EXACT PIPE CENTERLINES) */}
          {/* =============================================================== */}
          {/* TS1 = B51F_HSTS1 directly ON top hot supply header (y=56) */}
          <PipeSensorBadge
            x={392}
            y={56}
            sensor={plant.sensors['B51F_HSTS1']}
            shortLabel="TS1 (HSTS1)"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HSTS1', 'Fpl_TIT · B51F_HSTS1')}
          />
          {/* TS2 = B51F_HRTS2 directly ON hot return header (y=156) */}
          <PipeSensorBadge
            x={392}
            y={156}
            sensor={plant.sensors['B51F_HRTS2']}
            shortLabel="TS2 (HRTS2)"
            stemDir="top"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HRTS2', 'Fpl_TIT · B51F_HRTS2')}
          />
          {/* PS2 = B51F_HBPPS2 directly ON vertical return drop (x=516, y=206) */}
          <PipeSensorBadge
            x={516}
            y={206}
            sensor={plant.sensors['B51F_HBPPS2']}
            shortLabel="PS2 (HBPPS2)"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HBPPS2', 'Fpl_PIT · B51F_HBPPS2')}
          />
          {/* PS1 = B51F_HBPPS1 directly ON vertical supply riser (x=626, y=206) */}
          <PipeSensorBadge
            x={626}
            y={206}
            sensor={plant.sensors['B51F_HBPPS1']}
            shortLabel="PS1 (HBPPS1)"
            stemDir="right"
            labelPos="right"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HBPPS1', 'Fpl_PIT · B51F_HBPPS1 (HWP PID)')}
          />
          {/* TS3 = B51F_HBPTS3 directly ON vertical return drop below bypass (x=516, y=296) */}
          <PipeSensorBadge
            x={516}
            y={296}
            sensor={plant.sensors['B51F_HBPTS3']}
            shortLabel="TS3 (HBPTS3)"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HBPTS3', 'Fpl_TIT · B51F_HBPTS3')}
          />
          {/* B51F_HCLPS1 directly ON HWP1-1 discharge top bridge (x=562, y=356) */}
          <PipeSensorBadge
            x={562}
            y={356}
            sensor={plant.sensors['B51F_HCLPS1']}
            shortLabel="B51F_HCLPS1"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B51F_HCLPS1', 'Fpl_PIT · B51F_HCLPS1')}
          />
        </svg>
      </div>
    </div>
  );
};
