import React from 'react';

export const StatusLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-300 bg-[#0f1a2d] border border-[#223552] rounded px-3 py-1.5">
    <span className="text-slate-400 font-semibold uppercase tracking-wider">SCADA Legend:</span>
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" /> Running / Open
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" /> Stopped / Closed
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shadow-[0_0_6px_#3b82f6]" /> Starting / Stopping
    </span>
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-alarm-flash" /> Fault / Alarm
    </span>
    <span className="ml-auto text-slate-400">
      Click any equipment, valve, sensor, or Demand button to open draggable WinCC Faceplate
    </span>
  </div>
);
