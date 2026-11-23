import React from 'react';
import type { DemandId } from '../../types/scada.ts';
import { useB5Store } from '../../store/b5Store.ts';

export const FplDemand: React.FC<{ demandId: string }> = ({ demandId }) => {
  const id = demandId as DemandId;
  const seq = useB5Store((s) => s.plant.demands[id]);
  const equipment = useB5Store((s) => s.plant.equipment);
  const sensor = useB5Store((s) => (seq ? s.plant.sensors[seq.pvSensorTag] : undefined));
  const updateDemand = useB5Store((s) => s.updateDemand);

  if (!seq) return <div className="p-3 text-xs text-red-700 font-bold">Unknown Demand: {demandId}</div>;

  const setPriority = (idx: number, val: number) => {
    const nextPriors = [...seq.priors];
    nextPriors[idx] = Math.max(1, Math.min(seq.unitTags.length, val));
    updateDemand(id, { priors: nextPriors });
  };

  const rotatePriorities = () => {
    const nextPriors = seq.priors.map((p) => (p === 1 ? seq.unitTags.length : p - 1));
    updateDemand(id, { priors: nextPriors });
  };

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Enable & Status */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => updateDemand(id, { enable: !seq.enable })}
          className={`py-1.5 rounded font-black border cursor-pointer ${
            seq.enable
              ? 'bg-emerald-100 border-emerald-600 text-emerald-800 hover:bg-emerald-200'
              : 'bg-slate-200 border-slate-500 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {seq.enable ? 'SEQUENCE: ON' : 'SEQUENCE: OFF'}
        </button>
        <div className="bg-white border border-slate-400 rounded px-2 py-1 text-center shadow-xs">
          <div className="text-[9px] text-slate-600 font-bold">Status / Running</div>
          <div className="font-black text-blue-700">
            {seq.status} ({seq.count})
          </div>
        </div>
      </div>

      {/* Live PV + STU/STD Call Indicators */}
      <div className="grid grid-cols-3 gap-1.5 bg-white border border-slate-400 rounded p-2 text-center shadow-xs">
        <div>
          <div className="text-[9px] text-slate-600 font-bold">Current PV</div>
          <div className="text-slate-950 font-black">
            {sensor ? `${sensor.pv.toFixed(sensor.decimals)} ${seq.pvUnit}` : '--'}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-slate-600 font-bold">STU / STD</div>
          <div className="font-black">
            <span className={seq.stuCall ? 'text-emerald-700' : 'text-slate-400'}>STU</span> /{' '}
            <span className={seq.stdCall ? 'text-amber-700' : 'text-slate-400'}>STD</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] text-slate-600 font-bold">Timer Elapsed</div>
          <div className="text-amber-700 font-black">{seq.elapsedSec.toFixed(1)} s</div>
        </div>
      </div>

      {/* Editable StartUp / ShutDown SP & Delay Timers */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="text-[10px] text-blue-800 font-black uppercase">
          Thresholds & Delay Timers (Editable)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9.5px] text-slate-700 font-bold">StartUp SP ({seq.pvUnit})</label>
            <input
              type="number"
              step={0.1}
              value={seq.startUpSP}
              onChange={(e) => updateDemand(id, { startUpSP: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-950 font-bold"
            />
          </div>
          <div>
            <label className="text-[9.5px] text-slate-700 font-bold">StartUp Delay (s)</label>
            <input
              type="number"
              min={1}
              max={600}
              value={seq.startUpDelaySec}
              onChange={(e) => updateDemand(id, { startUpDelaySec: Math.max(1, Number(e.target.value)) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-emerald-700 font-black"
            />
          </div>
          <div>
            <label className="text-[9.5px] text-slate-700 font-bold">ShutDown SP ({seq.pvUnit})</label>
            <input
              type="number"
              step={0.1}
              value={seq.shutDownSP}
              onChange={(e) => updateDemand(id, { shutDownSP: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-950 font-bold"
            />
          </div>
          <div>
            <label className="text-[9.5px] text-slate-700 font-bold">ShutDown Delay (s)</label>
            <input
              type="number"
              min={1}
              max={600}
              value={seq.shutDownDelaySec}
              onChange={(e) => updateDemand(id, { shutDownDelaySec: Math.max(1, Number(e.target.value)) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-amber-700 font-black"
            />
          </div>
        </div>

        {/* Chiller 3-Condition FLA Capacity Thresholds */}
        {seq.chillerCapacityStartSP !== undefined && (
          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-300">
            <div>
              <label className="text-[9.5px] text-slate-700 font-bold">STU Cap (% FLA)</label>
              <input
                type="number"
                min={30}
                max={100}
                value={seq.chillerCapacityStartSP}
                onChange={(e) => updateDemand(id, { chillerCapacityStartSP: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-950 font-bold"
              />
            </div>
            <div>
              <label className="text-[9.5px] text-slate-700 font-bold">STD Cap (% FLA)</label>
              <input
                type="number"
                min={10}
                max={90}
                value={seq.chillerCapacityStopSP}
                onChange={(e) => updateDemand(id, { chillerCapacityStopSP: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-950 font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Priority Table & RunHours for Manual Operator Changeover */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-700 font-black uppercase">Priority & Run Hours</span>
          <button
            onClick={rotatePriorities}
            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-800 text-white font-bold text-[10px] cursor-pointer"
          >
            Changeover
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {seq.unitTags.map((tag, idx) => {
            const u = equipment[tag];
            if (!u) return null;
            const dotColor =
              u.status === 'RUNNING'
                ? 'bg-emerald-600'
                : u.faulted
                ? 'bg-red-600'
                : 'bg-slate-400';
            return (
              <div
                key={tag}
                className="flex items-center justify-between bg-slate-100 border border-slate-300 px-2 py-1 rounded"
              >
                <span className="flex items-center gap-1.5 text-[10.5px] text-slate-900 font-bold">
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  {tag.replace(/^B[235][0-9M]{1,2}F_/, '')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-semibold">{u.runHours.toFixed(0)}h</span>
                  <input
                    type="number"
                    min={1}
                    max={seq.unitTags.length}
                    value={seq.priors[idx]}
                    onChange={(e) => setPriority(idx, Number(e.target.value))}
                    className="w-10 bg-white border border-slate-400 rounded px-1 py-0.5 text-center text-slate-950 font-black"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
