import React from 'react';
import { useB5Store } from '../../store/b5Store.ts';

/**
 * WinCC Industrial Light Mode Sensor Faceplate (`Fpl_TIT` / `Fpl_PIT` / `Fpl_FIT` / `Fpl_LIT` / `Fpl_HIT` / `Fpl_AIT`):
 *  - Embedded Live Sensor Trend Chart with exact physical engineering unit & alarm threshold lines
 *  - Editable HHA / HA / LA / LLA Alarm Setpoints + Enable Checkboxes
 *  - Per-sensor Simulation PV Override & Fault Injector
 */
export const FplSensor: React.FC<{ tag: string }> = ({ tag }) => {
  const sensor = useB5Store((s) => s.plant.sensors[tag]);
  const trends = useB5Store((s) => s.plant.trends);
  const updateSensorAlarmLimits = useB5Store((s) => s.updateSensorAlarmLimits);
  const setSensorOverride = useB5Store((s) => s.setSensorOverride);
  const setSensorFault = useB5Store((s) => s.setSensorFault);

  if (!sensor) return <div className="p-3 text-xs text-red-700 font-bold">Unknown sensor: {tag}</div>;

  const pct = ((sensor.pv - sensor.minRange) / Math.max(0.01, sensor.maxRange - sensor.minRange)) * 100;

  // Build real-time sensor history in its exact physical engineering unit
  const slice = trends.slice(-80);
  const samples =
    slice.length >= 2
      ? slice.map((pt) => ({
          t: pt.timeLabel,
          v: pt.values[tag] ?? sensor.pv,
        }))
      : [
          { t: '00:00:00', v: sensor.pv },
          { t: 'Now', v: sensor.pv },
        ];

  const vals = samples.map((s) => s.v);
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;

  const span = Math.max(maxVal - minVal, Math.max(0.4, (sensor.maxRange - sensor.minRange) * 0.08));
  const yMin = Math.max(sensor.minRange, minVal - span * 0.35);
  const yMax = Math.min(sensor.maxRange, maxVal + span * 0.35);

  const W = 320;
  const H = 114;
  const padL = 42;
  const padR = 12;
  const padT = 10;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xOf = (i: number) => padL + (i / Math.max(1, samples.length - 1)) * plotW;
  const yOf = (v: number) => padT + (1 - (v - yMin) / Math.max(0.0001, yMax - yMin)) * plotH;
  const linePoints = samples.map((s, i) => `${xOf(i).toFixed(1)},${yOf(s.v).toFixed(1)}`).join(' ');

  const alarmRefLines: { label: string; val: number; en: boolean; color: string }[] = [
    { label: 'HHA', val: sensor.alarms.hhaSP, en: sensor.alarms.hhaEn, color: '#dc2626' },
    { label: 'HA', val: sensor.alarms.haSP, en: sensor.alarms.haEn, color: '#ea580c' },
    { label: 'LA', val: sensor.alarms.laSP, en: sensor.alarms.laEn, color: '#d97706' },
    { label: 'LLA', val: sensor.alarms.llaSP, en: sensor.alarms.llaEn, color: '#dc2626' },
  ];

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Live PV Readout */}
      <div className="bg-white border border-slate-400 rounded p-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-700 font-bold truncate">{sensor.label}</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border shrink-0 ${
              sensor.alarms.activeLevel === 'NORMAL'
                ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
                : 'bg-red-100 border-red-600 text-red-700 animate-alarm-flash'
            }`}
          >
            {sensor.alarms.activeLevel}
          </span>
        </div>
        <div className="text-xl font-black text-slate-950 mt-1">
          {sensor.faulted ? 'FAULT' : sensor.pv.toFixed(sensor.decimals)}{' '}
          <span className="text-xs font-bold text-blue-700">{sensor.unit}</span>
        </div>
        <div className="h-2 bg-slate-200 border border-slate-300 rounded overflow-hidden mt-1.5">
          <div
            className="h-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
          <span>
            Range: {sensor.minRange} – {sensor.maxRange} {sensor.unit}
          </span>
          <span>
            Min {minVal.toFixed(sensor.decimals)} · Avg {avgVal.toFixed(sensor.decimals)} · Max{' '}
            {maxVal.toFixed(sensor.decimals)}
          </span>
        </div>
      </div>

      {/* LIVE REAL-TIME SENSOR TREND CHART (Physical Unit + Alarm Lines) */}
      <div className="bg-white border border-slate-400 rounded p-1.5 shadow-inner space-y-1">
        <div className="flex items-center justify-between text-[9px] font-bold px-0.5">
          <span className="text-emerald-700">● Live Trend ({sensor.unit})</span>
          <span className="text-slate-600">
            {samples.length} pts · {sensor.tag}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-[#f8fafc] border border-slate-300 rounded-xs">
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + frac * plotH;
            const v = yMax - frac * (yMax - yMin);
            return (
              <g key={frac}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#cbd5e1" strokeWidth={0.7} strokeDasharray="2 2" />
                <text x={padL - 3} y={y + 3} textAnchor="end" fill="#334155" fontSize="7.5" fontWeight="700">
                  {v.toFixed(sensor.decimals === 0 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Visible Alarm Threshold Reference Lines */}
          {alarmRefLines
            .filter((al) => al.en && al.val >= yMin && al.val <= yMax)
            .map((al) => {
              const y = yOf(al.val);
              return (
                <g key={al.label}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={al.color} strokeWidth={0.9} strokeDasharray="3 2" />
                  <text x={W - padR - 2} y={y - 2} textAnchor="end" fill={al.color} fontSize="6.5" fontWeight="800">
                    {al.label} ({al.val})
                  </text>
                </g>
              );
            })}

          <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#64748b" strokeWidth={1} />
          <polyline fill="none" stroke="#16a34a" strokeWidth={2.0} points={linePoints} />

          <text x={padL} y={H - 4} fill="#475569" fontSize="7" fontWeight="700">
            {samples[0]?.t}
          </text>
          <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" fill="#0f172a" fontSize="7.5" fontWeight="800">
            {sensor.pv.toFixed(sensor.decimals)} {sensor.unit}
          </text>
          <text x={W - padR} y={H - 4} textAnchor="end" fill="#475569" fontSize="7" fontWeight="700">
            {samples[samples.length - 1]?.t}
          </text>
        </svg>
      </div>

      {/* Alarm Limits with Checkboxes (WinCC Fpl_TIT_WithCheckBox / Fpl_PIT) */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1.5">
        <div className="text-[10px] text-slate-700 font-bold uppercase">
          Alarm Setpoints ({sensor.unit}) & Enable
        </div>
        {(
          [
            ['HHA', 'hhaSP', 'hhaEn', 'text-red-700'],
            ['HA', 'haSP', 'haEn', 'text-amber-700'],
            ['LA', 'laSP', 'laEn', 'text-amber-700'],
            ['LLA', 'llaSP', 'llaEn', 'text-red-700'],
          ] as const
        ).map(([lbl, spKey, enKey, col]) => (
          <div key={lbl} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sensor.alarms[enKey]}
                onChange={(e) => updateSensorAlarmLimits(tag, { [enKey]: e.target.checked })}
                className="accent-blue-600"
              />
              <span className={`font-black w-8 ${col}`}>{lbl}</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.1}
                value={sensor.alarms[spKey]}
                onChange={(e) => updateSensorAlarmLimits(tag, { [spKey]: Number(e.target.value) })}
                className="w-20 bg-slate-50 border border-slate-400 rounded px-1.5 py-0.5 text-right text-slate-900 font-bold"
              />
              <span className="text-[9.5px] text-slate-600 w-8">{sensor.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Simulation Override */}
      <div className="bg-amber-50 border border-amber-400 rounded p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-amber-900 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={sensor.manualOverride}
              onChange={(e) => setSensorOverride(tag, e.target.checked, sensor.pv)}
              className="accent-amber-600"
            />
            Simulate PV Override ({sensor.unit})
          </label>
          <button
            onClick={() => setSensorFault(tag, !sensor.faulted)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
              sensor.faulted
                ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
                : 'bg-red-100 border-red-600 text-red-700 hover:bg-red-200'
            }`}
          >
            {sensor.faulted ? 'Clear Fault' : 'Inject Fault'}
          </button>
        </div>
        {sensor.manualOverride && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-amber-900">
              <span>Override Value</span>
              <span>
                {sensor.overrideValue.toFixed(sensor.decimals)} {sensor.unit}
              </span>
            </div>
            <input
              type="range"
              min={sensor.minRange}
              max={sensor.maxRange}
              step={(sensor.maxRange - sensor.minRange) / 100}
              value={sensor.overrideValue}
              onChange={(e) => setSensorOverride(tag, true, Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>
        )}
      </div>
    </div>
  );
};
