import type {
  AhuRoomConfig,
  AnalogSensor,
  DemandId,
  DemandSequencer,
  EquipmentUnit,
  PIDLoop,
  PowerMeter,
  ValveUnit,
} from '../types/scada.ts';

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
  initHz = 36.0
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
    loadPct: running ? 60 : 0,
    runHours,
    ratedKw,
    powerMeterTag,
    interlockOk: true,
    interlockReason: 'Permissive OK',
    sttPerm: true,
    stpPerm: true,
    faulted: false,
    telemetry: {},
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
    kd: opts.kd ?? 0.1,
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
    voltageLL: 400.1,
    voltageLN: 231.0,
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
 * Populates all verified COHR2401 Building 2 (B2_PLC — Advanced Optics) equipment, valves,
 * sensors, PID loops, B2PCW Demand sequencer, 21 AHUs + 4 PAUs + 4 FFUs + 5 FCUs,
 * Process/General Exhaust, and PMS switchboard tree directly into the shared PlantState.
 */
export function mergeBuilding2State(
  equipment: Record<string, EquipmentUnit>,
  valves: Record<string, ValveUnit>,
  sensors: Record<string, AnalogSensor>,
  pids: Record<string, PIDLoop>,
  demands: Record<DemandId, DemandSequencer>,
  meters: Record<string, PowerMeter>,
  ahus: Record<string, AhuRoomConfig>
): void {
  // =========================================================================
  // 1. BUILDING 2 PCW STATION (Scr_B2_PCW — Building 2 ONLY, 4 Main Pumps!)
  // =========================================================================
  equipment['B21F_P601A'] = makeEq('B21F_P601A', 'B2 PCW Pump P-601A', 'pcw', 'vfd', 37, 'B21F_DBPCW21', true, 2410.0, 38.0);
  equipment['B21F_P601B'] = makeEq('B21F_P601B', 'B2 PCW Pump P-601B', 'pcw', 'vfd', 37, 'B21F_DBPCW21', true, 2320.5, 38.0);
  equipment['B21F_P601C'] = makeEq('B21F_P601C', 'B2 PCW Pump P-601C', 'pcw', 'vfd', 37, 'B21F_DBPCW21', false, 2190.2, 35.0);
  equipment['B21F_P601D'] = makeEq('B21F_P601D', 'B2 PCW Pump P-601D', 'pcw', 'vfd', 37, 'B21F_DBPCW21', false, 2050.8, 35.0);
  // B21F_P602 Rejected PCW Pump (DOL): Auto runs >= High (85%), stops <= Low (35%), starts STOPPED at 65%
  equipment['B21F_P602'] = makeEq('B21F_P602', 'B2 Rejected PCW Pump P-602 (TK-601)', 'pcw', 'dol', 5.5, 'B21F_DBPCW21', false, 1650.0, 0);

  valves['B21F_TCV10601'] = makeValve('B21F_TCV10601', 'B2 PCW HX E-601A Temp Valve', 'pcw', 'CVAL', false, 52, 'B21F_TCV10601_PID');
  valves['B21F_TCV10602'] = makeValve('B21F_TCV10602', 'B2 PCW HX E-601B Temp Valve', 'pcw', 'CVAL', false, 48, 'B21F_TCV10602_PID');
  valves['B21F_XV10601'] = makeValve('B21F_XV10601', 'B2 PCW Drain Valve XV-10601', 'pcw', 'XVAL', false, 0);
  valves['B21F_XV10602'] = makeValve('B21F_XV10602', 'B2 PCW DI Makeup Valve XV-10602', 'pcw', 'XVAL', false, 100);
  valves['B21F_XV10603'] = makeValve('B21F_XV10603', 'B2 PCW Bypass Valve XV-10603 (Manual)', 'pcw', 'XVAL', true, 0);
  valves['B21F_XV10604'] = makeValve('B21F_XV10604', 'B2 PCW Bypass Valve XV-10604 (Manual)', 'pcw', 'XVAL', true, 0);

  sensors['B21F_PIT10601'] = makeSensor('B21F_PIT10601', 'B2 PCW Pump Suction Pressure', 'pcw', 'PIT_BAR', 1.6, 'bar', 0, 4, { lla: 0.9, la: 1.8, ha: 2.2, hha: 2.6 });
  sensors['B21F_LT10601'] = makeSensor('B21F_LT10601', 'B2 PCW Tank TK-601 Level', 'pcw', 'LIT', 65.0, '%', 0, 100, { lla: 20, la: 35, ha: 85, hha: 92 }, 1);
  sensors['B21F_FIT10601'] = makeSensor('B21F_FIT10601', 'B2 PCW Main Supply Flow', 'pcw', 'FIT', 165.0, 'm³/h', 0, 450, { lla: 20, la: 40, ha: 340, hha: 400 }, 1);
  sensors['B21F_TT10601'] = makeSensor('B21F_TT10601', 'B2 PCW HX E-601A Supply Temp', 'pcw', 'TIT', 22.0, '°C', 10, 35, { lla: 15, la: 18, ha: 25, hha: 28 });
  sensors['B21F_TT10602'] = makeSensor('B21F_TT10602', 'B2 PCW HX E-601B Supply Temp', 'pcw', 'TIT', 22.0, '°C', 10, 35, { lla: 15, la: 18, ha: 25, hha: 28 });
  sensors['B21F_TT10603'] = makeSensor('B21F_TT10603', 'B2 PCW Return Header Temp', 'pcw', 'TIT', 25.3, '°C', 10, 40, { lla: 16, la: 19, ha: 30, hha: 34 });
  sensors['B21F_DPT10601'] = makeSensor('B21F_DPT10601', 'B2 PCW End-of-Line Diff Press', 'pcw', 'DPT', 1.8, 'bar', 0, 4, { lla: 0.8, la: 1.2, ha: 2.6, hha: 3.2 });

  pids['B21F_P601A_PID'] = makePid('B21F_P601A_PID', 'B2 PCW Pumps DP PID (DPT10601)', 'pcw', 'B21F_DPT10601', 1.8, 'bar', 0.8, 3.2, { kp: 20, ki: 4.5, kd: 0.08, reverseActing: true, initCv: 76 });
  pids['B21F_TCV10601_PID'] = makePid('B21F_TCV10601_PID', 'B2 PCW TCV-10601 Temp PID', 'pcw', 'B21F_TT10601', 22.0, '°C', 16, 28, { kp: 14, ki: 2.8, kd: 0.08, reverseActing: false, initCv: 52, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
  pids['B21F_TCV10602_PID'] = makePid('B21F_TCV10602_PID', 'B2 PCW TCV-10602 Temp PID', 'pcw', 'B21F_TT10602', 22.0, '°C', 16, 28, { kp: 14, ki: 2.8, kd: 0.08, reverseActing: false, initCv: 48, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });

  demands['B2PCW'] = {
    id: 'B2PCW',
    label: 'B2 PCW Pump Demand Control (4 Pumps)',
    subsystem: 'pcw',
    enable: true,
    unitTags: ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'],
    priors: [1, 2, 3, 4],
    pvSensorTag: 'B21F_DPT10601',
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
  };

  // =========================================================================
  // 2. BUILDING 2 & BUILDING 3 DI WATER LOOPS (PCV10704, PCV10705) & B2 PV EoL
  // =========================================================================
  valves['B22F_PCV10704'] = makeValve('B22F_PCV10704', 'B2 DI PRV (2F/1F Optics Loops)', 'di', 'CVAL', false, 58, 'B22F_PCV10704_PID');
  sensors['B22F_PIT10704'] = makeSensor('B22F_PIT10704', 'B2 2F DI Loop Pressure', 'di', 'PIT_BAR', 3.0, 'bar', 0, 6, { lla: 1.5, la: 2.2, ha: 3.8, hha: 4.5 });
  sensors['B22F_FIT10704'] = makeSensor('B22F_FIT10704', 'B2 2F DI Loop Flow', 'di', 'FIT', 26.5, 'm³/h', 0, 60, { lla: 1, la: 5, ha: 45, hha: 55 }, 1);
  pids['B22F_PCV10704_PID'] = makePid('B22F_PCV10704_PID', 'B2 DI PRV PCV-10704 Press PID', 'di', 'B22F_PIT10704', 3.0, 'bar', 1.5, 4.5, { kp: 22, ki: 5.0, kd: 0.08, reverseActing: true, initCv: 58, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });

  // Building 3 1st Floor DI Cistern Loop (Scr_B5_DI / Scr_B2_DI / Scr_B3_DI unified screen!)
  valves['B31F_PCV10705'] = makeValve('B31F_PCV10705', 'B3 1F DI Cistern PRV PCV-10705', 'di', 'CVAL', false, 56, 'B31F_PCV10705_PID');
  sensors['B31F_PIT10705'] = makeSensor('B31F_PIT10705', 'B3 1F DI Cistern Pressure', 'di', 'PIT_BAR', 3.0, 'bar', 0, 6, { lla: 1.5, la: 2.2, ha: 3.8, hha: 4.5 });
  sensors['B31F_FIT10705'] = makeSensor('B31F_FIT10705', 'B3 1F DI Cistern Flow', 'di', 'FIT', 21.0, 'm³/h', 0, 60, { lla: 1, la: 4, ha: 42, hha: 52 }, 1);
  pids['B31F_PCV10705_PID'] = makePid('B31F_PCV10705_PID', 'B3 DI PRV PCV-10705 Press PID', 'di', 'B31F_PIT10705', 3.0, 'bar', 1.5, 4.5, { kp: 22, ki: 5.0, kd: 0.08, reverseActing: true, initCv: 56, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });

  sensors['B23F_PIT1302'] = makeSensor('B23F_PIT1302', 'B2 2F/3F PV End-of-Line Vacuum', 'pv', 'PIT_KPA', -73.8, 'kPa', -100, 0, { lla: -95, la: -90, ha: -58, hha: -42 }, 1);

  // =========================================================================
  // 3. BUILDING 2 HVAC — 4 PAUs + 21 AHUs (B22F_AHU01..10 & B2M3F_AHU01..11)
  // =========================================================================
  const b2AirList: { tag: string; label: string; meter: string; kw: number; tempSP: number; rhSP: number; dpSP: number; sasSP: number; isPau?: boolean }[] = [
    // 4 PAUs (1F/2F & 3F)
    { tag: 'B21F_PAU01', label: 'PAU-B2-1F-01 (1F/2F Fresh Air 1)', meter: 'B2M3F_DBAHU21', kw: 18, tempSP: 14.0, rhSP: 55, dpSP: 8.5, sasSP: 320, isPau: true },
    { tag: 'B21F_PAU02', label: 'PAU-B2-1F-02 (1F/2F Fresh Air 2)', meter: 'B2M3F_DBAHU21', kw: 18, tempSP: 14.0, rhSP: 55, dpSP: 8.5, sasSP: 320, isPau: true },
    { tag: 'B22F_PAU01', label: 'PAU-B2-2F-01 (3F Fresh Air 1)', meter: 'B2M3F_DBAHU22', kw: 18, tempSP: 14.0, rhSP: 55, dpSP: 8.5, sasSP: 320, isPau: true },
    { tag: 'B22F_PAU02', label: 'PAU-B2-2F-02 (3F Fresh Air 2)', meter: 'B2M3F_DBAHU22', kw: 18, tempSP: 14.0, rhSP: 55, dpSP: 8.5, sasSP: 320, isPau: true },
    // 10 2F AHUs (serving 1F Production / Coating / Polishing / Clean Line / Gowning)
    { tag: 'B22F_AHU01', label: 'AHU-B2-1F-01 (Cleanroom Area 1)', meter: 'B2M3F_DBAHU21', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B22F_AHU02', label: 'AHU-B2-1F-02 (Cleanroom Area 2)', meter: 'B2M3F_DBAHU21', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B22F_AHU03', label: 'AHU-B2-1F-03 (Area 3 / CNC)', meter: 'B2M3F_DBAHU21', kw: 18.5, tempSP: 22.0, rhSP: 48, dpSP: 10.2, sasSP: 340 },
    { tag: 'B22F_AHU04', label: 'AHU-B2-1F-04 (Coating Area)', meter: 'B2M3F_DBAHU21', kw: 22, tempSP: 21.0, rhSP: 42, dpSP: 7.8, sasSP: 380 },
    { tag: 'B22F_AHU05', label: 'AHU-B2-2F-05 (Sand Blasting)', meter: 'B2M3F_DBAHU21', kw: 18.5, tempSP: 22.0, rhSP: 50, dpSP: 10.8, sasSP: 330 },
    { tag: 'B22F_AHU06', label: 'AHU-B2-1F-06 (Polishing Area)', meter: 'B2M3F_DBAHU21', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B22F_AHU07', label: 'AHU-B2-1F-07 (Clean Line)', meter: 'B2M3F_DBAHU21', kw: 22, tempSP: 21.0, rhSP: 44, dpSP: 8.5, sasSP: 380 },
    { tag: 'B22F_AHU08', label: 'AHU-B2-2F-08 (Coating Material)', meter: 'B2M3F_DBAHU21', kw: 18.5, tempSP: 22.0, rhSP: 45, dpSP: 9.5, sasSP: 340 },
    { tag: 'B22F_AHU09', label: 'AHU-B2-2F-09 (Gowning / Corridor)', meter: 'B2M3F_DBAHU21', kw: 15, tempSP: 22.0, rhSP: 48, dpSP: 10.2, sasSP: 320 },
    { tag: 'B22F_AHU10', label: 'AHU-B2-2F-10 (Area 4 Process)', meter: 'B2M3F_DBAHU21', kw: 18.5, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 350 },
    // 11 M3F AHUs (serving 3F Cleanrooms: Disco Dicing, Grinding, Polishing, Wax Clean, Assembly, Optical Mounting)
    { tag: 'B2M3F_AHU01', label: 'AHU-B2-M3F-01 (Disco Dicing)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 370 },
    { tag: 'B2M3F_AHU02', label: 'AHU-B2-M3F-02 (Grinding Area 1)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 370 },
    { tag: 'B2M3F_AHU03', label: 'AHU-B2-M3F-03 (Grinding Area 2)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 370 },
    { tag: 'B2M3F_AHU04', label: 'AHU-B2-M3F-04 (Wax Clean Line)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 46, dpSP: 9.2, sasSP: 360 },
    { tag: 'B2M3F_AHU05', label: 'AHU-B2-M3F-05 (Cleaning Room)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B2M3F_AHU06', label: 'AHU-B2-M3F-06 (Clean Line 3F)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.0, rhSP: 44, dpSP: 8.6, sasSP: 380 },
    { tag: 'B2M3F_AHU07', label: 'AHU-B2-M3F-07 (Assembly Workshop)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B2M3F_AHU08', label: 'AHU-B2-M3F-08 (Assembly Inspection)', meter: 'B2M3F_DBAHU22', kw: 18.5, tempSP: 21.0, rhSP: 44, dpSP: 8.6, sasSP: 360 },
    { tag: 'B2M3F_AHU09', label: 'AHU-B2-M3F-09 (Optical Mounting)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.0, rhSP: 42, dpSP: 7.8, sasSP: 380 },
    { tag: 'B2M3F_AHU10', label: 'AHU-B2-M3F-10 (Polishing 3F)', meter: 'B2M3F_DBAHU22', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B2M3F_AHU11', label: 'AHU-B2-M3F-11 (Hand Cleaning / Changing)', meter: 'B2M3F_DBAHU22', kw: 18.5, tempSP: 22.0, rhSP: 46, dpSP: 9.6, sasSP: 350 },
  ];

  for (const [idx, a] of b2AirList.entries()) {
    const isPau = Boolean(a.isPau);
    equipment[a.tag] = makeEq(a.tag, a.label, 'ahu', 'vfd', a.kw, a.meter, true, 3200 + idx * 45, 38.0);
    const cwTag = isPau ? `${a.tag}_CHCV` : `${a.tag}_CWCV`;
    const hwTag = `${a.tag}_HWCV`;
    const fanPidTag = `${a.tag}_PID`;
    const cwPidTag = `${cwTag}_PID`;
    const hwPidTag = `${hwTag}_PID`;

    const initCw = isPau
      ? 68
      : Math.round(Math.min(85, Math.max(20, ((16.5 - a.dpSP) / 12.5) * 100)));
    const initHw = isPau
      ? 0
      : Math.round(
          Math.min(
            75,
            Math.max(10, ((a.tempSP - (25.2 - (initCw / 100) * 18 * 0.92 + 4.4)) / (23 * 0.42)) * 100)
          )
        );

    valves[cwTag] = makeValve(cwTag, `${a.label} 3-Way CW Valve`, 'ahu', 'CVAL', false, initCw, cwPidTag);
    if (!isPau) {
      valves[hwTag] = makeValve(hwTag, `${a.label} 3-Way HW Reheat Valve`, 'ahu', 'CVAL', false, initHw, hwPidTag);
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

    pids[fanPidTag] = makePid(fanPidTag, `${a.label} Fan Static Press PID`, 'ahu', sasTag, a.sasSP, 'Pa', 150, 600, { kp: 0.12, ki: 0.04, kd: 0.005, reverseActing: true, initCv: 80 });
    pids[cwPidTag] = makePid(cwPidTag, `${a.label} CW Valve PID`, 'ahu', isPau ? satTag : dpTag, isPau ? a.tempSP : a.dpSP, '°C', 5, 25, { kp: 6.5, ki: 1.4, kd: 0.12, reverseActing: false, initCv: initCw, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
    if (!isPau) {
      pids[hwPidTag] = makePid(hwPidTag, `${a.label} HW Reheat Valve PID`, 'ahu', ratTag, a.tempSP, '°C', 16, 28, { kp: 6.5, ki: 1.4, kd: 0.12, reverseActing: true, initCv: initHw, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
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

  // 4 FFUs (Cleanroom Fan Filter Units, VFD)
  for (const [idx, ffu] of [
    { tag: 'B21F_FFU01', label: 'FFU-B2-1F-01 (Cleanroom 1F)', meter: 'B2M3F_DBAHU21' },
    { tag: 'B21F_FFU02', label: 'FFU-B2-1F-02 (Cleanroom 1F)', meter: 'B2M3F_DBAHU21' },
    { tag: 'B21F_FFU03', label: 'FFU-B2-1F-03 (Cleanroom 1F)', meter: 'B2M3F_DBAHU21' },
    { tag: 'B22F_FFU01', label: 'FFU-B2-3F-01 (Cleanroom 3F)', meter: 'B2M3F_DBAHU22' },
  ].entries()) {
    equipment[ffu.tag] = makeEq(ffu.tag, ffu.label, 'ahu', 'vfd', 4.0, ffu.meter, true, 3600 + idx * 55, 36.0);
  }

  // 5 FCUs + 5 Motorized CHW Isolation Valves (Scr_B2_AIR_FCU.Pdl: B21F_FCU01..04 + V & B23F_FCU02 + V)
  for (const [idx, fcu] of [
    { tag: 'B21F_FCU01', vTag: 'B21F_FCU01V', label: 'FCU-B2-1F-01 (Coating Material Rm)', rt: 'B21F_FCU01RT1', sp: 23.0 },
    { tag: 'B21F_FCU02', vTag: 'B21F_FCU02V', label: 'FCU-B2-1F-02 (1F Office Area)', rt: 'B21F_FCU02RT1', sp: 23.2 },
    { tag: 'B21F_FCU03', vTag: 'B21F_FCU03V', label: 'FCU-B2-1F-03 (1F Lobby / Rest Area)', rt: 'B21F_FCU03RT1', sp: 23.5 },
    { tag: 'B21F_FCU04', vTag: 'B21F_FCU04V', label: 'FCU-B2-1F-04 (Sand Plating / Mtg)', rt: 'B21F_FCU04RT1', sp: 22.8 },
    { tag: 'B23F_FCU02', vTag: 'B23F_FCU02V', label: 'FCU-B2-3F-02 (3F Office / Hall)', rt: 'B23F_FCU02RT1', sp: 23.0 },
  ].entries()) {
    equipment[fcu.tag] = makeEq(fcu.tag, fcu.label, 'ahu', 'dol', 2.2, 'B22FB_DBOFF21', true, 3100 + idx * 80, 0);
    valves[fcu.vTag] = makeValve(fcu.vTag, `${fcu.label} CHW Valve (XVAL)`, 'ahu', 'XVAL', false, 100);
    sensors[fcu.rt] = makeSensor(fcu.rt, `${fcu.label} Room Temp`, 'ahu', 'TIT', fcu.sp, '°C', 14, 35, { lla: 16, la: 18, ha: 26, hha: 29 }, 1);
  }

  // =========================================================================
  // 4. BUILDING 2 EXHAUST & VENTILATION (EXH 1, EXH 2, EAF / ERV / PAUCT / TEF)
  // =========================================================================
  const b2ProcExh = [
    { tag: 'B22F_FA11001A', label: 'B2 Process Exhaust FA-11001A (Acid 1)', sensor: 'B21F_PIT11003', sp: -0.45 },
    { tag: 'B22F_FA11002A', label: 'B2 Process Exhaust FA-11002A (Solvent A)', sensor: 'B21F_PIT11004', sp: -0.45 },
    { tag: 'B22F_FA11002C', label: 'B2 Process Exhaust FA-11002C (Solvent C)', sensor: 'B21F_PIT11005', sp: -0.45 },
    { tag: 'B22F_FA11003A', label: 'B2 Process Exhaust FA-11003A (Grinding)', sensor: 'B21F_PIT11006', sp: -0.42 },
    { tag: 'B22F_FA11004A', label: 'B2 Process Exhaust FA-11004A (Heat A)', sensor: 'B22F_PIT11001', sp: -0.42 },
    { tag: 'B22F_FA11004B', label: 'B2 Process Exhaust FA-11004B (Heat B)', sensor: 'B22F_PIT11001', sp: -0.42 },
    { tag: 'B22F_FA11005A', label: 'B2 Process Exhaust FA-11005A (General)', sensor: 'B22F_PIT11001', sp: -0.42 },
  ];
  sensors['B21F_PIT11003'] = makeSensor('B21F_PIT11003', 'B2 EXH-1 Acid Duct Static Press', 'exh', 'PIT_KPA', -0.45, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B21F_PIT11004'] = makeSensor('B21F_PIT11004', 'B2 EXH-1 Solvent A Static Press', 'exh', 'PIT_KPA', -0.45, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B21F_PIT11005'] = makeSensor('B21F_PIT11005', 'B2 EXH-1 Solvent C Static Press', 'exh', 'PIT_KPA', -0.45, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B21F_PIT11006'] = makeSensor('B21F_PIT11006', 'B2 EXH-1 Grinding Static Press', 'exh', 'PIT_KPA', -0.42, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B22F_PIT11001'] = makeSensor('B22F_PIT11001', 'B2 EXH-2 Heat/Gen Static Press', 'exh', 'PIT_KPA', -0.42, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B21F_TIT11001'] = makeSensor('B21F_TIT11001', 'B2 EXH-2 Oven Duct Temp', 'exh', 'TIT', 34.5, '°C', 15, 70, { lla: 16, la: 18, ha: 50, hha: 60 }, 1);

  for (const [idx, f] of b2ProcExh.entries()) {
    equipment[f.tag] = makeEq(f.tag, f.label, 'exh', 'vfd', 15, 'B22FB_DBFAN21', true, 3400 + idx * 40, 38.5);
    pids[`${f.tag}_PID`] = makePid(`${f.tag}_PID`, `${f.label} PID`, 'exh', f.sensor, f.sp, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 77 });
  }

  // General Exhaust (EAF), ERV, PAUCT, TEF (Scr_B2_EAF_Exhaust.Pdl & Scr_B2_PAUCT.Pdl)
  const b2AuxFans: [string, string, number][] = [
    ['B21F_EAF01', 'B2 1F Exhaust Fan EAF-01', 5.5],
    ['B21F_EAF02', 'B2 1F Exhaust Fan EAF-02', 5.5],
    ['B21F_EAF03', 'B2 1F Exhaust Fan EAF-03', 5.5],
    ['B22F_EAF01', 'B2 2F Exhaust Fan EAF-01', 5.5],
    ['B22F_EAF02', 'B2 2F Exhaust Fan EAF-02', 5.5],
    ['B22F_ERV01', 'B2 Energy Recovery ERV-01', 3.0],
    ['B22F_ERV02', 'B2 Energy Recovery ERV-02', 3.0],
    ['B22F_ERV03', 'B2 Energy Recovery ERV-03', 3.0],
    ['B22F_ERV04', 'B2 Energy Recovery ERV-04', 3.0],
    ['B22F_PAUCT01', 'B2 Clean Tunnel PAUCT-01', 4.0],
    ['B22F_PAUCT02', 'B2 Clean Tunnel PAUCT-02', 4.0],
    ['B22F_PAUCT03', 'B2 Clean Tunnel PAUCT-03', 4.0],
    ['B22F_PAUCT04', 'B2 Clean Tunnel PAUCT-04', 4.0],
    ['B22F_PAUO01', 'B2 Office Fresh Air PAUO-01', 4.0],
    ['B21F_TEF01', 'B2 1F Toilet Exhaust TEF-01', 1.5],
    ['B21F_TEF02', 'B2 1F Toilet Exhaust TEF-02', 1.5],
    ['B22F_TEF01', 'B2 2F Toilet Exhaust TEF-01', 1.5],
    ['B22F_TEF02', 'B2 2F Toilet Exhaust TEF-02', 1.5],
    ['B22F_TEF03', 'B2 2F Toilet Exhaust TEF-03', 1.5],
    ['B23F_TEF01', 'B2 3F Toilet Exhaust TEF-01', 1.5],
    ['B23F_TEF02', 'B2 3F Toilet Exhaust TEF-02', 1.5],
  ];
  for (const [idx, [tag, label, kw]] of b2AuxFans.entries()) {
    equipment[tag] = makeEq(tag, label, 'exh', 'dol', kw, tag.includes('TEF') ? 'B22FB_DBOFF21' : 'B22FB_DBFAN21', true, 3300 + idx * 30, 0);
  }

  // =========================================================================
  // 5. BUILDING 2 PMS POWER DISTRIBUTION (Scr_B2_PMS: MDB 2.1 & MDB A0-7)
  // =========================================================================
  meters['PMDB_B2_MDB21'] = makeMeter('PMDB_B2_MDB21', 'MDB-2.1 (HVAC, PCW & Facility)', null, 'PM8000', 22, 612400);
  meters['PMDB_B2_MDBA07'] = makeMeter('PMDB_B2_MDBA07', 'MDB-A0.7 (Production & Cleanroom DBs)', null, 'PM8000', 30, 548900);

  // Under MDB 2.1
  meters['B2M3F_DBAHU21'] = makeMeter('B2M3F_DBAHU21', 'DB-AHU-2.1 (1F/2F AHUs & PAUs)', 'PMDB_B2_MDB21', 'PMMFM383AC', 6, 184200);
  meters['B2M3F_DBAHU22'] = makeMeter('B2M3F_DBAHU22', 'DB-AHU-2.2 (3F/M3F AHUs & PAUs)', 'PMDB_B2_MDB21', 'PMMFM383AC', 6, 196500);
  meters['B21F_DBPCW21'] = makeMeter('B21F_DBPCW21', 'DB-PCW-2.1 (P-601A..D & P-602)', 'PMDB_B2_MDB21', 'PMMFM383AC', 3, 92400);
  meters['B22FB_DBFAN21'] = makeMeter('B22FB_DBFAN21', 'DB-FAN-2.1 (Process/EAF/ERV)', 'PMDB_B2_MDB21', 'PMMFM383AC', 4, 88100);
  meters['B22FB_DBOFF21'] = makeMeter('B22FB_DBOFF21', 'DB-OFF-2.1 (Office / FCU / TEF)', 'PMDB_B2_MDB21', 'PMMFM383AC', 14, 51300);
  meters['B21F_DBAIR21'] = makeMeter('B21F_DBAIR21', 'DB-AIR-2.1 (Air Utility)', 'PMDB_B2_MDB21', 'PMMFM383AC', 8, 42800);
  meters['B21F_DBCTPUMP21'] = makeMeter('B21F_DBCTPUMP21', 'DB-CT-PUMP-2.1 (Aux Pumps)', 'PMDB_B2_MDB21', 'PMMFM383AC', 5, 36900);

  // Under MDB A0.7 (Production Process Cleanroom Sub-DBs from Scr_B2_PMS.Pdl)
  const b2ProcessDbs: [string, string, number][] = [
    ['B21FA_DBCL1', 'DB-CL-1 (1F Clean Line)', 26],
    ['B23F_DBCL2', 'DB-CL-2 (3F Clean Line)', 28],
    ['B21FA_DBCT1', 'DB-CT-1 (Coating 1)', 34],
    ['B21FA_DBCT2', 'DB-CT-2 (Coating 2)', 32],
    ['B21FA_DBCT3', 'DB-CT-3 (Coating 3)', 30],
    ['B21FA_DBGREY1', 'DB-GREY-1 (Grey Area 1)', 18],
    ['B21FA_DBGREY2', 'DB-GREY-2 (Grey Area 2)', 16],
    ['B21FA_DBGREY3', 'DB-GREY-3 (Grey Area 3)', 17],
    ['B21FA_DBGREY4', 'DB-GREY-4 (Grey Area 4)', 15],
    ['B23F_DBAS1', 'DB-AS-1 (Assembly 1)', 22],
    ['B23F_DBAS2', 'DB-AS-2 (Assembly 2)', 20],
    ['B23F_DBSU1', 'DB-SU-1 (Surface Grind 1)', 29],
    ['B23F_DBSU2', 'DB-SU-2 (Surface Grind 2)', 27],
    ['B23F_DBSU3', 'DB-SU-3 (Surface Grind 3)', 25],
    ['B23F_DBPO21', 'DB-PO-2.1 (Polishing 3F)', 24],
    ['B21FA_DBEQ', 'DB-EQ (Equipment Bay)', 19],
    ['B21FA_DBFX', 'DB-FX (Fixture / CNC)', 21],
    ['B21FA_DBGO', 'DB-GO (Gowning / Air Shower)', 12],
    ['B21FA_DBMR', 'DB-MR (Metro / Inspection)', 16],
    ['B21FA_DBOV', 'DB-OV (Ovens)', 23],
    ['B21FA_DBRC', 'DB-RC (1F Research / Clean)', 18],
    ['B23F_DBRC1', 'DB-RC-1 (3F Research / Clean)', 19],
    ['B23F_DBSA', 'DB-SA (Sand Blasting)', 20],
    ['B21FA_DBWI', 'DB-WI (Wax / Inspection)', 14],
    ['B21FA_DBWT', 'DB-WT (Water Treatment)', 15],
  ];
  for (const [idx, [tag, label, kw]] of b2ProcessDbs.entries()) {
    meters[tag] = makeMeter(tag, label, 'PMDB_B2_MDBA07', 'PMMFM383AC', kw, 32000 + idx * 2400);
  }
}
