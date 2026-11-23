import React from 'react';
import type { B5ScreenId } from '../../types/scada.ts';
import { useB5Store } from '../../store/b5Store.ts';

interface NavGroup {
  title: string;
  theme: 'pink' | 'blue' | 'green' | 'orange' | 'slate';
  items: { id: B5ScreenId; label: string; scada: string; matchIds?: B5ScreenId[] }[];
}

const B5_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    theme: 'pink',
    items: [
      { id: 'b5_overview_1f', label: '1F', scada: 'Scr_B5_1F_Overview (Read-Only)' },
      { id: 'b5_overview_m1f', label: 'M1F', scada: 'Scr_B5_M1F_Overview (Read-Only)' },
      { id: 'b5_overview_2f', label: '2F', scada: 'Scr_B5_2F_Overview (Read-Only)' },
      { id: 'b5_overview_m2f', label: 'M2F', scada: 'Scr_B5_M2F_Overview (Read-Only)' },
    ],
  },
  {
    title: 'HVAC',
    theme: 'blue',
    items: [
      { id: 'b5_chiller', label: 'CHILLER', scada: 'Scr_B5_ChillerSystem' },
      { id: 'b5_heat_recovery', label: 'HEAT', scada: 'Scr_B5_HeatRecovery' },
      { id: 'b5_cw_ahu', label: 'CW AHU', scada: 'Scr_B5_CW_AHU' },
      { id: 'b5_air_ahu', label: 'AIR AHU', scada: 'Scr_B5_AIR_AHU' },
    ],
  },
  {
    title: 'Process',
    theme: 'green',
    items: [
      { id: 'b5_ofrac', label: 'OFR AC', scada: 'Scr_B5_OFRAC' },
      { id: 'b5_oflac', label: 'OFL AC', scada: 'Scr_B5_OFLAC' },
      { id: 'b5_pcw', label: 'PCW', scada: 'Scr_B5_PCW' },
      { id: 'b5_di', label: 'DI', scada: 'Scr_B5_DI' },
      { id: 'b5_pv', label: 'PV', scada: 'Scr_B5_PV' },
      { id: 'b5_exh', label: 'EXH', scada: 'Scr_B5_EXH' },
    ],
  },
  {
    title: 'PMS',
    theme: 'orange',
    items: [{ id: 'b5_pms', label: 'PMS', scada: 'Scr_B5_PMS (MDB→DB)' }],
  },
  {
    title: 'Monitoring',
    theme: 'slate',
    items: [
      {
        id: 'b5_trend_online',
        label: 'TREND',
        scada: 'Scr_OnlineTrend / Scr_HistoricalTrend',
        matchIds: ['b5_trend_online', 'b5_trend_history'],
      },
      {
        id: 'b5_alarms_online',
        label: 'ALARM',
        scada: 'Scr_OnlineAlarm / Scr_AlarmSummary',
        matchIds: ['b5_alarms_online', 'b5_alarms_history'],
      },
    ],
  },
];

