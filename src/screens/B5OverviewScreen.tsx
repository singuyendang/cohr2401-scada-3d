import React from 'react';
import { ArrowRight, Snowflake, Flame, Droplets, Gauge, Wind, Fan, Zap } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import type { B5ScreenId } from '../types/scada.ts';

export const B5OverviewScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const runningCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.status === 'RUNNING').length;
  const faultCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.faulted).length;

  const totalPlantKw =
    (plant.meters['PMDB_B5M2F_MDB51']?.activeKw ?? 0) +
    (plant.meters['PMDB_B5M2F_MDB52']?.activeKw ?? 0) +
    (plant.meters['PMDB_B5M2F_MDB53']?.activeKw ?? 0);

  const cards: {
    screen: B5ScreenId;
    title: string;
    scada: string;
    icon: React.ReactNode;
    running: string;
    faults: number;
    kpis: [string, string][];
  }[] = [
    {
      screen: 'b5_chiller',
      title: 'Chiller & Cooling Towers',
      scada: 'Scr_B5_ChillerSystem',
      icon: <Snowflake className="w-4 h-4 text-cyan-400" />,
      running: `${runningCount(['B51F_CH11', 'B51F_CH12', 'B51F_CH13'])}/3 CH · ${runningCount([
        'B51F_CT11FN', 'B51F_CT12FN', 'B51F_CT13FN', 'B51F_CT14FN', 'B51F_CT15FN',
        'B51F_CT16FN', 'B51F_CT17FN', 'B51F_CT18FN', 'B51F_CT19FN',
      ])}/9 CT`,
      faults: faultCount(['B51F_CH11', 'B51F_CH12', 'B51F_CH13', 'B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP']),
      kpis: [
        ['CHSTS1 / CHRTS2', `${plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} / ${plant.sensors['B51F_CHRTS2'].pv.toFixed(1)} °C`],
        ['CHWPS1 / PIT10505', `${plant.sensors['B51F_CHWPS1'].pv.toFixed(2)} / ${plant.sensors['B51F_PIT10505'].pv.toFixed(2)} bar`],
        ['TT10505 (CT Outlet)', `${plant.sensors['B51F_TT10505'].pv.toFixed(1)} °C (WB ${plant.sandbox.ambientWetBulbC.toFixed(1)}°C)`],
      ],
    },
    {
      screen: 'b5_heat_recovery',
      title: 'Heat Recovery (CH-14)',
      scada: 'Scr_B5_HeatRecovery',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      running: `${runningCount(['B51F_CH14'])}/1 CH14 · ${runningCount(['B51F_CH11HWP', 'B51F_CH14CHWP'])}/2 Pumps`,
      faults: faultCount(['B51F_CH14', 'B51F_CH11HWP', 'B51F_CH14CHWP']),
      kpis: [
        ['HSTS1 / HRTS2', `${plant.sensors['B51F_HSTS1'].pv.toFixed(1)} / ${plant.sensors['B51F_HRTS2'].pv.toFixed(1)} °C`],
        ['HBPPS1 / HCHPS1', `${plant.sensors['B51F_HBPPS1'].pv.toFixed(2)} / ${plant.sensors['B51F_HCHPS1'].pv.toFixed(2)} bar`],
        ['HEMV / HBPMV', `MAN ${Math.round(plant.valves['B51F_HEMV'].positionPct)}% / ${Math.round(plant.valves['B51F_HBPMV'].positionPct)}%`],
      ],
    },
    {
      screen: 'b5_pcw',
      title: 'PCW (Process Cooling)',
      scada: 'Scr_B5_PCW',
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      running: `${runningCount(['B51F_P501A', 'B51F_P501B', 'B51F_P501C'])}/3 PCW · XV10502 ${plant.valves['B51F_XV10502'].openFB ? 'OPEN' : 'CLS'}`,
      faults: faultCount(['B51F_P501A', 'B51F_P501B', 'B51F_P501C', 'B51F_P502']),
      kpis: [
        ['DPT10501 / PIT10501', `${plant.sensors['B51F_DPT10501'].pv.toFixed(2)} / ${plant.sensors['B51F_PIT10501'].pv.toFixed(2)} bar`],
        ['TT10501 / TT10502', `${plant.sensors['B51F_TT10501'].pv.toFixed(1)} / ${plant.sensors['B51F_TT10502'].pv.toFixed(1)} °C`],
        ['TK-501 LT / P-502', `${plant.sensors['B51F_LT10501'].pv.toFixed(0)}% · ${plant.equipment['B51F_P502'].status}`],
      ],
    },
    {
      screen: 'b5_di',
      title: 'DI Water (RO-DI 2F)',
      scada: 'Scr_B5_DI',
      icon: <Droplets className="w-4 h-4 text-cyan-300" />,
      running: plant.sandbox.diPackageConnected ? 'RO-DI Pkg: CONNECTED' : 'RO-DI Pkg: DISCONNECTED',
      faults: plant.sandbox.diPackageConnected ? 0 : 1,
      kpis: [
        ['Disco Dicing PIT/FIT', `${plant.sensors['B52F_PIT10701'].pv.toFixed(2)} bar / ${plant.sensors['B52F_FIT10701'].pv.toFixed(1)}`],
        ['Sand Blast PIT/FIT', `${plant.sensors['B52F_PIT10702'].pv.toFixed(2)} bar / ${plant.sensors['B52F_FIT10702'].pv.toFixed(1)}`],
        ['Cleaning PIT/FIT', `${plant.sensors['B52F_PIT10703'].pv.toFixed(2)} bar / ${plant.sensors['B52F_FIT10703'].pv.toFixed(1)}`],
      ],
    },
    {
      screen: 'b5_oflac',
      title: 'OFLAC (Oil-Flood Air)',
      scada: 'Scr_B5_OFLAC',
      icon: <Gauge className="w-4 h-4 text-emerald-400" />,
      running: `${runningCount(['B51F_AC204', 'B51F_AC201', 'B51F_AC202'])}/3 Comp`,
      faults: faultCount(['B51F_AC204', 'B51F_AC201', 'B51F_AC202']),
      kpis: [
        ['PIT20101 Header', `${plant.sensors['B51F_PIT20101'].pv.toFixed(2)} bar`],
        ['AC204 (VSD Lead)', `${plant.equipment['B51F_AC204'].loadPct.toFixed(0)}% Cap`],
        ['AIT20101 Dew Point', `${plant.sensors['B51F_AIT20101'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b5_ofrac',
      title: 'OFRAC (Oil-Free Air)',
      scada: 'Scr_B5_OFRAC',
      icon: <Gauge className="w-4 h-4 text-teal-400" />,
      running: `${runningCount(['B51F_AC101', 'B51F_AC102'])}/2 Comp · ${runningCount(['B51F_P10101A', 'B51F_P10101B'])}/2 Pump`,
      faults: faultCount(['B51F_AC101', 'B51F_AC102', 'B51F_P10101A', 'B51F_P10101B']),
      kpis: [
        ['PIT10101 Header', `${plant.sensors['B51F_PIT10101'].pv.toFixed(2)} bar`],
        ['AC101 Load', `${plant.equipment['B51F_AC101'].loadPct.toFixed(0)}% Cap`],
        ['AIT10101 Dew Point', `${plant.sensors['B51F_AIT10101'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b5_pv',
      title: 'Process Vacuum (PV)',
      scada: 'Scr_B5_PV',
      icon: <Wind className="w-4 h-4 text-indigo-400" />,
      running: `${runningCount(['B51F_PV1301A', 'B51F_PV1301B'])}/2 Vacuum Pumps`,
      faults: faultCount(['B51F_PV1301A', 'B51F_PV1301B']),
      kpis: [
        ['PIT1301 (1F Header)', `${plant.sensors['B51F_PIT1301'].pv.toFixed(1)} kPa`],
        ['PIT1303 (2F EoL)', `${plant.sensors['B52F_PIT1303'].pv.toFixed(1)} kPa`],
        ['Demand Status', plant.demands.B5PV.status],
      ],
    },
    {
      screen: 'b5_cw_ahu',
      title: 'CW AHU (Water Coils)',
      scada: 'Scr_B5_CW_AHU',
      icon: <Fan className="w-4 h-4 text-blue-400" />,
      running: `${runningCount(['B5M1F_AHU01', 'B5M2F_AHU01', 'B5M2F_AHU02', 'B5M2F_AHU03', 'B5M2F_AHU04', 'B5M2F_PAU01'])}/6 Units`,
      faults: faultCount(['B5M1F_AHU01', 'B5M2F_AHU01', 'B5M2F_AHU02', 'B5M2F_AHU03', 'B5M2F_AHU04', 'B5M2F_PAU01']),
      kpis: [
        ['AHU-2F-01 CWCV/HWCV', `${plant.valves['B5M2F_AHU01_CWCV'].positionPct.toFixed(0)}% / ${plant.valves['B5M2F_AHU01_HWCV'].positionPct.toFixed(0)}%`],
        ['AHU-2F-04 CWCV/HWCV', `${plant.valves['B5M2F_AHU04_CWCV'].positionPct.toFixed(0)}% / ${plant.valves['B5M2F_AHU04_HWCV'].positionPct.toFixed(0)}%`],
        ['PAU-2F-01 CHCV / SAT', `${plant.valves['B5M2F_PAU01_CHCV'].positionPct.toFixed(0)}% · ${plant.sensors['B5M2F_PAU01_SAT'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b5_air_ahu',
      title: 'AIR AHU (Cleanrooms)',
      scada: 'Scr_B5_AIR_AHU',
      icon: <Fan className="w-4 h-4 text-cyan-300" />,
      running: `6 Rooms · 3-Way Bypass`,
      faults: 0,
      kpis: [
        ['AHU-2F-01 Room', `${plant.sensors['B5M2F_AHU01_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B5M2F_AHU01_RAH'].pv.toFixed(0)}% RH`],
        ['AHU-2F-04 KNN Tech', `${plant.sensors['B5M2F_AHU04_RAT'].pv.toFixed(1)} °C / DP ${plant.sensors['B5M2F_AHU04_DP'].pv.toFixed(1)} °C`],
        ['AHU-1F-01 Warehouse', `${plant.sensors['B5M1F_AHU01_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B5M1F_AHU01_RAH'].pv.toFixed(0)}% RH`],
      ],
    },
    {
      screen: 'b5_pms',
      title: 'PMS Power Distribution',
      scada: 'Scr_B5_PMS (MDB → DB)',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      running: `3 MDBs · 16 Sub-DBs`,
      faults: 0,
      kpis: [
        ['Building 5 Total Load', `${totalPlantKw.toFixed(1)} kW`],
        ['MDB-5.1 / MDB-5.2', `${plant.meters['PMDB_B5M2F_MDB51'].activeKw.toFixed(0)} / ${plant.meters['PMDB_B5M2F_MDB52'].activeKw.toFixed(0)} kW`],
        ['MDB-5.3 (Process DBs)', `${plant.meters['PMDB_B5M2F_MDB53'].activeKw.toFixed(0)} kW`],
      ],
    },
  ];

  return (
    <div className="p-3.5 space-y-3">
      {/* Compact Building Name Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#101c30] border border-[#29436b] rounded px-3.5 py-1.5 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-black tracking-wider text-emerald-300 uppercase">
            BUILDING 5 — SILICON CARBIDE
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">· B5_PLC</span>
        </div>
        <span className="text-xs font-bold text-cyan-300">
          Total Load: {totalPlantKw.toFixed(1)} kW
        </span>
      </div>

      <div className="space-y-3.5">
        {/* Authentic WinCC Coherent Site / Building 5 3D Visual Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 relative rounded-lg overflow-hidden border border-[#29436b] bg-[#0a1322] h-44">
            <img
              src="/scada/OverView.jpg"
              alt="Coherent COHR2401 Site Overview"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#091220] via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                  COHERENT · COHR2401 — SILICON CARBIDE & ADVANCED OPTICS FACILITY
                </div>
                <div className="text-sm font-bold text-white">
                  Building 5 — Central Utility Plant & Cleanroom (B5_PLC · 192.168.10.5)
                </div>
              </div>
              <button
                onClick={() => setActiveScreen('b5_chiller')}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow"
              >
                Open Chiller & CT P&ID →
              </button>
            </div>
          </div>
          <div className="relative rounded-lg overflow-hidden border border-[#29436b] bg-[#0a1322] h-44">
            <img
              src="/scada/B5_3D.jpg"
              alt="Building 5 3D View"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#091220] via-transparent to-transparent" />
            <div className="absolute bottom-2.5 left-3">
              <div className="text-[10px] font-mono text-amber-300 font-bold">BUILDING 5 · 3D LAYOUT</div>
              <div className="text-xs font-mono text-white">Total Active Load: {totalPlantKw.toFixed(1)} kW</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {cards.map((c) => (
            <div
              key={c.screen}
              onClick={() => setActiveScreen(c.screen)}
              className={`bg-[#101c30] border rounded-lg p-3.5 hover:border-cyan-400/70 transition cursor-pointer flex flex-col justify-between ${
                c.faults > 0 ? 'border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-[#223552]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.icon}
                    <span className="font-bold text-sm text-white">{c.title}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{c.scada}</div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono bg-[#0a1322] border border-[#1d2e4a] rounded px-2 py-1">
                  <span className="text-emerald-400 font-semibold">{c.running}</span>
                  {c.faults > 0 && (
                    <span className="text-red-400 font-bold animate-alarm-flash">{c.faults} FLT</span>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-[11px] font-mono">
                  {c.kpis.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-slate-400 truncate">{k}</span>
                      <span className="text-slate-100 font-semibold shrink-0">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
