import React from 'react';
import { useB5Store } from '../../store/b5Store.ts';

export const FplChiller: React.FC<{ tag: string; mode: 'control' | 'data' }> = ({ tag, mode }) => {
  const unit = useB5Store((s) => s.plant.equipment[tag]);
  const setEquipmentMode = useB5Store((s) => s.setEquipmentMode);
  const commandEquipment = useB5Store((s) => s.commandEquipment);
  const setEquipmentFault = useB5Store((s) => s.setEquipmentFault);
  const clearEquipmentFault = useB5Store((s) => s.clearEquipmentFault);
  const setChillerTempSP = useB5Store((s) => s.setChillerTempSP);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  if (!unit) return <div className="p-3 text-xs text-red-700 font-bold">Unknown Unit: {tag}</div>;

  const isHeatFan = tag.includes('_HP');
  const isHotWater = tag === 'B51F_CH14' || isHeatFan;
  const isAirCooled = tag.startsWith('B31F_CH');
  const unitNoun = isHeatFan ? 'Heat Fan' : isAirCooled ? 'Air-Cooled Chiller' : 'Chiller';

  if (mode === 'data') {
    const t = unit.telemetry;
    return (
      <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-500 rounded px-2.5 py-1.5">
          <span className="text-slate-700 font-bold">Modbus Comm Status</span>
          <span className="text-emerald-700 font-black">CONNECTED</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">Motor Current (% FLA)</div>
            <div className="text-base font-black text-emerald-700">{(t.fla ?? 0).toFixed(1)}%</div>
          </div>
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">
              {isHeatFan ? 'Water Flow SW' : 'Evaporator Flow SW'}
            </div>
            <div className={`text-sm font-black ${t.evapFS ? 'text-emerald-700' : 'text-amber-700'}`}>
              {t.evapFS ? 'FLOW OK' : 'NO FLOW'}
            </div>
          </div>
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">Evap Pressure</div>
            <div className="text-sm font-black text-blue-700">{(t.evapPress ?? 0).toFixed(2)} bar</div>
          </div>
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">Cond Pressure</div>
            <div className="text-sm font-black text-amber-700">{(t.condPress ?? 0).toFixed(2)} bar</div>
          </div>
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">
              {isAirCooled ? 'Ambient Air Temp' : isHeatFan ? 'HW Return Temp' : 'Cond EWT'}
            </div>
            <div className="text-sm font-black text-slate-900">{(t.condEWT ?? 0).toFixed(1)} °C</div>
          </div>
          <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
            <div className="text-[9.5px] text-slate-600 font-bold">Oil Diff Press</div>
            <div className="text-sm font-black text-slate-900">{(t.oilDP ?? 0).toFixed(2)} bar</div>
          </div>
        </div>

        <div className="bg-white border border-slate-400 rounded p-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-800 font-bold">Leaving Water Temp SP (°C)</span>
          <input
            type="number"
            step={0.5}
            min={isHotWater ? 35 : 5}
            max={isHotWater ? 52 : 14}
            value={t.spTemp ?? (isHotWater ? 45.0 : 8.0)}
            onChange={(e) => setChillerTempSP(tag, Number(e.target.value))}
            className="w-20 bg-slate-50 border-2 border-blue-500 rounded px-1.5 py-0.5 text-right text-slate-950 font-black"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold">{unitNoun} Status</div>
          <div
            className={`mt-1 text-center py-0.5 rounded font-black border ${
              unit.status === 'RUNNING'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-600'
                : unit.faulted
                ? 'bg-red-100 text-red-700 border-red-600 animate-alarm-flash'
                : unit.status === 'STARTING' || unit.status === 'STOPPING'
                ? 'bg-blue-100 text-blue-800 border-blue-600'
                : 'bg-slate-200 text-slate-700 border-slate-400'
            }`}
          >
            {unit.status}
          </div>
        </div>
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold">Mode</div>
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => setEquipmentMode(tag, 'AUTO')}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                unit.mode === 'AUTO'
                  ? 'bg-blue-600 border-blue-800 text-white'
                  : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200'
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => setEquipmentMode(tag, 'MANUAL')}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                unit.mode === 'MANUAL'
                  ? 'bg-amber-600 border-amber-800 text-white'
                  : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200'
              }`}
            >
              MAN
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-white border border-slate-400 rounded p-2 shadow-xs">
        <div>
          <div className="text-[10px] text-slate-600 font-bold">Capacity (% FLA)</div>
          <div className="text-base font-black text-emerald-700">{unit.loadPct.toFixed(1)}%</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-600 font-bold">Run Hours</div>
          <div className="text-sm font-black text-slate-900">{unit.runHours.toFixed(1)} h</div>
        </div>
      </div>

      <div className="bg-white border border-slate-400 rounded p-2 space-y-1 text-[10.5px]">
        <div className="flex justify-between">
          <span className="text-slate-600 font-bold">STT_Perm / Interlock</span>
          <span className={unit.sttPerm ? 'text-emerald-700 font-black' : 'text-red-600 font-black'}>
            {unit.sttPerm ? 'PERMITTED' : 'BLOCKED (NG)'}
          </span>
        </div>
        <div className="text-[10px] text-slate-700">{unit.interlockReason}</div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          disabled={unit.mode !== 'MANUAL' || !unit.sttPerm || unit.faulted}
          onClick={() => commandEquipment(tag, 'START')}
          className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
        >
          START
        </button>
        <button
          disabled={unit.mode !== 'MANUAL'}
          onClick={() => commandEquipment(tag, 'STOP')}
          className="py-1.5 rounded bg-slate-600 hover:bg-slate-500 border border-slate-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
        >
          STOP
        </button>
        <button
          disabled={!unit.faulted}
          onClick={() => clearEquipmentFault(tag)}
          className="py-1.5 rounded bg-amber-600 hover:bg-amber-500 border border-amber-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
        >
          CLR FLT
        </button>
      </div>

      <button
        onClick={() => openFaceplate('Fpl_CHData', tag, `${tag} · Modbus Data`)}
        className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-800 text-white font-bold cursor-pointer"
      >
        Open {unitNoun} Data (Fpl_CHData)
      </button>

      <div className="bg-red-50 border border-red-300 rounded p-2 flex items-center justify-between">
        <span className="text-[10px] text-red-900 font-bold">Simulation Test</span>
        <button
          onClick={() => setEquipmentFault(tag, !unit.faulted)}
          className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
            unit.faulted
              ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
              : 'bg-red-100 border-red-600 text-red-800 hover:bg-red-200'
          }`}
        >
          {unit.faulted ? `Clear ${unitNoun} Fault` : `Inject ${unitNoun} Trip`}
        </button>
      </div>
    </div>
  );
};