const B2_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    theme: 'pink',
    items: [
      { id: 'b2_overview_1f', label: '1F', scada: 'Scr_B2_1F_Overview (Read-Only)' },
      { id: 'b2_overview_2f', label: '2F', scada: 'Scr_B2_2F_Overview (Read-Only)' },
      { id: 'b2_overview_3f', label: '3F', scada: 'Scr_B2_3F_Overview (Read-Only)' },
      { id: 'b2_overview_m3f', label: 'M3F', scada: 'Scr_B2_M3F_Overview (Read-Only)' },
    ],
  },
  {
    title: 'HVAC',
    theme: 'blue',
    items: [
      { id: 'b5_chiller', label: 'CHILLER', scada: 'Scr_B2_HVAC_CHILLED (Shared B5 Central Plant)' },
      { id: 'b5_heat_recovery', label: 'HEAT', scada: 'Scr_B2_HeatRecovery (Shared B5 CH-14)' },
      { id: 'b2_cw_ahu', label: 'CW AHU', scada: 'Scr_B2_CW_AHU (F1-F2 & F3)' },
      { id: 'b2_air_ahu', label: 'AIR AHU', scada: 'Scr_B2_AIR_AHU (21 AHU + 4 PAU + 4 FFU)' },
      { id: 'b2_air_fcu', label: 'AIR FCU', scada: 'Scr_B2_AIR_FCU (1F & 3F FCUs)' },
    ],
  },
  {
    title: 'Process',
    theme: 'green',
    items: [
      { id: 'b5_oflac', label: 'OFL AC', scada: 'Scr_B2_OFLAC (Shared B5 Central Air)' },
      { id: 'b2_pcw', label: 'PCW', scada: 'Scr_B2_PCW (B2 Dedicated 4-Pump PCW)' },
      { id: 'b2_di', label: 'DI', scada: 'Scr_B2_DI (Full DI System + B2 PCV10704)' },
      { id: 'b2_pv', label: 'PV', scada: 'Scr_B2_PV (Full PV System + B2 PIT1302)' },
      { id: 'b2_exh', label: 'EXH', scada: 'Scr_B2_EXH (EXH 1/2 + EAF/ERV/PAUCT/TEF)' },
    ],
  },
  {
    title: 'PMS',
    theme: 'orange',
    items: [{ id: 'b2_pms', label: 'PMS', scada: 'Scr_B2_PMS (MDB 2.1 / A0.7 → DB)' }],
  },
  {
    title: 'Monitoring',
    theme: 'slate',
    items: [
      {
        id: 'b5_trend_online',
        label: 'TREND',
        scada: 'Scr_OnlineTrend / Scr_HistoricalTrend',
        matchIds: ['b5_trend_online', 'b5_trend_history'],
      },
      {
        id: 'b5_alarms_online',
        label: 'ALARM',
        scada: 'Scr_OnlineAlarm / Scr_AlarmSummary',
        matchIds: ['b5_alarms_online', 'b5_alarms_history'],
      },
    ],
  },
];

const B3_NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    theme: 'pink',
    items: [
      { id: 'b3_overview_1f', label: '1F', scada: 'Scr_B3_1F_Overview (Read-Only)' },
      { id: 'b3_overview_m1f', label: 'M1F', scada: 'Scr_B3_M1F_Overview (Read-Only)' },
    ],
  },
  {
    title: 'HVAC',
    theme: 'blue',
    items: [
      { id: 'b3_chiller', label: 'CHILLER', scada: 'Scr_B3_HVAC_CHILLED (2 Air-Cooled Chillers CH-21/22)' },
      { id: 'b3_heat', label: 'HEAT', scada: 'Scr_B3_HotWaterSystem (3 Heat Fans HP-01/02/03)' },
      { id: 'b3_cw_ahu', label: 'CW AHU', scada: 'Scr_B3_CW_AHU (2 AHU + 8 FCU w/ XV Valves)' },
      { id: 'b3_air_ahu', label: 'AIR AHU', scada: 'Scr_B3_AIR_AHU (2 AHU + 8 FCU Combined)' },
    ],
  },
  {
    title: 'Process',
    theme: 'green',
    items: [
      { id: 'b5_oflac', label: 'OFL AC', scada: 'Scr_B3_OFLAC (Shared B5 Central Air)' },
      { id: 'b3_di', label: 'DI', scada: 'Scr_B3_DI (Unified 3-Building DI + B3 Cistern PCV10705)' },
      { id: 'b3_exh', label: 'EXH', scada: 'Scr_B3_EXH (FA-11101A/02A/03A + EAF/TEF)' },
    ],
  },
  {
    title: 'PMS',
    theme: 'orange',
    items: [{ id: 'b3_pms', label: 'PMS', scada: 'Scr_B3_PMS (MDB 3.1 / 3.2 / 3.3 → DB)' }],
  },
  {
    title: 'Monitoring',
    theme: 'slate',
    items: [
      {
        id: 'b5_trend_online',
        label: 'TREND',
        scada: 'Scr_OnlineTrend / Scr_HistoricalTrend',
        matchIds: ['b5_trend_online', 'b5_trend_history'],
      },
      {
        id: 'b5_alarms_online',
        label: 'ALARM',
        scada: 'Scr_OnlineAlarm / Scr_AlarmSummary',
        matchIds: ['b5_alarms_online', 'b5_alarms_history'],
      },
    ],
  },
];

