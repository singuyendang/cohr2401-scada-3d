import React from 'react';
import { useB5Store } from '../../store/b5Store.ts';
import { VFD_MIN_HZ, VFD_MAX_HZ } from '../../simulation/pid.ts';

/**
 * WinCC Industrial Light Mode AHU & PAU Faceplate (`Fpl_AHU_DewPoint` / `Fpl_PAU`):
 *  - Fan VFD Control (Auto/Man, Start/Stop, Clear Fault, Min 15.0 Hz floor, Fan PID)
 *  - Editable Room Temp SP, Dew Point SP, and Supply Static Press SP (SAS Pa)
 *  - 3-Way Cooling (CWCV/CHCV) & 3-Way Reheat (HWCV) Valve live % + direct PID/Valve popup links
 */
export const FplAhuPau: React.FC<{ ahuTag: string }> = ({ ahuTag }) => {
  const cfg = useB5Store((s) => s.plant.ahus[ahuTag]);
  const unit = useB5Store((s) => s.plant.equipment[ahuTag]);
  const sensors = useB5Store((s) => s.plant.sensors);
  const valves = useB5Store((s) => s.plant.valves);
  const setEquipmentMode = useB5Store((s) => s.setEquipmentMode);
  const commandEquipment = useB5Store((s) => s.commandEquipment);
  const setEquipmentManualSP = useB5Store((s) => s.setEquipmentManualSP);
  const setEquipmentFault = useB5Store((s) => s.setEquipmentFault);
  const clearEquipmentFault = useB5Store((s) => s.clearEquipmentFault);
  const updateAhuSetpoints = useB5Store((s) => s.updateAhuSetpoints);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  if (!cfg || !unit) return <div className="p-3 text-xs text-red-700 font-bold">Unknown AHU/PAU: {ahuTag}</div>;

  const isPau = ahuTag.includes('PAU');
  const cwValve = valves[cfg.cwValveTag];
  const hwValve = cfg.hwValveTag ? valves[cfg.hwValveTag] : undefined;
  const sat = sensors[cfg.satSensorTag];
  const rat = sensors[cfg.ratSensorTag];
  const rah = sensors[cfg.rahSensorTag];
  const sas = sensors[cfg.sasSensorTag];
  const dp = sensors[cfg.dewPointSensorTag];

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Header + Authentic WinCC Graphic */}
      <div className="flex items-center justify-between bg-white border border-slate-400 rounded p-2 shadow-xs">
        <div>
          <div className="text-[10px] text-blue-700 font-bold">{isPau ? 'PAU (Fresh Air)' : 'AHU (Dew Point Control)'}</div>
          <div className="text-sm font-black text-slate-950">{cfg.label}</div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border ${
                unit.status === 'RUNNING'
                  ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
                  : unit.faulted
                  ? 'bg-red-100 border-red-600 text-red-700 animate-alarm-flash'
                  : 'bg-slate-200 border-slate-400 text-slate-700'
              }`}
            >
              {unit.status} · {unit.frequencyHz.toFixed(1)} Hz
            </span>
            <span className="text-[10px] text-slate-600 font-bold">{unit.runHours.toFixed(0)}h</span>
          </div>
        </div>
        <img src={isPau ? '/scada/pau.png' : '/scada/ahu.png'} alt={ahuTag} className="w-16 h-12 object-contain" />
      </div>

      {/* Live Air Sensors Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <button
          onClick={() => openFaceplate('Fpl_Sensor', cfg.satSensorTag, `Fpl_TIT · ${cfg.satSensorTag}`)}
          className="bg-white hover:bg-sky-50 border border-slate-400 rounded p-1.5 cursor-pointer"
        >
          <div className="text-[9px] text-slate-600 font-bold">Supply Temp</div>
          <div className="text-xs font-black text-blue-700">{sat?.pv.toFixed(1)} °C</div>
        </button>
        <button
          onClick={() => openFaceplate('Fpl_Sensor', cfg.ratSensorTag, `Fpl_TIT · ${cfg.ratSensorTag}`)}
          className="bg-white hover:bg-sky-50 border border-slate-400 rounded p-1.5 cursor-pointer"
        >
          <div className="text-[9px] text-slate-600 font-bold">Room Temp</div>
          <div className="text-xs font-black text-slate-950">{rat?.pv.toFixed(1)} °C</div>
        </button>
        <button
          onClick={() => openFaceplate('Fpl_Sensor', cfg.rahSensorTag, `Fpl_HIT · ${cfg.rahSensorTag}`)}
          className="bg-white hover:bg-sky-50 border border-slate-400 rounded p-1.5 cursor-pointer"
        >
          <div className="text-[9px] text-slate-600 font-bold">Room RH</div>
          <div className="text-xs font-black text-emerald-700">{rah?.pv.toFixed(1)} %</div>
        </button>
        <button
          onClick={() => openFaceplate('Fpl_Sensor', cfg.dewPointSensorTag, `Fpl_TIT · ${cfg.dewPointSensorTag}`)}
          className="bg-white hover:bg-sky-50 border border-slate-400 rounded p-1.5 cursor-pointer"
        >
          <div className="text-[9px] text-slate-600 font-bold">Dew Point</div>
          <div className="text-xs font-black text-cyan-800">{dp?.pv.toFixed(1)} °C</div>
        </button>
        <button
          onClick={() => openFaceplate('Fpl_Sensor', cfg.sasSensorTag, `Fpl_PIT · ${cfg.sasSensorTag}`)}
          className="bg-white hover:bg-sky-50 border border-slate-400 rounded p-1.5 cursor-pointer col-span-2"
        >
          <div className="text-[9px] text-slate-600 font-bold">Duct Static Press (SAS)</div>
          <div className="text-xs font-black text-amber-700">{sas?.pv.toFixed(0)} Pa (SP {cfg.sasSP} Pa)</div>
        </button>
      </div>

      {/* Editable Setpoints */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="text-[9.5px] uppercase font-black text-blue-800">Room & Duct Setpoints</div>
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <label className="block text-[9px] text-slate-600 font-bold">Room (°C)</label>
            <input
              type="number"
              step={0.5}
              min={16}
              max={28}
              value={cfg.roomTempSP}
              onChange={(e) => updateAhuSetpoints(ahuTag, { roomTempSP: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1 py-0.5 text-right font-bold"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-600 font-bold">DewPt (°C)</label>
            <input
              type="number"
              step={0.5}
              min={4}
              max={18}
              value={cfg.dewPointSP}
              onChange={(e) => updateAhuSetpoints(ahuTag, { dewPointSP: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1 py-0.5 text-right font-bold"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-600 font-bold">SAS (Pa)</label>
            <input
              type="number"
              step={10}
              min={150}
              max={600}
              value={cfg.sasSP}
              onChange={(e) => updateAhuSetpoints(ahuTag, { sasSP: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1 py-0.5 text-right font-bold"
            />
          </div>
        </div>
      </div>

      {/* 3-Way Control Valves & PID Quick Launchers */}
      <div className="bg-sky-50 border border-sky-400 rounded p-2 space-y-1.5">
        <div className="text-[9.5px] uppercase font-black text-sky-900">
          3-Way Bypass Coils (Constant CHW/HW Header DP)
        </div>
        <div className="space-y-1">
          {cwValve && (
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded px-2 py-1">
              <span className="font-bold text-cyan-800">
                {isPau ? 'CHCV' : 'CWCV'}: {cwValve.positionPct.toFixed(0)}%
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => openFaceplate('Fpl_CVAL', cwValve.tag, `Fpl_CVAL · ${cwValve.tag}`)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-400 text-[9.5px] font-bold cursor-pointer"
                >
                  Valve
                </button>
                <button
                  onClick={() => openFaceplate('Fpl_PID', cfg.cwPidTag, `Fpl_PID · ${cfg.cwPidTag}`)}
                  className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9.5px] font-bold cursor-pointer"
                >
                  PID+Trend
                </button>
              </div>
            </div>
          )}
          {hwValve && cfg.hwPidTag && (
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded px-2 py-1">
              <span className="font-bold text-pink-700">HWCV (Reheat): {hwValve.positionPct.toFixed(0)}%</span>
              <div className="flex gap-1">
                <button
                  onClick={() => openFaceplate('Fpl_CVAL', hwValve.tag, `Fpl_CVAL · ${hwValve.tag}`)}
                  className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-400 text-[9.5px] font-bold cursor-pointer"
                >
                  Valve
                </button>
                <button
                  onClick={() => openFaceplate('Fpl_PID', cfg.hwPidTag, `Fpl_PID · ${cfg.hwPidTag}`)}
                  className="px-1.5 py-0.5 rounded bg-pink-600 hover:bg-pink-500 text-white text-[9.5px] font-bold cursor-pointer"
                >
                  PID+Trend
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between bg-white border border-slate-300 rounded px-2 py-1">
            <span className="font-bold text-emerald-800">Supply Fan VFD: {unit.frequencyHz.toFixed(1)} Hz</span>
            <button
              onClick={() => openFaceplate('Fpl_PID', cfg.fanPidTag, `Fpl_PID · ${cfg.fanPidTag}`)}
              className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-bold cursor-pointer"
            >
              Fan PID+Trend
            </button>
          </div>
        </div>
      </div>

      {/* Mode & Fan VFD Controls */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setEquipmentMode(ahuTag, 'AUTO')}
            className={`py-1 rounded border font-bold cursor-pointer ${
              unit.mode === 'AUTO' ? 'bg-blue-600 border-blue-800 text-white' : 'bg-slate-100 border-slate-400 text-slate-600'
            }`}
          >
            AUTO
          </button>
          <button
            onClick={() => setEquipmentMode(ahuTag, 'MANUAL')}
            className={`py-1 rounded border font-bold cursor-pointer ${
              unit.mode === 'MANUAL' ? 'bg-amber-600 border-amber-800 text-white' : 'bg-slate-100 border-slate-400 text-slate-600'
            }`}
          >
            MANUAL
          </button>
        </div>

        {unit.mode === 'MANUAL' && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span>Manual Fan Hz (15–50)</span>
              <span className="text-amber-700">{unit.manualSP.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              min={VFD_MIN_HZ}
              max={VFD_MAX_HZ}
              step={0.5}
              value={unit.manualSP}
              onChange={(e) => setEquipmentManualSP(ahuTag, Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5">
          <button
            disabled={unit.mode !== 'MANUAL' || unit.faulted}
            onClick={() => commandEquipment(ahuTag, 'START')}
            className="py-1 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            START
          </button>
          <button
            disabled={unit.mode !== 'MANUAL'}
            onClick={() => commandEquipment(ahuTag, 'STOP')}
            className="py-1 rounded bg-slate-600 hover:bg-slate-500 border border-slate-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            STOP
          </button>
          <button
            disabled={!unit.faulted}
            onClick={() => clearEquipmentFault(ahuTag)}
            className="py-1 rounded bg-amber-600 hover:bg-amber-500 border border-amber-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            CLR FLT
          </button>
        </div>
      </div>

      <div className="bg-red-50 border border-red-300 rounded p-1.5 flex items-center justify-between">
        <span className="text-[10px] text-red-900 font-bold">Simulation Test</span>
        <button
          onClick={() => setEquipmentFault(ahuTag, !unit.faulted)}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
            unit.faulted
              ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
              : 'bg-red-100 border-red-600 text-red-800 hover:bg-red-200'
          }`}
        >
          {unit.faulted ? 'Clear Fault' : 'Inject AHU Fault'}
        </button>
      </div>
    </div>
  );
};
