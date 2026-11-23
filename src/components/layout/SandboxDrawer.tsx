import React, { useState } from 'react';
import { X, ZapOff, ShieldCheck, Sliders, Radio, Wifi, WifiOff } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';
import type { B5ScreenId } from '../../types/scada.ts';

interface ScreenFaultPreset {
  title: string;
  equipment: string[];
  sensors: string[];
  includeRodiComm?: boolean;
}

const SCREEN_FAULT_MAP: Record<B5ScreenId, ScreenFaultPreset> = {
  site_overview: {
    title: 'Site-Wide Key Faults (B5 / B2 / B3)',
    equipment: [
      'B51F_CH11', 'B51F_CH14', 'B51F_AC204', 'B51F_PV1301A',
      'B21F_P601A', 'B22F_AHU01', 'B31F_CH21', 'B31F_HP01', 'B3M1F_AHU01',
    ],
    sensors: ['B51F_CHSTS1', 'B21F_DPT10601', 'B31F_CHSTS1', 'B31F_HPSTS1', 'B51F_PIT20101', 'B51F_PIT1301'],
    includeRodiComm: true,
  },
  plant_3d_training: {
    title: '3D Digital Twin & OTS Quick Faults',
    equipment: [
      'B51F_CH11', 'B51F_CH14', 'B51F_P501A', 'B51F_AC204',
      'B21F_P601A', 'B21F_P602', 'B31F_CH21', 'B31F_HP01', 'B31F_HPP21',
    ],
    sensors: ['B51F_CHSTS1', 'B51F_TT10505', 'B51F_DPT10501', 'B21F_LT10601', 'B31F_CHSTS1', 'B31F_HPSTS1'],
    includeRodiComm: true,
  },
  b5_chiller: {
    title: 'Chiller & Cooling Towers',
    equipment: [
      'B51F_CH11', 'B51F_CH12', 'B51F_CH13', 'B51F_CH14',
      'B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP', 'B51F_CH14CHWP',
      'B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP',
      'B51F_CT11FN', 'B51F_CT12FN', 'B51F_CT13FN', 'B51F_CT14FN',
      'B51F_CT15FN', 'B51F_CT16FN', 'B51F_CT17FN', 'B51F_CT18FN', 'B51F_CT19FN',
    ],
    sensors: [
      'B51F_CHSTS1', 'B51F_CHRTS2', 'B51F_CHWPS1', 'B51F_BPPS1', 'B51F_BPPS2',
      'B51F_BPTS3', 'B51F_TT10505', 'B51F_PIT10505', 'B51F_HCHPS1',
    ],
  },
  b5_heat_recovery: {
    title: 'Heat Recovery (CH-14)',
    equipment: ['B51F_CH14', 'B51F_CH14CHWP', 'B51F_CH11HWP'],
    sensors: [
      'B51F_HSTS1', 'B51F_HRTS2', 'B51F_HBPPS1', 'B51F_HBPPS2',
      'B51F_HBPTS3', 'B51F_HCHPS1', 'B51F_HCLPS1',
    ],
  },
  b5_cw_ahu: {
    title: 'CW / HW AHU Distribution',
    equipment: [
      'B5M2F_PAU01', 'B5M2F_AHU01', 'B5M2F_AHU02', 'B5M2F_AHU03', 'B5M2F_AHU04', 'B5M1F_AHU01',
    ],
    sensors: [
      'B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_HSTS1',
      'B5M2F_PAU01_SAT', 'B5M2F_AHU01_SAT', 'B5M2F_AHU02_SAT', 'B5M2F_AHU03_SAT', 'B5M2F_AHU04_SAT', 'B5M1F_AHU01_SAT',
    ],
  },
  b5_air_ahu: {
    title: 'AIR AHU & Cleanrooms',
    equipment: [
      'B5M2F_PAU01', 'B5M2F_AHU01', 'B5M2F_AHU02', 'B5M2F_AHU03', 'B5M2F_AHU04', 'B5M1F_AHU01',
    ],
    sensors: [
      'B5M2F_AHU01_RAT', 'B5M2F_AHU01_RAH', 'B5M2F_AHU01_DP', 'B5M2F_AHU01_SAS',
      'B5M2F_AHU02_RAT', 'B5M2F_AHU02_RAH', 'B5M2F_AHU02_DP', 'B5M2F_AHU02_SAS',
      'B5M2F_AHU03_RAT', 'B5M2F_AHU03_RAH', 'B5M2F_AHU03_DP', 'B5M2F_AHU03_SAS',
      'B5M2F_AHU04_RAT', 'B5M2F_AHU04_RAH', 'B5M2F_AHU04_DP', 'B5M2F_AHU04_SAS',
      'B5M1F_AHU01_RAT', 'B5M1F_AHU01_RAH', 'B5M1F_AHU01_DP', 'B5M2F_PAU01_SAT',
    ],
  },
  b5_pcw: {
    title: 'PCW Silicon Station',
    equipment: ['B51F_P501A', 'B51F_P501B', 'B51F_P501C', 'B51F_P502'],
    sensors: [
      'B51F_PIT10501', 'B51F_FIT10501', 'B51F_DPT10501', 'B51F_LT10501',
      'B51F_TT10501', 'B51F_TT10502', 'B51F_TT10503',
    ],
  },
  b5_di: {
    title: 'Unified DI Water (B5 + B2 + B3)',
    equipment: [],
    sensors: [
      'B52F_PIT10701', 'B52F_FIT10701',
      'B52F_PIT10702', 'B52F_FIT10702',
      'B52F_PIT10703', 'B52F_FIT10703',
      'B22F_PIT10704', 'B22F_FIT10704',
      'B31F_PIT10705', 'B31F_FIT10705',
    ],
    includeRodiComm: true,
  },
  b5_oflac: {
    title: 'OFLAC Oil-Flood Air',
    equipment: ['B51F_AC204', 'B51F_AC201', 'B51F_AC202', 'B51F_AD201A', 'B51F_AD202A', 'B51F_AD202B'],
    sensors: ['B51F_PIT20101', 'B51F_AIT20101'],
  },
  b5_ofrac: {
    title: 'OFRAC Oil-Free Air',
    equipment: [
      'B51F_AC101', 'B51F_AC102', 'B51F_P10101A', 'B51F_P10101B',
      'B51F_AD101A', 'B51F_AD101B', 'B51F_AD102A', 'B51F_AD102B',
    ],
    sensors: ['B51F_PIT10101', 'B51F_AIT10101'],
  },
  b5_pv: {
    title: 'Process Vacuum (PV)',
    equipment: ['B51F_PV1301A', 'B51F_PV1301B'],
    sensors: ['B51F_PIT1301', 'B52F_PIT1303'],
  },
  b5_exh: {
    title: 'Exhaust & Ventilation',
    equipment: [
      'B5M2F_FA11201A', 'B5M2F_FA11203A', 'B5M2F_FA11204A',
      'B51F_FAF01', 'B51F_FAF02', 'B51F_EAF01', 'B51F_EAF02',
      'B51F_TEF01', 'B52F_TEF01',
    ],
    sensors: ['B51F_PIT11201', 'B51F_PIT11202', 'B51F_TIT11201'],
  },
  b5_overview_1f: {
    title: '1F Floor Overview',
    equipment: [
      'B51F_CH11', 'B51F_CH12', 'B51F_CH13', 'B51F_CH14',
      'B51F_CH11CHWP', 'B51F_CT11CWP', 'B51F_P501A', 'B51F_P502',
      'B51F_AC101', 'B51F_AC204', 'B51F_PV1301A', 'B51F_EAF01', 'B51F_FAF01', 'B51F_TEF01',
    ],
    sensors: [
      'B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_PIT10501',
      'B51F_LT10501', 'B51F_PIT10101', 'B51F_PIT20101', 'B51F_PIT1301',
    ],
    includeRodiComm: true,
  },
  b5_overview_m1f: {
    title: 'M1F Floor Overview',
    equipment: ['B5M1F_AHU01'],
    sensors: ['B5M1F_AHU01_RAT', 'B5M1F_AHU01_RAH', 'B5M1F_AHU01_SAT', 'B5M1F_AHU01_SAS', 'B5M1F_AHU01_DP'],
  },
  b5_overview_2f: {
    title: '2F Floor Overview',
    equipment: ['B52F_TEF01'],
    sensors: [
      'B5M2F_AHU01_RAT', 'B5M2F_AHU02_RAT', 'B5M2F_AHU03_RAT', 'B5M2F_AHU04_RAT',
      'B51F_DPT10501', 'B51F_TT10503', 'B52F_PIT1303',
      'B52F_PIT10701', 'B52F_PIT10702', 'B52F_PIT10703',
    ],
    includeRodiComm: true,
  },
  b5_overview_m2f: {
    title: 'M2F Floor Overview',
    equipment: [
      'B5M2F_AHU01', 'B5M2F_AHU02', 'B5M2F_AHU03', 'B5M2F_AHU04', 'B5M2F_PAU01',
      'B5M2F_FA11201A', 'B5M2F_FA11203A', 'B5M2F_FA11204A',
    ],
    sensors: ['B51F_PIT11201', 'B51F_PIT11202', 'B51F_TIT11201', 'B5M2F_PAU01_SAT'],
  },
  b5_overview: {
    title: 'Plant Key Faults',
    equipment: [
      'B51F_CH11', 'B51F_CH12', 'B51F_CH14', 'B51F_CH11CHWP', 'B51F_CT11FN',
      'B51F_P501A', 'B51F_AC204', 'B51F_AC101', 'B51F_PV1301A', 'B5M2F_AHU01',
    ],
    sensors: [
      'B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_DPT10501',
      'B51F_PIT20101', 'B51F_PIT1301',
    ],
  },
  b5_pms: {
    title: 'Major Power Loads',
    equipment: [
      'B51F_CH11', 'B51F_CH12', 'B51F_CH14', 'B51F_CH11CHWP',
      'B51F_P501A', 'B51F_AC204', 'B51F_AC101', 'B5M2F_AHU01', 'B5M2F_AHU02',
    ],
    sensors: ['B51F_CHSTS1', 'B51F_CHWPS1'],
  },
  b5_trend_online: {
    title: 'Plant Key Faults',
    equipment: ['B51F_CH11', 'B51F_CH14', 'B51F_P501A', 'B51F_AC204', 'B5M2F_AHU01', 'B5M2F_FA11201A'],
    sensors: ['B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_DPT10501', 'B51F_PIT20101', 'B52F_PIT10701'],
  },
  b5_trend_history: {
    title: 'Plant Key Faults',
    equipment: ['B51F_CH11', 'B51F_CH14', 'B51F_P501A', 'B51F_AC204', 'B5M2F_AHU01', 'B5M2F_FA11201A'],
    sensors: ['B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_DPT10501', 'B51F_PIT20101', 'B52F_PIT10701'],
  },
  b5_alarms_online: {
    title: 'Quick Alarm Test Faults',
    equipment: ['B51F_CH11', 'B51F_CH14', 'B51F_P501A', 'B51F_AC204', 'B51F_PV1301A', 'B5M2F_AHU01'],
    sensors: ['B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_PIT10501', 'B52F_PIT10701', 'B51F_PIT20101'],
    includeRodiComm: true,
  },
  b5_alarms_history: {
    title: 'Quick Alarm Test Faults',
    equipment: ['B51F_CH11', 'B51F_CH14', 'B51F_P501A', 'B51F_AC204', 'B51F_PV1301A', 'B5M2F_AHU01'],
    sensors: ['B51F_CHSTS1', 'B51F_CHWPS1', 'B51F_TT10505', 'B51F_PIT10501', 'B52F_PIT10701', 'B51F_PIT20101'],
    includeRodiComm: true,
  },
  // ---- BUILDING 2 SCREENS ----
  b2_overview: {
    title: 'B2 Plant Key Faults',
    equipment: [
      'B21F_P601A', 'B21F_P601B', 'B21F_P602', 'B21F_PAU01', 'B22F_AHU01', 'B2M3F_AHU01',
      'B21F_FCU01', 'B22F_FA11001A', 'B22F_FA11004A',
    ],
    sensors: ['B21F_DPT10601', 'B21F_PIT10601', 'B21F_LT10601', 'B22F_PIT10704', 'B23F_PIT1302', 'B21F_PIT11003'],
    includeRodiComm: true,
  },
  b2_overview_1f: {
    title: 'B2 1F Floor Overview',
    equipment: [
      'B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D', 'B21F_P602',
      'B21F_PAU01', 'B21F_PAU02', 'B21F_FCU01', 'B21F_FCU02', 'B21F_FFU01', 'B21F_EAF01', 'B21F_TEF01',
    ],
    sensors: ['B21F_DPT10601', 'B21F_PIT10601', 'B21F_LT10601', 'B21F_TT10601', 'B21F_FCU01RT1', 'B22F_AHU04_RAT'],
  },
  b2_overview_2f: {
    title: 'B2 2F Floor Overview',
    equipment: [
      'B22F_AHU01', 'B22F_AHU02', 'B22F_AHU04', 'B22F_AHU07', 'B22F_AHU10',
      'B22F_FA11001A', 'B22F_FA11002A', 'B22F_FA11004A', 'B22F_ERV01', 'B22F_PAUCT01', 'B22F_EAF01', 'B22F_TEF01',
    ],
    sensors: ['B22F_PIT10704', 'B22F_FIT10704', 'B21F_PIT11003', 'B21F_PIT11004', 'B22F_PIT11001', 'B21F_TIT11001'],
    includeRodiComm: true,
  },
  b2_overview_3f: {
    title: 'B2 3F Floor Overview',
    equipment: ['B22F_FFU01', 'B23F_FCU02', 'B23F_TEF01', 'B23F_TEF02'],
    sensors: [
      'B2M3F_AHU01_RAT', 'B2M3F_AHU04_RAT', 'B2M3F_AHU07_RAT', 'B2M3F_AHU09_RAT',
      'B23F_PIT1302', 'B23F_FCU02RT1',
    ],
  },
  b2_overview_m3f: {
    title: 'B2 M3F Floor Overview',
    equipment: [
      'B2M3F_AHU01', 'B2M3F_AHU02', 'B2M3F_AHU05', 'B2M3F_AHU07', 'B2M3F_AHU09', 'B2M3F_AHU11',
      'B22F_PAU01', 'B22F_PAU02', 'B22F_FFU01',
    ],
    sensors: ['B2M3F_AHU01_SAT', 'B2M3F_AHU05_SAT', 'B2M3F_AHU09_SAT', 'B22F_PAU01_SAT', 'B22F_PAU02_SAT'],
  },
  b2_cw_ahu: {
    title: 'B2 CW / HW AHU',
    equipment: [
      'B21F_PAU01', 'B21F_PAU02', 'B22F_PAU01', 'B22F_PAU02',
      'B22F_AHU01', 'B22F_AHU04', 'B22F_AHU07', 'B2M3F_AHU01', 'B2M3F_AHU06', 'B2M3F_AHU09',
    ],
    sensors: [
      'B51F_CHSTS1', 'B51F_HSTS1', 'B21F_PAU01_SAT', 'B22F_PAU01_SAT',
      'B22F_AHU01_SAT', 'B22F_AHU04_SAT', 'B2M3F_AHU01_SAT', 'B2M3F_AHU09_SAT',
    ],
  },
  b2_air_ahu: {
    title: 'B2 AIR AHU & FFU',
    equipment: [
      'B21F_PAU01', 'B22F_PAU01', 'B22F_AHU01', 'B22F_AHU04', 'B22F_AHU07',
      'B2M3F_AHU01', 'B2M3F_AHU07', 'B2M3F_AHU09', 'B21F_FFU01', 'B22F_FFU01',
    ],
    sensors: [
      'B22F_AHU01_RAT', 'B22F_AHU04_RAT', 'B22F_AHU04_DP', 'B22F_AHU07_RAT',
      'B2M3F_AHU01_RAT', 'B2M3F_AHU01_SAS', 'B2M3F_AHU09_RAT', 'B2M3F_AHU09_DP',
    ],
  },
  b2_air_fcu: {
    title: 'B2 Office & Lobby FCUs',
    equipment: ['B21F_FCU01', 'B21F_FCU02', 'B21F_FCU03', 'B21F_FCU04', 'B23F_FCU02'],
    sensors: ['B21F_FCU01RT1', 'B21F_FCU02RT1', 'B21F_FCU03RT1', 'B21F_FCU04RT1', 'B23F_FCU02RT1'],
  },
  b2_pcw: {
    title: 'B2 PCW Station (4 Pumps)',
    equipment: ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D', 'B21F_P602'],
    sensors: [
      'B21F_PIT10601', 'B21F_FIT10601', 'B21F_DPT10601', 'B21F_LT10601',
      'B21F_TT10601', 'B21F_TT10602', 'B21F_TT10603',
    ],
  },
  b2_di: {
    title: 'Unified DI Water (B5 + B2 + B3)',
    equipment: [],
    sensors: [
      'B22F_PIT10704', 'B22F_FIT10704',
      'B31F_PIT10705', 'B31F_FIT10705',
      'B52F_PIT10701', 'B52F_PIT10702', 'B52F_PIT10703',
    ],
    includeRodiComm: true,
  },
  b2_pv: {
    title: 'Shared PV System (B5 + B2)',
    equipment: ['B51F_PV1301A', 'B51F_PV1301B'],
    sensors: ['B23F_PIT1302', 'B51F_PIT1301', 'B52F_PIT1303'],
  },
  b2_exh: {
    title: 'B2 Process & Aux Exhaust',
    equipment: [
      'B22F_FA11001A', 'B22F_FA11002A', 'B22F_FA11002C', 'B22F_FA11003A',
      'B22F_FA11004A', 'B22F_FA11004B', 'B22F_FA11005A',
      'B21F_EAF01', 'B22F_ERV01', 'B22F_PAUCT01', 'B21F_TEF01', 'B23F_TEF01',
    ],
    sensors: [
      'B21F_PIT11003', 'B21F_PIT11004', 'B21F_PIT11005', 'B21F_PIT11006',
      'B22F_PIT11001', 'B21F_TIT11001',
    ],
  },
  b2_pms: {
    title: 'B2 Major Power Loads',
    equipment: [
      'B21F_P601A', 'B21F_P601B', 'B22F_AHU01', 'B22F_AHU04', 'B2M3F_AHU01',
      'B2M3F_AHU09', 'B22F_FA11001A', 'B22F_FA11004A',
    ],
    sensors: ['B21F_DPT10601', 'B21F_PIT10601'],
  },
  // ---- BUILDING 3 SCREENS ----
  b3_overview: {
    title: 'B3 Plant Key Faults',
    equipment: [
      'B31F_CH21', 'B31F_CH22', 'B31F_CH21CHWP', 'B31F_HP01', 'B31F_HP02', 'B31F_HPP21',
      'B3M1F_AHU01', 'B3M1F_AHU02', 'B3M1F_FA11101A',
    ],
    sensors: ['B31F_CHSTS1', 'B31F_CHWPS1', 'B31F_HPSTS1', 'B31F_HWPS1', 'B31F_PIT10705', 'B3M1F_PIT11101'],
    includeRodiComm: true,
  },
  b3_overview_1f: {
    title: 'B3 1F Floor Overview',
    equipment: [
      'B31F_CH21', 'B31F_CH22', 'B31F_CH21CHWP', 'B31F_HP01', 'B31F_HP02', 'B31F_HPP21',
      'B31F_FCU03', 'B31F_EAF01', 'B31F_EAF02', 'B31F_TEF01',
    ],
    sensors: ['B31F_CHSTS1', 'B31F_CHWPS1', 'B31F_HPSTS1', 'B31F_HWPS1', 'B31F_PIT10705', 'B31F_FCU03RT1'],
    includeRodiComm: true,
  },
  b3_overview_m1f: {
    title: 'B3 M1F Floor Overview',
    equipment: [
      'B3M1F_AHU01', 'B3M1F_AHU02', 'B3M1F_FA11101A', 'B3M1F_FA11102A', 'B3M1F_FA11103A',
      'B3M1F_FCU01', 'B3M1F_FCU04', 'B3M1F_FCU06',
    ],
    sensors: ['B3M1F_AHU01_RAT', 'B3M1F_AHU02_RAT', 'B3M1F_PIT11101', 'B3M1F_PIT11102', 'B3M1F_FCU01RT1'],
  },
  b3_chiller: {
    title: 'B3 Air-Cooled Chillers',
    equipment: ['B31F_CH21', 'B31F_CH22', 'B31F_CH21CHWP', 'B31F_CH22CHWP'],
    sensors: ['B31F_CHSTS1', 'B31F_CHRTS2', 'B31F_CHWPS1', 'B31F_BPPS1', 'B31F_BPPS2', 'B31F_BPTS3'],
  },
  b3_heat: {
    title: 'B3 Hot Water Heat Fans',
    equipment: ['B31F_HP01', 'B31F_HP02', 'B31F_HP03', 'B31F_HPP21', 'B31F_HPP22'],
    sensors: ['B31F_HPSTS1', 'B31F_HPRTS2', 'B31F_HWPS1', 'B31F_HPBPPS1', 'B31F_HPBPPS2', 'B31F_HPBPTS3'],
  },
  b3_cw_ahu: {
    title: 'B3 CW / HW AHU & FCUs',
    equipment: [
      'B3M1F_AHU01', 'B3M1F_AHU02', 'B31F_FCU03',
      'B3M1F_FCU01', 'B3M1F_FCU02', 'B3M1F_FCU03', 'B3M1F_FCU04', 'B3M1F_FCU05', 'B3M1F_FCU06', 'B3M1F_FCU07',
    ],
    sensors: ['B31F_CHSTS1', 'B31F_HPSTS1', 'B3M1F_AHU01_SAT', 'B3M1F_AHU02_SAT', 'B31F_FCU03RT1', 'B3M1F_FCU01RT1'],
  },
  b3_air_ahu: {
    title: 'B3 AIR AHU & 8 FCUs',
    equipment: [
      'B3M1F_AHU01', 'B3M1F_AHU02', 'B31F_FCU03',
      'B3M1F_FCU01', 'B3M1F_FCU02', 'B3M1F_FCU03', 'B3M1F_FCU04', 'B3M1F_FCU05', 'B3M1F_FCU06', 'B3M1F_FCU07',
    ],
    sensors: [
      'B3M1F_AHU01_RAT', 'B3M1F_AHU01_RAH', 'B3M1F_AHU01_DP',
      'B3M1F_AHU02_RAT', 'B3M1F_AHU02_RAH', 'B3M1F_AHU02_DP',
      'B31F_FCU03RT1', 'B3M1F_FCU01RT1', 'B3M1F_FCU04RT1',
    ],
  },
  b3_di: {
    title: 'Unified DI Water (B5 + B2 + B3)',
    equipment: [],
    sensors: [
      'B31F_PIT10705', 'B31F_FIT10705',
      'B22F_PIT10704', 'B22F_FIT10704',
      'B52F_PIT10701', 'B52F_PIT10702', 'B52F_PIT10703',
    ],
    includeRodiComm: true,
  },
  b3_exh: {
    title: 'B3 Process & Aux Exhaust',
    equipment: [
      'B3M1F_FA11101A', 'B3M1F_FA11102A', 'B3M1F_FA11103A',
      'B31F_EAF01', 'B31F_EAF02', 'B31F_EAF03', 'B31F_EAF04', 'B31F_EAF05', 'B31F_TEF01',
    ],
    sensors: ['B3M1F_PIT11101', 'B3M1F_PIT11102'],
  },
  b3_pms: {
    title: 'B3 Major Power Loads',
    equipment: [
      'B31F_CH21', 'B31F_CH22', 'B31F_HP01', 'B31F_HP02',
      'B3M1F_AHU01', 'B3M1F_AHU02', 'B3M1F_FA11101A', 'B3M1F_FA11102A',
    ],
    sensors: ['B31F_CHSTS1', 'B31F_HPSTS1'],
  },
};