const THEME_CLASS: Record<NavGroup['theme'], { idle: string; active: string }> = {
  pink: {
    idle: 'bg-gradient-to-b from-rose-200 to-rose-400 border-rose-700 text-slate-950 hover:brightness-105',
    active: 'bg-gradient-to-b from-pink-300 to-rose-500 border-white text-white ring-2 ring-rose-200 shadow-lg',
  },
  blue: {
    idle: 'bg-gradient-to-b from-sky-500/80 to-blue-700/90 border-blue-900 text-white hover:brightness-110',
    active: 'bg-gradient-to-b from-cyan-400 to-blue-600 border-white text-white ring-2 ring-cyan-300 shadow-lg',
  },
  green: {
    idle: 'bg-gradient-to-b from-lime-400/85 to-emerald-600/90 border-emerald-900 text-slate-950 hover:brightness-110',
    active: 'bg-gradient-to-b from-lime-300 to-emerald-500 border-white text-slate-950 ring-2 ring-lime-200 shadow-lg',
  },
  orange: {
    idle: 'bg-gradient-to-b from-amber-400/90 to-orange-600/95 border-orange-900 text-slate-950 hover:brightness-110',
    active: 'bg-gradient-to-b from-amber-300 to-orange-500 border-white text-slate-950 ring-2 ring-amber-200 shadow-lg',
  },
  slate: {
    idle: 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-800 text-slate-100 hover:brightness-110',
    active: 'bg-gradient-to-b from-slate-400 to-slate-600 border-white text-white ring-2 ring-cyan-300 shadow-lg',
  },
};

export const ScadaNavSidebar: React.FC = () => {
  const activeBuilding = useB5Store((s) => s.activeBuilding);
  const activeScreen = useB5Store((s) => s.activeScreen);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);
  const onlineAlarmCount = useB5Store(
    (s) => s.plant.alarms.filter((a) => a.active || !a.acknowledged).length
  );

  // Full-width Coherent 3D Site Overview & 3D Training Studio hide the building-specific left sidebar
  if (activeScreen === 'site_overview' || activeScreen === 'plant_3d_training') return null;

  const navGroups =
    activeBuilding === 'B2' ? B2_NAV_GROUPS : activeBuilding === 'B3' ? B3_NAV_GROUPS : B5_NAV_GROUPS;

  return (
    <aside className="w-40 bg-[#9aa2ae] border-r-2 border-[#475569] flex flex-col shrink-0 select-none">
      <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-2.5">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900 text-center">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = item.matchIds
                ? item.matchIds.includes(activeScreen)
                : activeScreen === item.id;
              const style = isActive ? THEME_CLASS[group.theme].active : THEME_CLASS[group.theme].idle;
              return (
                <button
                  key={`${activeBuilding}-${item.id}`}
                  onClick={() => setActiveScreen(item.id)}
                  title={item.scada}
                  className={`w-full py-1 px-2 rounded border text-center font-bold text-xs tracking-wide transition cursor-pointer relative ${style}`}
                >
                  {item.label}
                  {item.id === 'b5_alarms_online' && onlineAlarmCount > 0 && (
                    <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 text-[9.5px] font-mono rounded-full bg-[#ff0000] text-white border border-white animate-alarm-flash">
                      {onlineAlarmCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
};
