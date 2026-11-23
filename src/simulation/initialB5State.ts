import type {
  PlantState,
  EquipmentUnit,
  ValveUnit,
  AnalogSensor,
  PIDLoop,
  DemandSequencer,
  DemandId,
  PowerMeter,
  AhuRoomConfig,
} from '../types/scada.ts';
import { mergeBuilding2State } from './initialB2State.ts';
import { mergeBuilding3State } from './initialB3State.ts';

function makeSensor(
  tag: string,
  label: string,
  subsystem: AnalogSensor['subsystem'],
  kind: AnalogSensor['kind'],
  pv: number,
  unit: string,
  minRange: number,
  maxRange: number,
  limits: { lla: number; la: number; ha: number; hha: number },
  decimals = 2
): AnalogSensor {
  return {
    tag,
    label,
    subsystem,
    kind,
    pv,
    lastGoodPv: pv,
    unit,
    minRange,
    maxRange,
    decimals,
    manualOverride: false,
    overrideValue: pv,
    faulted: false,
    alarms: {
      llaSP: limits.lla,
      laSP: limits.la,
      haSP: limits.ha,
      hhaSP: limits.hha,
      llaEn: true,
      laEn: true,
      haEn: true,
      hhaEn: true,
      activeLevel: 'NORMAL',
    },
  };
}

function makeEq(
  tag: string,
  label: string,
  subsystem: EquipmentUnit['subsystem'],
  kind: EquipmentUnit['kind'],
  ratedKw: number,
  powerMeterTag: string,
  running: boolean,
  runHours: number,
  initHz = 36.0,
  telemetry: Record<string, number> = {}
): EquipmentUnit {
  return {
    tag,
    label,
    subsystem,
    kind,
    mode: 'AUTO',
    status: running ? 'RUNNING' : 'STOPPED',
    cmdStart: running,
    startTimerSec: 0,
    frequencyHz: running && kind === 'vfd' ? initHz : 0,
    manualSP: kind === 'vfd' ? initHz : 60,
    loadPct: running ? 62 : 0,
    runHours,
    ratedKw,
    powerMeterTag,
    interlockOk: true,
    interlockReason: 'Permissive OK',
    sttPerm: true,
    stpPerm: true,
    faulted: false,
    telemetry,
  };
}

function makeValve(
  tag: string,
  label: string,
  subsystem: ValveUnit['subsystem'],
  kind: 'CVAL' | 'XVAL',
  manualOnly: boolean,
  openOrPct: number,
  pidTag?: string
): ValveUnit {
  const pos = kind === 'XVAL' ? (openOrPct > 0 ? 100 : 0) : openOrPct;
  return {
    tag,
    label,
    subsystem,
    kind,
    manualOnly,
    mode: manualOnly ? 'MANUAL' : 'AUTO',
    cmdOpen: pos >= 50,
    targetPct: pos,
    positionPct: pos,
    openFB: pos >= 95,
    closeFB: pos <= 5,
    permissive: true,
    faulted: false,
    pidTag,
  };
}

function makePid(
  tag: string,
  label: string,
  subsystem: PIDLoop['subsystem'],
  sensorTag: string,
  sp: number,
  unit: string,
  minSP: number,
  maxSP: number,
  opts: {
    kp: number;
    ki: number;
    kd?: number;
    reverseActing: boolean;
    initCv: number;
    isValvePid?: boolean;
    autoOutMinPct?: number;
    autoOutMaxPct?: number;
  }
): PIDLoop {
  const isValve = opts.isValvePid ?? false;
  return {
    tag,
    label,
    subsystem,
    sensorTag,
    sp,
    kp: opts.kp,
    ki: opts.ki,
    kd: opts.kd ?? 0.2,
    reverseActing: opts.reverseActing,
    integral: opts.initCv,
    lastError: 0,
    lastPv: sp,
    dFiltered: 0,
    cvPct: opts.initCv,
    isValvePid: isValve,
    autoOutMinPct: opts.autoOutMinPct ?? (isValve ? 0 : 30),
    autoOutMaxPct: opts.autoOutMaxPct ?? 100,
    unit,
    minSP,
    maxSP,
  };
}

function makeMeter(
  tag: string,
  label: string,
  parentTag: string | null,
  meterType: PowerMeter['meterType'],
  baseKw: number,
  initKwh: number
): PowerMeter {
  return {
    tag,
    label,
    parentTag,
    meterType,
    voltageLL: 400.2,
    voltageLN: 231.1,
    frequencyHz: 50.0,
    currentAvg: 0,
    powerFactor: 0.92,
    activeKw: baseKw,
    reactiveKvar: baseKw * 0.42,
    apparentKva: baseKw / 0.92,
    energyKwh: initKwh,
    baseKw,
  };
}

/**
 * Creates the 100% verified COHR2401 Building 5 initial plant state.
 * Every tag name matches References/COHR2401_SCADA (COHR2401.mdf & GraCS/*.Pdl) and TIA Portal V18.
 */
