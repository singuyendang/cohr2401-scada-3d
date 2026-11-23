import React from 'react';
import { useB5Store } from '../../store/b5Store.ts';

/**
 * WinCC Industrial Light Mode PID Faceplate (`Fpl_PID_Bar` / `Fpl_PID_kPa` / `Fpl_PID_Temp`):
 *  - Embedded Live 3-Pen Trend Chart:
 *      • Input (Setpoint SP):  Blue  (#2563eb)
 *      • Output Control (CV):  Red   (#dc2626)
 *      • Process Value (PV):   Green (#16a34a)
 *  - Editable Auto Output Min / Max Limits for BOTH VFD Motors & Modulating Valves
 *  - Full PID Tuning (Kp, Ki, Kd) + Reset
 */
export const FplPid: React.FC<{ pidTag: string }> = ({ pidTag }) => {
  const pid = useB5Store((s) => s.plant.pids[pidTag]);
  const sensor = useB5Store((s) => (pid ? s.plant.sensors[pid.sensorTag] : undefined));
  const trends = useB5Store((s) => s.plant.trends);
  const updatePid = useB5Store((s) => s.updatePid);

  if (!pid) return <div className="p-3 text-xs text-red-700 font-bold">Unknown PID: {pidTag}</div>;

  const isVfd = !pid.isValvePid;
  const minFloorPct = isVfd ? 30 : 0;
  const decimals = sensor?.decimals ?? 2;

  // Build live 3-pen series from rolling trend buffer (last 80 points)
  const slice = trends.slice(-80);
  const spKey = `${pidTag}__SP`;
  const cvKey = `${pidTag}__CV`;
  const pvKey = `${pidTag}__PV`;

  const samples =
    slice.length >= 2
      ? slice.map((pt) => ({
          t: pt.timeLabel,
          sp: pt.values[spKey] ?? pid.sp,
          cv: pt.values[cvKey] ?? pid.cvPct,
          pv: pt.values[pvKey] ?? pt.values[pid.sensorTag] ?? sensor?.pv ?? pid.sp,
        }))
      : [
          { t: '00:00:00', sp: pid.sp, cv: pid.cvPct, pv: sensor?.pv ?? pid.sp },
          { t: 'Now', sp: pid.sp, cv: pid.cvPct, pv: sensor?.pv ?? pid.sp },
        ];

  // Left Y-axis scaling for Input (SP) & Process Value (PV) in engineering units
  const engVals = samples.flatMap((s) => [s.sp, s.pv]);
  const rawMin = Math.min(...engVals);
  const rawMax = Math.max(...engVals);
  const span = Math.max(rawMax - rawMin, Math.max(0.4, (pid.maxSP - pid.minSP) * 0.12));
  const yMin = rawMin - span * 0.25;
  const yMax = rawMax + span * 0.25;

  // SVG plot geometry
  const W = 320;
  const H = 122;
  const padL = 36;
  const padR = 32;
  const padT = 10;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xOf = (i: number) => padL + (i / Math.max(1, samples.length - 1)) * plotW;
  const yEng = (v: number) => padT + (1 - (v - yMin) / Math.max(0.0001, yMax - yMin)) * plotH;
  const yCv = (cv: number) => padT + (1 - Math.max(0, Math.min(100, cv)) / 100) * plotH;

  const spPoints = samples.map((s, i) => `${xOf(i).toFixed(1)},${yEng(s.sp).toFixed(1)}`).join(' ');
  const pvPoints = samples.map((s, i) => `${xOf(i).toFixed(1)},${yEng(s.pv).toFixed(1)}`).join(' ');
  const cvPoints = samples.map((s, i) => `${xOf(i).toFixed(1)},${yCv(s.cv).toFixed(1)}`).join(' ');

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* PV / SP / CV Bar Summary */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-white border border-slate-400 rounded p-1.5 shadow-xs">
          <div className="text-[9.5px] text-blue-700 font-bold">Input SP ({pid.unit})</div>
          <div className="text-sm font-black text-blue-700">{pid.sp.toFixed(decimals)}</div>
        </div>
        <div className="bg-white border border-slate-400 rounded p-1.5 shadow-xs">
          <div className="text-[9.5px] text-emerald-700 font-bold">Process PV ({pid.unit})</div>
          <div className={`text-sm font-black ${sensor?.faulted ? 'text-red-600' : 'text-emerald-700'}`}>
            {sensor ? (sensor.faulted ? 'FLT' : sensor.pv.toFixed(decimals)) : '--'}
          </div>
        </div>
        <div className="bg-white border border-slate-400 rounded p-1.5 shadow-xs">
          <div className="text-[9.5px] text-red-700 font-bold">{isVfd ? 'Output CV' : 'Output CV'}</div>
          <div className="text-sm font-black text-red-600">
            {isVfd ? `${(pid.cvPct * 0.5).toFixed(1)} Hz` : `${pid.cvPct.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* LIVE 3-PEN PID TREND CHART (Blue=Input SP, Red=Output CV, Green=Process PV) */}
      <div className="bg-white border border-slate-400 rounded p-1.5 shadow-inner space-y-1">
        <div className="flex items-center justify-between text-[9px] font-bold px-0.5">
          <span className="flex items-center gap-1 text-blue-700">
            <span className="w-2.5 h-1 bg-[#2563eb] inline-block rounded-xs" /> Input (SP)
          </span>
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="w-2.5 h-1 bg-[#16a34a] inline-block rounded-xs" /> Process (PV)
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <span className="w-2.5 h-1 bg-[#dc2626] inline-block rounded-xs" /> Output (CV)
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-[#f8fafc] border border-slate-300 rounded-xs">
          {/* Horizontal grid & dual axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + frac * plotH;
            const engVal = yMax - frac * (yMax - yMin);
            const cvVal = Math.round((1 - frac) * 100);
            return (
              <g key={frac}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#cbd5e1" strokeWidth={0.7} strokeDasharray="2 2" />
                <text x={padL - 3} y={y + 3} textAnchor="end" fill="#334155" fontSize="7.5" fontWeight="700">
                  {engVal.toFixed(decimals === 0 ? 0 : 1)}
                </text>
                <text x={W - padR + 3} y={y + 3} textAnchor="start" fill="#dc2626" fontSize="7.5" fontWeight="700">
                  {isVfd ? `${(cvVal * 0.5).toFixed(0)}Hz` : `${cvVal}%`}
                </text>
              </g>
            );
          })}

          {/* Plot Border */}
          <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#64748b" strokeWidth={1} />

          {/* 3 Live Curves: Input SP (Blue), Output Control CV (Red), Process Value PV (Green) */}
          <polyline fill="none" stroke="#2563eb" strokeWidth={1.7} strokeDasharray="4 2" points={spPoints} />
          <polyline fill="none" stroke="#dc2626" strokeWidth={1.7} points={cvPoints} />
          <polyline fill="none" stroke="#16a34a" strokeWidth={2.0} points={pvPoints} />

          {/* X-Axis Timestamps & Unit */}
          <text x={padL} y={H - 4} fill="#475569" fontSize="7" fontWeight="700">
            {samples[0]?.t}
          </text>
          <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontWeight="800">
            Unit: {pid.unit} | CV: {isVfd ? 'Hz' : '%'}
          </text>
          <text x={W - padR} y={H - 4} textAnchor="end" fill="#475569" fontSize="7" fontWeight="700">
            {samples[samples.length - 1]?.t}
          </text>
        </svg>
      </div>

      {/* Setpoint Control */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-700">
            Setpoint ({pid.minSP} – {pid.maxSP} {pid.unit})
          </span>
          <input
            type="number"
            min={pid.minSP}
            max={pid.maxSP}
            step={(pid.maxSP - pid.minSP) / 50}
            value={pid.sp}
            onChange={(e) => updatePid(pidTag, { sp: Number(e.target.value) })}
            className="w-20 bg-slate-50 border-2 border-blue-500 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold"
          />
        </div>
        <input
          type="range"
          min={pid.minSP}
          max={pid.maxSP}
          step={(pid.maxSP - pid.minSP) / 100}
          value={pid.sp}
          onChange={(e) => updatePid(pidTag, { sp: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>

      {/* Auto Mode Output Min / Max Limits — Enabled for BOTH VFD Motors AND Modulating Valves */}
      <div className="bg-sky-50 border border-sky-400 rounded p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-sky-900">
            {isVfd ? 'VFD Auto Output Limits' : 'Valve Auto Output Limits'}
          </span>
          <span className="text-[9px] text-slate-600 font-semibold">Auto only</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9.5px] text-slate-700 font-semibold mb-0.5">
              Auto Min ({isVfd ? `${(pid.autoOutMinPct * 0.5).toFixed(1)} Hz` : '%'})
            </label>
            <input
              type="number"
              min={minFloorPct}
              max={100}
              value={pid.autoOutMinPct}
              onChange={(e) => updatePid(pidTag, { autoOutMinPct: Number(e.target.value) })}
              className="w-full bg-white border border-slate-400 rounded px-2 py-0.5 text-right text-emerald-700 font-black"
            />
          </div>
          <div>
            <label className="block text-[9.5px] text-slate-700 font-semibold mb-0.5">
              Auto Max ({isVfd ? `${(pid.autoOutMaxPct * 0.5).toFixed(1)} Hz` : '%'})
            </label>
            <input
              type="number"
              min={minFloorPct}
              max={100}
              value={pid.autoOutMaxPct}
              onChange={(e) => updatePid(pidTag, { autoOutMaxPct: Number(e.target.value) })}
              className="w-full bg-white border border-slate-400 rounded px-2 py-0.5 text-right text-amber-700 font-black"
            />
          </div>
        </div>
        {isVfd && (
          <div className="text-[9px] text-slate-600">
            Range: 30% (15.0 Hz floor) – 100% (50.0 Hz). Manual unaffected.
          </div>
        )}
      </div>

      {/* Full PID Tuning (Kp, Ki, Kd) & Reset */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="text-[9.5px] uppercase text-slate-700 font-bold">PID Gains (P · I · D)</div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <div>
            <label className="block text-[9px] text-slate-600 font-bold mb-0.5">Kp (P)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={pid.kp}
              onChange={(e) => updatePid(pidTag, { kp: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-600 font-bold mb-0.5">Ki (I)</label>
            <input
              type="number"
              min={0}
              step={0.2}
              value={pid.ki}
              onChange={(e) => updatePid(pidTag, { ki: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-600 font-bold mb-0.5">Kd (D)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={pid.kd}
              onChange={(e) => updatePid(pidTag, { kd: Number(e.target.value) })}
              className="w-full bg-slate-50 border border-blue-400 rounded px-1.5 py-0.5 text-right text-blue-800 font-bold"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5">
          <span>Input: {pid.sensorTag}</span>
          <button
            onClick={() => updatePid(pidTag, { reset: true })}
            className="px-2.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 border border-slate-500 text-slate-900 font-bold cursor-pointer"
          >
            Reset PID
          </button>
        </div>
      </div>
    </div>
  );
};
