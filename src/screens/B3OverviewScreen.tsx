import React from 'react';
import { ArrowRight, Snowflake, Flame, Droplets, Gauge, Wind, Fan, Zap } from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import type { B5ScreenId } from '../types/scada.ts';

export const B3OverviewScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const runningCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.status === 'RUNNING').length;
  const faultCount = (tags: string[]) =>
    tags.filter((t) => plant.equipment[t]?.faulted).length;

  const b3ChTags = ['B31F_CH21', 'B31F_CH22'];
  const b3HpTags = ['B31F_HP01', 'B31F_HP02', 'B31F_HP03'];
  const b3AhuTags = ['B3M1F_AHU01', 'B3M1F_AHU02'];
  const b3FcuTags = [
    'B31F_FCU03',
    'B3M1F_FCU01', 'B3M1F_FCU02', 'B3M1F_FCU03', 'B3M1F_FCU04',
    'B3M1F_FCU05', 'B3M1F_FCU06', 'B3M1F_FCU07',
  ];
  const b3ExhTags = ['B3M1F_FA11101A', 'B3M1F_FA11102A', 'B3M1F_FA11103A'];
  const b3AuxExhTags = ['B31F_EAF01', 'B31F_EAF02', 'B31F_EAF03', 'B31F_EAF04', 'B31F_EAF05', 'B31F_TEF01'];

  const totalB3Kw =
    (plant.meters['PMDB_B3M1F_MDB31']?.activeKw ?? 0) +
    (plant.meters['PMDB_B3M1F_MDB32']?.activeKw ?? 0) +
    (plant.meters['PMDB_B3M1F_MDB33']?.activeKw ?? 0);

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
      screen: 'b3_chiller',
      title: 'Air-Cooled Chiller Plant',
      scada: 'Scr_B3_HVAC_CHILLED · CH-21/22',
      icon: <Snowflake className="w-4 h-4 text-cyan-400" />,
      running: `${runningCount(b3ChTags)}/2 Air-Cooled CH · ${runningCount(['B31F_CH21CHWP', 'B31F_CH22CHWP'])}/2 CHWP`,
      faults: faultCount([...b3ChTags, 'B31F_CH21CHWP', 'B31F_CH22CHWP']),
      kpis: [
        ['CHSTS1 / CHRTS2', `${plant.sensors['B31F_CHSTS1'].pv.toFixed(1)} / ${plant.sensors['B31F_CHRTS2'].pv.toFixed(1)} °C`],
        ['CHWPS1 Header', `${plant.sensors['B31F_CHWPS1'].pv.toFixed(2)} bar`],
        ['Demand Status', `${plant.demands.B3CH.status} · No CT`],
      ],
    },
    {
      screen: 'b3_heat',
      title: 'Hot Water Heat Fan Plant',
      scada: 'Scr_B3_HotWaterSystem · HP-01..03',
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      running: `${runningCount(b3HpTags)}/3 Heat Fans · ${runningCount(['B31F_HPP21', 'B31F_HPP22'])}/2 HPP`,
      faults: faultCount([...b3HpTags, 'B31F_HPP21', 'B31F_HPP22']),
      kpis: [
        ['HPSTS1 / HPRTS2', `${plant.sensors['B31F_HPSTS1'].pv.toFixed(1)} / ${plant.sensors['B31F_HPRTS2'].pv.toFixed(1)} °C`],
        ['HWPS1 Header', `${plant.sensors['B31F_HWPS1'].pv.toFixed(2)} bar`],
        ['Demand Status', plant.demands.B3HP.status],
      ],
    },
    {
      screen: 'b3_cw_ahu',
      title: 'CW / HW AHU & 8 FCUs',
      scada: 'Scr_B3_CW_AHU · Isolated B3 Loops',
      icon: <Fan className="w-4 h-4 text-blue-400" />,
      running: `${runningCount(b3AhuTags)}/2 AHU · ${runningCount(b3FcuTags)}/8 PLC FCUs`,
      faults: faultCount([...b3AhuTags, ...b3FcuTags]),
      kpis: [
        ['B3 CHW Supply', `${plant.sensors['B31F_CHSTS1'].pv.toFixed(1)} °C · ${plant.sensors['B31F_CHWPS1'].pv.toFixed(2)} bar`],
        ['B3 HW Supply', `${plant.sensors['B31F_HPSTS1'].pv.toFixed(1)} °C · ${plant.sensors['B31F_HWPS1'].pv.toFixed(2)} bar`],
        ['AHU01 / 02 CWCV', `${plant.valves['B3M1F_AHU01_CWCV'].positionPct.toFixed(0)}% / ${plant.valves['B3M1F_AHU02_CWCV'].positionPct.toFixed(0)}%`],
      ],
    },
    {
      screen: 'b3_air_ahu',
      title: 'AIR AHU & FCU Combined',
      scada: 'Scr_B3_AIR_AHU · 2 AHU + 8 FCU',
      icon: <Fan className="w-4 h-4 text-cyan-300" />,
      running: `${runningCount(b3AhuTags)}/2 Cleanroom AHU · ${runningCount(b3FcuTags)}/8 FCU`,
      faults: faultCount([...b3AhuTags, ...b3FcuTags]),
      kpis: [
        ['AHU-01 Cleanse', `${plant.sensors['B3M1F_AHU01_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B3M1F_AHU01_RAH'].pv.toFixed(0)}% RH`],
        ['AHU-02 Material', `${plant.sensors['B3M1F_AHU02_RAT'].pv.toFixed(1)} °C / ${plant.sensors['B3M1F_AHU02_RAH'].pv.toFixed(0)}% RH`],
        ['FCU-1F-03 / M1F-01', `${plant.sensors['B31F_FCU03RT1'].pv.toFixed(1)} / ${plant.sensors['B3M1F_FCU01RT1'].pv.toFixed(1)} °C`],
      ],
    },
    {
      screen: 'b3_exh',
      title: 'Process & General Exhaust',
      scada: 'Scr_B3_EXH · FA-11101..03 + EAF/TEF',
      icon: <Wind className="w-4 h-4 text-rose-400" />,
      running: `${runningCount(b3ExhTags)}/3 Process · ${runningCount(b3AuxExhTags)}/6 EAF/TEF`,
      faults: faultCount([...b3ExhTags, ...b3AuxExhTags]),
      kpis: [
        ['FA-11101A / PIT11101', `${plant.equipment['B3M1F_FA11101A'].frequencyHz.toFixed(1)} Hz · ${plant.sensors['B3M1F_PIT11101'].pv.toFixed(2)} kPa`],
        ['FA-11102A / PIT11102', `${plant.equipment['B3M1F_FA11102A'].frequencyHz.toFixed(1)} Hz · ${plant.sensors['B3M1F_PIT11102'].pv.toFixed(2)} kPa`],
        ['FA-11103A (DOL)', plant.equipment['B3M1F_FA11103A'].status],
      ],
    },
    {
      screen: 'b3_di',
      title: 'DI Water (Unified 3-Bld)',
      scada: 'Scr_B3_DI · Cistern PCV10705',
      icon: <Droplets className="w-4 h-4 text-cyan-300" />,
      running: plant.sandbox.diPackageConnected ? 'RO-DI Pkg: CONNECTED' : 'RO-DI Pkg: DISCONNECTED',
      faults: plant.sandbox.diPackageConnected ? 0 : 1,
      kpis: [
        ['B3 Cistern PIT10705', `${plant.sensors['B31F_PIT10705'].pv.toFixed(2)} bar`],
        ['B3 Cistern FIT10705', `${plant.sensors['B31F_FIT10705'].pv.toFixed(1)} m³/h`],
        ['PRV PCV10705', `${plant.valves['B31F_PCV10705'].positionPct.toFixed(0)}% (${plant.valves['B31F_PCV10705'].mode})`],
      ],
    },
    {
      screen: 'b5_oflac',
      title: 'OFLAC Compressed Air (B5)',
      scada: 'Scr_B3_OFLAC → Live from B5',
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
      screen: 'b3_pms',
      title: 'B3 PMS Power Distribution',
      scada: 'Scr_B3_PMS (MDB 3.1 / 3.2 / 3.3)',
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      running: '3 MDBs · 9 Sub-DBs',
      faults: 0,
      kpis: [
        ['Building 3 Total Load', `${totalB3Kw.toFixed(1)} kW`],
        ['MDB-3.1 (HVAC/CH/Fan)', `${plant.meters['PMDB_B3M1F_MDB31'].activeKw.toFixed(0)} kW`],
        ['MDB-3.2 / 3.3 (WB/Off)', `${(plant.meters['PMDB_B3M1F_MDB32'].activeKw + plant.meters['PMDB_B3M1F_MDB33'].activeKw).toFixed(0)} kW`],
      ],
    },
  ];

  return (
    <div className="p-3.5 space-y-3">
      {/* Compact Building Name Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#101c30] border border-[#29436b] rounded px-3.5 py-1.5 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-black tracking-wider text-emerald-300 uppercase">
            BUILDING 3 — ADVANCED OPTICS
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">· B3_PLC</span>
        </div>
        <span className="text-xs font-bold text-cyan-300">
          Total Load: {totalB3Kw.toFixed(1)} kW
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-[#29436b] bg-[#0a1322] h-40">
        <img
          src="/scada/OverView.jpg"
          alt="Coherent Building 3 Plant Overview"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091220] via-transparent to-transparent" />
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
              COHERENT · COHR2401 — BUILDING 3 (B3_PLC)
            </div>
            <div className="text-sm font-bold text-white">
              2 Air-Cooled Chillers · 3 Heat Fans · 2 AHUs · 8 PLC FCUs (w/ XV Valves) · 3 Process EXH + 6 EAF/TEF · 3 MDBs
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('b3_chiller')}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer shadow"
            >
              Air-Cooled Chillers →
            </button>
            <button
              onClick={() => setActiveScreen('b3_heat')}
              className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer shadow"
            >
              Heat Fans →
            </button>
          </div>
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
