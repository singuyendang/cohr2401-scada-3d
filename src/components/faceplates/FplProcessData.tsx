import React from 'react';
import { AlertTriangle, CheckCircle2, Play, Square, RotateCcw } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';

/**
 * WinCC Industrial Light Mode Process Utility Faceplates (Faithful to fds_img_18.png):
 *  - Fpl_AC / Fpl_PV: Control Faceplate (Remote, INTLK-OK, Auto/Man, Start/Stop, Clear Fault, RunHours)
 *  - Fpl_ACVSDData / Fpl_ACFIXData / Fpl_PVData: High-contrast telemetry tables
 */
export const FplProcessData: React.FC<{
  tag: string;
  view: 'ac_control' | 'ac_vsd_data' | 'ac_fix_data' | 'pv_control' | 'pv_data';
}> = ({ tag, view }) => {
  const unit = useB5Store((s) => s.plant.equipment[tag]);
  const sensors = useB5Store((s) => s.plant.sensors);
  const setMode = useB5Store((s) => s.setEquipmentMode);
  const cmd = useB5Store((s) => s.commandEquipment);
  const setManualSP = useB5Store((s) => s.setEquipmentManualSP);
  const setFault = useB5Store((s) => s.setEquipmentFault);
  const clearFault = useB5Store((s) => s.clearEquipmentFault);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  if (!unit) return <div className="p-3 text-xs text-red-700 font-bold">Unknown unit: {tag}</div>;

  const isRunning = unit.status === 'RUNNING';
  const isVsd = unit.kind === 'ac_vsd';
  const isPv = unit.kind === 'pv';

  // Control view matching left side of fds_img_18.png (authentic WinCC Light Gray!)
  if (view === 'ac_control' || view === 'pv_control') {
    const dataType = isPv ? 'Fpl_PVData' : isVsd ? 'Fpl_ACVSDData' : 'Fpl_ACFIXData';
    return (
      <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
        <div className="flex items-center justify-between bg-white border border-slate-400 rounded p-2.5 shadow-xs">
          <div>
            <div className="text-[10px] text-blue-700 font-bold">{isPv ? 'PV' : isVsd ? 'AC (VSD)' : 'AC (FIX)'}</div>
            <div className="text-sm font-black text-slate-950">{unit.tag}</div>
            <div className="text-[10px] text-slate-700 font-bold mt-0.5">{unit.runHours.toFixed(1)} Run Hours</div>
          </div>
          <img
            src={isPv ? '/scada/PV.png' : '/scada/Air compressor.png'}
            alt={unit.tag}
            className="w-14 h-12 object-contain"
          />
        </div>

        {/* Classic WinCC Status Grid (fds_img_18.png) */}
        <div className="grid grid-cols-2 gap-1.5 text-center text-[10.5px] font-black">
          <div className="py-1 rounded bg-white border border-slate-400 text-emerald-700">Remote</div>
          <div
            className={`py-1 rounded border ${
              unit.interlockOk
                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                : 'bg-red-100 border-red-600 text-red-700'
            }`}
          >
            {unit.interlockOk ? 'INTLK - OK' : 'INTLK - NG'}
          </div>
          <div
            className={`py-1 rounded border ${
              unit.sttPerm ? 'bg-white border-slate-400 text-blue-700' : 'bg-amber-100 border-amber-600 text-amber-800'
            }`}
          >
            {unit.sttPerm ? 'Start - OK' : 'Start - NG'}
          </div>
          <div className="py-1 rounded bg-white border border-slate-400 text-blue-700">Stop - OK</div>
          <div className="py-1 rounded bg-white border border-slate-400 text-blue-800">{unit.mode}</div>
          <div
            className={`py-1 rounded border ${
              unit.faulted
                ? 'bg-red-100 border-red-600 text-red-700 animate-alarm-flash'
                : isRunning
                ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
                : 'bg-slate-200 border-slate-400 text-slate-700'
            }`}
          >
            {unit.faulted ? 'FAULT' : unit.status}
          </div>
        </div>

        {!unit.interlockOk && (
          <div className="text-[10px] text-amber-900 bg-amber-100 border border-amber-500 rounded px-2 py-1 font-semibold">
            Permissive: {unit.interlockReason}
          </div>
        )}

        {/* Auto / Man Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode(tag, 'AUTO')}
            className={`py-1.5 rounded font-bold cursor-pointer border ${
              unit.mode === 'AUTO'
                ? 'bg-blue-600 border-blue-800 text-white'
                : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setMode(tag, 'MANUAL')}
            className={`py-1.5 rounded font-bold cursor-pointer border ${
              unit.mode === 'MANUAL'
                ? 'bg-pink-600 border-pink-800 text-white'
                : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Man
          </button>
        </div>

        {/* Manual Start / Stop */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={unit.mode !== 'MANUAL'}
            onClick={() => cmd(tag, 'START')}
            className="py-1.5 rounded font-bold flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 border border-emerald-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Start
          </button>
          <button
            disabled={unit.mode !== 'MANUAL'}
            onClick={() => cmd(tag, 'STOP')}
            className="py-1.5 rounded font-bold flex items-center justify-center gap-1 bg-slate-600 hover:bg-slate-500 border border-slate-800 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 text-white cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        </div>

        {/* Manual Capacity Slider for VSD Compressor */}
        {isVsd && (
          <div className="bg-white border border-slate-400 rounded p-2 space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-700">Manual Capacity SP</span>
              <span className="text-amber-700">{unit.manualSP.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={25}
              max={100}
              step={1}
              disabled={unit.mode !== 'MANUAL'}
              value={unit.manualSP}
              onChange={(e) => setManualSP(tag, Number(e.target.value))}
              className="w-full accent-amber-600 disabled:opacity-45"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => clearFault(tag)}
            className="py-1.5 rounded font-bold flex items-center justify-center gap-1 bg-slate-200 hover:bg-slate-300 border border-slate-500 text-slate-900 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear Fault
          </button>
          <button
            onClick={() => openFaceplate(dataType, tag, `${dataType} · ${tag}`)}
            className="py-1.5 rounded font-bold bg-blue-600 hover:bg-blue-500 border border-blue-800 text-white cursor-pointer"
          >
            Open Data →
          </button>
        </div>

        <button
          onClick={() => setFault(tag, !unit.faulted)}
          className={`w-full py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer border ${
            unit.faulted
              ? 'bg-emerald-100 border-emerald-600 text-emerald-800'
              : 'bg-red-100 border-red-500 text-red-800 hover:bg-red-200'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          {unit.faulted ? 'Reset Simulated Fault' : 'Inject Unit Fault (Test Failover)'}
        </button>
      </div>
    );
  }

  // Telemetry Data Views matching right side of fds_img_18.png (Light Mode)
  const isOflac = unit.subsystem === 'oflac';
  const hdrPress = isOflac
    ? sensors['B51F_PIT20101']?.pv ?? 7.0
    : sensors['B51F_PIT10101']?.pv ?? 7.0;
  const pvVac = sensors['B51F_PIT1301']?.pv ?? -75.0;
  const loadedState = isRunning && (isVsd ? unit.loadPct > 30 : (unit.telemetry.loaded ?? 0) > 0);
  const rpm = isRunning ? Math.round(900 + (unit.loadPct / 100) * 2100) : 0;

  let rows: [string, string, string][] = [];
  let titleText = '';

  if (view === 'ac_vsd_data') {
    titleText = 'VSD Air Compressor Data';
    rows = [
      ['Speed', `${rpm}`, 'RPM'],
      ['State', loadedState ? 'Load' : 'UnLoad', ''],
      ['Capacity', unit.loadPct.toFixed(1), '%'],
      ['Disc. Pres', (isRunning ? hdrPress + 0.25 : hdrPress).toFixed(2), 'Bar'],
      ['TargetPres', (unit.telemetry.targetPress ?? 7.0).toFixed(1), 'Bar'],
      ['InletVac', (isRunning ? -0.025 : 0.0).toFixed(3), 'Bar'],
      ['1st Stage T', (unit.telemetry.stage1Temp ?? 75).toFixed(1), '°C'],
      ['2nd Stage T', (unit.telemetry.stage2Temp ?? 81).toFixed(1), '°C'],
      ['Bearing OT', (isRunning ? 64.2 : 31.0).toFixed(1), '°C'],
      ['Run Hours', unit.runHours.toFixed(1), 'Hrs'],
    ];
  } else if (view === 'ac_fix_data') {
    titleText = 'FIX Air Compressor Data';
    rows = [
      ['RLA', unit.loadPct.toFixed(1), '%'],
      ['State', loadedState ? 'Load' : 'UnLoad', ''],
      ['LoadPres', (unit.telemetry.loadPress ?? 6.6).toFixed(1), 'Bar'],
      ['UnloadPres', (unit.telemetry.unloadPress ?? 7.4).toFixed(1), 'Bar'],
      ['Disc. Pres', (isRunning ? hdrPress + 0.2 : hdrPress).toFixed(2), 'Bar'],
      ['System Pres', hdrPress.toFixed(2), 'Bar'],
      ['1st Stage T', (unit.telemetry.stage1Temp ?? 34).toFixed(1), '°C'],
      ['2nd Stage T', (unit.telemetry.stage2Temp ?? 35).toFixed(1), '°C'],
      ['Run Hours', unit.runHours.toFixed(1), 'Hrs'],
    ];
  } else {
    titleText = 'Process Vacuum Pump Data';
    rows = [
      ['Capacity', unit.loadPct.toFixed(1), '%'],
      ['State', isRunning ? 'Running' : 'Stopped', ''],
      ['Header Vac', pvVac.toFixed(1), 'kPa'],
      ['Target Vac', (unit.telemetry.targetVacKpa ?? -75.0).toFixed(1), 'kPa'],
      ['T2 Airend T', (unit.telemetry.t2AirendTemp ?? 72).toFixed(1), '°C'],
      ['T3 Oil Temp', (unit.telemetry.t3OilTemp ?? 66).toFixed(1), '°C'],
      ['Power Est', (isRunning ? unit.ratedKw * (unit.loadPct / 100) : 0).toFixed(1), 'kW'],
      ['Run Hours', unit.runHours.toFixed(1), 'Hrs'],
    ];
  }

  return (
    <div className="p-3 space-y-2 text-xs font-mono text-slate-900">
      <div className="grid grid-cols-2 gap-1.5 text-center">
        <div className="py-1 px-2 rounded bg-sky-100 border border-sky-600 text-sky-950 font-black text-[10px]">
          {titleText}
        </div>
        <div className="py-1 px-2 rounded bg-emerald-100 border border-emerald-600 text-emerald-800 font-black text-[10px] flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Comm. OK
        </div>
      </div>

      <div className="space-y-1">
        {rows.map(([label, val, unitStr]) => (
          <div
            key={label}
            className="grid grid-cols-12 items-center gap-1 bg-white border border-slate-400 rounded px-2 py-1 shadow-2xs"
          >
            <span className="col-span-5 text-[10px] bg-amber-50 border border-amber-300 rounded px-1 py-0.2 text-slate-800 font-bold">
              {label}
            </span>
            <span
              className={`col-span-5 text-right font-black ${
                val === 'Load' || val === 'Running'
                  ? 'text-emerald-700'
                  : val === 'UnLoad' || val === 'Stopped'
                  ? 'text-blue-700'
                  : 'text-slate-950'
              }`}
            >
              {val}
            </span>
            <span className="col-span-2 text-right text-[9.5px] text-slate-600 font-bold">{unitStr}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
