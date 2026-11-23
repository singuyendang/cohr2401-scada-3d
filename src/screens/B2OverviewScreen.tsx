import React from 'react';
import { ArrowRight, Snowflake, Flame, Droplets, Gauge, Wind, Fan, Zap, AirVent } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import type { B5ScreenId } from '../types/scada.ts';

export const B2OverviewScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const runningCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.status === 'RUNNING').length;
  const faultCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.faulted).length;

  const b2Ahu2FTags = [
    'B22F_AHU01', 'B22F_AHU02', 'B22F_AHU03', 'B22F_AHU04', 'B22F_AHU05',
    'B22F_AHU06', 'B22F_AHU07', 'B22F_AHU08', 'B22F_AHU09', 'B22F_AHU10',
  ];
  const b2AhuM3FTags = [
    'B2M3F_AHU01', 'B2M3F_AHU02', 'B2M3F_AHU03', 'B2M3F_AHU04', 'B2M3F_AHU05', 'B2M3F_AHU06',
    'B2M3F_AHU07', 'B2M3F_AHU08', 'B2M3F_AHU09', 'B2M3F_AHU10', 'B2M3F_AHU11',
  ];
  const b2PauTags = ['B21F_PAU01', 'B21F_PAU02', 'B22F_PAU01', 'B22F_PAU02'];
  const b2FfuTags = ['B21F_FFU01', 'B21F_FFU02', 'B21F_FFU03', 'B22F_FFU01'];
  const b2FcuTags = ['B21F_FCU01', 'B21F_FCU02', 'B21F_FCU03', 'B21F_FCU04', 'B23F_FCU02'];
  const b2ExhTags = [
    'B22F_FA11001A', 'B22F_FA11002A', 'B22F_FA11002C', 'B22F_FA11003A',
    'B22F_FA11004A', 'B22F_FA11004B', 'B22F_FA11005A',
  ];

  const totalB2Kw =
    (plant.meters['PMDB_B2_MDB21']?.activeKw ?? 0) +
    (plant.meters['PMDB_B2_MDBA07']?.activeKw ?? 0);

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
      screen: 'b2_pcw',
      title: 'B2 PCW Station (4 Pumps)',
      scada: 'Scr_B2_PCW · B2 Only',
      icon: <Droplets className="w-4 h-4 text-sky-400" />,
      running: `${runningCount(['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'])}/4 PCW · XV10602 ${plant.valves['B21F_XV10602'].openFB ? 'OPEN' : 'CLS'}`,
      faults: faultCount(['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D', 'B21F_P602']),
      kpis: [
        ['DPT10601 / PIT10601', `${plant.sensors['B21F_DPT10601'].pv.toFixed(2)} / ${plant.sensors['B21F_PIT10601'].pv.toFixed(2)} bar`],
        ['TT10601 / TT10602', `${plant.sensors['B21F_TT10601'].pv.toFixed(1)} / ${plant.sensors['B21F_TT10602'].pv.toFixed(1)} °C`],
        ['TK-601 LT / P-602', `${plant.sensors['B21F_LT10601'].pv.toFixed(0)}% · ${plant.equipment['B21F_P602'].status}`],
      ],
    },
    {
      screen: 'b2_cw_ahu',
      title: 'CW / HW AHU (F1–F2 & F3)',
      scada: 'Scr_B2_CW_AHU · 25 Units',
      icon: <Fan className="w-4 h-4 text-blue-400" />,
      running: `${runningCount([...b2Ahu2FTags, ...b2AhuM3FTags])}/21 AHU · ${runningCount(b2PauTags)}/4 PAU`,
      faults: faultCount([...b2Ahu2FTags, ...b2AhuM3FTags, ...b2PauTags]),
      kpis: [
        ['CHW Supply (from B5)', `${plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} °C · ${plant.sensors['B51F_CHWPS1'].pv.toFixed(2)} bar`],
        ['HW Supply (from B5)', `${plant.sensors['B51F_HSTS1'].pv.toFixed(1)} °C`],
        ['PAU-1F-01 / 2F-01 SAT', `${plant.sensors['B21F_PAU01_SAT'].pv.toFixed(1)} / ${plant.sensors['B22F_PAU01_SAT'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b2_air_ahu',
      title: 'AIR AHU & Cleanrooms',
      scada: 'Scr_B2_AIR_AHU · 21 AHU + 4 FFU',
      icon: <Fan className="w-4 h-4 text-cyan-300" />,
      running: `${runningCount([...b2Ahu2FTags, ...b2AhuM3FTags])}/21 AHU · ${runningCount(b2FfuTags)}/4 FFU`,
      faults: faultCount([...b2Ahu2FTags, ...b2AhuM3FTags, ...b2FfuTags]),
      kpis: [
        ['1F Coating (AHU04)', `${plant.sensors['B22F_AHU04_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B22F_AHU04_RAH'].pv.toFixed(0)}% RH`],
        ['3F Disco Dicing (M3F-01)', `${plant.sensors['B2M3F_AHU01_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B2M3F_AHU01_RAH'].pv.toFixed(0)}% RH`],
        ['3F Optical Mtg (M3F-09)', `${plant.sensors['B2M3F_AHU09_RAT'].pv.toFixed(1)} °C / DP ${plant.sensors['B2M3F_AHU09_DP'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b2_air_fcu',
      title: 'AIR FCU (1F & 3F Offices)',
      scada: 'Scr_B2_AIR_FCU · 5 FCUs',
      icon: <AirVent className="w-4 h-4 text-sky-300" />,
      running: `${runningCount(b2FcuTags)}/5 FCUs Running`,
      faults: faultCount(b2FcuTags),
      kpis: [
        ['1F Office FCU01 / 02', `${plant.sensors['B21F_FCU01RT1'].pv.toFixed(1)} / ${plant.sensors['B21F_FCU02RT1'].pv.toFixed(1)} °C`],
        ['1F Lobby / Mtg FCU03 / 04', `${plant.sensors['B21F_FCU03RT1'].pv.toFixed(1)} / ${plant.sensors['B21F_FCU04RT1'].pv.toFixed(1)} °C`],
        ['3F Office FCU-3F-02', `${plant.sensors['B23F_FCU02RT1'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b2_exh',
      title: 'Process & General Exhaust',
      scada: 'Scr_B2_EXH_1/2 + EAF/ERV/TEF',
      icon: <Wind className="w-4 h-4 text-rose-400" />,
      running: `${runningCount(b2ExhTags)}/7 Process VFD · 21 Aux Fans`,
      faults: faultCount(b2ExhTags),
      kpis: [
        ['EXH-1 PIT11003 / 04', `${plant.sensors['B21F_PIT11003'].pv.toFixed(2)} / ${plant.sensors['B21F_PIT11004'].pv.toFixed(2)} kPa`],
        ['EXH-1 PIT11005 / 06', `${plant.sensors['B21F_PIT11005'].pv.toFixed(2)} / ${plant.sensors['B21F_PIT11006'].pv.toFixed(2)} kPa`],
        ['EXH-2 PIT11001 / TIT11001', `${plant.sensors['B22F_PIT11001'].pv.toFixed(2)} kPa / ${plant.sensors['B21F_TIT11001'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b2_di',
      title: 'DI Water (Shared RO-DI)',
      scada: 'Scr_B2_DI · B22F_PCV10704',
      icon: <Droplets className="w-4 h-4 text-cyan-300" />,
      running: plant.sandbox.diPackageConnected ? 'RO-DI Pkg: CONNECTED' : 'RO-DI Pkg: DISCONNECTED',
      faults: plant.sandbox.diPackageConnected ? 0 : 1,
      kpis: [
        ['B2 2F PIT10704', `${plant.sensors['B22F_PIT10704'].pv.toFixed(2)} bar`],
        ['B2 2F FIT10704', `${plant.sensors['B22F_FIT10704'].pv.toFixed(1)} m³/h`],
        ['B2 PRV PCV10704', `${plant.valves['B22F_PCV10704'].positionPct.toFixed(0)}% (${plant.valves['B22F_PCV10704'].mode})`],
      ],
    },
    {
      screen: 'b2_pv',
      title: 'Process Vacuum (Shared B5)',
      scada: 'Scr_B2_PV · B23F_PIT1302',
      icon: <Wind className="w-4 h-4 text-indigo-400" />,
      running: `${runningCount(['B51F_PV1301A', 'B51F_PV1301B'])}/2 Central Pumps (B5)`,
      faults: faultCount(['B51F_PV1301A', 'B51F_PV1301B']),
      kpis: [
        ['B2 EoL PIT1302', `${plant.sensors['B23F_PIT1302'].pv.toFixed(1)} kPa`],
        ['B5 Main Header PIT1301', `${plant.sensors['B51F_PIT1301'].pv.toFixed(1)} kPa`],
        ['Demand Status', plant.demands.B5PV.status],
      ],
    },
    {
      screen: 'b5_chiller',
      title: 'Chiller Plant (Shared B5)',
      scada: 'Scr_B2_HVAC_CHILLED → B5',
      icon: <Snowflake className="w-4 h-4 text-cyan-400" />,
      running: `${runningCount(['B51F_CH11', 'B51F_CH12', 'B51F_CH13'])}/3 Central Chillers`,
      faults: faultCount(['B51F_CH11', 'B51F_CH12', 'B51F_CH13']),
      kpis: [
        ['CHSTS1 / CHRTS2', `${plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} / ${plant.sensors['B51F_CHRTS2'].pv.toFixed(1)} °C`],
        ['CHWPS1 Header', `${plant.sensors['B51F_CHWPS1'].pv.toFixed(2)} bar`],
        ['Coupling', 'Live from Building 5'],
      ],
    },
    {
      screen: 'b5_heat_recovery',
      title: 'Heat Recovery (Shared B5)',
      scada: 'Scr_B2_HeatRecovery → B5',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      running: `${runningCount(['B51F_CH14'])}/1 CH14 · ${runningCount(['B51F_CH11HWP'])}/1 HWP`,
      faults: faultCount(['B51F_CH14', 'B51F_CH11HWP']),
      kpis: [
        ['HSTS1 / HRTS2', `${plant.sensors['B51F_HSTS1'].pv.toFixed(1)} / ${plant.sensors['B51F_HRTS2'].pv.toFixed(1)} °C`],
        ['HBPPS1 Header', `${plant.sensors['B51F_HBPPS1'].pv.toFixed(2)} bar`],
        ['Coupling', 'Live to B2 AHU HWCVs'],
      ],
    },
    {
      screen: 'b5_oflac',
      title: 'OFLAC Compressed Air (B5)',
      scada: 'Scr_B2_OFLAC → B5 (No OFRAC)',
      icon: <Gauge className="w-4 h-4 text-emerald-400" />,
      running: `${runningCount(['B51F_AC204', 'B51F_AC201', 'B51F_AC202'])}/3 Central Comp`,
      faults: faultCount(['B51F_AC204', 'B51F_AC201', 'B51F_AC202']),
      kpis: [
        ['PIT20101 Header', `${plant.sensors['B51F_PIT20101'].pv.toFixed(2)} bar`],
        ['AIT20101 Dew Point', `${plant.sensors['B51F_AIT20101'].pv.toFixed(1)} °C`],
        ['Coupling', 'Live from Building 5'],
      ],
    },
    {
      screen: 'b2_pms',
      title: 'B2 PMS Power Distribution',
      scada: 'Scr_B2_PMS (MDB 2.1 + A0.7)',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      running: '2 MDBs · 32 Sub-DBs',
      faults: 0,
      kpis: [
        ['Building 2 Total Load', `${totalB2Kw.toFixed(1)} kW`],
        ['MDB-2.1 (Facility/HVAC)', `${plant.meters['PMDB_B2_MDB21'].activeKw.toFixed(0)} kW`],
        ['MDB-A0.7 (25 Process DBs)', `${plant.meters['PMDB_B2_MDBA07'].activeKw.toFixed(0)} kW`],
      ],
    },
  ];

  return (
    <div className="p-3.5 space-y-3">
      {/* Compact Building Name Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#101c30] border border-[#29436b] rounded px-3.5 py-1.5 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-black tracking-wider text-emerald-300 uppercase">
            BUILDING 2 — ADVANCED OPTICS
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">· B2_PLC</span>
        </div>
        <span className="text-xs font-bold text-cyan-300">
          Total Load: {totalB2Kw.toFixed(1)} kW
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-[#29436b] bg-[#0a1322] h-40">
        <img
          src="/scada/OverView.jpg"
          alt="Coherent Building 2 Advanced Optics Overview"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091220] via-transparent to-transparent" />
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
              COHERENT · COHR2401 — BUILDING 2 ADVANCED OPTICS (B2_PLC)
            </div>
            <div className="text-sm font-bold text-white">
              21 AHUs · 4 PAUs · 4 FFUs · 5 FCUs · 4-Pump PCW Station · 7 Process Exhaust VFDs · 32 Sub-DBs
            </div>
          </div>
          <button
            onClick={() => setActiveScreen('b2_pcw')}
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow"
          >
            Open B2 PCW P&ID →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {cards.map((c) => (
          <div
            key={`${c.screen}-${c.title}`}
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
  );
};