export const SandboxDrawer: React.FC = () => {
  const activeScreen = useB5Store((s) => s.activeScreen);
  const sandboxOpen = useB5Store((s) => s.sandboxOpen);
  const setSandboxOpen = useB5Store((s) => s.setSandboxOpen);
  const sandbox = useB5Store((s) => s.plant.sandbox);
  const sensors = useB5Store((s) => s.plant.sensors);
  const equipment = useB5Store((s) => s.plant.equipment);
  const updateSandbox = useB5Store((s) => s.updateSandbox);
  const setSensorOverride = useB5Store((s) => s.setSensorOverride);
  const setSensorFault = useB5Store((s) => s.setSensorFault);
  const setEquipmentFault = useB5Store((s) => s.setEquipmentFault);
  const clearAllFaults = useB5Store((s) => s.clearAllFaults);

  const [selectedSensorTag, setSelectedSensorTag] = useState('B51F_CHWPS1');
  const [selectedEqTag, setSelectedEqTag] = useState('B51F_CH11');

  if (!sandboxOpen) return null;

  const sensor = sensors[selectedSensorTag] ?? Object.values(sensors)[0];
  const eq = equipment[selectedEqTag] ?? Object.values(equipment)[0];
  const pagePreset = SCREEN_FAULT_MAP[activeScreen];

  return (
    <aside className="w-88 bg-[#0e1a2e] border-l border-[#29436b] flex flex-col shrink-0 shadow-2xl z-30 overflow-hidden">
      <div className="px-4 py-3 bg-[#13243f] border-b border-[#29436b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
            Simulation & Fault Sandbox
          </span>
        </div>
        <button
          onClick={() => setSandboxOpen(false)}
          className="text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* 1. Ambient & Perturbation */}
        <section className="space-y-3 bg-[#0a1322] border border-[#1e3252] rounded p-3">
          <h3 className="text-[11px] font-mono font-bold uppercase text-cyan-300">
            1. Environment & Sensor Perturbation
          </h3>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Noise Amplitude (2–4s drift)</span>
              <span className="font-mono text-cyan-300 font-bold">{sandbox.noiseAmplitudePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              step={10}
              value={sandbox.noiseAmplitudePct}
              onChange={(e) => updateSandbox({ noiseAmplitudePct: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-300">Ambient Wet-Bulb Temp</span>
              <span className={`font-mono font-bold ${sandbox.ambientWetBulbC >= 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {sandbox.ambientWetBulbC.toFixed(1)} °C
              </span>
            </div>
            <input
              type="range"
              min={18}
              max={30}
              step={0.5}
              value={sandbox.ambientWetBulbC}
              onChange={(e) => updateSandbox({ ambientWetBulbC: Number(e.target.value) })}
              className="w-full accent-amber-400"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Default 22.5 °C. Set ≥ 26.5 °C to test CT 50 Hz saturation against TT10505 (25.0 °C SP).
            </p>
          </div>
        </section>

        {/* 2. Plant Process Loads */}
        <section className="space-y-2.5 bg-[#0a1322] border border-[#1e3252] rounded p-3">
          <h3 className="text-[11px] font-mono font-bold uppercase text-cyan-300">
            2. Plant Process Loads (B5, B2 &amp; B3)
          </h3>
          {(
            [
              ['coolingLoadPct', 'B5/B2 Central Cooling Load', 20, 100],
              ['b3CoolingLoadPct', 'B3 Air-Cooled Chiller Load', 20, 100],
              ['pcwToolLoadPct', 'B5 PCW Tool Thermal Load', 20, 100],
              ['b2PcwToolLoadPct', 'B2 PCW Tool Thermal Load', 20, 100],
              ['diBranchDemandPct', 'DI Branch Demand (B5+B2+B3)', 20, 100],
              ['oflacAirDemandPct', 'OFLAC Air Demand (B5+B2+B3)', 15, 100],
              ['ofracAirDemandPct', 'OFRAC Oil-Free Air Demand', 15, 100],
              ['pvVacuumDemandPct', 'PV Vacuum Demand (B5+B2)', 15, 100],
            ] as const
          ).map(([key, label, min, max]) => (
            <div key={key}>
              <div className="flex justify-between mb-0.5">
                <span className="text-slate-300">{label}</span>
                <span className="font-mono text-white font-bold">{sandbox[key]}%</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                value={sandbox[key]}
                onChange={(e) => updateSandbox({ [key]: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </div>
          ))}
        </section>

        {/* 3. Sensor Override & Sensor Fault */}
        <section className="space-y-2.5 bg-[#0a1322] border border-[#1e3252] rounded p-3">
          <h3 className="text-[11px] font-mono font-bold uppercase text-cyan-300 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> 3. Sensor Override & Fault
          </h3>
          <select
            value={selectedSensorTag}
            onChange={(e) => setSelectedSensorTag(e.target.value)}
            className="w-full bg-[#112038] border border-[#2a436b] rounded px-2 py-1.5 text-xs font-mono text-white"
          >
            {Object.values(sensors).map((s) => (
              <option key={s.tag} value={s.tag}>
                {s.tag} ({s.pv.toFixed(s.decimals)} {s.unit}){s.manualOverride ? ' [OVR]' : ''}{s.faulted ? ' [FLT]' : ''}
              </option>
            ))}
          </select>

          {sensor && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sensor.manualOverride}
                    onChange={(e) => setSensorOverride(sensor.tag, e.target.checked, sensor.pv)}
                    className="accent-amber-400"
                  />
                  Manual Override PV
                </label>
                <span className="font-mono text-cyan-300 font-bold">
                  {sensor.pv.toFixed(sensor.decimals)} {sensor.unit}
                </span>
              </div>

              <input
                type="range"
                min={sensor.minRange}
                max={sensor.maxRange}
                step={(sensor.maxRange - sensor.minRange) / 100}
                value={sensor.manualOverride ? sensor.overrideValue : sensor.pv}
                onChange={(e) => setSensorOverride(sensor.tag, true, Number(e.target.value))}
                className="w-full accent-amber-400"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setSensorFault(sensor.tag, !sensor.faulted)}
                  className={`flex-1 py-1.5 rounded font-semibold border cursor-pointer ${
                    sensor.faulted
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-red-600/20 border-red-500 text-red-300'
                  }`}
                >
                  {sensor.faulted ? 'Clear Sensor Fault' : 'Inject Sensor Fault'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 4. Context-Aware Equipment & Sensor Fault Injector (updates dynamically per active screen!) */}
        <section className="space-y-2.5 bg-[#0a1322] border border-[#1e3252] rounded p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-mono font-bold uppercase text-red-300 flex items-center gap-1.5">
              <ZapOff className="w-3.5 h-3.5" /> 4. Quick Fault Injector
            </h3>
            <button
              onClick={clearAllFaults}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30 cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3" /> Clear All
            </button>
          </div>

          <div className="flex gap-1.5">
            <select
              value={selectedEqTag}
              onChange={(e) => setSelectedEqTag(e.target.value)}
              className="flex-1 bg-[#112038] border border-[#2a436b] rounded px-2 py-1 text-xs font-mono text-white"
            >
              {Object.values(equipment).map((u) => (
                <option key={u.tag} value={u.tag}>
                  {u.tag} [{u.status}]
                </option>
              ))}
            </select>
            {eq && (
              <button
                onClick={() => setEquipmentFault(eq.tag, !eq.faulted)}
                className={`px-2.5 py-1 rounded text-xs font-bold border cursor-pointer ${
                  eq.faulted
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-red-600/25 border-red-500 text-red-200'
                }`}
              >
                {eq.faulted ? 'Clear' : 'Trip'}
              </button>
            )}
          </div>

          {/* Active Screen Badge */}
          <div className="pt-1 border-t border-[#1e3252] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-amber-300 font-bold uppercase">Page Quick Faults:</span>
              <span className="text-cyan-300 font-bold">{pagePreset.title}</span>
            </div>

            {/* Third-Party RO-DI Comm Link Toggle when relevant */}
            {pagePreset.includeRodiComm && (
              <button
                onClick={() => updateSandbox({ diPackageConnected: !sandbox.diPackageConnected })}
                className={`w-full px-2 py-1.5 rounded text-[10.5px] font-mono border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  !sandbox.diPackageConnected
                    ? 'bg-red-600 border-red-400 text-white animate-alarm-flash'
                    : 'bg-[#112038] border-emerald-500/50 text-emerald-300 hover:border-red-400'
                }`}
              >
                {sandbox.diPackageConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                RO-DI Package Comm: {sandbox.diPackageConnected ? 'CONNECTED (Click to Drop)' : 'DISCONNECTED (Click to Restore)'}
              </button>
            )}

            {/* Page Equipment Quick Fault Buttons */}
            {pagePreset.equipment.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9.5px] font-mono uppercase text-slate-400 font-bold">
                  Equipment ({pagePreset.equipment.length})
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {pagePreset.equipment.map((tag) => {
                    const u = equipment[tag];
                    if (!u) return null;
                    return (
                      <button
                        key={tag}
                        onClick={() => setEquipmentFault(tag, !u.faulted)}
                        title={`${tag} · ${u.label}`}
                        className={`px-1.5 py-1 rounded text-[10px] font-mono border truncate cursor-pointer transition ${
                          u.faulted
                            ? 'bg-red-600 border-red-400 text-white font-bold animate-alarm-flash'
                            : 'bg-[#112038] border-[#253c61] text-slate-300 hover:border-red-400'
                        }`}
                      >
                        {tag.replace(/^B[235][0-9M]{1,2}F_/, '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Page Sensor Quick Fault Buttons */}
            {pagePreset.sensors.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9.5px] font-mono uppercase text-slate-400 font-bold">
                  Sensors ({pagePreset.sensors.length})
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {pagePreset.sensors.map((tag) => {
                    const s = sensors[tag];
                    if (!s) return null;
                    return (
                      <button
                        key={tag}
                        onClick={() => setSensorFault(tag, !s.faulted)}
                        title={`${tag} · ${s.label}`}
                        className={`px-1.5 py-1 rounded text-[10px] font-mono border truncate cursor-pointer transition ${
                          s.faulted
                            ? 'bg-amber-600 border-amber-300 text-white font-bold animate-alarm-flash'
                            : 'bg-[#0f1d33] border-[#29446e] text-cyan-200 hover:border-amber-400'
                        }`}
                      >
                        {tag.replace(/^B[235][0-9M]{1,2}F_/, '')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
};
