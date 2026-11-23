import React from 'react';
import { Lock } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';

export const FplValve: React.FC<{ tag: string }> = ({ tag }) => {
  const valve = useB5Store((s) => s.plant.valves[tag]);
  const commandValve = useB5Store((s) => s.commandValve);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  if (!valve) return <div className="p-3 text-xs text-red-700 font-bold">Unknown valve: {tag}</div>;

  const isXval = valve.kind === 'XVAL';
  const statusLabel = valve.faulted
    ? 'FAULTED'
    : isXval
    ? valve.openFB
      ? 'OPENED'
      : valve.closeFB
      ? 'CLOSED'
      : 'TRAVELING'
    : `${valve.positionPct.toFixed(1)}%`;

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Mode & Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold">Valve Status</div>
          <div
            className={`mt-1 text-center py-0.5 rounded font-black border ${
              valve.faulted
                ? 'bg-red-100 text-red-700 border-red-600 animate-alarm-flash'
                : valve.positionPct > 5
                ? 'bg-emerald-100 text-emerald-800 border-emerald-600'
                : 'bg-slate-200 text-slate-700 border-slate-400'
            }`}
          >
            {statusLabel}
          </div>
        </div>
        <div className="bg-white border border-slate-400 rounded p-2 shadow-xs">
          <div className="text-[10px] text-slate-600 font-bold flex items-center justify-between">
            <span>Mode</span>
            {valve.manualOnly && <Lock className="w-3 h-3 text-amber-600" />}
          </div>
          <div className="mt-1 flex gap-1">
            <button
              disabled={valve.manualOnly}
              onClick={() => commandValve(tag, { mode: 'AUTO' })}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold ${
                valve.mode === 'AUTO'
                  ? 'bg-blue-600 border-blue-800 text-white'
                  : 'bg-slate-100 border-slate-400 text-slate-500'
              } disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed`}
            >
              AUTO
            </button>
            <button
              onClick={() => commandValve(tag, { mode: 'MANUAL' })}
              className={`flex-1 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                valve.mode === 'MANUAL'
                  ? 'bg-amber-600 border-amber-800 text-white'
                  : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200'
              }`}
            >
              MAN
            </button>
          </div>
        </div>
      </div>

      {valve.manualOnly && (
        <div className="text-[10px] bg-amber-100 border border-amber-500 text-amber-900 font-semibold rounded px-2 py-1">
          Manual-Only Valve (Auto input intentionally unmapped per COHR2401 PLC design).
        </div>
      )}

      {/* Position Bar */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1 shadow-xs">
        <div className="flex justify-between text-[10px] text-slate-600 font-bold">
          <span>Actual Position (PVFB)</span>
          <span className="text-slate-950 font-black">{valve.positionPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-slate-200 border border-slate-300 rounded overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${valve.positionPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[9.5px] text-slate-600 pt-0.5 font-semibold">
          <span>CloseFB: {valve.closeFB ? '1' : '0'}</span>
          <span>OpenFB: {valve.openFB ? '1' : '0'}</span>
        </div>
      </div>

      {/* Controls */}
      {isXval ? (
        <div className="grid grid-cols-3 gap-1.5">
          <button
            disabled={valve.mode !== 'MANUAL' || valve.faulted}
            onClick={() => commandValve(tag, { cmdOpen: true })}
            className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            OPEN
          </button>
          <button
            disabled={valve.mode !== 'MANUAL' || valve.faulted}
            onClick={() => commandValve(tag, { cmdOpen: false })}
            className="py-1.5 rounded bg-slate-600 hover:bg-slate-500 border border-slate-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            CLOSE
          </button>
          <button
            disabled={!valve.faulted}
            onClick={() => commandValve(tag, { faulted: false })}
            className="py-1.5 rounded bg-amber-600 hover:bg-amber-500 border border-amber-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white font-bold cursor-pointer"
          >
            CLR FLT
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-400 rounded p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-700 font-bold">Manual Position SP (0–100%)</span>
            <input
              type="number"
              min={0}
              max={100}
              disabled={valve.mode !== 'MANUAL'}
              value={Math.round(valve.targetPct)}
              onChange={(e) => commandValve(tag, { targetPct: Number(e.target.value) })}
              className="w-16 bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold disabled:opacity-45"
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            disabled={valve.mode !== 'MANUAL'}
            value={valve.targetPct}
            onChange={(e) => commandValve(tag, { targetPct: Number(e.target.value) })}
            className="w-full accent-amber-600 disabled:opacity-45"
          />
          {valve.pidTag && (
            <button
              onClick={() => openFaceplate('Fpl_PID', valve.pidTag!, `PID · ${valve.pidTag}`)}
              className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 border border-blue-800 text-white font-bold cursor-pointer"
            >
              Open Valve PID Faceplate (Trend & Limits)
            </button>
          )}
        </div>
      )}

      {/* Per-device Valve Fault Simulation */}
      <div className="bg-red-50 border border-red-300 rounded p-2 flex items-center justify-between">
        <span className="text-[10px] text-red-900 font-bold">Simulation Test</span>
        <button
          onClick={() => commandValve(tag, { faulted: !valve.faulted })}
          className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
            valve.faulted
              ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
              : 'bg-red-100 border-red-600 text-red-800 hover:bg-red-200'
          }`}
        >
          {valve.faulted ? 'Clear Valve Fault' : 'Inject Valve Fault'}
        </button>
      </div>
    </div>
  );
};
