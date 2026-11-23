import React from 'react';
import { useB5Store } from '../../store/b5Store.ts';
import { VFD_MIN_HZ, VFD_MAX_HZ } from '../../simulation/pid.ts';

export const FplVfdDol: React.FC<{ tag: string }> = ({ tag }) => {
  const unit = useB5Store((s) => s.plant.equipment[tag]);
  const setEquipmentMode = useB5Store((s) => s.setEquipmentMode);
  const commandEquipment = useB5Store((s) => s.commandEquipment);
  const setEquipmentManualSP = useB5Store((s) => s.setEquipmentManualSP);
  const setEquipmentFault = useB5Store((s) => s.setEquipmentFault);
  const clearEquipmentFault = useB5Store((s) => s.clearEquipmentFault);

  if (!unit) return <div className="p-3 text-xs text-red-700 font-bold">Unknown tag: {tag}</div>;

  const isVfd = unit.kind === 'vfd';
  const statusBadge =
    unit.status === 'RUNNING'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-600'
      : unit.status === 'FAULTED'
      ? 'bg-red-100 text-red-700 border-red-600 animate-alarm-flash'
      : unit.status === 'STARTING' || unit.status === 'STOPPING'
      ? 'bg-blue-100 text-blue-800 border-blue-600'
      : 'bg-slate-200 text-slate-700 border-slate-400';

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Status & Mode Header */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold">Status</div>
          <div className={`mt-1 px-2 py-0.5 text-center rounded border font-black ${statusBadge}`}>
            {unit.status}
          </div>
        </div>
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold">Control Mode</div>
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => setEquipmentMode(tag, 'AUTO')}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                unit.mode === 'AUTO'
                  ? 'bg-blue-600 border-blue-800 text-white shadow-xs'
                  : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200'
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => setEquipmentMode(tag, 'MANUAL')}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                unit.mode === 'MANUAL'
                  ? 'bg-amber-600 border-amber-800 text-white shadow-xs'
                  : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200'
              }`}
            >
              MAN
            </button>
          </div>
        </div>
      </div>

      {/* Live VFD Frequency & Run Hours */}
      <div className="grid grid-cols-2 gap-2 bg-white border border-slate-400 rounded p-2 shadow-xs">
        {isVfd ? (
          <div>
            <div className="text-[10px] text-slate-600 font-bold">Output Freq (Min {VFD_MIN_HZ} Hz)</div>
            <div className="text-base font-black text-emerald-700">{unit.frequencyHz.toFixed(1)} Hz</div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-slate-600 font-bold">Motor Type</div>
            <div className="text-sm font-black text-blue-700">DOL Starter</div>
          </div>
        )}
        <div className="text-right">
          <div className="text-[10px] text-slate-600 font-bold">Run Hours (PLC)</div>
          <div className="text-sm font-black text-slate-900">{unit.runHours.toFixed(1)} h</div>
        </div>
      </div>

      {/* Manual Speed SP */}
      {isVfd && (
        <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-700 font-bold">Man Sp (15.0 – 50.0 Hz)</span>
            <input
              type="number"
              min={VFD_MIN_HZ}
              max={VFD_MAX_HZ}
              step={0.5}
              disabled={unit.mode !== 'MANUAL'}
              value={unit.manualSP}
              onChange={(e) => setEquipmentManualSP(tag, Number(e.target.value))}
              className="w-20 bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold disabled:opacity-45"
            />
          </div>
          <input
            type="range"
            min={VFD_MIN_HZ}
            max={VFD_MAX_HZ}
            step={0.5}
            disabled={unit.mode !== 'MANUAL'}
            value={unit.manualSP}
            onChange={(e) => setEquipmentManualSP(tag, Number(e.target.value))}
            className="w-full accent-amber-600 disabled:opacity-45"
          />
        </div>
      )}

      {/* Permissives & Interlocks */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1 text-[10.5px]">
        <div className="flex justify-between">
          <span className="text-slate-600 font-bold">Interlock / STT_Perm</span>
          <span className={unit.interlockOk ? 'text-emerald-700 font-black' : 'text-red-600 font-black'}>
            {unit.interlockOk ? 'OK' : 'NG'}
          </span>
        </div>
        <div className="text-[10px] text-slate-700 truncate" title={unit.interlockReason}>
          {unit.interlockReason}
        </div>
      </div>

      {/* Manual Start / Stop / Clear Fault */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          disabled={unit.mode !== 'MANUAL' || !unit.interlockOk || unit.faulted}
          onClick={() => commandEquipment(tag, 'START')}
          className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer disabled:cursor-not-allowed"
        >
          START
        </button>
        <button
          disabled={unit.mode !== 'MANUAL'}
          onClick={() => commandEquipment(tag, 'STOP')}
          className="py-1.5 rounded bg-slate-600 hover:bg-slate-500 border border-slate-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer disabled:cursor-not-allowed"
        >
          STOP
        </button>
        <button
          disabled={!unit.faulted}
          onClick={() => clearEquipmentFault(tag)}
          className="py-1.5 rounded bg-amber-600 hover:bg-amber-500 border border-amber-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer disabled:cursor-not-allowed"
        >
          CLR FLT
        </button>
      </div>

      {/* Per-device Simulation Test Box */}
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
          {unit.faulted ? 'Clear Simulated Fault' : 'Inject VFD/Motor Fault'}
        </button>
      </div>
    </div>
  );
};
