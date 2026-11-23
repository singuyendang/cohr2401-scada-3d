import React from 'react';
import { Zap } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';

/**
 * Scr_B5_PMS — Building 5 Single-Line Diagram Electrical Tree (Faithful to GraCS & fds_img_32.png)
 *  - Main 400V 3P+N+E Switchgear Bus -> 3 MDBs (PM8000): MDB-5.1, MDB-5.2, MDB-5.3
 *  - Each MDB branches down via MCCBs to its exact GraCS sub-DBs (PMMFM383AC)
 *  - Live summed Active kW, Current (A), Voltage (V), PF, and accumulating kWh responding to running plant loads
 *  - Click any MDB -> Fpl_PM8000 (WinCC Light Mode); click any DB -> Fpl_PMMFM383AC (WinCC Light Mode)
 */
export const B5PmsScreen: React.FC = () => {
  const meters = useB5Store((s) => s.plant.meters);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const mdb51 = meters['PMDB_B5M2F_MDB51'];
  const mdb52 = meters['PMDB_B5M2F_MDB52'];
  const mdb53 = meters['PMDB_B5M2F_MDB53'];
  const totalKw = mdb51.activeKw + mdb52.activeKw + mdb53.activeKw;
  const totalKva = mdb51.apparentKva + mdb52.apparentKva + mdb53.apparentKva;
  const totalCurrent = mdb51.currentAvg + mdb52.currentAvg + mdb53.currentAvg;

  const branches = [
    {
      mdb: mdb51,
      breaker: 'ACB 4P 1600A-65kA',
      accent: 'border-blue-600 bg-blue-50',
      dbs: [
        'PMDB_B5M2F_DB51',
        'PMDB_B5M2F_DB52',
        'PMDB_B5M2F_DB53',
        'PMDB_B5M2F_DB54',
        'PMDB_B5M2F_DBCTPUMP51',
      ],
    },
    {
      mdb: mdb52,
      breaker: 'ACB 4P 1250A-65kA',
      accent: 'border-emerald-600 bg-emerald-50',
      dbs: [
        'PMDB_B5M2F_DBAHU51',
        'PMDB_B5M2F_DBAIR51',
        'PMDB_B5M2F_DBPCW51',
        'PMDB_B5M2F_DBFAN51',
        'PMDB_B5M2F_DBOFF51',
      ],
    },
    {
      mdb: mdb53,
      breaker: 'ACB 4P 1000A-65kA',
      accent: 'border-amber-600 bg-amber-50',
      dbs: [
        'PMDB_B5M2F_DB55',
        'PMDB_B5M2F_DB56',
        'PMDB_B5M2F_DB57',
        'PMDB_B5M2F_DB58',
        'PMDB_B5M2F_DB59',
        'PMDB_B5M2F_DB510',
      ],
    },
  ];

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 5 — Power Management System Single-Line Diagram (`Scr_B5_PMS` · `MDB 5.1..5.3 → DB_*`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            Click any MDB (`PM8000`) or Branch Board (`PMMFM383AC`) to open full 3-phase telemetry faceplate · Live loads scale dynamically with running Chillers, Pumps, Compressors & AHUs
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#101c30] border border-amber-500/50 rounded px-3 py-1.5 font-mono text-xs">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>
            Total: <strong className="text-amber-300">{totalKw.toFixed(1)} kW</strong>
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

      {/* Authentic WinCC Industrial Light-Gray SLD Canvas matching fds_img_32.png */}
      <div className="bg-[#cfd5de] border-2 border-[#475569] rounded-lg p-4 text-slate-900 font-mono space-y-4 shadow-inner">
        {/* Top Main 400V Switchgear Busbar */}
        <div className="flex flex-col items-center">
          <div className="px-4 py-1.5 rounded bg-slate-800 text-white text-xs font-bold tracking-wide shadow">
            FROM TRANSFORMER TR-B5 · 400V / 231V · 3P + N + E · {mdb51.frequencyHz.toFixed(2)} Hz
          </div>
          <div className="w-1 h-5 bg-slate-800" />
          {/* Horizontal Main Copper Busbar */}
          <div className="w-full max-w-5xl h-2.5 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 border border-slate-900 rounded-xs shadow-sm" />
        </div>

        {/* 3 MDB Trees (MDB 5.1, MDB 5.2, MDB 5.3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {branches.map(({ mdb, breaker, accent, dbs }) => (
            <div key={mdb.tag} className="flex flex-col items-center">
              {/* Vertical Feeder + ACB Breaker Symbol */}
              <div className="w-0.5 h-3 bg-slate-900" />
              <div className="px-2 py-0.5 rounded bg-white border border-slate-700 text-[9.5px] font-black text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                {breaker} (CLOSED)
              </div>
              <div className="w-0.5 h-3 bg-slate-900" />

              {/* MDB Main Card (Clickable -> Fpl_PM8000) */}
              <button
                data-scada-tag={mdb.tag}
                onClick={() => openFaceplate('Fpl_PM8000', mdb.tag, `Fpl_PM8000 · ${mdb.label}`)}
                className={`w-full rounded-md border-2 p-2.5 text-left shadow cursor-pointer transition hover:brightness-95 ${accent}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-bold">
                      PM8000
                    </span>
                    <div className="text-xs font-black text-slate-950 mt-1">{mdb.label}</div>
                  </div>
                  <img
                    src="/scada/PM8000-removebg-preview.png"
                    alt="PM8000"
                    className="w-11 h-11 object-contain"
                  />
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

              {/* Sub-busbar spine down to Branch DBs */}
              <div className="w-0.5 h-3 bg-slate-800" />
              <div className="w-full h-1.5 bg-slate-700 rounded-xs" />

              {/* Branch Sub-DBs (PMMFM383AC) */}
              <div className="w-full mt-2 space-y-1.5 pl-3 border-l-2 border-slate-700">
                {dbs.map((dbTag) => {
                  const db = meters[dbTag];
                  if (!db) return null;
                  return (
                    <div key={dbTag} className="relative flex items-center">
                      {/* Horizontal MCCB feeder stub */}
                      <div className="w-3 h-0.5 bg-slate-700 -ml-3 shrink-0" />
                      <button
                        data-scada-tag={db.tag}
                        onClick={() => openFaceplate('Fpl_PMMFM383AC', db.tag, `Fpl_PMMFM383AC · ${db.label}`)}
                        className="flex-1 bg-white hover:bg-sky-50 border border-slate-500 hover:border-blue-700 rounded px-2.5 py-1.5 text-left transition cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-[11px] text-slate-950 truncate">{db.label}</span>
                          <span className="text-[9px] px-1 rounded bg-slate-200 text-slate-700 font-bold shrink-0">
                            MCCB · MFM383
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10.5px]">
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
          ))}
        </div>
      </div>
    </div>
  );
};
