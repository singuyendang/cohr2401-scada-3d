import React from 'react';
import { Zap } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';

/**
 * Scr_B2_PMS — Building 2 Single-Line Diagram Electrical Tree
 *  - Main 400V 3P+N+E Switchgear Bus -> 2 Root MDBs (PM8000):
 *      * MDB-2.1 (Facility / HVAC / PCW / Fans / Office): 7 Sub-DBs (PMMFM383AC)
 *      * MDB-A0.7 (Production & Cleanroom Equipment): 25 Sub-DBs (PMMFM383AC)
 *  - Dynamic live kW / kVA / Current (A) / kWh summation responding directly to running B2 loads
 */
export const B2PmsScreen: React.FC = () => {
  const meters = useB5Store((s) => s.plant.meters);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const mdb21 = meters['PMDB_B2_MDB21'];
  const mdbA07 = meters['PMDB_B2_MDBA07'];
  const totalKw = mdb21.activeKw + mdbA07.activeKw;
  const totalKva = mdb21.apparentKva + mdbA07.apparentKva;
  const totalCurrent = mdb21.currentAvg + mdbA07.currentAvg;

  const mdb21Dbs = [
    'B2M3F_DBAHU21',
    'B2M3F_DBAHU22',
    'B21F_DBPCW21',
    'B22FB_DBFAN21',
    'B22FB_DBOFF21',
    'B21F_DBAIR21',
    'B21F_DBCTPUMP21',
  ];

  const mdbA07Dbs = [
    'B21FA_DBCL1', 'B23F_DBCL2', 'B21FA_DBCT1', 'B21FA_DBCT2', 'B21FA_DBCT3',
    'B21FA_DBGREY1', 'B21FA_DBGREY2', 'B21FA_DBGREY3', 'B21FA_DBGREY4',
    'B23F_DBAS1', 'B23F_DBAS2', 'B23F_DBSU1', 'B23F_DBSU2', 'B23F_DBSU3',
    'B23F_DBPO21', 'B21FA_DBEQ', 'B21FA_DBFX', 'B21FA_DBGO', 'B21FA_DBMR',
    'B21FA_DBOV', 'B21FA_DBRC', 'B23F_DBRC1', 'B23F_DBSA', 'B21FA_DBWI', 'B21FA_DBWT',
  ];

  const renderDbButton = (dbTag: string) => {
    const db = meters[dbTag];
    if (!db) return null;
    return (
      <button
        key={dbTag}
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
    );
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — Power Management System Single-Line Diagram (`Scr_B2_PMS` · `MDB-2.1 & MDB-A0.7 → 32 Sub-DBs`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Click any MDB (`PM8000`) or Sub-DB (`PMMFM383AC`) to inspect 3-phase power telemetry · Live loads track running B2 AHUs, PCW Pumps & Exhaust Fans
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#101c30] border border-amber-500/50 rounded px-3 py-1.5 font-mono text-xs">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>
            B2 Total: <strong className="text-amber-300">{totalKw.toFixed(1)} kW</strong>
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

      {/* Authentic WinCC Industrial Light-Gray SLD Canvas */}
      <div className="bg-[#cfd5de] border-2 border-[#475569] rounded-lg p-4 text-slate-900 font-mono space-y-4 shadow-inner">
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 rounded bg-slate-800 text-white text-xs font-bold tracking-wide shadow">
            FROM TRANSFORMER TR-B2 (MSB ROOM M3F) · 400V / 231V · 3P + N + E · {mdb21.frequencyHz.toFixed(2)} Hz
          </div>
          <div className="w-1 h-5 bg-slate-800" />
          <div className="w-full max-w-6xl h-2.5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-slate-900 rounded-xs shadow-sm" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* LEFT COLUMN (1/3): MDB-2.1 (7 Facility / HVAC / PCW Sub-DBs) */}
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-3 bg-slate-900" />
            <div className="px-2 py-0.5 rounded bg-white border border-slate-700 text-[9.5px] font-black text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              ACB 4P 1600A-65kA (CLOSED)
            </div>
            <div className="w-0.5 h-3 bg-slate-900" />

            <button
              data-scada-tag={mdb21.tag}
              onClick={() => openFaceplate('Fpl_PM8000', mdb21.tag, `Fpl_PM8000 · ${mdb21.label}`)}
              className="w-full rounded-md border-2 border-blue-600 bg-blue-50 p-2.5 text-left shadow cursor-pointer transition hover:brightness-95"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold">PM8000</span>
                  <div className="text-xs font-black text-slate-950 mt-1">{mdb21.label}</div>
                </div>
                <img src="/scada/PM8000-removebg-preview.png" alt="PM8000" className="w-11 h-11 object-contain" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 bg-white border border-slate-400 rounded p-1.5 text-center">
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">POWER</div>
                  <div className="text-xs font-black text-emerald-700">{mdb21.activeKw.toFixed(1)} kW</div>
                </div>
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">CURRENT</div>
                  <div className="text-xs font-black text-blue-700">{mdb21.currentAvg.toFixed(0)} A</div>
                </div>
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">V L-L / PF</div>
                  <div className="text-[10.5px] font-black text-slate-900">
                    {mdb21.voltageLL.toFixed(0)}V · {mdb21.powerFactor.toFixed(2)}
                  </div>
                </div>
              </div>
            </button>

            <div className="w-0.5 h-3 bg-slate-800" />
            <div className="w-full h-1.5 bg-slate-700 rounded-xs" />

            <div className="w-full mt-2 space-y-1.5 pl-3 border-l-2 border-slate-700">
              {mdb21Dbs.map((dbTag) => (
                <div key={dbTag} className="relative flex items-center">
                  <div className="w-3 h-0.5 bg-slate-700 -ml-3 shrink-0" />
                  {renderDbButton(dbTag)}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT 2 COLUMNS (2/3): MDB-A0.7 (25 Production & Cleanroom Sub-DBs) */}
          <div className="xl:col-span-2 flex flex-col items-center">
            <div className="w-0.5 h-3 bg-slate-900" />
            <div className="px-2 py-0.5 rounded bg-white border border-slate-700 text-[9.5px] font-black text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              ACB 4P 2000A-65kA (CLOSED)
            </div>
            <div className="w-0.5 h-3 bg-slate-900" />

            <button
              data-scada-tag={mdbA07.tag}
              onClick={() => openFaceplate('Fpl_PM8000', mdbA07.tag, `Fpl_PM8000 · ${mdbA07.label}`)}
              className="w-full rounded-md border-2 border-amber-600 bg-amber-50 p-2.5 text-left shadow cursor-pointer transition hover:brightness-95"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold">PM8000</span>
                  <div className="text-xs font-black text-slate-950 mt-1">{mdbA07.label}</div>
                </div>
                <img src="/scada/PM8000-removebg-preview.png" alt="PM8000" className="w-11 h-11 object-contain" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 bg-white border border-slate-400 rounded p-1.5 text-center">
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">POWER</div>
                  <div className="text-xs font-black text-emerald-700">{mdbA07.activeKw.toFixed(1)} kW</div>
                </div>
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">CURRENT</div>
                  <div className="text-xs font-black text-blue-700">{mdbA07.currentAvg.toFixed(0)} A</div>
                </div>
                <div>
                  <div className="text-[8.5px] text-slate-500 font-bold">V L-L / PF</div>
                  <div className="text-[10.5px] font-black text-slate-900">
                    {mdbA07.voltageLL.toFixed(0)}V · {mdbA07.powerFactor.toFixed(2)}
                  </div>
                </div>
              </div>
            </button>

            <div className="w-0.5 h-3 bg-slate-800" />
            <div className="w-full h-1.5 bg-slate-700 rounded-xs" />

            <div className="w-full mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {mdbA07Dbs.map((dbTag) => renderDbButton(dbTag))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
