import React from 'react';
import { Zap } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';

/**
 * Scr_B3_PMS.Pdl — Building 3 Single-Line Diagram Electrical Tree
 *  - Main 400V 3P+N+E Bus -> 3 Root MDBs (PM8000):
 *      * MDB-3.1 (HVAC, Air-Cooled Chillers, Heat Fans, Exhaust): DBAHU31, DBCTPUMP31, DBFAN31
 *      * MDB-3.2 (Office / 8 FCUs & Wet Bench 0..2): DBOFF31, DBWB, DBWB1, DBWB2
 *      * MDB-3.3 (Wet Bench 3..4 Process): DBWB3, DBWB4
 */
export const B3PmsScreen: React.FC = () => {
  const meters = useB5Store((s) => s.plant.meters);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const columns: {
    mdbTag: string;
    breaker: string;
    borderClass: string;
    bgClass: string;
    subTags: string[];
  }[] = [
    {
      mdbTag: 'PMDB_B3M1F_MDB31',
      breaker: 'ACB 4P 1250A-50kA (CLOSED)',
      borderClass: 'border-blue-600',
      bgClass: 'bg-blue-50',
      subTags: ['PMDB_B3M1F_DBAHU31', 'PMDB_B3M1F_DBCTPUMP31', 'PMDB_B3M1F_DBFAN31'],
    },
    {
      mdbTag: 'PMDB_B3M1F_MDB32',
      breaker: 'ACB 4P 1000A-50kA (CLOSED)',
      borderClass: 'border-emerald-600',
      bgClass: 'bg-emerald-50',
      subTags: ['PMDB_B31F_DBOFF31', 'PMDB_B31F_DBWB', 'PMDB_B31F_DBWB1', 'PMDB_B31F_DBWB2'],
    },
    {
      mdbTag: 'PMDB_B3M1F_MDB33',
      breaker: 'ACB 4P 800A-50kA (CLOSED)',
      borderClass: 'border-amber-600',
      bgClass: 'bg-amber-50',
      subTags: ['PMDB_B31F_DBWB3', 'PMDB_B31F_DBWB4'],
    },
  ];

  const totalKw = columns.reduce((s, c) => s + (meters[c.mdbTag]?.activeKw ?? 0), 0);
  const totalKva = columns.reduce((s, c) => s + (meters[c.mdbTag]?.apparentKva ?? 0), 0);
  const totalCurrent = columns.reduce((s, c) => s + (meters[c.mdbTag]?.currentAvg ?? 0), 0);

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 3 — Power Management System Single-Line Diagram (`Scr_B3_PMS.Pdl` · `MDB-3.1 / 3.2 / 3.3 → 9 Sub-DBs`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Click any MDB (`PM8000`) or Sub-DB (`PMMFM383AC`) to inspect 3-phase power telemetry · Live loads track Air-Cooled Chillers, Heat Fans, AHUs &amp; Exhaust
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#101c30] border border-amber-500/50 rounded px-3 py-1.5 font-mono text-xs">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>
            B3 Total: <strong className="text-amber-300">{totalKw.toFixed(1)} kW</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            <strong className="text-cyan-300">{totalKva.toFixed(1)} kVA</strong>
          </span>
          <span className="text-slate-500">|</span>
          <span>
            <strong className="text-emerald-300">{totalCurrent.toFixed(0)} A</strong>
          </span>
        </div>
      </div>

      <div className="bg-[#cfd5de] border-2 border-[#475569] rounded-lg p-4 text-slate-900 font-mono space-y-4 shadow-inner">
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 rounded bg-slate-800 text-white text-xs font-bold tracking-wide shadow">
            FROM TRANSFORMER TR-B3 (MSB ROOM M1F) · 400V / 231V · 3P + N + E ·{' '}
            {meters['PMDB_B3M1F_MDB31'].frequencyHz.toFixed(2)} Hz
          </div>
          <div className="w-1 h-5 bg-slate-800" />
          <div className="w-full max-w-6xl h-2.5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-slate-900 rounded-xs shadow-sm" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {columns.map((col) => {
            const mdb = meters[col.mdbTag];
            if (!mdb) return null;
            return (
              <div key={col.mdbTag} className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-slate-900" />
                <div className="px-2 py-0.5 rounded bg-white border border-slate-700 text-[9.5px] font-black text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  {col.breaker}
                </div>
                <div className="w-0.5 h-3 bg-slate-900" />

                <button
                  data-scada-tag={mdb.tag}
                  onClick={() => openFaceplate('Fpl_PM8000', mdb.tag, `Fpl_PM8000 · ${mdb.label}`)}
                  className={`w-full rounded-md border-2 ${col.borderClass} ${col.bgClass} p-2.5 text-left shadow cursor-pointer transition hover:brightness-95`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold">PM8000</span>
                      <div className="text-xs font-black text-slate-950 mt-1">{mdb.label}</div>
                    </div>
                    <img src="/scada/PM8000-removebg-preview.png" alt="PM8000" className="w-11 h-11 object-contain" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 bg-white border border-slate-400 rounded p-1.5 text-center">
                    <div>
                      <div className="text-[8.5px] text-slate-500 font-bold">POWER</div>
                      <div className="text-xs font-black text-emerald-700">{mdb.activeKw.toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div className="text-[8.5px] text-slate-500 font-bold">CURRENT</div>
                      <div className="text-xs font-black text-blue-700">{mdb.currentAvg.toFixed(0)} A</div>
                    </div>
                    <div>
                      <div className="text-[8.5px] text-slate-500 font-bold">V L-L / PF</div>
                      <div className="text-[10.5px] font-black text-slate-900">
                        {mdb.voltageLL.toFixed(0)}V · {mdb.powerFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="w-0.5 h-3 bg-slate-800" />
                <div className="w-full h-1.5 bg-slate-700 rounded-xs" />

                <div className="w-full mt-2 space-y-1.5 pl-3 border-l-2 border-slate-700">
                  {col.subTags.map((subTag) => {
                    const db = meters[subTag];
                    if (!db) return null;
                    return (
                      <div key={subTag} className="relative flex items-center">
                        <div className="w-3 h-0.5 bg-slate-700 -ml-3 shrink-0" />
                        <button
                          data-scada-tag={db.tag}
                          onClick={() => openFaceplate('Fpl_PMMFM383AC', db.tag, `Fpl_PMMFM383AC · ${db.label}`)}
                          className="w-full bg-white hover:bg-sky-50 border border-slate-500 hover:border-blue-700 rounded px-2 py-1.5 text-left transition cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-black text-[10.5px] text-slate-950 truncate">{db.label}</span>
                            <span className="text-[8.5px] px-1 rounded bg-slate-200 text-slate-700 font-bold shrink-0">
                              MFM383
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="font-black text-emerald-700">{db.activeKw.toFixed(1)} kW</span>
                            <span className="font-bold text-blue-700">{db.currentAvg.toFixed(1)} A</span>
                            <span className="text-slate-600">{db.energyKwh.toFixed(0)} kWh</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
