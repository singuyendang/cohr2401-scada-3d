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
 * Custom 3D Heat Fan Graphic (B31F_HP01 / HP02 / HP03):
 *  - Named strictly "Heat Fan" per user specification
 *  - Air-source hot-water thermal unit with finned evaporator intake, spinning coaxial Mẫu 2 top fan,
 *    and insulated hot-water heat-exchanger barrel with live % FLA & mode/status readout.
 */
const HeatFanUnitSymbol: React.FC<{
  x: number;
  y: number;
  unit: EquipmentUnit;
  shortName: string;
  onClick: () => void;
}> = ({ x, y, unit, shortName, onClick }) => {
  const isRun = unit.status === 'RUNNING';
  const isTransit = unit.status === 'STARTING' || unit.status === 'STOPPING';
  const strokeCol = unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#334155';
  const badgeBg = unit.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#64748b';

  return (
    <g
      data-scada-tag={unit.tag}
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer group"
    >
      {/* Heavy skid base */}
      <rect x={4} y={96} width={186} height={8} rx={2} fill="#334155" stroke="#0f172a" strokeWidth={1.2} />

      {/* Main Heat Fan Cabinet */}
      <rect
        x={10}
        y={10}
        width={174}
        height={86}
        rx={4}
        fill="#fff1f2"
        stroke={strokeCol}
        strokeWidth={2.2}
        className={unit.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
      />

      {/* Top Air Discharge Shroud + Spinning Coaxial Heat Fan (Mẫu 2) */}
      <rect x={14} y={2} width={166} height={11} rx={2} fill="#9f1239" stroke="#0f172a" strokeWidth={1.1} />
      <IndustrialFanSvg x={48} y={48} radius={22} variant="hvac" status={unit.status} faulted={unit.faulted} />

      {/* Right Side Thermal Coil & Hot Water Condenser Telemetry */}
      <g transform="translate(80, 18)">
        <rect x={0} y={0} width={96} height={26} rx={2} fill="#fecdd3" stroke="#9f1239" strokeWidth={1} />
        {[6, 12, 18, 22].map((ly) => (
          <line key={ly} x1={4} y1={ly} x2={92} y2={ly} stroke="#be123c" strokeWidth={0.8} strokeOpacity={0.55} />
        ))}
        <text x={48} y={16} textAnchor="middle" fill="#881337" fontSize="8" fontFamily="monospace" fontWeight="900">
          HEAT FAN COIL
        </text>

        <rect x={0} y={32} width={44} height={24} rx={2} fill={badgeBg} stroke="#0f172a" strokeWidth={0.9} />
        <text x={22} y={42.5} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="900">
          {unit.status === 'RUNNING' ? 'RUN' : unit.faulted ? 'FAULT' : isTransit ? 'TRANS' : 'STOP'}
        </text>
        <text x={22} y={52} textAnchor="middle" fill="#f8fafc" fontSize="7" fontFamily="monospace" fontWeight="800">
          {unit.mode === 'AUTO' ? 'AUTO' : 'MAN'}
        </text>

        <rect x={48} y={32} width={48} height={24} rx={2} fill="#dcfce7" stroke="#166534" strokeWidth={1} />
        <text x={72} y={42} textAnchor="middle" fill="#052e16" fontSize="7" fontFamily="monospace" fontWeight="800">
          FLA %
        </text>
        <text x={72} y={52.5} textAnchor="middle" fill="#14532d" fontSize="8.5" fontFamily="monospace" fontWeight="900">
          {unit.loadPct.toFixed(1)}%
        </text>

        <text x={48} y={69} textAnchor="middle" fill="#881337" fontSize="8.5" fontFamily="monospace" fontWeight="900">
          {shortName} · SP {(unit.telemetry.spTemp ?? 45).toFixed(0)}°C
        </text>
      </g>
    </g>
  );
};

/**
 * Scr_B3_HotWaterSystem.Pdl — Building 3 Hot Water Heat Fan System
 *  - 3 Heat Fans: B31F_HP01, B31F_HP02 (Duty) & B31F_HP03 (Standby)
 *  - 3 Isolation Valves: B31F_HP01V / 02V / 03V (`Fpl_XVAL`)
 *  - 2 Hot Water VFD Pumps: B31F_HPP21 / HPP22 (`Fpl_VFD`, PID tracking `B31F_HWPS1`)
 *  - Manual-only bypass valve `B31F_HPBPMV` (`Fpl_CVAL`)
 *  - Supplies 45 °C hot water (`B31F_HPSTS1`) directly to Building 3 AHU HWCV reheat coils
 */
export const B3HeatFanScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const hpp21Run = plant.equipment['B31F_HPP21'].status === 'RUNNING';
  const hpp22Run = plant.equipment['B31F_HPP22'].status === 'RUNNING';
  const anyHppRun = hpp21Run || hpp22Run;
  const bypassFlow = anyHppRun && plant.valves['B31F_HPBPMV'].positionPct > 2;

  const hpFlow = (n: string) => anyHppRun && plant.valves[`B31F_HP${n}V`].openFB;

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Hot Water Heat Fan System (`Scr_B3_HotWaterSystem.Pdl` · `Heat Fan HP-01/02/03`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Hot Supply HPSTS1: {plant.sensors['B31F_HPSTS1'].pv.toFixed(1)} °C · Return HPRTS2: {plant.sensors['B31F_HPRTS2'].pv.toFixed(1)} °C ·
            HPP PID (HWPS1 SP: {plant.pids['B31F_HPP21_PID'].sp.toFixed(1)} bar) · Supplies B3 AHU HWCV Reheat Coils
          </p>
        </div>
        <StatusLegend />
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1200 580" className="w-full min-w-[1000px] h-auto select-none">
          {/* =============================================================== */}
          {/* 1. HOT WATER SUPPLY NETWORK (LIGHT PINK #eb9ee3 — 10px)         */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#eb9ee3"
            strokeWidth={10}
            segments={[
              { d: 'M 146 66 L 626 66 L 626 462 L 800 462', flowing: anyHppRun, reverse: true },
              { d: 'M 626 198 L 800 198', flowing: hpFlow('01'), reverse: true },
              { d: 'M 626 330 L 800 330', flowing: hpFlow('02'), reverse: true },
              { d: 'M 626 462 L 800 462', flowing: hpFlow('03'), reverse: true },
            ]}
          />
          <PipeTee x={626} y={198} color="#eb9ee3" orientation="right" />
          <PipeTee x={626} y={330} color="#eb9ee3" orientation="right" />

          {/* =============================================================== */}
          {/* 2. HOT WATER RETURN NETWORK (DEEP MAGENTA #e03c86 — TO SUCTION) */}
          {/* Return jogs LEFT ABOVE pumps (y=210) -> Suction header (x=310)  */}
          {/* -> LEFT suction ports -> Pump TOP-RIGHT discharge -> x=542 Bus  */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#e03c86"
            strokeWidth={10}
            segments={[
              // Return header from B3 AHUs -> down x=494 -> jog LEFT at y=210 (ABOVE HPP21!) -> Suction manifold x=310
              { d: 'M 146 126 L 494 126 L 494 210 L 310 210 L 310 436', flowing: anyHppRun },
              // Pump Suction Inlets (LEFT side of pump volute)
              { d: 'M 310 274 L 411 274', flowing: hpp21Run },
              { d: 'M 310 436 L 411 436', flowing: hpp22Run },
              // Pump Discharge Outlets (TOP-RIGHT nozzle y-10 -> common discharge bus x=542)
              { d: 'M 441 264 L 542 264', flowing: hpp21Run },
              { d: 'M 441 426 L 542 426', flowing: hpp22Run },
              // Common Discharge Bus (x=542) -> HP01V / HP02V / HP03V -> Heat Fan Inlets
              { d: 'M 542 232 L 542 496', flowing: anyHppRun },
              { d: 'M 542 232 L 800 232', flowing: hpFlow('01') },
              { d: 'M 542 364 L 800 364', flowing: hpFlow('02') },
              { d: 'M 542 496 L 800 496', flowing: hpFlow('03') },
            ]}
          />
          <PipeTee x={310} y={274} color="#e03c86" orientation="right" />
          <PipeTee x={542} y={264} color="#e03c86" orientation="left" />
          <PipeTee x={542} y={364} color="#e03c86" orientation="right" />
          <PipeTee x={542} y={426} color="#e03c86" orientation="left" />

          {/* =============================================================== */}
          {/* 3. BYPASS BRIDGE (METALLIC GRAY #94a3b8) + MANUAL HPBPMV        */}
          {/* =============================================================== */}
          <WinccPipeNetwork
            color="#94a3b8"
            strokeWidth={10}
            segments={[{ d: 'M 494 166 L 626 166', flowing: bypassFlow, reverse: true }]}
          />
          <PipeTee x={494} y={166} color="#e03c86" orientation="right" />
          <PipeTee x={626} y={166} color="#eb9ee3" orientation="left" />

          {/* Flow Direction Arrows */}
          <PipeArrow x={208} y={66} dir="left" active={anyHppRun} />
          <PipeArrow x={410} y={66} dir="left" active={anyHppRun} />
          <PipeArrow x={208} y={126} dir="right" active={anyHppRun} />
          <PipeArrow x={410} y={126} dir="right" active={anyHppRun} />
          <PipeArrow x={402} y={210} dir="left" active={anyHppRun} />
          <PipeArrow x={310} y={356} dir="down" active={hpp22Run} />
          <PipeArrow x={358} y={274} dir="right" active={hpp21Run} />
          <PipeArrow x={358} y={436} dir="right" active={hpp22Run} />
          <PipeArrow x={490} y={264} dir="right" active={hpp21Run} />
          <PipeArrow x={490} y={426} dir="right" active={hpp22Run} />
          <PipeArrow x={626} y={118} dir="up" active={anyHppRun} />
          <PipeArrow x={770} y={198} dir="left" active={hpFlow('01')} />
          <PipeArrow x={770} y={232} dir="right" active={hpFlow('01')} />
          <PipeArrow x={770} y={330} dir="left" active={hpFlow('02')} />
          <PipeArrow x={770} y={364} dir="right" active={hpFlow('02')} />
          <PipeArrow x={770} y={462} dir="left" active={hpFlow('03')} />
          <PipeArrow x={770} y={496} dir="right" active={hpFlow('03')} />

          {/* Destination Headers */}
          <g transform="translate(18, 46)">
            <rect x={0} y={0} width={128} height={38} rx={3} fill="#0f172a" stroke="#eb9ee3" strokeWidth={1.5} />
            <text x={64} y={16} textAnchor="middle" fill="#f5d0fe" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              HW SUPPLY TO
            </text>
            <text x={64} y={29} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
              B3 AHU01/02 HWCV
            </text>
          </g>
          <g transform="translate(18, 106)">
            <rect x={0} y={0} width={128} height={38} rx={3} fill="#0f172a" stroke="#e03c86" strokeWidth={1.5} />
            <text x={64} y={16} textAnchor="middle" fill="#fda4af" fontSize="8.5" fontFamily="monospace" fontWeight="900">
              HW RETURN FROM
            </text>
            <text x={64} y={29} textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="800">
              B3 AHU01/02 HWCV
            </text>
          </g>

          {/* =============================================================== */}
          {/* 4. HOT WATER VFD PUMPS (HPP-21 & HPP-22)                        */}
          {/* =============================================================== */}
          <WinccPumpSymbol
            x={425}
            y={274}
            unit={plant.equipment['B31F_HPP21']}
            shortTag="B31F_HPP21"
            onClick={() => openFaceplate('Fpl_VFD', 'B31F_HPP21', 'Fpl_VFD · B31F_HPP21')}
          />
          <WinccPumpSymbol
            x={425}
            y={436}
            unit={plant.equipment['B31F_HPP22']}
            shortTag="B31F_HPP22"
            onClick={() => openFaceplate('Fpl_VFD', 'B31F_HPP22', 'Fpl_VFD · B31F_HPP22')}
          />

          {/* =============================================================== */}
          {/* 5. VALVES: HPBPMV (MANUAL) + HP01V / HP02V / HP03V (XVAL)       */}
          {/* =============================================================== */}
          <WinccValveSymbol
            x={560}
            y={166}
            valve={plant.valves['B31F_HPBPMV']}
            shortLabel="HPBPMV (MAN)"
            onClick={() => openFaceplate('Fpl_CVAL', 'B31F_HPBPMV', 'Fpl_CVAL · B31F_HPBPMV (Manual Only)')}
          />
          <WinccValveSymbol
            x={698}
            y={232}
            valve={plant.valves['B31F_HP01V']}
            shortLabel="HP01V"
            onClick={() => openFaceplate('Fpl_XVAL', 'B31F_HP01V', 'Fpl_XVAL · B31F_HP01V')}
          />
          <WinccValveSymbol
            x={698}
            y={364}
            valve={plant.valves['B31F_HP02V']}
            shortLabel="HP02V"
            onClick={() => openFaceplate('Fpl_XVAL', 'B31F_HP02V', 'Fpl_XVAL · B31F_HP02V')}
          />
          <WinccValveSymbol
            x={698}
            y={496}
            valve={plant.valves['B31F_HP03V']}
            shortLabel="HP03V"
            onClick={() => openFaceplate('Fpl_XVAL', 'B31F_HP03V', 'Fpl_XVAL · B31F_HP03V')}
          />

          {/* =============================================================== */}
          {/* 6. THREE HEAT FAN UNITS (HP-01, HP-02, HP-03)                   */}
          {/* =============================================================== */}
          <HeatFanUnitSymbol
            x={798}
            y={160}
            unit={plant.equipment['B31F_HP01']}
            shortName="HEAT FAN 01"
            onClick={() => openFaceplate('Fpl_CH', 'B31F_HP01', 'Fpl_CH · B31F_HP01 (Heat Fan 01)')}
          />
          <HeatFanUnitSymbol
            x={798}
            y={292}
            unit={plant.equipment['B31F_HP02']}
            shortName="HEAT FAN 02"
            onClick={() => openFaceplate('Fpl_CH', 'B31F_HP02', 'Fpl_CH · B31F_HP02 (Heat Fan 02)')}
          />
          <HeatFanUnitSymbol
            x={798}
            y={424}
            unit={plant.equipment['B31F_HP03']}
            shortName="HEAT FAN 03"
            onClick={() => openFaceplate('Fpl_CH', 'B31F_HP03', 'Fpl_CH · B31F_HP03 (Heat Fan 03)')}
          />

          {/* Right Heat Fan Summary Box */}
          <g transform="translate(1014, 168)">
            <rect x={0} y={0} width={168} height={154} rx={5} fill="#fff1f2" stroke="#9f1239" strokeWidth={1.4} />
            <text x={84} y={18} textAnchor="middle" fill="#881337" fontSize="9" fontFamily="monospace" fontWeight="900">
              HEAT FAN PLANT
            </text>
            <line x1={10} y1={24} x2={158} y2={24} stroke="#fda4af" strokeWidth={1} />
            <text x={10} y={40} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Active Units:</text>
            <text x={10} y={53} fill="#be123c" fontSize="9.5" fontFamily="monospace" fontWeight="900">
              {plant.demands.B3HP.count} / 3 Heat Fans
            </text>
            <text x={10} y={71} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Demand Status:</text>
            <text x={10} y={84} fill="#0f172a" fontSize="9" fontFamily="monospace" fontWeight="900">
              {plant.demands.B3HP.status}
            </text>
            <text x={10} y={102} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Interlock Sequence:</text>
            <text x={10} y={115} fill="#334155" fontSize="7.5" fontFamily="monospace" fontWeight="700">
              HP0xV → HPP21/22 → HWPS1
            </text>
            <text x={10} y={133} fill="#475569" fontSize="8" fontFamily="monospace" fontWeight="800">Target Supply Temp:</text>
            <text x={10} y={145} fill="#9f1239" fontSize="9" fontFamily="monospace" fontWeight="900">
              {(plant.equipment['B31F_HP01'].telemetry.spTemp ?? 45).toFixed(1)} °C
            </text>
          </g>

          {/* =============================================================== */}
          {/* 7. PIPE-MOUNTED SENSORS                                         */}
          {/* =============================================================== */}
          <PipeSensorBadge
            x={305}
            y={66}
            sensor={plant.sensors['B31F_HPSTS1']}
            shortLabel="B31F_HPSTS1"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HPSTS1', 'Fpl_TIT · B31F_HPSTS1')}
          />
          <PipeSensorBadge
            x={305}
            y={126}
            sensor={plant.sensors['B31F_HPRTS2']}
            shortLabel="B31F_HPRTS2"
            stemDir="bottom"
            labelPos="bottom"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HPRTS2', 'Fpl_TIT · B31F_HPRTS2')}
          />
          <PipeSensorBadge
            x={548}
            y={66}
            sensor={plant.sensors['B31F_HPBPPS1']}
            shortLabel="B31F_HPBPPS1"
            stemDir="top"
            labelPos="top"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HPBPPS1', 'Fpl_PIT · B31F_HPBPPS1')}
          />
          <PipeSensorBadge
            x={494}
            y={208}
            sensor={plant.sensors['B31F_HPBPPS2']}
            shortLabel="B31F_HPBPPS2"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HPBPPS2', 'Fpl_PIT · B31F_HPBPPS2')}
          />
          <PipeSensorBadge
            x={626}
            y={114}
            sensor={plant.sensors['B31F_HPBPTS3']}
            shortLabel="B31F_HPBPTS3"
            stemDir="right"
            labelPos="right"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HPBPTS3', 'Fpl_TIT · B31F_HPBPTS3')}
          />
          <PipeSensorBadge
            x={542}
            y={346}
            sensor={plant.sensors['B31F_HWPS1']}
            shortLabel="B31F_HWPS1"
            stemDir="left"
            labelPos="left"
            onClick={() => openFaceplate('Fpl_Sensor', 'B31F_HWPS1', 'Fpl_PIT · B31F_HWPS1 (HPP PID)')}
          />

          {/* =============================================================== */}
          {/* 8. WINCC BLUE DEMAND SETTINGS BUTTON & HPP PID ICON             */}
          {/* =============================================================== */}
          <g
            transform="translate(24, 274)"
            onClick={() => openFaceplate('Fpl_Demand', 'B3HP', 'Fpl_Demand_B3HP (Heat Fan Settings)')}
            className="cursor-pointer group"
          >
            <defs>
              <linearGradient id="wincc-btn-B3HP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect
              x={0}
              y={0}
              width={180}
              height={26}
              rx={3}
              fill="url(#wincc-btn-B3HP)"
              stroke="#1e3a8a"
              strokeWidth={1.3}
              className="group-hover:brightness-110"
            />
            <text x={90} y={16.5} textAnchor="middle" fill="#ffffff" fontSize="9.5" fontFamily="sans-serif" fontWeight="700">
              Heat Fan Settings (B3HP)
            </text>
          </g>

          <PidIconButton
            x={168}
            y={326}
            label="HPP-PID (HWPS1)"
            onClick={() => openFaceplate('Fpl_PID', 'B31F_HPP21_PID', 'Fpl_PID · B31F_HPP21_PID (HWPS1)')}
          />
        </svg>
      </div>
    </div>
  );
};
