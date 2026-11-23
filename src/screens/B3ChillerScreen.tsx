import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import type { EquipmentUnit } from '../types/scada.ts';
import {
  PidIconButton,
  PipeArrow,
  PipeSensorBadge,
  PipeTee,
  WinccPipeNetwork,
  WinccPumpSymbol,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Custom 3D Air-Cooled Chiller Graphic (CH-21 / CH-22):
 *  - Finned V-coil outdoor condenser deck + louvered air intake frame
 *  - 2 top-mounted spinning coaxial condenser fans (Mẫu 2: Green RUNNING / Blue STARTING-STOPPING / Gray STOPPED / Red FAULTED)
 *  - Lower compressor & evaporator barrel housing with live % FLA & mode/status bar
 *  - ZERO cooling tower connections!
 */
const AirCooledChillerSymbol: React.FC<{
  x: number;
  y: number;
  unit: EquipmentUnit;
  shortName: string;
  onClick: () => void;
}> = ({ x, y, unit, shortName, onClick }) => {
  const isRun = unit.status === 'RUNNING';
  const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';
  const frameStroke = unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#334155';
  const badgeBg = unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#64748b';
  const ambientAir = unit.telemetry.condEWT ?? 31.0;

  return (
    <g
      data-scada-tag={unit.tag}
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer group"
    >
      {/* Heat rejection upward airflow streaks above top condenser fans when running */}
      {isRun && (
        <g stroke="#0284c7" strokeWidth={1.6} strokeDasharray="3 3" opacity={0.75}>
          <line x1={58} y1={-6} x2={58} y2={-22} />
          <line x1={74} y1={-4} x2={74} y2={-20} />
          <line x1={164} y1={-6} x2={164} y2={-22} />
          <line x1={180} y1={-4} x2={180} y2={-20} />
          <polygon points="58,-25 54,-19 62,-19" fill="#0284c7" />
          <polygon points="164,-25 160,-19 168,-19" fill="#0284c7" />
        </g>
      )}

      {/* Heavy steel structural skid base */}
      <rect x={4} y={118} width={228} height={9} rx={2} fill="#334155" stroke="#0f172a" strokeWidth={1.3} />

      {/* Main Outdoor Air-Cooled Chiller Cabinet */}
      <rect
        x={10}
        y={14}
        width={216}
        height={104}
        rx={4}
        fill="#e2e8f0"
        stroke={frameStroke}
        strokeWidth={2.2}
        className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
      />

      {/* Top Condenser Fan Shroud Deck */}
      <rect x={14} y={4} width={208} height={14} rx={2} fill="#475569" stroke="#0f172a" strokeWidth={1.2} />
      {/* 2 Top-Mounted Coaxial Spinning Condenser Fans (Mẫu 2) */}
      <IndustrialFanSvg x={66} y={14} radius={17} variant="hvac" status={unit.status} faulted={unit.faulted} />
      <IndustrialFanSvg x={170} y={14} radius={17} variant="hvac" status={unit.status} faulted={unit.faulted} />

      {/* Finned V-Coil Air-Cooled Condenser Bank (distinctive V-coil geometry!) */}
      <g transform="translate(18, 34)">
        <rect x={0} y={0} width={200} height={42} rx={2} fill="#cbd5e1" stroke="#475569" strokeWidth={1.1} />
        {/* Left & Right V-Coil Heat Exchanger Slanted Fin Banks */}
        <polygon points="6,4 48,38 56,38 14,4" fill="#94a3b8" stroke="#1e293b" strokeWidth={1} />
        <polygon points="94,4 56,38 48,38 86,4" fill="#64748b" stroke="#1e293b" strokeWidth={1} />
        <polygon points="106,4 148,38 156,38 114,4" fill="#94a3b8" stroke="#1e293b" strokeWidth={1} />
        <polygon points="194,4 156,38 148,38 186,4" fill="#64748b" stroke="#1e293b" strokeWidth={1} />
        {/* Fin louvers */}
        {[10, 18, 26, 34].map((ly) => (
          <line key={ly} x1={4} y1={ly} x2={196} y2={ly} stroke="#334155" strokeWidth={0.7} strokeOpacity={0.55} />
        ))}
        <text x={100} y={24} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
          V-COIL AIR CONDENSER ({ambientAir.toFixed(1)} °C AIR)
        </text>
      </g>

      {/* Lower Evaporator Barrel & Screw/Scroll Compressor Compartment */}
      <g transform="translate(18, 80)">
        <rect x={0} y={0} width={200} height={32} rx={2} fill="#f8fafc" stroke="#334155" strokeWidth={1.1} />
        {/* Insulated Evaporator Cylinder */}
        <rect x={6} y={6} width={78} height={20} rx={8} fill="#0e7490" stroke="#0f172a" strokeWidth={1.1} />
        <text x={45} y={19} textAnchor="middle" fill="#e0f2fe" fontSize="8" fontFamily="monospace" fontWeight="900">
          EVAPORATOR
        </text>
        {/* Status + Mode + FLA Readout */}
        <rect x={90} y={5} width={44} height={22} rx={2} fill={badgeBg} stroke="#0f172a" strokeWidth={0.9} />
        <text x={112} y={15} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
          {unit.status === 'RUNNING' ? 'RUN' : unit.faulted ? 'FAULT' : isTransit ? 'TRANS' : 'STOP'}
        </text>
        <text x={112} y={24} textAnchor="middle" fill="#f1f5f9" fontSize="7" fontFamily="monospace" fontWeight="800">
          {unit.mode === 'AUTO' ? 'AUTO' : 'MAN'}
        </text>
        <rect x={138} y={5} width={56} height={22} rx={2} fill="#dcfce7" stroke="#166534" strokeWidth={1} />
        <text x={166} y={14.5} textAnchor="middle" fill="#052e16" fontSize="7.5" fontFamily="monospace" fontWeight="800">
          FLA %
        </text>
        <text x={166} y={24} textAnchor="middle" fill="#14532d" fontSize="9" fontFamily="monospace" fontWeight="900">
          {unit.loadPct.toFixed(1)}%
        </text>
      </g>

      {/* Tag Header Banner */}
      <rect x={66} y={128} width={104} height={16} rx={2} fill="#0f172a" />
      <text x={118} y={139.5} textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="900">
        {shortName} (AIR)
      </text>
    </g>
  );
};

/**
 * Scr_B3_HVAC_CHILLED.Pdl — Building 3 Dedicated Air-Cooled Chiller Plant
 *  - 2 Air-Cooled Chillers: B31F_CH21 (Duty) & B31F_CH22 (Standby), ZERO Cooling Towers!
 *  - Interlock chain: CH2xCHV OpenFB -> CH2xCHWP RUNNING -> CHWPS1 >= 1.5 bar -> permits CH2x
 *  - Manual-only bypass valve B31F_BPMV
 *  - Independent CHW supply (B31F_CHSTS1) feeding strictly B3M1F_AHU01/02 & 8 Building 3 FCUs
 */
export const B3ChillerScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const chwp21Run = plant.equipment['B31F_CH21CHWP'].status === 'RUNNING';
  const chwp22Run = plant.equipment['B31F_CH22CHWP'].status === 'RUNNING';
  const anyChwpRun = chwp21Run || chwp22Run;
  const bypassFlow = anyChwpRun && plant.valves['B31F_BPMV'].positionPct > 2;
  const ch21Flow = chwp21Run && plant.valves['B31F_CH21CHV'].openFB;
  const ch22Flow = chwp22Run && plant.valves['B31F_CH22CHV'].openFB;

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Air-Cooled Chiller System (`Scr_B3_HVAC_CHILLED.Pdl` · `CH-21 & CH-22`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Dedicated Air-Cooled Chiller Yard (No Cooling Towers) · CHW Supply CHSTS1: {plant.sensors['B31F_CHSTS1'].pv.toFixed(1)} °C ·
            CHWPS1 PID SP: {plant.pids['B31F_CH21CHWP_PID'].sp.toFixed(1)} bar · Isolated from Building 5
          </p>
        </div>
        <StatusLegend />
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1200 570" className="w-full min-w-[1000px] h-auto select-none">
          {/* =============================================================== */}
          {/* 1. CHW SUPPLY NETWORK (BRIGHT CYAN #00cfe8 — TO B3 AHUs & FCUs) */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={10}
            segments={[
              { d: 'M 140 72 L 620 72 L 620 398 L 796 398', flowing: anyChwpRun, reverse: true },
              { d: 'M 620 218 L 796 218', flowing: ch21Flow, reverse: true },
              { d: 'M 620 398 L 796 398', flowing: ch22Flow, reverse: true },
              { d: 'M 490 162 L 620 162', flowing: bypassFlow, reverse: true },
            ]}
          />
          <PipeTee x={620} y={162} color="#00cfe8" orientation="left" />
          <PipeTee x={620} y={218} color="#00cfe8" orientation="right" />

          {/* =============================================================== */}
          {/* 2. CHW RETURN NETWORK (DARK TEAL #008f91 — STRICTLY TO SUCTION) */}
          {/* Return jogs LEFT ABOVE pumps (y=204) -> Suction header (x=310)  */}
          {/* -> LEFT suction ports -> Pump TOP-RIGHT discharge -> x=540 Bus  */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#008f91"
            strokeWidth={10}
            segments={[
              // Return Header from B3 AHUs/FCUs -> down x=490 -> jog LEFT at y=204 (ABOVE pump!) -> Suction bus x=310
              { d: 'M 140 132 L 490 132 L 490 204 L 310 204 L 310 436', flowing: anyChwpRun },
              // Pump Suction Inlets (LEFT side of pump volute)
              { d: 'M 310 266 L 411 266', flowing: chwp21Run },
              { d: 'M 310 436 L 411 436', flowing: chwp22Run },
              // Pump Discharge Outlets (TOP-RIGHT nozzle y-10 -> common discharge manifold x=540)
              { d: 'M 441 256 L 540 256', flowing: chwp21Run },
              { d: 'M 441 426 L 540 426', flowing: chwp22Run },
              // Common Discharge Manifold (x=540) -> CH21CHV / CH22CHV -> Chiller Evaporator Inlets
              { d: 'M 540 256 L 540 426', flowing: anyChwpRun },
              { d: 'M 540 256 L 796 256', flowing: ch21Flow },
              { d: 'M 540 426 L 796 426', flowing: ch22Flow },
            ]}
          />
          <PipeTee x={490} y={162} color="#008f91" orientation="right" />
          <PipeTee x={310} y={266} color="#008f91" orientation="right" />
          <PipeTee x={540} y={256} color="#008f91" orientation="down" />
          <PipeTee x={540} y={426} color="#008f91" orientation="up" />

          {/* Flow Direction Arrows */}
          <PipeArrow x={200} y={72} dir="left" active={anyChwpRun} />
          <PipeArrow x={410} y={72} dir="left" active={anyChwpRun} />
          <PipeArrow x={200} y={132} dir="right" active={anyChwpRun} />
          <PipeArrow x={410} y={132} dir="right" active={anyChwpRun} />
          <PipeArrow x={400} y={204} dir="left" active={anyChwpRun} />
          <PipeArrow x={310} y={350} dir="down" active={chwp22Run} />
          <PipeArrow x={358} y={266} dir="right" active={chwp21Run} />
          <PipeArrow x={358} y={436} dir="right" active={chwp22Run} />
          <PipeArrow x={488} y={256} dir="right" active={chwp21Run} />
          <PipeArrow x={488} y={426} dir="right" active={chwp22Run} />
          <PipeArrow x={620} y={115} dir="up" active={anyChwpRun} />
          <PipeArrow x={620} y={310} dir="up" active={ch22Flow} />
          <PipeArrow x={765} y={218} dir="left" active={ch21Flow} />
          <PipeArrow x={765} y={256} dir="right" active={ch21Flow} />
          <PipeArrow x={765} y={398} dir="left" active={ch22Flow} />
          <PipeArrow x={765} y={426} dir="right" active={ch22Flow} />

          {/* Left Building 3 Destination Header Labels */}
          <g transform="translate(18, 52)">
            <rect x={0} y={0} width={122} height={38} rx={3} fill="#0f172a" stroke="#00cfe8" strokeWidth={1.5} />
            <text x={61} y={16} textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              CHW SUPPLY TO
            </text>
            <text x={61} y={29} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
              B3 AHUs &amp; 8 FCUs
            </text>
          </g>
          <g transform="translate(18, 112)">
            <rect x={0} y={0} width={122} height={38} rx={3} fill="#0f172a" stroke="#008f91" strokeWidth={1.5} />
            <text x={61} y={16} textAnchor="middle" fill="#5eead4" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              CHW RETURN FROM
            </text>
            <text x={61} y={29} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
              B3 AHUs &amp; 8 FCUs
            </text>
          </g>

          {/* =============================================================== */}
          {/* 3. CHWP VFD PUMPS (CH21CHWP & CH22CHWP)                         */}
          {/* =============================================================== */}
          <WinccPumpSymbol
            x={425}
            y={266}
            unit={plant.equipment['B31F_CH21CHWP']}
            shortTag="B31F_CH21CHWP"
            onClick={() => openFaceplate('Fpl_VFD', 'B31F_CH21CHWP', 'Fpl_VFD · B31F_CH21CHWP')}
          />
          <WinccPumpSymbol
            x={425}
            y={436}
            unit={plant.equipment['B31F_CH22CHWP']}
            shortTag="B31F_CH22CHWP"
            onClick={() => openFaceplate('Fpl_VFD', 'B31F_CH22CHWP', 'Fpl_VFD · B31F_CH22CHWP')}
          />

          {/* =============================================================== */}
          {/* 4. VALVES: MANUAL BYPASS BPMV + EVAP ISOLATION CH21CHV/22CHV    */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={555}
            y={162}
            valve={plant.valves['B31F_BPMV']}
            shortLabel="BPMV (MAN)"
            onClick={() => openFaceplate('Fpl_CVAL', 'B31F_BPMV', 'Fpl_CVAL · B31F_BPMV (Manual Only)')}
          />
          <WinccValveSymbol
            x={692}
            y={256}
            valve={plant.valves['B31F_CH21CHV']}
            shortLabel="CH21CHV"
            onClick={() => openFaceplate('Fpl_XVAL', 'B31F_CH21CHV', 'Fpl_XVAL · B31F_CH21CHV')}
          />
          <WinccValveSymbol
            x={692}
            y={426}
            valve={plant.valves['B31F_CH22CHV']}
            shortLabel="CH22CHV"
            onClick={() => openFaceplate('Fpl_XVAL', 'B31F_CH22CHV', 'Fpl_XVAL · B31F_CH22CHV')}
          />

          {/* =============================================================== */}
          {/* 5. TWO AIR-COOLED CHILLERS (CH-21 DUTY & CH-22 STANDBY)         */}
          {/* =============================================================== */}
          <AirCooledChillerSymbol
            x={794}
            y={144}
            unit={plant.equipment['B31F_CH21']}
            shortName="CH-21"
            onClick={() => openFaceplate('Fpl_CH', 'B31F_CH21', 'Fpl_CH · B31F_CH21 (Air-Cooled Chiller)')}
          />
          <AirCooledChillerSymbol
            x={794}
            y={324}
            unit={plant.equipment['B31F_CH22']}
            shortName="CH-22"
            onClick={() => openFaceplate('Fpl_CH', 'B31F_CH22', 'Fpl_CH · B31F_CH22 (Air-Cooled Chiller)')}
          />

          {/* Air-Cooled Yard Info Panel (Right) */}
          <g transform="translate(1044, 152)">
            <rect x={0} y={0} width={140} height={154} rx={5} fill="#e2e8f0" stroke="#334155" strokeWidth={1.4} />
            <text x={70} y={18} textAnchor="middle" fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
              AIR-COOLED YARD
            </text>
            <line x1={10} y1={24} x2={130} y2={24} stroke="#94a3b8" strokeWidth={1} />
            <text x={10} y={40} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Cooling Medium:</text>
            <text x={10} y={52} fill="#0369a1" fontSize="8.5" fontFamily="monospace" fontWeight="900">Ambient Air (V-Coil)</text>
            <text x={10} y={70} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Ambient Dry-Bulb:</text>
            <text x={10} y={82} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
              {(plant.sandbox.ambientWetBulbC + 8.5).toFixed(1)} °C
            </text>
            <text x={10} y={100} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">B3 Cooling Load:</text>
            <text x={10} y={112} fill="#15803d" fontSize="9.5" fontFamily="monospace" fontWeight="900">
              {plant.sandbox.b3CoolingLoadPct.toFixed(0)} %
            </text>
            <text x={10} y={130} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Interlock Sequence:</text>
            <text x={10} y={142} fill="#334155" fontSize="7.5" fontFamily="monospace" fontWeight="700">
              CHV → CHWP → CHWPS1
            </text>
          </g>

          {/* =============================================================== */}
          {/* 6. PIPE-MOUNTED SENSORS (WELDED ON PIPE CENTERLINES)            */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={305}
            y={72}
            sensor={plant.sensors['B31F_CHSTS1']}
            shortLabel="B31F_CHSTS1"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_CHSTS1', 'Fpl_TIT · B31F_CHSTS1')}
          />
          <PipeSensorBadge
            x={305}
            y={132}
            sensor={plant.sensors['B31F_CHRTS2']}
            shortLabel="B31F_CHRTS2"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_CHRTS2', 'Fpl_TIT · B31F_CHRTS2')}
          />
          <PipeSensorBadge
            x={548}
            y={72}
            sensor={plant.sensors['B31F_BPPS1']}
            shortLabel="B31F_BPPS1"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_BPPS1', 'Fpl_PIT · B31F_BPPS1')}
          />
          <PipeSensorBadge
            x={490}
            y={202}
            sensor={plant.sensors['B31F_BPPS2']}
            shortLabel="B31F_BPPS2"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_BPPS2', 'Fpl_PIT · B31F_BPPS2')}
          />
          <PipeSensorBadge
            x={620}
            y={114}
            sensor={plant.sensors['B31F_BPTS3']}
            shortLabel="B31F_BPTS3"
            stemDir="right"
            labelPos="right"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_BPTS3', 'Fpl_TIT · B31F_BPTS3')}
          />
          <PipeSensorBadge
            x={540}
            y={346}
            sensor={plant.sensors['B31F_CHWPS1']}
            shortLabel="B31F_CHWPS1"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_CHWPS1', 'Fpl_PIT · B31F_CHWPS1 (CHWP PID)')}
          />

          {/* =============================================================== */}
          {/* 7. WINCC BLUE DEMAND SETTINGS BUTTONS & PID ICON                */}
          {/* =============================================================== */}
          {(
            [
              { y: 268, id: 'B3CH', label: 'Chiller Settings (B3CH)' },
              { y: 304, id: 'B3CHWP', label: 'CHWP Settings (B3CHWP)' },
            ] as const
          ).map((btn) => (
            <g
              key={btn.id}
              transform={`translate(24, ${btn.y})`}
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
                width={176}
                height={26}
                rx={3}
                fill={`url(#wincc-btn-${btn.id})`}
                stroke="#1e3a8a"
                strokeWidth={1.3}
                className="group-hover:brightness-110"
              />
              <text x={88} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">
                {btn.label}
              </text>
            </g>
          ))}

          <PidIconButton
            x={168}
            y={356}
            label="CHWP-PID (CHWPS1)"
            onClick={() => openFaceplate('Fpl_PID', 'B31F_CH21CHWP_PID', 'Fpl_PID · B31F_CH21CHWP_PID (CHWPS1)')}
          />
        </svg>
      </div>
    </div>
  );
};
