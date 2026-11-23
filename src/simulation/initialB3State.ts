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
    loadPct: running ? 60 : 0,
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
 * Populates all verified COHR2401 Building 3 (B3_PLC — Wafer Fab / Utility Support)
 * equipment, valves, sensors, PIDs, Demand sequencers (B3CH, B3CHWP, B3HP),
 * 2 Air-Cooled Chillers (CH-21/22), 3 Heat Fans (HP-01/02/03), 2 AHUs, 8 PLC-monitored FCUs
 * with XV valves, Process & Aux Exhaust, and PMS switchboard tree (MDB-3.1/3.2/3.3 + 9 Sub-DBs).
 * (Note: B3 DI loop B31F_PCV10705 / PIT10705 / FIT10705 is already populated in initialB2State.ts.)
 */
export function mergeBuilding3State(
  equipment: Record<string, EquipmentUnit>,
  valves: Record<string, ValveUnit>,
  sensors: Record<string, AnalogSensor>,
  pids: Record<string, PIDLoop>,
  demands: Record<DemandId, DemandSequencer>,
  meters: Record<string, PowerMeter>,
  ahus: Record<string, AhuRoomConfig>
): void {
  // =========================================================================
  // 1. BUILDING 3 AIR-COOLED CHILLER SYSTEM (Scr_B3_HVAC_CHILLED.Pdl)
  //    2 Air-Cooled Chillers CH-21 (Duty) & CH-22 (Standby), ZERO Cooling Towers!
  // =========================================================================
  for (const c of [
    { n: 21, run: true, hrs: 2680.5 },
    { n: 22, run: false, hrs: 2410.2 },
  ]) {
    const chTag = `B31F_CH${c.n}`;
    equipment[chTag] = makeEq(
      chTag,
      `Air-Cooled Chiller CH-${c.n}`,
      'chiller',
      'chiller',
      115,
      'PMDB_B3M1F_DBCTPUMP31',
      c.run,
      c.hrs,
      0,
      {
        spTemp: 8.0,
        evapPress: c.run ? 3.2 : 4.8,
        condPress: c.run ? 12.1 : 6.4,
        condEWT: 31.0, // Ambient Air Entering Condenser Coil (°C)
        chwrTemp: 12.0,
        oilDP: c.run ? 2.3 : 0.0,
        fla: c.run ? 64.0 : 0.0,
        evapFS: c.run ? 1 : 0,
      }
    );
    valves[`${chTag}CHV`] = makeValve(
      `${chTag}CHV`,
      `CH-${c.n} Evap Isolation Valve`,
      'chiller',
      'XVAL',
      false,
      c.run ? 100 : 0
    );
    equipment[`${chTag}CHWP`] = makeEq(
      `${chTag}CHWP`,
      `CH-${c.n} Chilled Water Pump`,
      'chiller',
      'vfd',
      18.5,
      'PMDB_B3M1F_DBCTPUMP31',
      c.run,
      c.hrs + 30,
      38.0
    );
  }
  valves['B31F_BPMV'] = makeValve('B31F_BPMV', 'B3 CHW Bypass Valve (Manual Only)', 'chiller', 'CVAL', true, 0);

  sensors['B31F_CHSTS1'] = makeSensor('B31F_CHSTS1', 'B3 CHW Supply Temp', 'chiller', 'TIT', 8.0, '°C', 0, 25, { lla: 4.5, la: 6.0, ha: 10.5, hha: 12.5 });
  sensors['B31F_CHRTS2'] = makeSensor('B31F_CHRTS2', 'B3 CHW Return Temp', 'chiller', 'TIT', 12.0, '°C', 0, 30, { lla: 7.0, la: 9.0, ha: 15.5, hha: 17.5 });
  sensors['B31F_CHWPS1'] = makeSensor('B31F_CHWPS1', 'B3 CHWP Header Pressure', 'chiller', 'PIT_BAR', 3.5, 'bar', 0, 8, { lla: 1.4, la: 2.2, ha: 5.0, hha: 6.0 });
  sensors['B31F_BPPS1'] = makeSensor('B31F_BPPS1', 'B3 CHW Bypass Supply Press', 'chiller', 'PIT_BAR', 3.5, 'bar', 0, 8, { lla: 1.4, la: 2.2, ha: 5.5, hha: 6.5 });
  sensors['B31F_BPPS2'] = makeSensor('B31F_BPPS2', 'B3 CHW Bypass Return Press', 'chiller', 'PIT_BAR', 0.9, 'bar', 0, 8, { lla: 0.1, la: 0.3, ha: 2.8, hha: 3.6 });
  sensors['B31F_BPTS3'] = makeSensor('B31F_BPTS3', 'B3 CHW Bypass Line Temp', 'chiller', 'TIT', 8.3, '°C', 0, 25, { lla: 4.0, la: 6.0, ha: 14.0, hha: 16.0 });

  pids['B31F_CH21CHWP_PID'] = makePid('B31F_CH21CHWP_PID', 'B3 CHWP Header Press PID (CHWPS1)', 'chiller', 'B31F_CHWPS1', 3.5, 'bar', 1.5, 5.5, { kp: 14, ki: 3.5, kd: 0.08, reverseActing: true, initCv: 76 });

  demands['B3CH'] = {
    id: 'B3CH',
    label: 'B3 Air-Cooled Chiller Demand Control',
    subsystem: 'chiller',
    enable: true,
    unitTags: ['B31F_CH21', 'B31F_CH22'],
    priors: [1, 2],
    pvSensorTag: 'B31F_CHSTS1',
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
    targetCount: 1,
    count: 1,
    status: 'DEMAND_STB',
    stageUpWhenHigh: true,
    chillerCapacityStartSP: 82,
    chillerCapacityStopSP: 40,
  };

  demands['B3CHWP'] = {
    id: 'B3CHWP',
    label: 'B3 CHWP Demand Control',
    subsystem: 'chiller',
    enable: true,
    unitTags: ['B31F_CH21CHWP', 'B31F_CH22CHWP'],
    priors: [1, 2],
    pvSensorTag: 'B31F_CHWPS1',
    pvUnit: 'bar',
    startUpSP: 2.6,
    shutDownSP: 4.3,
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
  };

  // =========================================================================
  // 2. BUILDING 3 HOT WATER HEAT FAN SYSTEM (Scr_B3_HotWaterSystem.Pdl)
  //    3 Heat Fan units HP-01/02 (Duty) & HP-03 (Standby) + HPP21/22 VFDs
  // =========================================================================
  for (const hp of [
    { n: '01', run: true, hrs: 2150.4 },
    { n: '02', run: true, hrs: 2040.8 },
    { n: '03', run: false, hrs: 1890.1 },
  ]) {
    const hpTag = `B31F_HP${hp.n}`;
    equipment[hpTag] = makeEq(
      hpTag,
      `Heat Fan HP-${hp.n}`,
      'heat_recovery',
      'chiller',
      28,
      'PMDB_B3M1F_DBCTPUMP31',
      hp.run,
      hp.hrs,
      0,
      {
        spTemp: 45.0,
        evapPress: hp.run ? 4.4 : 5.2,
        condPress: hp.run ? 13.6 : 6.2,
        condEWT: 40.5,
        chwrTemp: 40.5,
        oilDP: hp.run ? 2.1 : 0.0,
        fla: hp.run ? 56.0 : 0.0,
        evapFS: hp.run ? 1 : 0,
      }
    );
    valves[`${hpTag}V`] = makeValve(
      `${hpTag}V`,
      `Heat Fan HP-${hp.n} Isolation Valve`,
      'heat_recovery',
      'XVAL',
      false,
      hp.run ? 100 : 0
    );
  }

  equipment['B31F_HPP21'] = makeEq('B31F_HPP21', 'B3 Hot Water Pump HPP-21', 'heat_recovery', 'vfd', 7.5, 'PMDB_B3M1F_DBCTPUMP31', true, 2240.0, 37.0);
  equipment['B31F_HPP22'] = makeEq('B31F_HPP22', 'B3 Hot Water Pump HPP-22', 'heat_recovery', 'vfd', 7.5, 'PMDB_B3M1F_DBCTPUMP31', false, 2080.0, 35.0);
  valves['B31F_HPBPMV'] = makeValve('B31F_HPBPMV', 'B3 Hot Water Bypass Valve (Manual Only)', 'heat_recovery', 'CVAL', true, 0);

  sensors['B31F_HPSTS1'] = makeSensor('B31F_HPSTS1', 'B3 Hot Water Supply Temp', 'heat_recovery', 'TIT', 45.0, '°C', 20, 65, { lla: 32, la: 36, ha: 52, hha: 56 });
  sensors['B31F_HPRTS2'] = makeSensor('B31F_HPRTS2', 'B3 Hot Water Return Temp', 'heat_recovery', 'TIT', 40.5, '°C', 20, 60, { lla: 28, la: 32, ha: 48, hha: 52 });
  sensors['B31F_HWPS1'] = makeSensor('B31F_HWPS1', 'B3 Hot Water Header Pressure', 'heat_recovery', 'PIT_BAR', 3.2, 'bar', 0, 6, { lla: 1.0, la: 1.6, ha: 4.6, hha: 5.2 });
  sensors['B31F_HPBPPS1'] = makeSensor('B31F_HPBPPS1', 'B3 HW Bypass Supply Press', 'heat_recovery', 'PIT_BAR', 3.2, 'bar', 0, 6, { lla: 1.0, la: 1.6, ha: 4.8, hha: 5.4 });
  sensors['B31F_HPBPPS2'] = makeSensor('B31F_HPBPPS2', 'B3 HW Bypass Return Press', 'heat_recovery', 'PIT_BAR', 1.2, 'bar', 0, 6, { lla: 0.3, la: 0.6, ha: 2.8, hha: 3.5 });
  sensors['B31F_HPBPTS3'] = makeSensor('B31F_HPBPTS3', 'B3 HW Bypass Line Temp', 'heat_recovery', 'TIT', 44.4, '°C', 20, 65, { lla: 30, la: 35, ha: 52, hha: 56 });

  pids['B31F_HPP21_PID'] = makePid('B31F_HPP21_PID', 'B3 Hot Water Pump Press PID (HWPS1)', 'heat_recovery', 'B31F_HWPS1', 3.2, 'bar', 1.5, 5.0, { kp: 16, ki: 3.8, kd: 0.08, reverseActing: true, initCv: 74 });

  demands['B3HP'] = {
    id: 'B3HP',
    label: 'B3 Heat Fan Demand Control',
    subsystem: 'heat_recovery',
    enable: true,
    unitTags: ['B31F_HP01', 'B31F_HP02', 'B31F_HP03'],
    priors: [1, 2, 3],
    pvSensorTag: 'B31F_HPSTS1',
    pvUnit: '°C',
    startUpSP: 42.0, // Stage up if HW supply temp drops <= 42°C & avg FLA >= 82%
    shutDownSP: 46.8, // Stage down if HW supply temp >= 46.8°C & avg FLA <= 38%
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
    stageUpWhenHigh: false,
    chillerCapacityStartSP: 82,
    chillerCapacityStopSP: 38,
  };

  // =========================================================================
  // 3. BUILDING 3 HVAC — 2 AHUs (B3M1F_AHU01/02) + 8 PLC-MONITORED FCUs (+XV)
  // =========================================================================
  const b3Ahus = [
    { tag: 'B3M1F_AHU01', label: 'AHU-B3-M1F-01 (Cleanse & Process)', kw: 22, tempSP: 21.5, rhSP: 45, dpSP: 9.0, sasSP: 360 },
    { tag: 'B3M1F_AHU02', label: 'AHU-B3-M1F-02 (Material & Chemical)', kw: 22, tempSP: 22.0, rhSP: 46, dpSP: 9.5, sasSP: 350 },
  ];

  for (const [idx, a] of b3Ahus.entries()) {
    equipment[a.tag] = makeEq(a.tag, a.label, 'ahu', 'vfd', a.kw, 'PMDB_B3M1F_DBAHU31', true, 3150 + idx * 90, 38.0);
    const cwTag = `${a.tag}_CWCV`;
    const hwTag = `${a.tag}_HWCV`;
    const fanPidTag = `${a.tag}_PID`;
    const cwPidTag = `${cwTag}_PID`;
    const hwPidTag = `${hwTag}_PID`;

    const initCw = Math.round(Math.min(85, Math.max(20, ((16.5 - a.dpSP) / 12.5) * 100)));
    const initHw = Math.round(
      Math.min(75, Math.max(10, ((a.tempSP - (25.2 - (initCw / 100) * 18 * 0.92 + 4.4)) / (23 * 0.42)) * 100))
    );

    valves[cwTag] = makeValve(cwTag, `${a.label} 3-Way CW Valve`, 'ahu', 'CVAL', false, initCw, cwPidTag);
    valves[hwTag] = makeValve(hwTag, `${a.label} 3-Way HW Reheat Valve`, 'ahu', 'CVAL', false, initHw, hwPidTag);

    const satTag = `${a.tag}_SAT`;
    const ratTag = `${a.tag}_RAT`;
    const rahTag = `${a.tag}_RAH`;
    const sasTag = `${a.tag}_SAS`;
    const dpTag = `${a.tag}_DP`;

    sensors[satTag] = makeSensor(satTag, `${a.label} Supply Air Temp`, 'ahu', 'TIT', 15.5, '°C', 5, 35, { lla: 8, la: 11, ha: 22, hha: 26 }, 1);
    sensors[ratTag] = makeSensor(ratTag, `${a.label} Room/Return Temp`, 'ahu', 'TIT', a.tempSP, '°C', 10, 35, { lla: 16, la: 18, ha: 25, hha: 28 }, 1);
    sensors[rahTag] = makeSensor(rahTag, `${a.label} Room/Return RH`, 'ahu', 'HIT', a.rhSP, '%RH', 10, 90, { lla: 25, la: 32, ha: 60, hha: 70 }, 1);
    sensors[sasTag] = makeSensor(sasTag, `${a.label} Supply Static Press`, 'ahu', 'PIT_PA', a.sasSP, 'Pa', 0, 800, { lla: 100, la: 180, ha: 580, hha: 680 }, 0);
    sensors[dpTag] = makeSensor(dpTag, `${a.label} Dew Point`, 'ahu', 'TIT', a.dpSP, '°C', 0, 25, { lla: 2, la: 4, ha: 14, hha: 17 }, 1);

    pids[fanPidTag] = makePid(fanPidTag, `${a.label} Fan Static Press PID`, 'ahu', sasTag, a.sasSP, 'Pa', 150, 600, { kp: 0.12, ki: 0.04, kd: 0.005, reverseActing: true, initCv: 80 });
    pids[cwPidTag] = makePid(cwPidTag, `${a.label} CW Valve PID`, 'ahu', dpTag, a.dpSP, '°C', 5, 25, { kp: 6.5, ki: 1.4, kd: 0.12, reverseActing: false, initCv: initCw, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });
    pids[hwPidTag] = makePid(hwPidTag, `${a.label} HW Reheat Valve PID`, 'ahu', ratTag, a.tempSP, '°C', 16, 28, { kp: 6.5, ki: 1.4, kd: 0.12, reverseActing: true, initCv: initHw, isValvePid: true, autoOutMinPct: 0, autoOutMaxPct: 100 });

    ahus[a.tag] = {
      ahuTag: a.tag,
      label: a.label,
      cwValveTag: cwTag,
      hwValveTag: hwTag,
      fanPidTag,
      cwPidTag,
      hwPidTag,
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

  // 8 PLC-Monitored FCUs (ALL with XV valves + Run FB + Room Temp RT1)
  const b3Fcus = [
    { tag: 'B31F_FCU03', vTag: 'B31F_FCU03V', label: 'FCU-B3-1F-03 (1F Warehouse / Rest)', rt: 'B31F_FCU03RT1', sp: 23.2 },
    { tag: 'B3M1F_FCU01', vTag: 'B3M1F_FCU01V', label: 'FCU-B3-M1F-01 (M1F Office North)', rt: 'B3M1F_FCU01RT1', sp: 23.0 },
    { tag: 'B3M1F_FCU02', vTag: 'B3M1F_FCU02V', label: 'FCU-B3-M1F-02 (M1F Office Center)', rt: 'B3M1F_FCU02RT1', sp: 23.0 },
    { tag: 'B3M1F_FCU03', vTag: 'B3M1F_FCU03V', label: 'FCU-B3-M1F-03 (M1F Office South)', rt: 'B3M1F_FCU03RT1', sp: 22.8 },
    { tag: 'B3M1F_FCU04', vTag: 'B3M1F_FCU04V', label: 'FCU-B3-M1F-04 (M1F Lab Zone A)', rt: 'B3M1F_FCU04RT1', sp: 22.5 },
    { tag: 'B3M1F_FCU05', vTag: 'B3M1F_FCU05V', label: 'FCU-B3-M1F-05 (M1F Lab Zone B)', rt: 'B3M1F_FCU05RT1', sp: 22.5 },
    { tag: 'B3M1F_FCU06', vTag: 'B3M1F_FCU06V', label: 'FCU-B3-M1F-06 (M1F Switchroom)', rt: 'B3M1F_FCU06RT1', sp: 23.5 },
    { tag: 'B3M1F_FCU07', vTag: 'B3M1F_FCU07V', label: 'FCU-B3-M1F-07 (M1F Corridor)', rt: 'B3M1F_FCU07RT1', sp: 23.4 },
  ];
  for (const [idx, fcu] of b3Fcus.entries()) {
    equipment[fcu.tag] = makeEq(fcu.tag, fcu.label, 'ahu', 'dol', 2.2, 'PMDB_B31F_DBOFF31', true, 2950 + idx * 65, 0);
    valves[fcu.vTag] = makeValve(fcu.vTag, `${fcu.label} CHW Valve (XVAL)`, 'ahu', 'XVAL', false, 100);
    sensors[fcu.rt] = makeSensor(fcu.rt, `${fcu.label} Room Temp`, 'ahu', 'TIT', fcu.sp, '°C', 14, 35, { lla: 16, la: 18, ha: 26, hha: 29 }, 1);
  }

  // =========================================================================
  // 4. BUILDING 3 EXHAUST SYSTEM (Scr_B3_EXH.Pdl & Scr_B3_EAF_Exhaust.Pdl)
  // =========================================================================
  equipment['B3M1F_FA11101A'] = makeEq('B3M1F_FA11101A', 'B3 Process Exhaust FA-11101A (Acid/Scrubber)', 'exh', 'vfd', 15, 'PMDB_B3M1F_DBFAN31', true, 3210, 38.5);
  equipment['B3M1F_FA11102A'] = makeEq('B3M1F_FA11102A', 'B3 Process Exhaust FA-11102A (Solvent/Cleanse)', 'exh', 'vfd', 15, 'PMDB_B3M1F_DBFAN31', true, 3180, 37.5);
  equipment['B3M1F_FA11103A'] = makeEq('B3M1F_FA11103A', 'B3 Process Exhaust FA-11103A (Chemical DOL)', 'exh', 'dol', 11, 'PMDB_B3M1F_DBFAN31', true, 3090, 0);

  sensors['B3M1F_PIT11101'] = makeSensor('B3M1F_PIT11101', 'B3 EXH Duct 1 Static Press (FA-11101A)', 'exh', 'PIT_KPA', -0.45, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });
  sensors['B3M1F_PIT11102'] = makeSensor('B3M1F_PIT11102', 'B3 EXH Duct 2 Static Press (FA-11102A)', 'exh', 'PIT_KPA', -0.42, 'kPa', -1.5, 0.2, { lla: -1.1, la: -0.85, ha: -0.15, hha: -0.05 });

  pids['B3M1F_FA11101A_PID'] = makePid('B3M1F_FA11101A_PID', 'B3 FA-11101A Exhaust Press PID', 'exh', 'B3M1F_PIT11101', -0.45, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 77 });
  pids['B3M1F_FA11102A_PID'] = makePid('B3M1F_FA11102A_PID', 'B3 FA-11102A Exhaust Press PID', 'exh', 'B3M1F_PIT11102', -0.42, 'kPa', -1.0, -0.1, { kp: 35, ki: 10, kd: 0.05, reverseActing: false, initCv: 75 });

  // General Exhaust (EAF-01..05) & Toilet Exhaust (TEF-01)
  const b3AuxFans: [string, string, number, string][] = [
    ['B31F_EAF01', 'B3 1F Exhaust Fan EAF-01 (Cleanse)', 4.0, 'PMDB_B3M1F_DBFAN31'],
    ['B31F_EAF02', 'B3 1F Exhaust Fan EAF-02 (Chemical)', 4.0, 'PMDB_B3M1F_DBFAN31'],
    ['B31F_EAF03', 'B3 1F Exhaust Fan EAF-03 (Material Rm)', 4.0, 'PMDB_B3M1F_DBFAN31'],
    ['B31F_EAF04', 'B3 1F Exhaust Fan EAF-04 (Warehouse)', 4.0, 'PMDB_B3M1F_DBFAN31'],
    ['B31F_EAF05', 'B3 1F Exhaust Fan EAF-05 (Plant Yard)', 4.0, 'PMDB_B3M1F_DBFAN31'],
    ['B31F_TEF01', 'B3 1F Toilet Exhaust TEF-01', 1.5, 'PMDB_B31F_DBOFF31'],
  ];
  for (const [idx, [tag, label, kw, meter]] of b3AuxFans.entries()) {
    equipment[tag] = makeEq(tag, label, 'exh', 'dol', kw, meter, true, 3100 + idx * 35, 0);
  }

  // =========================================================================
  // 5. BUILDING 3 PMS POWER DISTRIBUTION (Scr_B3_PMS.Pdl: MDB-3.1/3.2/3.3)
  // =========================================================================
  meters['PMDB_B3M1F_MDB31'] = makeMeter('PMDB_B3M1F_MDB31', 'MDB-3.1 (HVAC, Chillers & Fans)', null, 'PM8000', 12, 312400);
  meters['PMDB_B3M1F_MDB32'] = makeMeter('PMDB_B3M1F_MDB32', 'MDB-3.2 (Office & Wet Bench 0..2)', null, 'PM8000', 14, 286900);
  meters['PMDB_B3M1F_MDB33'] = makeMeter('PMDB_B3M1F_MDB33', 'MDB-3.3 (Wet Bench 3..4 Process)', null, 'PM8000', 10, 214500);

  // Under MDB-3.1
  meters['PMDB_B3M1F_DBAHU31'] = makeMeter('PMDB_B3M1F_DBAHU31', 'DB-AHU-3.1 (AHU-01/02)', 'PMDB_B3M1F_MDB31', 'PMMFM383AC', 4, 86400);
  meters['PMDB_B3M1F_DBCTPUMP31'] = makeMeter('PMDB_B3M1F_DBCTPUMP31', 'DB-CT-PUMP-3.1 (CH-21/22 & Heat Fans)', 'PMDB_B3M1F_MDB31', 'PMMFM383AC', 5, 162100);
  meters['PMDB_B3M1F_DBFAN31'] = makeMeter('PMDB_B3M1F_DBFAN31', 'DB-FAN-3.1 (Process EXH & EAF)', 'PMDB_B3M1F_MDB31', 'PMMFM383AC', 3, 63900);

  // Under MDB-3.2
  meters['PMDB_B31F_DBOFF31'] = makeMeter('PMDB_B31F_DBOFF31', 'DB-OFF-3.1 (Office / 8 FCUs / TEF)', 'PMDB_B3M1F_MDB32', 'PMMFM383AC', 11, 58200);
  meters['PMDB_B31F_DBWB'] = makeMeter('PMDB_B31F_DBWB', 'DB-WB (Main Wet Bench)', 'PMDB_B3M1F_MDB32', 'PMMFM383AC', 28, 84500);
  meters['PMDB_B31F_DBWB1'] = makeMeter('PMDB_B31F_DBWB1', 'DB-WB-1 (Wet Bench 1)', 'PMDB_B3M1F_MDB32', 'PMMFM383AC', 24, 73100);
  meters['PMDB_B31F_DBWB2'] = makeMeter('PMDB_B31F_DBWB2', 'DB-WB-2 (Wet Bench 2)', 'PMDB_B3M1F_MDB32', 'PMMFM383AC', 22, 71100);

  // Under MDB-3.3
  meters['PMDB_B31F_DBWB3'] = makeMeter('PMDB_B31F_DBWB3', 'DB-WB-3 (Wet Bench 3)', 'PMDB_B3M1F_MDB33', 'PMMFM383AC', 26, 108400);
  meters['PMDB_B31F_DBWB4'] = makeMeter('PMDB_B31F_DBWB4', 'DB-WB-4 (Wet Bench 4)', 'PMDB_B3M1F_MDB33', 'PMMFM383AC', 25, 106100);
}
