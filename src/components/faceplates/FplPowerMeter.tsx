import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';

/**
 * WinCC Industrial Light Mode Power Meter Faceplate (`Fpl_PM8000` / `Fpl_PMMFM383AC` / `Fpl_PM2000`):
 *  - Faithful layout to fds_img_32.png (Current A/B/C/AVG, Voltage L-L & L-N, Frequency & PF, Power kW/kVAR/kVA, Energy kWh)
 */
export const FplPowerMeter: React.FC<{ meterTag: string }> = ({ meterTag }) => {
  const m = useB5Store((s) => s.plant.meters[meterTag]);

  if (!m) return <div className="p-3 text-xs text-red-700 font-bold">Unknown Power Meter: {meterTag}</div>;

  // Realistic subtle 3-phase balance variations around average
  const iA = m.currentAvg * 1.015;
  const iB = m.currentAvg * 0.992;
  const iC = m.currentAvg * 0.993;
  const vAB = m.voltageLL + 0.4;
  const vBC = m.voltageLL - 0.3;
  const vCA = m.voltageLL - 0.1;

  return (
    <div className="p-3 space-y-2.5 text-xs font-mono text-slate-900">
      {/* Header matching fds_img_32.png */}
      <div className="flex items-center justify-between bg-white border border-slate-400 rounded p-2 shadow-xs">
        <div>
          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 border border-blue-500 text-blue-900 font-black text-[10px]">
            {m.meterType}
          </span>
          <div className="text-xs font-black text-slate-950 mt-1">{m.label}</div>
          <div className="text-[9.5px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Modbus TCP OK
          </div>
        </div>
        <img
          src="/scada/PM8000-removebg-preview.png"
          alt={m.meterType}
          className="w-12 h-12 object-contain"
        />
      </div>

      {/* Current & Voltage 2-column grid (fds_img_32.png) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white border border-slate-400 rounded p-2 space-y-1">
          <div className="text-[10px] font-black text-blue-800 border-b border-slate-300 pb-0.5">Current (A)</div>
          {(
            [
              ['Current A', iA.toFixed(1)],
              ['Current B', iB.toFixed(1)],
              ['Current C', iC.toFixed(1)],
              ['Current AVG', m.currentAvg.toFixed(1)],
            ] as const
          ).map(([lbl, val]) => (
            <div key={lbl} className="flex justify-between text-[10px]">
              <span className="text-slate-600 font-semibold">{lbl}</span>
              <span className="font-black text-slate-950">{val} A</span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-400 rounded p-2 space-y-1">
          <div className="text-[10px] font-black text-blue-800 border-b border-slate-300 pb-0.5">Voltage (V)</div>
          {(
            [
              ['V A-B', vAB.toFixed(1)],
              ['V B-C', vBC.toFixed(1)],
              ['V C-A', vCA.toFixed(1)],
              ['V L-N Avg', m.voltageLN.toFixed(1)],
            ] as const
          ).map(([lbl, val]) => (
            <div key={lbl} className="flex justify-between text-[10px]">
              <span className="text-slate-600 font-semibold">{lbl}</span>
              <span className="font-black text-slate-950">{val} V</span>
            </div>
          ))}
        </div>
      </div>

      {/* Frequency & Power Factor */}
      <div className="grid grid-cols-2 gap-2 bg-white border border-slate-400 rounded p-2">
        <div className="flex justify-between text-[10.5px]">
          <span className="text-slate-600 font-bold">Frequency</span>
          <span className="font-black text-emerald-700">{m.frequencyHz.toFixed(2)} Hz</span>
        </div>
        <div className="flex justify-between text-[10.5px]">
          <span className="text-slate-600 font-bold">PF Total</span>
          <span className="font-black text-blue-700">{m.powerFactor.toFixed(2)}</span>
        </div>
      </div>

      {/* Power (kW / kVAR / kVA) */}
      <div className="bg-white border border-slate-400 rounded p-2 space-y-1">
        <div className="text-[10px] font-black text-blue-800 border-b border-slate-300 pb-0.5">Power</div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-700 font-bold">Active Power Total</span>
          <span className="font-black text-emerald-700">{m.activeKw.toFixed(1)} kW</span>
        </div>
        <div className="flex justify-between text-[10.5px]">
          <span className="text-slate-600 font-semibold">Reactive Power Total</span>
          <span className="font-bold text-slate-900">{m.reactiveKvar.toFixed(1)} kVAR</span>
        </div>
        <div className="flex justify-between text-[10.5px]">
          <span className="text-slate-600 font-semibold">Apparent Power Total</span>
          <span className="font-bold text-slate-900">{m.apparentKva.toFixed(1)} kVA</span>
        </div>
      </div>

      {/* Accumulating Energy */}
      <div className="bg-amber-50 border border-amber-400 rounded p-2 flex items-center justify-between">
        <span className="text-[10px] text-amber-900 font-black uppercase">Active Energy Delivered</span>
        <span className="text-sm font-black text-slate-950">{m.energyKwh.toLocaleString('en-US', { maximumFractionDigits: 1 })} kWh</span>
      </div>
    </div>
  );
};