export function createInitialB5State(): PlantState {
  const equipment: Record<string, EquipmentUnit> = {};
  const valves: Record<string, ValveUnit> = {};
  const sensors: Record<string, AnalogSensor> = {};
  const pids: Record<string, PIDLoop> = {};
  const meters: Record<string, PowerMeter> = {};
  const ahus: Record<string, AhuRoomConfig> = {};

  // =========================================================================
  // 1. CHILLER & CONDENSER PLANT (Scr_B5_ChillerSystem.Pdl)
  // =========================================================================
  // CH11, CH12 running Auto; CH13 Standby; CH14 running Auto for Heat Recovery
  const chillerCfg = [
    { n: 11, run: true, hrs: 3120.4, kw: 280, meter: 'PMDB_B5M2F_DB51' },
    { n: 12, run: true, hrs: 2985.1, kw: 280, meter: 'PMDB_B5M2F_DB52' },
    { n: 13, run: false, hrs: 2740.8, kw: 280, meter: 'PMDB_B5M2F_DB53' },
    { n: 14, run: true, hrs: 2415.6, kw: 220, meter: 'PMDB_B5M2F_DB54' }, // Heat Recovery Chiller
  ];
  for (const c of chillerCfg) {
    const chTag = `B51F_CH${c.n}`;
    equipment[chTag] = makeEq(
      chTag,
      c.n === 14 ? `Chiller CH-${c.n} (Heat Recovery)` : `Chiller CH-${c.n}`,
      c.n === 14 ? 'heat_recovery' : 'chiller',
      'chiller',
      c.kw,
      c.meter,
      c.run,
      c.hrs,
      0,
      {
        spTemp: c.n === 14 ? 45.0 : 8.0,
        evapPress: c.run ? 3.2 : 4.8,
        condPress: c.run ? (c.n === 14 ? 11.4 : 8.6) : 6.1,
        condEWT: c.n === 14 ? 40.0 : 25.0,
        chwrTemp: c.n === 14 ? 11.8 : 12.0,
        oilDP: c.run ? 2.4 : 0.0,
        fla: c.run ? 62.0 : 0.0,
        evapFS: c.run ? 1 : 0,
      }
    );

    valves[`${chTag}CHV`] = makeValve(
      `${chTag}CHV`,
      `CH-${c.n} Evap Isolation Valve`,
      c.n === 14 ? 'heat_recovery' : 'chiller',
      'XVAL',
      false,
      c.run ? 100 : 0
    );
    valves[`${chTag}CDV`] = makeValve(
      `${chTag}CDV`,
      `CH-${c.n} Cond Isolation Valve`,
      c.n === 14 ? 'heat_recovery' : 'chiller',
      'XVAL',
      false,
      c.run ? 100 : 0
    );
    equipment[`${chTag}CHWP`] = makeEq(
      `${chTag}CHWP`,
      `CH-${c.n} Chilled Water Pump`,
      c.n === 14 ? 'heat_recovery' : 'chiller',
      'vfd',
      55,
      'PMDB_B5M2F_DBCTPUMP51',
      c.run,
      c.hrs + 42,
      38.5
    );
  }

  // Condenser Water Pumps (3 VFDs: CT11CWP, CT12CWP running; CT13CWP standby)
  for (const [idx, n] of [11, 12, 13].entries()) {
    const tag = `B51F_CT${n}CWP`;
    equipment[tag] = makeEq(
      tag,
      `Condenser Water Pump CT-${n}CWP`,
      'chiller',
      'vfd',
      75,
      'PMDB_B5M2F_DBCTPUMP51',
      idx < 2,
      2800 + idx * 115,
      39.0
    );
  }

  // 9 Cooling Towers (CT11..CT19): CT11..14 running Auto (min 2 towers per running chiller CH11/CH12)
  for (let n = 11; n <= 19; n++) {
    const run = n <= 14;
    equipment[`B51F_CT${n}FN`] = makeEq(
      `B51F_CT${n}FN`,
      `Cooling Tower Fan CT-${n}`,
      'chiller',
      'vfd',
      11,
      'PMDB_B5M2F_DBCTPUMP51',
      run,
      1900 + (n - 11) * 90,
      35.0
    );
    valves[`B51F_CT${n}IV`] = makeValve(`B51F_CT${n}IV`, `CT-${n} Inlet Valve`, 'chiller', 'XVAL', false, run ? 100 : 0);
    valves[`B51F_CT${n}OV`] = makeValve(`B51F_CT${n}OV`, `CT-${n} Outlet Valve`, 'chiller', 'XVAL', false, run ? 100 : 0);
  }

  // Chiller Bypass Valve (Manual-only per user spec)
  valves['B51F_BPMV'] = makeValve('B51F_BPMV', 'CHW Bypass Control Valve (Manual Only)', 'chiller', 'CVAL', true, 0);

  // Chiller & Condenser Sensors (100% verified from Scr_B5_ChillerSystem.Pdl & fds_img_33.png)
  sensors['B51F_CHSTS1'] = makeSensor('B51F_CHSTS1', 'CHW Supply Temp', 'chiller', 'TIT', 8.0, '°C', 0, 25, { lla: 4.5, la: 6.0, ha: 10.5, hha: 12.5 });
  sensors['B51F_CHRTS2'] = makeSensor('B51F_CHRTS2', 'CHW Return Temp', 'chiller', 'TIT', 12.0, '°C', 0, 30, { lla: 7.0, la: 9.0, ha: 15.5, hha: 17.5 });
  sensors['B51F_CHWPS1'] = makeSensor('B51F_CHWPS1', 'CHWP Common Header Pressure', 'chiller', 'PIT_BAR', 4.0, 'bar', 0, 8, { lla: 1.5, la: 2.5, ha: 5.5, hha: 6.5 });
  sensors['B51F_BPPS1'] = makeSensor('B51F_BPPS1', 'CHW Bypass Supply Press', 'chiller', 'PIT_BAR', 4.0, 'bar', 0, 10, { lla: 1.5, la: 2.5, ha: 6.5, hha: 7.5 });
  sensors['B51F_BPPS2'] = makeSensor('B51F_BPPS2', 'CHW Bypass Return Press', 'chiller', 'PIT_BAR', 0.8, 'bar', 0, 10, { lla: 0.1, la: 0.2, ha: 3.0, hha: 4.0 });
  sensors['B51F_BPTS3'] = makeSensor('B51F_BPTS3', 'CHW Bypass Line Temp', 'chiller', 'TIT', 8.3, '°C', 0, 25, { lla: 4.0, la: 6.0, ha: 14.0, hha: 16.0 });
  sensors['B51F_TT10505'] = makeSensor('B51F_TT10505', 'CT Outlet Water Temp (Controls CT Fans)', 'chiller', 'TIT', 25.0, '°C', 15, 45, { lla: 17.0, la: 19.0, ha: 30.0, hha: 33.0 });
  sensors['B51F_PIT10505'] = makeSensor('B51F_PIT10505', 'CWP Header Pressure', 'chiller', 'PIT_BAR', 2.2, 'bar', 0, 6, { lla: 1.0, la: 1.4, ha: 3.8, hha: 4.5 });

  // Chiller & CT PID Loops (CHWP -> CHWPS1, CWP -> PIT10505, CT Fans -> TT10505)
  pids['B51F_CH11CHWP_PID'] = makePid('B51F_CH11CHWP_PID', 'CHWP Common Header Press PID (CHWPS1)', 'chiller', 'B51F_CHWPS1', 4.0, 'bar', 1.5, 6.0, { kp: 14, ki: 3.5, reverseActing: true, initCv: 77 });
  pids['B51F_CT11CWP_PID'] = makePid('B51F_CT11CWP_PID', 'CWP Common Header Press PID (PIT10505)', 'chiller', 'B51F_PIT10505', 2.2, 'bar', 1.0, 4.0, { kp: 18, ki: 4.0, reverseActing: true, initCv: 78 });
  pids['B51F_CT11FN_PID'] = makePid('B51F_CT11FN_PID', 'CT Fans Common Temp PID (TT10505)', 'chiller', 'B51F_TT10505', 25.0, '°C', 20.0, 35.0, { kp: 12, ki: 2.2, reverseActing: false, initCv: 70 });

  // =========================================================================
  // 2. HEAT RECOVERY SYSTEM (Scr_B5_HeatRecovery.Pdl)
  // =========================================================================
  equipment['B51F_CH11HWP'] = makeEq('B51F_CH11HWP', 'Hot Water Pump CH11HWP', 'heat_recovery', 'vfd', 30, 'PMDB_B5M2F_DBCTPUMP51', true, 2390.2, 37.0);
  valves['B51F_HEMV'] = makeValve('B51F_HEMV', 'Heat Exchanger Valve HEMV (Manual Only)', 'heat_recovery', 'CVAL', true, 0);
  valves['B51F_HBPMV'] = makeValve('B51F_HBPMV', 'Hot Water Bypass Valve HBPMV (Manual Only)', 'heat_recovery', 'CVAL', true, 0);

  sensors['B51F_HSTS1'] = makeSensor('B51F_HSTS1', 'Hot Water Supply Temp', 'heat_recovery', 'TIT', 45.0, '°C', 20, 65, { lla: 32, la: 36, ha: 52, hha: 56 });
  sensors['B51F_HRTS2'] = makeSensor('B51F_HRTS2', 'Hot Water Return Temp', 'heat_recovery', 'TIT', 40.0, '°C', 20, 60, { lla: 28, la: 32, ha: 48, hha: 52 });
  sensors['B51F_HBPPS1'] = makeSensor('B51F_HBPPS1', 'Hot Water Supply Header Press', 'heat_recovery', 'PIT_BAR', 3.2, 'bar', 0, 6, { lla: 1.0, la: 1.6, ha: 4.6, hha: 5.2 });
  sensors['B51F_HBPPS2'] = makeSensor('B51F_HBPPS2', 'Hot Water Return Header Press', 'heat_recovery', 'PIT_BAR', 1.4, 'bar', 0, 6, { lla: 0.4, la: 0.7, ha: 3.0, hha: 3.6 });
  sensors['B51F_HBPTS3'] = makeSensor('B51F_HBPTS3', 'Hot Water Bypass Temp', 'heat_recovery', 'TIT', 44.2, '°C', 20, 65, { lla: 30, la: 35, ha: 52, hha: 56 });
  sensors['B51F_HCHPS1'] = makeSensor('B51F_HCHPS1', 'CH14 Cold End Supply Press', 'heat_recovery', 'PIT_BAR', 3.4, 'bar', 0, 6, { lla: 1.0, la: 1.6, ha: 4.8, hha: 5.5 });
  sensors['B51F_HCLPS1'] = makeSensor('B51F_HCLPS1', 'CH14 Cold End Return Press', 'heat_recovery', 'PIT_BAR', 1.5, 'bar', 0, 6, { lla: 0.4, la: 0.7, ha: 3.0, hha: 3.6 });

  pids['B51F_CH11HWP_PID'] = makePid('B51F_CH11HWP_PID', 'Hot Water Pump CH11HWP Press PID', 'heat_recovery', 'B51F_HBPPS1', 3.2, 'bar', 1.5, 5.0, { kp: 16, ki: 3.8, reverseActing: true, initCv: 74 });
  pids['B51F_CH14CHWP_PID'] = makePid('B51F_CH14CHWP_PID', 'CH14 Cold-End Pump Press PID', 'heat_recovery', 'B51F_HCHPS1', 3.4, 'bar', 1.5, 5.0, { kp: 16, ki: 3.8, reverseActing: true, initCv: 76 });

  // =========================================================================
  // 3. PCW & DI WATER SYSTEM (Scr_B5_PCW.Pdl & Scr_B5_DI.Pdl)
  // =========================================================================
  equipment['B51F_P501A'] = makeEq('B51F_P501A', 'PCW Pump P-501A', 'pcw', 'vfd', 37, 'PMDB_B5M2F_DBPCW51', true, 2650.0, 38.0);
  equipment['B51F_P501B'] = makeEq('B51F_P501B', 'PCW Pump P-501B', 'pcw', 'vfd', 37, 'PMDB_B5M2F_DBPCW51', true, 2510.5, 38.0);
  equipment['B51F_P501C'] = makeEq('B51F_P501C', 'PCW Pump P-501C', 'pcw', 'vfd', 37, 'PMDB_B5M2F_DBPCW51', false, 2320.2, 35.0);
  // P-502 Rejected PCW Pump (DOL): Auto runs only when TK-501 LT10501 >= High (85%) and stops <= Low (35%); starts STOPPED at 68%
  equipment['B51F_P502'] = makeEq('B51F_P502', 'Rejected PCW Pump P-502 (TK-501)', 'pcw', 'dol', 5.5, 'PMDB_B5M2F_DBPCW51', false, 1890.0, 0);

  // PCW Valves: TCV10501/02 Auto PID; XV10501 (Drain) & XV10502 (DI Makeup -> starts OPEN at PIT10501=1.6 < L=1.8); XV10503/04 Manual-only
  valves['B51F_TCV10501'] = makeValve('B51F_TCV10501', 'PCW Line 1 Temp Control Valve', 'pcw', 'CVAL', false, 52, 'B51F_TCV10501_PID');
  valves['B51F_TCV10502'] = makeValve('B51F_TCV10502', 'PCW Line 2 Temp Control Valve', 'pcw', 'CVAL', false, 48, 'B51F_TCV10502_PID');
  valves['B51F_XV10501'] = makeValve('B51F_XV10501', 'PCW Drain Valve XV-10501', 'pcw', 'XVAL', false, 0);
  valves['B51F_XV10502'] = makeValve('B51F_XV10502', 'PCW DI Makeup Valve XV-10502', 'pcw', 'XVAL', false, 100); // Starts OPEN!
  valves['B51F_XV10503'] = makeValve('B51F_XV10503', 'PCW Bypass Valve XV-10503 (Manual)', 'pcw', 'XVAL', true, 0);
  valves['B51F_XV10504'] = makeValve('B51F_XV10504', 'PCW Bypass Valve XV-10504 (Manual)', 'pcw', 'XVAL', true, 0);

  // DI Water 2F PRVs (Process Control Valves with PID tracking PIT10701..03, no branch-stop interlock)
  valves['B52F_PCV10701'] = makeValve('B52F_PCV10701', 'DI PRV Disco Dicing Room', 'di', 'CVAL', false, 56, 'B52F_PCV10701_PID');
  valves['B52F_PCV10702'] = makeValve('B52F_PCV10702', 'DI PRV Sand Blasting Room', 'di', 'CVAL', false, 52, 'B52F_PCV10702_PID');
  valves['B52F_PCV10703'] = makeValve('B52F_PCV10703', 'DI PRV Cleaning Room', 'di', 'CVAL', false, 60, 'B52F_PCV10703_PID');

  // PCW & DI Sensors (100% verified from Scr_B5_PCW fds_img_39.png: DPT10501, TT10501, TT10502, TT10503, FIT10501, PIT10501, LT10501)
  sensors['B51F_PIT10501'] = makeSensor('B51F_PIT10501', 'PCW Pump Suction Pressure', 'pcw', 'PIT_BAR', 1.6, 'bar', 0, 4, { lla: 0.9, la: 1.8, ha: 2.2, hha: 2.6 });
  sensors['B51F_LT10501'] = makeSensor('B51F_LT10501', 'PCW Tank TK-501 Level', 'pcw', 'LIT', 68.0, '%', 0, 100, { lla: 20, la: 35, ha: 85, hha: 92 }, 1);
  sensors['B51F_FIT10501'] = makeSensor('B51F_FIT10501', 'PCW Main Supply Flow', 'pcw', 'FIT', 145.0, 'm³/h', 0, 400, { lla: 20, la: 40, ha: 300, hha: 360 }, 1);
  sensors['B51F_TT10501'] = makeSensor('B51F_TT10501', 'PCW HX E-501A Supply Temp', 'pcw', 'TIT', 22.0, '°C', 10, 35, { lla: 15, la: 18, ha: 25, hha: 28 });
  sensors['B51F_TT10502'] = makeSensor('B51F_TT10502', 'PCW HX E-501B Supply Temp', 'pcw', 'TIT', 22.0, '°C', 10, 35, { lla: 15, la: 18, ha: 25, hha: 28 });
  sensors['B51F_TT10503'] = makeSensor('B51F_TT10503', 'PCW 2F Return Temp', 'pcw', 'TIT', 25.4, '°C', 10, 40, { lla: 16, la: 19, ha: 30, hha: 34 });
  sensors['B51F_DPT10501'] = makeSensor('B51F_DPT10501', 'PCW 2F End-of-Line Diff Press', 'pcw', 'DPT', 1.8, 'bar', 0, 4, { lla: 0.8, la: 1.2, ha: 2.6, hha: 3.2 });

  sensors['B52F_PIT10701'] = makeSensor('B52F_PIT10701', 'DI Press — Disco Dicing', 'di', 'PIT_BAR', 3.0, 'bar', 0, 6, { lla: 1.5, la: 2.2, ha: 3.8, hha: 4.5 });
  sensors['B52F_PIT10702'] = makeSensor('B52F_PIT10702', 'DI Press — Sand Blasting', 'di', 'PIT_BAR', 3.0, 'bar', 0, 6, { lla: 1.5, la: 2.2, ha: 3.8, hha: 4.5 });
  sensors['B52F_PIT10703'] = makeSensor('B52F_PIT10703', 'DI Press — Cleaning Room', 'di', 'PIT_BAR', 3.0, 'bar', 0, 6, { lla: 1.5, la: 2.2, ha: 3.8, hha: 4.5 });
  sensors['B52F_FIT10701'] = makeSensor('B52F_FIT10701', 'DI Flow — Disco Dicing', 'di', 'FIT', 18.5, 'm³/h', 0, 50, { lla: 1, la: 4, ha: 38, hha: 45 }, 1);
  sensors['B52F_FIT10702'] = makeSensor('B52F_FIT10702', 'DI Flow — Sand Blasting', 'di', 'FIT', 14.2, 'm³/h', 0, 50, { lla: 1, la: 3, ha: 38, hha: 45 }, 1);
  sensors['B52F_FIT10703'] = makeSensor('B52F_FIT10703', 'DI Flow — Cleaning Room', 'di', 'FIT', 22.0, 'm³/h', 0, 50, { lla: 1, la: 5, ha: 38, hha: 45 }, 1);

  pids['B51F_P501A_PID'] = makePid('B51F_P501A_PID', 'PCW Pumps End-of-Line DP PID (DPT10501)', 'pcw', 'B51F_DPT10501', 1.8, 'bar', 0.8, 3.2, { kp: 20, ki: 4.5, reverseActing: true, initCv: 76 });
  pids['B51F_TCV10501_PID'] = makePid('B51F_TCV10501_PID', 'PCW TCV-10501 Temp PID (TT10501)', 'pcw', 'B51F_TT10501', 22.0, '°C', 16, 28, { kp: 14, ki: 2.8, reverseActing: false, initCv: 52, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
  pids['B51F_TCV10502_PID'] = makePid('B51F_TCV10502_PID', 'PCW TCV-10502 Temp PID (TT10502)', 'pcw', 'B51F_TT10502', 22.0, '°C', 16, 28, { kp: 14, ki: 2.8, reverseActing: false, initCv: 48, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
  pids['B52F_PCV10701_PID'] = makePid('B52F_PCV10701_PID', 'DI PRV PCV-10701 Press PID', 'di', 'B52F_PIT10701', 3.0, 'bar', 1.5, 4.5, { kp: 22, ki: 5.0, reverseActing: true, initCv: 56, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
  pids['B52F_PCV10702_PID'] = makePid('B52F_PCV10702_PID', 'DI PRV PCV-10702 Press PID', 'di', 'B52F_PIT10702', 3.0, 'bar', 1.5, 4.5, { kp: 22, ki: 5.0, reverseActing: true, initCv: 52, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
  pids['B52F_PCV10703_PID'] = makePid('B52F_PCV10703_PID', 'DI PRV PCV-10703 Press PID', 'di', 'B52F_PIT10703', 3.0, 'bar', 1.5, 4.5, { kp: 22, ki: 5.0, reverseActing: true, initCv: 60, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });

  // =========================================================================
  // 4. COMPRESSED AIR (OFLAC, OFRAC) & PROCESS VACUUM (PV)
  // =========================================================================
  // OFLAC: AC204 (VSD lead running) + AC201, AC202 (Fix lag standby)
  equipment['B51F_AC204'] = makeEq('B51F_AC204', 'OFLAC VSD Compressor AC-204', 'oflac', 'ac_vsd', 75, 'PMDB_B5M2F_DBAIR51', true, 3420.5, 0, {
    dischargePressure: 7.2,
    systemPressure: 7.0,
    targetPress: 7.0,
    stage1Temp: 76.5,
    stage2Temp: 82.0,
    inlet2ndPress: 2.3,
  });
  equipment['B51F_AC201'] = makeEq('B51F_AC201', 'OFLAC Fix Compressor AC-201', 'oflac', 'ac_fix', 75, 'PMDB_B5M2F_DBAIR51', false, 2910.0, 0, {
    dischargePressure: 7.0,
    systemPressure: 7.0,
    loadPress: 6.6,
    unloadPress: 7.4,
    stage1Temp: 34.0,
    stage2Temp: 35.0,
    inlet2ndPress: 1.0,
    loaded: 0,
  });
  equipment['B51F_AC202'] = makeEq('B51F_AC202', 'OFLAC Fix Compressor AC-202', 'oflac', 'ac_fix', 75, 'PMDB_B5M2F_DBAIR51', false, 2855.3, 0, {
    dischargePressure: 7.0,
    systemPressure: 7.0,
    loadPress: 6.6,
    unloadPress: 7.4,
    stage1Temp: 34.0,
    stage2Temp: 35.0,
    inlet2ndPress: 1.0,
    loaded: 0,
  });
  equipment['B51F_AD201A'] = makeEq('B51F_AD201A', 'OFLAC Air Dryer AD-201A', 'oflac', 'dryer', 4.0, 'PMDB_B5M2F_DBAIR51', true, 3410.0, 0);
  equipment['B51F_AD202A'] = makeEq('B51F_AD202A', 'OFLAC Air Dryer AD-202A', 'oflac', 'dryer', 4.0, 'PMDB_B5M2F_DBAIR51', false, 2900.0, 0);
  equipment['B51F_AD202B'] = makeEq('B51F_AD202B', 'OFLAC Air Dryer AD-202B', 'oflac', 'dryer', 4.0, 'PMDB_B5M2F_DBAIR51', false, 2840.0, 0);
  sensors['B51F_PIT20101'] = makeSensor('B51F_PIT20101', 'OFLAC Header Pressure', 'oflac', 'PIT_BAR', 7.0, 'bar', 0, 10, { lla: 5.5, la: 6.2, ha: 8.0, hha: 8.8 });
  sensors['B51F_AIT20101'] = makeSensor('B51F_AIT20101', 'OFLAC Air Dew Point', 'oflac', 'AIT', -40.2, '°C', -70, 10, { lla: -65, la: -60, ha: -25, hha: -15 }, 1);

  // OFRAC: AC101 running + AC102 standby + AD101A/B, AD102A/B + P10101A/B
  equipment['B51F_AC101'] = makeEq('B51F_AC101', 'OFRAC Oil-Free Comp AC-101', 'ofrac', 'ac_vsd', 90, 'PMDB_B5M2F_DBAIR51', true, 3150.0, 0, {
    dischargePressure: 7.2,
    systemPressure: 7.0,
    targetPress: 7.0,
    stage1Temp: 79.0,
    stage2Temp: 84.5,
    inlet2ndPress: 2.4,
  });
  equipment['B51F_AC102'] = makeEq('B51F_AC102', 'OFRAC Oil-Free Comp AC-102', 'ofrac', 'ac_fix', 90, 'PMDB_B5M2F_DBAIR51', false, 2980.0, 0, {
    dischargePressure: 7.0,
    systemPressure: 7.0,
    loadPress: 6.6,
    unloadPress: 7.4,
    stage1Temp: 33.0,
    stage2Temp: 34.0,
    inlet2ndPress: 1.0,
    loaded: 0,
  });
  equipment['B51F_AD101A'] = makeEq('B51F_AD101A', 'OFRAC Dryer AD-101A', 'ofrac', 'dryer', 4.5, 'PMDB_B5M2F_DBAIR51', true, 3145.0, 0);
  equipment['B51F_AD101B'] = makeEq('B51F_AD101B', 'OFRAC Dryer AD-101B', 'ofrac', 'dryer', 4.5, 'PMDB_B5M2F_DBAIR51', false, 2970.0, 0);
  equipment['B51F_AD102A'] = makeEq('B51F_AD102A', 'OFRAC Dryer AD-102A', 'ofrac', 'dryer', 4.5, 'PMDB_B5M2F_DBAIR51', false, 2810.0, 0);
  equipment['B51F_AD102B'] = makeEq('B51F_AD102B', 'OFRAC Dryer AD-102B', 'ofrac', 'dryer', 4.5, 'PMDB_B5M2F_DBAIR51', false, 2790.0, 0);
  equipment['B51F_P10101A'] = makeEq('B51F_P10101A', 'OFRAC Cooling Pump P-10101A', 'ofrac', 'dol', 7.5, 'PMDB_B5M2F_DBAIR51', true, 3148.0, 0);
  equipment['B51F_P10101B'] = makeEq('B51F_P10101B', 'OFRAC Cooling Pump P-10101B', 'ofrac', 'dol', 7.5, 'PMDB_B5M2F_DBAIR51', false, 2960.0, 0);
  sensors['B51F_PIT10101'] = makeSensor('B51F_PIT10101', 'OFRAC Header Pressure', 'ofrac', 'PIT_BAR', 7.0, 'bar', 0, 10, { lla: 5.5, la: 6.2, ha: 8.0, hha: 8.8 });
  sensors['B51F_AIT10101'] = makeSensor('B51F_AIT10101', 'OFRAC Air Dew Point', 'ofrac', 'AIT', -41.5, '°C', -70, 10, { lla: -65, la: -60, ha: -25, hha: -15 }, 1);

  // PV: PV1301A running + PV1301B standby
  equipment['B51F_PV1301A'] = makeEq('B51F_PV1301A', 'Process Vacuum Pump PV-1301A', 'pv', 'pv', 22, 'PMDB_B5M2F_DB55', true, 3055.0, 0, {
    t2AirendTemp: 72.5,
    t3OilTemp: 66.0,
    targetVacKpa: -75.0,
  });
  equipment['B51F_PV1301B'] = makeEq('B51F_PV1301B', 'Process Vacuum Pump PV-1301B', 'pv', 'pv', 22, 'PMDB_B5M2F_DB55', false, 2940.0, 0, {
    t2AirendTemp: 32.0,
    t3OilTemp: 30.0,
    targetVacKpa: -75.0,
  });
  sensors['B51F_PIT1301'] = makeSensor('B51F_PIT1301', 'PV Main Header Vacuum', 'pv', 'PIT_KPA', -75.0, 'kPa', -100, 0, { lla: -95, la: -90, ha: -60, hha: -45 }, 1);
  sensors['B52F_PIT1303'] = makeSensor('B52F_PIT1303', 'PV 2F End-of-Line Vacuum', 'pv', 'PIT_KPA', -74.2, 'kPa', -100, 0, { lla: -95, la: -90, ha: -58, hha: -42 }, 1);

  // =========================================================================
  // 5. AHU & PAU (Scr_B5_AIR_AHU.Pdl, Scr_B5_CW_AHU.Pdl — 3-way CWCV & HWCV!)
  // =========================================================================
  const ahuList = [
    { tag: 'B5M1F_AHU01', label: 'AHU-B5-1F-01 (M1F)', kw: 18.5, tempSP: 22.0, rhSP: 45.0, dpSP: 9.5, sasSP: 350 },
    { tag: 'B5M2F_AHU01', label: 'AHU-B5-2F-01 (Cleanroom 1)', kw: 22.0, tempSP: 21.5, rhSP: 45.0, dpSP: 9.0, sasSP: 380 },
    { tag: 'B5M2F_AHU02', label: 'AHU-B5-2F-02 (Cleanroom 2)', kw: 22.0, tempSP: 21.5, rhSP: 45.0, dpSP: 9.0, sasSP: 380 },
    { tag: 'B5M2F_AHU03', label: 'AHU-B5-2F-03 (Metro/Leak)', kw: 18.5, tempSP: 22.0, rhSP: 48.0, dpSP: 10.4, sasSP: 340 },
    { tag: 'B5M2F_AHU04', label: 'AHU-B5-2F-04 (KNN Tech)', kw: 22.0, tempSP: 21.0, rhSP: 42.0, dpSP: 7.5, sasSP: 400 },
    { tag: 'B5M2F_PAU01', label: 'PAU-B5-2F-01 (Fresh Air)', kw: 15.0, tempSP: 14.0, rhSP: 55.0, dpSP: 8.5, sasSP: 320 },
  ];

  for (const [idx, a] of ahuList.entries()) {
    const isPau = a.tag.includes('PAU');
    equipment[a.tag] = makeEq(a.tag, a.label, 'ahu', 'vfd', a.kw, 'PMDB_B5M2F_DBAHU51', true, 4100 + idx * 120, 38.0);
    const cwTag = isPau ? `${a.tag}_CHCV` : `${a.tag}_CWCV`;
    const hwTag = `${a.tag}_HWCV`;
    const fanPidTag = `${a.tag}_PID`;
    const cwPidTag = `${cwTag}_PID`;
    const hwPidTag = `${hwTag}_PID`;

    valves[cwTag] = makeValve(cwTag, `${a.label} 3-Way CW Valve`, 'ahu', 'CVAL', false, 52, cwPidTag);
    if (!isPau) {
      valves[hwTag] = makeValve(hwTag, `${a.label} 3-Way HW Reheat Valve`, 'ahu', 'CVAL', false, 28, hwPidTag);
    }

    const satTag = `${a.tag}_SAT`;
    const ratTag = `${a.tag}_RAT`;
    const rahTag = `${a.tag}_RAH`;
    const sasTag = `${a.tag}_SAS`;
    const dpTag = `${a.tag}_DP`;

    sensors[satTag] = makeSensor(satTag, `${a.label} Supply Air Temp`, 'ahu', 'TIT', isPau ? 14.0 : 15.5, '°C', 5, 35, { lla: 8, la: 11, ha: 22, hha: 26 }, 1);
    sensors[ratTag] = makeSensor(
      ratTag,
      `${a.label} Room/Return Temp`,
      'ahu',
      'TIT',
      a.tempSP,
      '°C',
      10,
      35,
      isPau ? { lla: 8, la: 10, ha: 26, hha: 30 } : { lla: 16, la: 18, ha: 25, hha: 28 },
      1
    );
    sensors[rahTag] = makeSensor(rahTag, `${a.label} Room/Return RH`, 'ahu', 'HIT', a.rhSP, '%RH', 10, 90, { lla: 25, la: 32, ha: 60, hha: 70 }, 1);
    sensors[sasTag] = makeSensor(sasTag, `${a.label} Supply Static Press`, 'ahu', 'PIT_PA', a.sasSP, 'Pa', 0, 800, { lla: 100, la: 180, ha: 580, hha: 680 }, 0);
    sensors[dpTag] = makeSensor(dpTag, `${a.label} Dew Point`, 'ahu', 'TIT', a.dpSP, '°C', 0, 25, { lla: 2, la: 4, ha: 14, hha: 17 }, 1);

    pids[fanPidTag] = makePid(fanPidTag, `${a.label} Fan Static Press PID`, 'ahu', sasTag, a.sasSP, 'Pa', 150, 600, { kp: 0.12, ki: 0.04, kd: 0.005, reverseActing: true, initCv: 82 });
    pids[cwPidTag] = makePid(cwPidTag, `${a.label} CW Valve PID`, 'ahu', isPau ? satTag : dpTag, isPau ? a.tempSP : a.dpSP, '°C', 5, 25, { kp: 10, ki: 2.0, kd: 0.1, reverseActing: false, initCv: 58, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
    if (!isPau) {
      pids[hwPidTag] = makePid(hwPidTag, `${a.label} HW Reheat Valve PID`, 'ahu', ratTag, a.tempSP, '°C', 16, 28, { kp: 10, ki: 2.0, kd: 0.1, reverseActing: true, initCv: 30, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
    }

    ahus[a.tag] = {
      ahuTag: a.tag,
      label: a.label,
      cwValveTag: cwTag,
      hwValveTag: isPau ? '' : hwTag,
      fanPidTag,
      cwPidTag,
      hwPidTag: isPau ? '' : hwPidTag,
      satSensorTag: satTag,
      ratSensorTag: ratTag,
      rahSensorTag: rahTag,
      sasSensorTag: sasTag,
      dewPointSensorTag: dpTag,
      roomTempSP: a.tempSP,
      roomRhSP: a.rhSP,
      dewPointSP: a.dpSP,
      sasSP: a.sasSP,
    };
  }

  // =========================================================================
  // 6. EXHAUST & VENTILATION (Scr_B5_EXH.Pdl, Scr_B5_Toilet_Exhaust.Pdl)
  // =========================================================================
  equipment['B5M2F_FA11201A'] = makeEq('B5M2F_FA11201A', 'Process Exhaust FA-11201A', 'exh', 'vfd', 15, 'PMDB_B5M2F_DBFAN51', true, 3810, 39.0);
  equipment['B5M2F_FA11203A'] = makeEq('B5M2F_FA11203A', 'Process Exhaust FA-11203A', 'exh', 'vfd', 15, 'PMDB_B5M2F_DBFAN51', true, 3790, 38.0);
  equipment['B5M2F_FA11204A'] = makeEq('B5M2F_FA11204A', 'Process Exhaust FA-11204A', 'exh', 'vfd', 15, 'PMDB_B5M2F_DBFAN51', true, 3760, 37.5);
  equipment['B51F_FAF01'] = makeEq('B51F_FAF01', '1F Plant Fresh Air Fan FAF-01', 'exh', 'vfd', 7.5, 'PMDB_B5M2F_DBFAN51', true, 3600, 35.0);
  equipment['B51F_FAF02'] = makeEq('B51F_FAF02', '1F Plant Fresh Air Fan FAF-02', 'exh', 'vfd', 7.5, 'PMDB_B5M2F_DBFAN51', true, 3590, 35.0);
  equipment['B51F_EAF01'] = makeEq('B51F_EAF01', '1F Plant Exhaust Fan EAF-01', 'exh', 'vfd', 7.5, 'PMDB_B5M2F_DBFAN51', true, 3605, 36.0);
  equipment['B51F_EAF02'] = makeEq('B51F_EAF02', '1F Plant Exhaust Fan EAF-02', 'exh', 'vfd', 7.5, 'PMDB_B5M2F_DBFAN51', true, 3585, 36.0);
  equipment['B51F_TEF01'] = makeEq('B51F_TEF01', '1F Toilet Exhaust TEF-01', 'exh', 'dol', 1.5, 'PMDB_B5M2F_DBOFF51', true, 4200, 0);
  equipment['B52F_TEF01'] = makeEq('B52F_TEF01', '2F Toilet Exhaust TEF-01', 'exh', 'dol', 1.5, 'PMDB_B5M2F_DBOFF51', true, 4180, 0);

  sensors['B51F_PIT11201'] = makeSensor('B51F_PIT11201', 'Exhaust Duct 1 Static Press', 'exh', 'PIT_KPA', -0.45, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B51F_PIT11202'] = makeSensor('B51F_PIT11202', 'Exhaust Duct 2 Static Press', 'exh', 'PIT_KPA', -0.42, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B51F_TIT11201'] = makeSensor('B51F_TIT11201', 'Plant Room Ambient Temp', 'exh', 'TIT', 27.5, '°C', 15, 50, { lla: 16, la: 18, ha: 36, hha: 42 }, 1);

  pids['B5M2F_FA11201A_PID'] = makePid('B5M2F_FA11201A_PID', 'FA-11201A Exhaust Press PID', 'exh', 'B51F_PIT11201', -0.45, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 78 });
  pids['B5M2F_FA11203A_PID'] = makePid('B5M2F_FA11203A_PID', 'FA-11203A Exhaust Press PID', 'exh', 'B51F_PIT11202', -0.42, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 76 });
  pids['B5M2F_FA11204A_PID'] = makePid('B5M2F_FA11204A_PID', 'FA-11204A Exhaust Press PID', 'exh', 'B51F_PIT11202', -0.42, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 75 });

  // =========================================================================
  // 7. DEMAND SEQUENCERS (FB_Demand — exact Fpl_Demand_B5* faceplates)
  // =========================================================================
  const demands: Partial<Record<DemandId, DemandSequencer>> = {
    B5CH: {
      id: 'B5CH',
      label: 'B5 Chiller Demand Control',
      subsystem: 'chiller',
      enable: true,
      unitTags: ['B51F_CH11', 'B51F_CH12', 'B51F_CH13'],
      priors: [1, 2, 3],
      pvSensorTag: 'B51F_CHSTS1',
      pvUnit: '°C',
      startUpSP: 9.2,
      shutDownSP: 7.4,
      startUpDelaySec: 8,
      shutDownDelaySec: 12,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 2,
      count: 2,
      status: 'DEMAND_STB',
      stageUpWhenHigh: true,
      chillerCapacityStartSP: 82,
      chillerCapacityStopSP: 42,
    },
    B5CHWP: {
      id: 'B5CHWP',
      label: 'B5 CHWP Demand Control',
      subsystem: 'chiller',
      enable: true,
      unitTags: ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'],
      priors: [1, 2, 3],
      pvSensorTag: 'B51F_CHWPS1',
      pvUnit: 'bar',
      startUpSP: 3.3,
      shutDownSP: 4.5,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 2,
      count: 2,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5CWP: {
      id: 'B5CWP',
      label: 'B5 CWP Demand Control',
      subsystem: 'chiller',
      enable: true,
      unitTags: ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'],
      priors: [1, 2, 3],
      pvSensorTag: 'B51F_PIT10505',
      pvUnit: 'bar',
      startUpSP: 1.7,
      shutDownSP: 2.7,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 2,
      count: 2,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5CT: {
      id: 'B5CT',
      label: 'B5 Cooling Tower Demand Control',
      subsystem: 'chiller',
      enable: true,
      unitTags: [
        'B51F_CT11FN',
        'B51F_CT12FN',
        'B51F_CT13FN',
        'B51F_CT14FN',
        'B51F_CT15FN',
        'B51F_CT16FN',
        'B51F_CT17FN',
        'B51F_CT18FN',
        'B51F_CT19FN',
      ],
      priors: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      pvSensorTag: 'B51F_TT10505',
      pvUnit: '°C',
      startUpSP: 26.2,
      shutDownSP: 24.0,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 4,
      count: 4,
      status: 'DEMAND_STB',
      stageUpWhenHigh: true,
    },
    B5PCW: {
      id: 'B5PCW',
      label: 'B5 PCW Pump Demand Control',
      subsystem: 'pcw',
      enable: true,
      unitTags: ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'],
      priors: [1, 2, 3],
      pvSensorTag: 'B51F_DPT10501',
      pvUnit: 'bar',
      startUpSP: 1.4,
      shutDownSP: 2.2,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 2,
      count: 2,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5OFLAC: {
      id: 'B5OFLAC',
      label: 'B5 Oil-Flood AC Demand Control',
      subsystem: 'oflac',
      enable: true,
      unitTags: ['B51F_AC204', 'B51F_AC201', 'B51F_AC202'],
      priors: [1, 2, 3],
      pvSensorTag: 'B51F_PIT20101',
      pvUnit: 'bar',
      startUpSP: 6.5,
      shutDownSP: 7.4,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 1,
      count: 1,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5OFRAC: {
      id: 'B5OFRAC',
      label: 'B5 Oil-Free AC Demand Control',
      subsystem: 'ofrac',
      enable: true,
      unitTags: ['B51F_AC101', 'B51F_AC102'],
      priors: [1, 2],
      pvSensorTag: 'B51F_PIT10101',
      pvUnit: 'bar',
      startUpSP: 6.5,
      shutDownSP: 7.4,
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 1,
      count: 1,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5OFRACCP: {
      id: 'B5OFRACCP',
      label: 'B5 Oil-Free AC Cooling Pump Prefix',
      subsystem: 'ofrac',
      enable: true,
      unitTags: ['B51F_P10101A', 'B51F_P10101B'],
      priors: [1, 2],
      pvSensorTag: 'B51F_PIT10101',
      pvUnit: 'bar',
      startUpSP: 6.0,
      shutDownSP: 8.0,
      startUpDelaySec: 4,
      shutDownDelaySec: 8,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 1,
      count: 1,
      status: 'DEMAND_STB',
      stageUpWhenHigh: false,
    },
    B5PV: {
      id: 'B5PV',
      label: 'B5 Process Vacuum Demand Control',
      subsystem: 'pv',
      enable: true,
      unitTags: ['B51F_PV1301A', 'B51F_PV1301B'],
      priors: [1, 2],
      pvSensorTag: 'B51F_PIT1301',
      pvUnit: 'kPa',
      startUpSP: -68.0, // Vacuum weaker (higher/less negative than -68 kPa) -> stage up
      shutDownSP: -80.0, // Vacuum strong (below -80 kPa) -> stage down
      startUpDelaySec: 6,
      shutDownDelaySec: 10,
      elapsedSec: 0,
      stuCall: false,
      stdCall: false,
      stuPrior: 0,
      stdPrior: 0,
      targetCount: 1,
      count: 1,
      status: 'DEMAND_STB',
      stageUpWhenHigh: true,
    },
  };

  // =========================================================================
  // 8. POWER MONITORING SYSTEM (Scr_B5_PMS — GraCS MDB 5.1..5.3 -> DB_*)
  // =========================================================================
  meters['PMDB_B5M2F_MDB51'] = makeMeter('PMDB_B5M2F_MDB51', 'MDB-5.1 (Chillers & Utility)', null, 'PM8000', 18, 482150);
  meters['PMDB_B5M2F_MDB52'] = makeMeter('PMDB_B5M2F_MDB52', 'MDB-5.2 (HVAC, PCW & Air)', null, 'PM8000', 14, 391420);
  meters['PMDB_B5M2F_MDB53'] = makeMeter('PMDB_B5M2F_MDB53', 'MDB-5.3 (Process & Floor DBs)', null, 'PM8000', 22, 315880);

  // Branch DBs under MDB 5.1
  meters['PMDB_B5M2F_DB51'] = makeMeter('PMDB_B5M2F_DB51', 'DB-5.1 (CH-11)', 'PMDB_B5M2F_MDB51', 'PMMFM383AC', 2, 128400);
  meters['PMDB_B5M2F_DB52'] = makeMeter('PMDB_B5M2F_DB52', 'DB-5.2 (CH-12)', 'PMDB_B5M2F_MDB51', 'PMMFM383AC', 2, 122150);
  meters['PMDB_B5M2F_DB53'] = makeMeter('PMDB_B5M2F_DB53', 'DB-5.3 (CH-13)', 'PMDB_B5M2F_MDB51', 'PMMFM383AC', 1.5, 98420);
  meters['PMDB_B5M2F_DB54'] = makeMeter('PMDB_B5M2F_DB54', 'DB-5.4 (CH-14 HR)', 'PMDB_B5M2F_MDB51', 'PMMFM383AC', 2, 84100);
  meters['PMDB_B5M2F_DBCTPUMP51'] = makeMeter('PMDB_B5M2F_DBCTPUMP51', 'DB-CT-PUMP-5.1', 'PMDB_B5M2F_MDB51', 'PMMFM383AC', 3, 145600);

  // Branch DBs under MDB 5.2
  meters['PMDB_B5M2F_DBAHU51'] = makeMeter('PMDB_B5M2F_DBAHU51', 'DB-AHU-5.1', 'PMDB_B5M2F_MDB52', 'PMMFM383AC', 4, 112300);
  meters['PMDB_B5M2F_DBAIR51'] = makeMeter('PMDB_B5M2F_DBAIR51', 'DB-AIR-5.1 (OFLAC/OFRAC)', 'PMDB_B5M2F_MDB52', 'PMMFM383AC', 3, 164200);
  meters['PMDB_B5M2F_DBPCW51'] = makeMeter('PMDB_B5M2F_DBPCW51', 'DB-PCW-5.1', 'PMDB_B5M2F_MDB52', 'PMMFM383AC', 2, 78900);
  meters['PMDB_B5M2F_DBFAN51'] = makeMeter('PMDB_B5M2F_DBFAN51', 'DB-FAN-5.1 (Exhaust)', 'PMDB_B5M2F_MDB52', 'PMMFM383AC', 2, 62400);
  meters['PMDB_B5M2F_DBOFF51'] = makeMeter('PMDB_B5M2F_DBOFF51', 'DB-OFF-5.1 (Office/TEF)', 'PMDB_B5M2F_MDB52', 'PMMFM383AC', 12, 41200);

  // Branch DBs under MDB 5.3 (Process floor DBs 5.5..5.10)
  meters['PMDB_B5M2F_DB55'] = makeMeter('PMDB_B5M2F_DB55', 'DB-5.5 (PV / Vacuum)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 4, 52100);
  meters['PMDB_B5M2F_DB56'] = makeMeter('PMDB_B5M2F_DB56', 'DB-5.6 (2F Cleanroom A)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 28, 64200);
  meters['PMDB_B5M2F_DB57'] = makeMeter('PMDB_B5M2F_DB57', 'DB-5.7 (2F Cleanroom B)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 24, 59100);
  meters['PMDB_B5M2F_DB58'] = makeMeter('PMDB_B5M2F_DB58', 'DB-5.8 (Disco Dicing)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 32, 71800);
  meters['PMDB_B5M2F_DB59'] = makeMeter('PMDB_B5M2F_DB59', 'DB-5.9 (Sand Blasting)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 19, 46300);
  meters['PMDB_B5M2F_DB510'] = makeMeter('PMDB_B5M2F_DB510', 'DB-5.10 (Cleaning Room)', 'PMDB_B5M2F_MDB53', 'PMMFM383AC', 21, 51900);

  // Cast demands map to include Building 2's B2PCW sequencer populated right below
  const allDemands = demands as Record<DemandId, DemandSequencer>;

  // =========================================================================
  // 9. MERGE BUILDING 2 (B2_PLC) & BUILDING 3 (B3_PLC) INTO SHARED PLANT STATE
  // =========================================================================
  mergeBuilding2State(equipment, valves, sensors, pids, allDemands, meters, ahus);
  mergeBuilding3State(equipment, valves, sensors, pids, allDemands, meters, ahus);

  return {
    simTimeSec: 0,
    tickCount: 0,
    equipment,
    valves,
    sensors,
    pids,
    demands: allDemands,
    meters,
    ahus,
    alarms: [],
    trends: [],
    sandbox: {
      paused: false,
      timeScale: 1,
      noiseAmplitudePct: 100,
      ambientWetBulbC: 22.5,
      coolingLoadPct: 58,
      b3CoolingLoadPct: 58,
      pcwToolLoadPct: 55,
      b2PcwToolLoadPct: 55,
      diBranchDemandPct: 60,
      oflacAirDemandPct: 45,
      ofracAirDemandPct: 45,
      pvVacuumDemandPct: 45,
      diPackageConnected: true,
    },
  };
}
