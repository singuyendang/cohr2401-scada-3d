import type {
  PlantState,
  EquipmentUnit,
  ValveUnit,
  AnalogSensor,
  PIDLoop,
  DemandId,
  DemandSequencer,
  PowerMeter,
} from '../types/scada.ts';
import { clamp, cvToVfdHz, manualSpToVfdHz, stepPidLoop } from './pid.ts';
import { sensorPerturbation } from './perturbation.ts';
import { stepDemandSequencer } from './demand.ts';
import {
  evaluateChillerPermissives,
  evaluateP502TankLevelHysteresis,
  evaluatePcwValveHysteresis,
  stepValveStroke,
} from './interlocks.ts';
import { updateAlarmsAndTrends } from './alarmsAndTrends.ts';
import { stepBuilding2Subsystems } from './physicsB2.ts';
import { stepBuilding3Subsystems } from './physicsB3.ts';

function firstOrderLag(current: number, target: number, tauSec: number, dt: number): number {
  const alpha = clamp(dt / Math.max(tauSec, dt), 0, 1);
  return current + (target - current) * alpha;
}

function updateSensorPv(
  sensor: AnalogSensor,
  computedTarget: number,
  tauSec: number,
  perturbationAmp: number,
  simTimeSec: number,
  noiseAmplitudePct: number,
  dt: number
): AnalogSensor {
  if (sensor.faulted) {
    // FDS rule: When faulted, PV holds last good value
    return { ...sensor, pv: sensor.lastGoodPv };
  }
  if (sensor.manualOverride) {
    const val = Number(clamp(sensor.overrideValue, sensor.minRange, sensor.maxRange).toFixed(sensor.decimals));
    return { ...sensor, pv: val, lastGoodPv: val };
  }
  const noise = sensorPerturbation(sensor.tag, simTimeSec, perturbationAmp, noiseAmplitudePct);
  const lagged = firstOrderLag(sensor.pv, computedTarget + noise, tauSec, dt);
  const clamped = Number(clamp(lagged, sensor.minRange, sensor.maxRange).toFixed(sensor.decimals));
  return { ...sensor, pv: clamped, lastGoodPv: clamped };
}

function advanceMotorStatus(
  unit: EquipmentUnit,
  desiredRun: boolean,
  permissiveOk: boolean,
  reason: string,
  autoHz: number | null,
  dt: number
): EquipmentUnit {
  if (unit.faulted) {
    return {
      ...unit,
      status: 'FAULTED',
      cmdStart: false,
      startTimerSec: 0,
      frequencyHz: 0,
      loadPct: 0,
      interlockOk: permissiveOk,
      interlockReason: reason,
      sttPerm: permissiveOk,
    };
  }

  let status = unit.status;
  let startTimerSec = unit.startTimerSec;
  const startDuration = unit.kind === 'chiller' ? 2.5 : 0.5;
  const stopDuration = 0.5;

  if (desiredRun && permissiveOk) {
    if (status === 'STOPPED' || status === 'STOPPING' || status === 'FAULTED') {
      status = 'STARTING';
      startTimerSec = 0;
    } else if (status === 'STARTING') {
      startTimerSec += dt;
      if (startTimerSec >= startDuration) {
        status = 'RUNNING';
        startTimerSec = 0;
      }
    }
  } else {
    if (status === 'RUNNING' || status === 'STARTING') {
      status = 'STOPPING';
      startTimerSec = 0;
    } else if (status === 'STOPPING') {
      startTimerSec += dt;
      if (startTimerSec >= stopDuration) {
        status = 'STOPPED';
        startTimerSec = 0;
      }
    } else {
      status = 'STOPPED';
      startTimerSec = 0;
    }
  }

  const isRunning = status === 'RUNNING';
  let frequencyHz = 0;
  if (unit.kind === 'vfd') {
    const targetHz =
      unit.mode === 'AUTO' && autoHz !== null
        ? cvToVfdHz(autoHz, isRunning)
        : manualSpToVfdHz(unit.manualSP, isRunning);
    if (!isRunning) {
      frequencyHz = 0;
    } else if (unit.status !== 'RUNNING' || unit.frequencyHz < 15.0) {
      // First tick entering RUNNING starts cleanly at target clamped to [15.0, 50.0] Hz
      frequencyHz = targetHz;
    } else {
      // Realistic industrial VFD accel/decel ramp (10.0 Hz/s) preventing instant unphysical jumps
      const maxDelta = 10.0 * dt;
      const diff = targetHz - unit.frequencyHz;
      const stepped = Math.abs(diff) <= maxDelta ? targetHz : unit.frequencyHz + Math.sign(diff) * maxDelta;
      frequencyHz = Number(clamp(stepped, 15.0, 50.0).toFixed(2));
    }
  }

  const runHours = isRunning ? Number((unit.runHours + dt / 3600).toFixed(4)) : unit.runHours;

  return {
    ...unit,
    status,
    cmdStart: desiredRun,
    startTimerSec: Number(startTimerSec.toFixed(2)),
    frequencyHz,
    runHours,
    interlockOk: permissiveOk,
    interlockReason: reason,
    sttPerm: permissiveOk,
  };
}

/**
 * Pure deterministic simulation tick for Coherent COHR2401 Building 5.
 * Advances physics, PIDs, interlocks, FB_Demand sequencers, PMS SLD power, alarms, and trends by dt seconds.
 */
export function stepBuilding5Plant(prev: PlantState, rawDtSec: number): PlantState {
  const dt = rawDtSec * prev.sandbox.timeScale;
  const nextSimTimeSec = Number((prev.simTimeSec + dt).toFixed(2));
  const nextTickCount = prev.tickCount + 1;
  const noisePct = prev.sandbox.noiseAmplitudePct;

  const equipment: Record<string, EquipmentUnit> = {};
  for (const k of Object.keys(prev.equipment)) {
    equipment[k] = { ...prev.equipment[k], telemetry: { ...prev.equipment[k].telemetry } };
  }
  const valves: Record<string, ValveUnit> = {};
  for (const k of Object.keys(prev.valves)) valves[k] = { ...prev.valves[k] };
  const sensors: Record<string, AnalogSensor> = {};
  for (const k of Object.keys(prev.sensors)) sensors[k] = { ...prev.sensors[k], alarms: { ...prev.sensors[k].alarms } };
  const pids: Record<string, PIDLoop> = {};
  for (const k of Object.keys(prev.pids)) pids[k] = { ...prev.pids[k] };
  const demands: Record<DemandId, DemandSequencer> = { ...prev.demands };
  const meters: Record<string, PowerMeter> = {};
  for (const k of Object.keys(prev.meters)) meters[k] = { ...prev.meters[k] };

  // =========================================================================
  // STEP 1: ADVANCE ALL PID LOOPS
  // =========================================================================
  for (const pidTag of Object.keys(pids)) {
    const loop = pids[pidTag];
    const sensor = sensors[loop.sensorTag];
    pids[pidTag] = stepPidLoop(loop, sensor?.pv ?? loop.sp, sensor?.faulted ?? false, dt);
  }

  // =========================================================================
  // STEP 2: EVALUATE FB_DEMAND SEQUENCERS
  // =========================================================================
  // 2a. Chillers B5CH (CH11..13; CH14 is Heat Recovery)
  const chDemandRes = stepDemandSequencer(demands.B5CH, equipment, sensors, dt, 1);
  demands.B5CH = chDemandRes.nextSeq;
  const desiredChillers = chDemandRes.desiredAutoStartTags;

  // Count how many chillers want to run (Auto desired + Manual commanded)
  const activeOrWantedChillers = ['B51F_CH11', 'B51F_CH12', 'B51F_CH13'].filter((t) => {
    const u = equipment[t];
    if (!u || u.faulted) return false;
    return u.mode === 'AUTO' ? desiredChillers.has(t) : u.cmdStart;
  });
  const reqChillerCount = Math.max(1, activeOrWantedChillers.length);

  // 2b. CHWP Demand (matches active chiller trains, min reqChillerCount)
  const chwpDemandRes = stepDemandSequencer(demands.B5CHWP, equipment, sensors, dt, reqChillerCount);
  demands.B5CHWP = chwpDemandRes.nextSeq;

  // 2c. CWP Demand (min 1 per running chiller, capped at 3)
  const cwpDemandRes = stepDemandSequencer(demands.B5CWP, equipment, sensors, dt, Math.min(3, reqChillerCount));
  demands.B5CWP = cwpDemandRes.nextSeq;

  // 2d. Cooling Tower Demand (min 2 towers per running chiller per user spec)
  const minTowers = Math.min(9, reqChillerCount * 2);
  const ctDemandRes = stepDemandSequencer(demands.B5CT, equipment, sensors, dt, minTowers);
  demands.B5CT = ctDemandRes.nextSeq;

  // 2e. PCW Pumps Demand
  const pcwDemandRes = stepDemandSequencer(demands.B5PCW, equipment, sensors, dt, 1);
  demands.B5PCW = pcwDemandRes.nextSeq;

  // 2f. OFLAC Demand (VSD AC204 lead + Fix AC201/202 lag)
  const oflacDemandRes = stepDemandSequencer(demands.B5OFLAC, equipment, sensors, dt, 1);
  demands.B5OFLAC = oflacDemandRes.nextSeq;

  // 2g. OFRAC Demand & Cooling Pump Prefix
  const ofracDemandRes = stepDemandSequencer(demands.B5OFRAC, equipment, sensors, dt, 1);
  demands.B5OFRAC = ofracDemandRes.nextSeq;
  const ofracRunningCount = ['B51F_AC101', 'B51F_AC102'].filter((t) => equipment[t]?.status === 'RUNNING').length;
  const ofracCpRes = stepDemandSequencer(demands.B5OFRACCP, equipment, sensors, dt, Math.max(1, ofracRunningCount));
  demands.B5OFRACCP = ofracCpRes.nextSeq;

  // 2h. Process Vacuum Demand
  const pvDemandRes = stepDemandSequencer(demands.B5PV, equipment, sensors, dt, 1);
  demands.B5PV = pvDemandRes.nextSeq;

  // =========================================================================
  // STEP 3: INTERLOCKED CHILLER / CT / HEAT RECOVERY VALVES & MOTORS
  // =========================================================================
  const chwpCv = pids['B51F_CH11CHWP_PID'].cvPct;
  const cwpCv = pids['B51F_CT11CWP_PID'].cvPct;
  const ctCv = pids['B51F_CT11FN_PID'].cvPct;

  // 3a. Cooling Towers (CT11..19): Open IV/OV first -> OpenFB -> Run Fan (tracking TT10501)
  for (let n = 11; n <= 19; n++) {
    const fnTag = `B51F_CT${n}FN`;
    const ivTag = `B51F_CT${n}IV`;
    const ovTag = `B51F_CT${n}OV`;
    const fn = equipment[fnTag];
    const wantTower =
      fn.mode === 'AUTO'
        ? demands.B5CT.enable
          ? ctDemandRes.desiredAutoStartTags.has(fnTag)
          : fn.cmdStart
        : fn.cmdStart;

    valves[ivTag] = stepValveStroke(valves[ivTag], null, wantTower, dt);
    valves[ovTag] = stepValveStroke(valves[ovTag], null, wantTower, dt);

    const valvesOpen = valves[ivTag].openFB && valves[ovTag].openFB && !valves[ivTag].faulted && !valves[ovTag].faulted;
    equipment[fnTag] = advanceMotorStatus(
      fn,
      wantTower,
      valvesOpen,
      valvesOpen ? 'CT IV/OV OpenFB OK' : 'Waiting CT IV/OV OpenFB',
      ctCv,
      dt
    );
  }

  // 3b. Condenser Water Pumps (CT11..13CWP): all Auto CWPs share PIT10505 PID
  const activeTowersReady = [11, 12, 13, 14, 15, 16, 17, 18, 19].filter(
    (n) => valves[`B51F_CT${n}IV`].openFB && valves[`B51F_CT${n}OV`].openFB
  ).length;
  for (const n of [11, 12, 13]) {
    const tag = `B51F_CT${n}CWP`;
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? cwpDemandRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    const perm = activeTowersReady >= 1;
    equipment[tag] = advanceMotorStatus(
      u,
      want,
      perm,
      perm ? 'CT Header Open OK' : 'No CT isolation valves open',
      cwpCv,
      dt
    );
  }

  // 3c. Chiller Trains CH11..13: Open CHV & CDV -> CHWP starts on CHV OpenFB -> Chiller starts on all permissives
  for (const n of [11, 12, 13]) {
    const chTag = `B51F_CH${n}`;
    const chvTag = `${chTag}CHV`;
    const cdvTag = `${chTag}CDV`;
    const chwpTag = `${chTag}CHWP`;

    const ch = equipment[chTag];
    const chwp = equipment[chwpTag];
    const wantTrain = ch.mode === 'AUTO' ? desiredChillers.has(chTag) : ch.cmdStart;
    const wantChwp =
      chwp.mode === 'AUTO' ? wantTrain || chwpDemandRes.desiredAutoStartTags.has(chwpTag) : chwp.cmdStart;

    valves[chvTag] = stepValveStroke(valves[chvTag], null, wantTrain || wantChwp, dt);
    valves[cdvTag] = stepValveStroke(valves[cdvTag], null, wantTrain, dt);

    const chwpPerm = valves[chvTag].openFB && !valves[chvTag].faulted;
    equipment[chwpTag] = advanceMotorStatus(
      chwp,
      wantChwp,
      chwpPerm,
      chwpPerm ? `${chvTag} OpenFB OK` : `Waiting ${chvTag} OpenFB`,
      chwpCv,
      dt
    );

    const chPerm = evaluateChillerPermissives(chTag, equipment, valves, sensors);
    equipment[chTag] = advanceMotorStatus(ch, wantTrain, chPerm.sttPerm, chPerm.reason, null, dt);
    equipment[chTag].telemetry.evapFS = chPerm.evapFs ? 1 : 0;
  }

  // 3d. Manual-only Chiller Bypass Valve
  valves['B51F_BPMV'] = stepValveStroke(valves['B51F_BPMV'], null, null, dt);

  // 3e. Heat Recovery Train (CH14 + CH11HWP + CH14CHWP; HEMV & HBPMV Manual-only; NO Cooling Tower path)
  const ch14 = equipment['B51F_CH14'];
  const wantCh14 = ch14.mode === 'AUTO' ? !ch14.faulted : ch14.cmdStart;
  valves['B51F_CH14CHV'] = stepValveStroke(valves['B51F_CH14CHV'], null, wantCh14, dt);
  valves['B51F_CH14CDV'] = stepValveStroke(valves['B51F_CH14CDV'], null, wantCh14, dt);
  valves['B51F_HEMV'] = stepValveStroke(valves['B51F_HEMV'], null, null, dt);
  valves['B51F_HBPMV'] = stepValveStroke(valves['B51F_HBPMV'], null, null, dt);

  const ch11Hwp = equipment['B51F_CH11HWP'];
  const wantHwp = ch11Hwp.mode === 'AUTO' ? wantCh14 : ch11Hwp.cmdStart;
  equipment['B51F_CH11HWP'] = advanceMotorStatus(
    ch11Hwp,
    wantHwp,
    valves['B51F_CH14CDV'].openFB,
    valves['B51F_CH14CDV'].openFB ? 'CH14CDV OpenFB OK' : 'Waiting CH14CDV OpenFB',
    pids['B51F_CH11HWP_PID'].cvPct,
    dt
  );

  const ch14Chwp = equipment['B51F_CH14CHWP'];
  const wantCh14Chwp = ch14Chwp.mode === 'AUTO' ? wantCh14 : ch14Chwp.cmdStart;
  equipment['B51F_CH14CHWP'] = advanceMotorStatus(
    ch14Chwp,
    wantCh14Chwp,
    valves['B51F_CH14CHV'].openFB,
    valves['B51F_CH14CHV'].openFB ? 'CH14CHV OpenFB OK' : 'Waiting CH14CHV OpenFB',
    pids['B51F_CH14CHWP_PID'].cvPct,
    dt
  );

  const ch14Perm = evaluateChillerPermissives('B51F_CH14', equipment, valves, sensors);
  equipment['B51F_CH14'] = advanceMotorStatus(ch14, wantCh14, ch14Perm.sttPerm, ch14Perm.reason, null, dt);
  equipment['B51F_CH14'].telemetry.evapFS = ch14Perm.evapFs ? 1 : 0;

  // =========================================================================
  // STEP 4: PCW & DI WATER VALVES & PUMPS
  // =========================================================================
  const pcwCv = pids['B51F_P501A_PID'].cvPct;
  for (const tag of ['B51F_P501A', 'B51F_P501B', 'B51F_P501C']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? pcwDemandRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(u, want, true, 'PCW Suction OK', pcwCv, dt);
  }
  const p502 = equipment['B51F_P502'];
  const p502AutoWant = evaluateP502TankLevelHysteresis(sensors['B51F_LT10501'], p502);
  equipment['B51F_P502'] = advanceMotorStatus(
    p502,
    p502.mode === 'AUTO' ? p502AutoWant : p502.cmdStart,
    true,
    p502.mode === 'AUTO'
      ? `TK-501 Level ${sensors['B51F_LT10501'].pv.toFixed(1)}% (H>=${sensors['B51F_LT10501'].alarms.haSP}% / L<=${sensors['B51F_LT10501'].alarms.laSP}%)`
      : 'Manual Control',
    null,
    dt
  );

  valves['B51F_TCV10501'] = stepValveStroke(valves['B51F_TCV10501'], pids['B51F_TCV10501_PID'].cvPct, null, dt);
  valves['B51F_TCV10502'] = stepValveStroke(valves['B51F_TCV10502'], pids['B51F_TCV10502_PID'].cvPct, null, dt);

  const hyst = evaluatePcwValveHysteresis(sensors['B51F_PIT10501'], valves['B51F_XV10501'], valves['B51F_XV10502']);
  valves['B51F_XV10501'] = stepValveStroke(valves['B51F_XV10501'], null, hyst.xv10501AutoOpen, dt);
  valves['B51F_XV10502'] = stepValveStroke(valves['B51F_XV10502'], null, hyst.xv10502AutoOpen, dt);
  valves['B51F_XV10503'] = stepValveStroke(valves['B51F_XV10503'], null, null, dt); // Manual-only
  valves['B51F_XV10504'] = stepValveStroke(valves['B51F_XV10504'], null, null, dt); // Manual-only

  // DI PRVs (Process Control Valves with PID tracking PIT10701..03, no branch-stop interlock)
  valves['B52F_PCV10701'] = stepValveStroke(valves['B52F_PCV10701'], pids['B52F_PCV10701_PID'].cvPct, null, dt);
  valves['B52F_PCV10702'] = stepValveStroke(valves['B52F_PCV10702'], pids['B52F_PCV10702_PID'].cvPct, null, dt);
  valves['B52F_PCV10703'] = stepValveStroke(valves['B52F_PCV10703'], pids['B52F_PCV10703_PID'].cvPct, null, dt);

  // =========================================================================
  // STEP 5: COMPRESSED AIR (OFLAC, OFRAC) & PROCESS VACUUM (PV)
  // =========================================================================
  for (const tag of ['B51F_AC204', 'B51F_AC201', 'B51F_AC202']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? oflacDemandRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(u, want, true, 'OFLAC Ready', null, dt);
  }
  equipment['B51F_AD201A'] = advanceMotorStatus(equipment['B51F_AD201A'], equipment['B51F_AC204'].status === 'RUNNING' || equipment['B51F_AC201'].status === 'RUNNING', true, 'OK', null, dt);
  equipment['B51F_AD202A'] = advanceMotorStatus(equipment['B51F_AD202A'], equipment['B51F_AC201'].status === 'RUNNING', true, 'OK', null, dt);
  equipment['B51F_AD202B'] = advanceMotorStatus(equipment['B51F_AD202B'], equipment['B51F_AC202'].status === 'RUNNING', true, 'OK', null, dt);

  for (const tag of ['B51F_P10101A', 'B51F_P10101B']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? ofracCpRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(u, want, true, 'OFRAC Cooling Ready', null, dt);
  }
  const ofracPumpRunning =
    equipment['B51F_P10101A'].status === 'RUNNING' || equipment['B51F_P10101B'].status === 'RUNNING';
  for (const tag of ['B51F_AC101', 'B51F_AC102']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? ofracDemandRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(
      u,
      want,
      ofracPumpRunning,
      ofracPumpRunning ? 'Cooling Pump Running' : 'Waiting P10101A/B',
      null,
      dt
    );
  }
  equipment['B51F_AD101A'] = advanceMotorStatus(equipment['B51F_AD101A'], equipment['B51F_AC101'].status === 'RUNNING', true, 'OK', null, dt);
  equipment['B51F_AD102A'] = advanceMotorStatus(equipment['B51F_AD102A'], equipment['B51F_AC102'].status === 'RUNNING', true, 'OK', null, dt);

  for (const tag of ['B51F_PV1301A', 'B51F_PV1301B']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? pvDemandRes.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(u, want, true, 'PV Ready', null, dt);
  }

  // =========================================================================
  // STEP 6: AHU / PAU (3-WAY VALVES) & EXHAUST FANS
  // =========================================================================
  let ahuTotalCoolingDemand = 0;
  let ahuTotalHeatingDemand = 0;
  let ahuCount = 0;

  for (const ahuKey of Object.keys(prev.ahus)) {
    const cfg = prev.ahus[ahuKey];
    const fan = equipment[cfg.ahuTag];
    const wantFan = fan.mode === 'AUTO' ? !fan.faulted : fan.cmdStart;
    equipment[cfg.ahuTag] = advanceMotorStatus(fan, wantFan, true, 'AHU Ready', pids[cfg.fanPidTag].cvPct, dt);

    const cwVal = stepValveStroke(valves[cfg.cwValveTag], pids[cfg.cwPidTag].cvPct, null, dt);
    valves[cfg.cwValveTag] = cwVal;

    let hwPos = 0;
    if (cfg.hwValveTag && cfg.hwPidTag) {
      const hwVal = stepValveStroke(valves[cfg.hwValveTag], pids[cfg.hwPidTag].cvPct, null, dt);
      valves[cfg.hwValveTag] = hwVal;
      hwPos = hwVal.positionPct;
    }

    const fanRunning = equipment[cfg.ahuTag].status === 'RUNNING';
    const fanRatio = fanRunning ? equipment[cfg.ahuTag].frequencyHz / 50 : 0;

    // Supply Air Static Pressure (Pa)
    const sasTarget = fanRunning ? 480 * (fanRatio * fanRatio) * 1.15 : 0;
    sensors[cfg.sasSensorTag] = updateSensorPv(sensors[cfg.sasSensorTag], sasTarget, 2.5, 4.0, nextSimTimeSec, noisePct, dt);

    // Supply Air Temp & Room Temp / RH / DewPoint driven by 3-way CWCV (dehumidification) & HWCV (reheat)
    // Building 3 AHUs are physically coupled to B3's own Air-Cooled Chillers (B31F_CHSTS1) & Heat Fans (B31F_HPSTS1)!
    const isB3Ahu = cfg.ahuTag.startsWith('B3');
    const cwsTemp = isB3Ahu && sensors['B31F_CHSTS1'] ? sensors['B31F_CHSTS1'].pv : sensors['B51F_CHSTS1'].pv;
    const hwsTemp = isB3Ahu && sensors['B31F_HPSTS1'] ? sensors['B31F_HPSTS1'].pv : sensors['B51F_HSTS1'].pv;
    const coolingEffect = fanRunning ? (cwVal.positionPct / 100) * Math.max(0, 26 - cwsTemp) * 0.92 : 0;
    const reheatEffect = fanRunning ? (hwPos / 100) * Math.max(0, hwsTemp - 22) * 0.42 : 0;

    const satTarget = clamp(25.2 - coolingEffect + reheatEffect, 9.0, 32.0);
    sensors[cfg.satSensorTag] = updateSensorPv(sensors[cfg.satSensorTag], satTarget, 5.0, 0.15, nextSimTimeSec, noisePct, dt);

    const loadPct = isB3Ahu ? prev.sandbox.b3CoolingLoadPct : prev.sandbox.coolingLoadPct;
    const roomHeatGain = 2.6 + (loadPct / 100) * 3.0;
    const ratTarget = fanRunning ? satTarget + roomHeatGain : 26.5;
    sensors[cfg.ratSensorTag] = updateSensorPv(sensors[cfg.ratSensorTag], ratTarget, 8.0, 0.15, nextSimTimeSec, noisePct, dt);

    // DewPoint & RH respond to CW coil dehumidification
    const dpTarget = fanRunning ? clamp(16.5 - (cwVal.positionPct / 100) * 12.5, 3.0, 20.0) : 16.0;
    sensors[cfg.dewPointSensorTag] = updateSensorPv(sensors[cfg.dewPointSensorTag], dpTarget, 7.0, 0.15, nextSimTimeSec, noisePct, dt);

    const rhTarget = clamp(100 - 5 * (sensors[cfg.ratSensorTag].pv - sensors[cfg.dewPointSensorTag].pv), 20, 85);
    sensors[cfg.rahSensorTag] = updateSensorPv(sensors[cfg.rahSensorTag], rhTarget, 7.0, 0.4, nextSimTimeSec, noisePct, dt);

    if (!isB3Ahu) {
      ahuTotalCoolingDemand += cwVal.positionPct;
      ahuTotalHeatingDemand += hwPos;
      ahuCount++;
    }
  }

  // Exhaust VFDs & Plant Room Fans
  const exhMap: [string, string][] = [
    ['B5M2F_FA11201A', 'B5M2F_FA11201A_PID'],
    ['B5M2F_FA11203A', 'B5M2F_FA11203A_PID'],
    ['B5M2F_FA11204A', 'B5M2F_FA11204A_PID'],
  ];
  for (const [eqTag, pidTag] of exhMap) {
    const u = equipment[eqTag];
    equipment[eqTag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, true, 'OK', pids[pidTag].cvPct, dt);
  }
  for (const tag of ['B51F_FAF01', 'B51F_FAF02', 'B51F_EAF01', 'B51F_EAF02']) {
    const u = equipment[tag];
    equipment[tag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, true, 'OK', 70, dt);
  }
  for (const tag of ['B51F_TEF01', 'B52F_TEF01']) {
    const u = equipment[tag];
    equipment[tag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, true, 'OK', null, dt);
  }

  const fa1Ratio = equipment['B5M2F_FA11201A'].status === 'RUNNING' ? equipment['B5M2F_FA11201A'].frequencyHz / 50 : 0;
  const fa2Ratio =
    ((equipment['B5M2F_FA11203A'].status === 'RUNNING' ? equipment['B5M2F_FA11203A'].frequencyHz / 50 : 0) +
      (equipment['B5M2F_FA11204A'].status === 'RUNNING' ? equipment['B5M2F_FA11204A'].frequencyHz / 50 : 0)) /
    2;
  sensors['B51F_PIT11201'] = updateSensorPv(sensors['B51F_PIT11201'], -0.75 * fa1Ratio * fa1Ratio, 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B51F_PIT11202'] = updateSensorPv(sensors['B51F_PIT11202'], -0.74 * fa2Ratio * fa2Ratio, 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B51F_TIT11201'] = updateSensorPv(sensors['B51F_TIT11201'], prev.sandbox.ambientWetBulbC + 5.0, 12.0, 0.15, nextSimTimeSec, noisePct, dt);

  // =========================================================================
  // STEP 7: CENTRAL PLANT HYDRAULICS & THERMODYNAMICS
  // =========================================================================
  // 7a. Chilled Water Hydraulics (3-way AHU valves keep hydraulic resistance CONSTANT!)
  // B51F_CHWPS1 is the common CHWP discharge pressure sensor controlling CH11..13CHWP PID (4.0 bar SP)
  const runningChwps = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'].filter(
    (t) => equipment[t].status === 'RUNNING'
  );
  const avgChwpHz =
    runningChwps.length > 0
      ? runningChwps.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningChwps.length
      : 0;
  const bpmvBypassFactor = 1 - (valves['B51F_BPMV'].positionPct / 100) * 0.25;
  // Nominal: 2 pumps @ 38.5 Hz -> ~4.0 bar CHWPS1 (invariant to AHU 3-way valve movement!)
  const pumpCountBoost = runningChwps.length > 0 ? 0.86 + 0.07 * runningChwps.length : 0;
  const chwpsTarget =
    runningChwps.length > 0
      ? 6.75 * Math.pow(avgChwpHz / 50, 2) * pumpCountBoost * bpmvBypassFactor
      : 0.1;
  sensors['B51F_CHWPS1'] = updateSensorPv(sensors['B51F_CHWPS1'], chwpsTarget, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  sensors['B51F_BPPS1'] = updateSensorPv(sensors['B51F_BPPS1'], sensors['B51F_CHWPS1'].pv, 2.0, 0.03, nextSimTimeSec, noisePct, dt);
  sensors['B51F_BPPS2'] = updateSensorPv(sensors['B51F_BPPS2'], 0.8, 2.5, 0.02, nextSimTimeSec, noisePct, dt);

  // 7b. Chilled Water Temperatures (coupled to Sandbox Cooling Load & AHU 3-way CWCV thermal extraction)
  const runningChillers = ['B51F_CH11', 'B51F_CH12', 'B51F_CH13'].filter((t) => equipment[t].status === 'RUNNING');
  const avgAhuCwPct = ahuCount > 0 ? ahuTotalCoolingDemand / ahuCount : 50;
  const thermalLoadFactor = (prev.sandbox.coolingLoadPct * 0.75 + avgAhuCwPct * 0.25) / 100; // ~0.56 nominal
  const totalChillerCapacityUnits = runningChillers.length;
  const requiredCapacityUnits = thermalLoadFactor * 2.15;

  const chSupplySp = equipment['B51F_CH11'].telemetry.spTemp ?? 8.0;
  const loadRatio = totalChillerCapacityUnits > 0 ? requiredCapacityUnits / totalChillerCapacityUnits : 3.0;
  const cwsTarget =
    totalChillerCapacityUnits > 0
      ? chSupplySp + Math.max(0, (loadRatio - 0.92) * 5.0) - Math.max(0, (0.45 - loadRatio) * 1.2)
      : 16.5;
  const deltaT = 2.2 + thermalLoadFactor * 3.4; // ~4.0°C nominal -> 8.0 -> 12.0°C
  sensors['B51F_CHSTS1'] = updateSensorPv(sensors['B51F_CHSTS1'], cwsTarget, 5.0, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_CHRTS2'] = updateSensorPv(sensors['B51F_CHRTS2'], sensors['B51F_CHSTS1'].pv + deltaT, 5.5, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_BPTS3'] = updateSensorPv(sensors['B51F_BPTS3'], sensors['B51F_CHSTS1'].pv + 0.3, 4.0, 0.1, nextSimTimeSec, noisePct, dt);

  // Update each Chiller FLA & Modbus Telemetry
  const perChillerFla = totalChillerCapacityUnits > 0 ? clamp(loadRatio * 100, 22, 100) : 0;
  for (const n of [11, 12, 13]) {
    const ch = equipment[`B51F_CH${n}`];
    if (ch.status === 'RUNNING') {
      ch.loadPct = Number(perChillerFla.toFixed(1));
      ch.telemetry.fla = ch.loadPct;
      ch.telemetry.chwrTemp = sensors['B51F_CHRTS2'].pv;
      ch.telemetry.condEWT = sensors['B51F_TT10505'].pv;
      ch.telemetry.evapPress = Number((3.0 + (sensors['B51F_CHSTS1'].pv - 7.0) * 0.15).toFixed(2));
      ch.telemetry.condPress = Number((7.5 + (sensors['B51F_TT10505'].pv - 22.0) * 0.25).toFixed(2));
      ch.telemetry.oilDP = 2.4;
    } else {
      ch.loadPct = 0;
      ch.telemetry.fla = 0;
      ch.telemetry.oilDP = 0;
    }
  }

  // 7c. Condenser Water & Cooling Tower Physics (TT10505 controls CT11..19FN — Wet-Bulb approach!)
  const runningCwps = ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'].filter((t) => equipment[t].status === 'RUNNING');
  const avgCwpHz =
    runningCwps.length > 0
      ? runningCwps.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningCwps.length
      : 0;
  const cwpPressTarget = runningCwps.length > 0 ? 3.62 * Math.pow(avgCwpHz / 50, 2) * (0.9 + 0.05 * runningCwps.length) : 0.1;
  sensors['B51F_PIT10505'] = updateSensorPv(sensors['B51F_PIT10505'], cwpPressTarget, 2.5, 0.04, nextSimTimeSec, noisePct, dt);

  const runningCts = [11, 12, 13, 14, 15, 16, 17, 18, 19]
    .map((n) => `B51F_CT${n}FN`)
    .filter((t) => equipment[t].status === 'RUNNING');
  const avgCtHz =
    runningCts.length > 0
      ? runningCts.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningCts.length
      : 0;
  const heatRejectionLoad = Math.max(0.15, totalChillerCapacityUnits * (perChillerFla / 100));
  const ctAirflowCapacity = Math.max(0.05, runningCts.length * Math.pow(avgCtHz / 50, 0.9));
  // Thermodynamically cannot cool below Ambient Wet-Bulb!
  // Nominal: WB=22.5°C, 4 towers @ 35Hz, 2 chillers @ 62% FLA -> approach ~2.5°C -> TT10505 = 25.0°C
  const approachC = clamp(1.3 + (heatRejectionLoad / ctAirflowCapacity) * 2.75, 1.2, 14.0);
  const tt10505Target = prev.sandbox.ambientWetBulbC + approachC;
  sensors['B51F_TT10505'] = updateSensorPv(sensors['B51F_TT10505'], tt10505Target, 4.5, 0.15, nextSimTimeSec, noisePct, dt);

  // 7d. Heat Recovery Physics (CH14 + CH11HWP + CH14CHWP — isolated from CT!)
  const hwpRunning = equipment['B51F_CH11HWP'].status === 'RUNNING';
  const ch14ColdRunning = equipment['B51F_CH14CHWP'].status === 'RUNNING';
  const hwpRatio = hwpRunning ? equipment['B51F_CH11HWP'].frequencyHz / 50 : 0;
  const ch14ColdRatio = ch14ColdRunning ? equipment['B51F_CH14CHWP'].frequencyHz / 50 : 0;
  const hbpmvFactor = 1 - (valves['B51F_HBPMV'].positionPct / 100) * 0.25;
  sensors['B51F_HBPPS1'] = updateSensorPv(sensors['B51F_HBPPS1'], hwpRunning ? 5.85 * hwpRatio * hwpRatio * hbpmvFactor : 0.2, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  sensors['B51F_HBPPS2'] = updateSensorPv(sensors['B51F_HBPPS2'], hwpRunning ? 1.4 : 0.2, 2.5, 0.02, nextSimTimeSec, noisePct, dt);
  sensors['B51F_HCHPS1'] = updateSensorPv(sensors['B51F_HCHPS1'], ch14ColdRunning ? 5.85 * ch14ColdRatio * ch14ColdRatio : 0.2, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  sensors['B51F_HCLPS1'] = updateSensorPv(sensors['B51F_HCLPS1'], ch14ColdRunning ? 1.5 : 0.2, 2.5, 0.02, nextSimTimeSec, noisePct, dt);

  const avgAhuHwPct = ahuCount > 0 ? ahuTotalHeatingDemand / Math.max(1, ahuCount - 1) : 28;
  const ch14Running = equipment['B51F_CH14'].status === 'RUNNING';
  const hstsTarget = ch14Running ? (equipment['B51F_CH14'].telemetry.spTemp ?? 45.0) : 29.0;
  const hrDeltaT = ch14Running ? 2.8 + (avgAhuHwPct / 100) * 7.8 : 0.5;
  sensors['B51F_HSTS1'] = updateSensorPv(sensors['B51F_HSTS1'], hstsTarget, 5.0, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_HRTS2'] = updateSensorPv(sensors['B51F_HRTS2'], sensors['B51F_HSTS1'].pv - hrDeltaT, 5.5, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_HBPTS3'] = updateSensorPv(sensors['B51F_HBPTS3'], sensors['B51F_HSTS1'].pv - 0.8, 4.0, 0.1, nextSimTimeSec, noisePct, dt);
  equipment['B51F_CH14'].loadPct = ch14Running ? Number(clamp(38 + avgAhuHwPct * 0.65, 25, 95).toFixed(1)) : 0;
  equipment['B51F_CH14'].telemetry.fla = equipment['B51F_CH14'].loadPct;
  equipment['B51F_CH14'].telemetry.condEWT = sensors['B51F_HRTS2'].pv;

  // 7e. PCW & DI Water Physics (B51F_DPT10501, B51F_TT10501, B51F_TT10502, B51F_TT10503, B51F_FIT10501 belong strictly to PCW!)
  const runningPcw = ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'].filter((t) => equipment[t].status === 'RUNNING');
  const avgPcwHz = runningPcw.length > 0 ? runningPcw.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningPcw.length : 0;
  const xvBypassDrop =
    (valves['B51F_XV10503'].positionPct / 100) * 0.35 + (valves['B51F_XV10504'].positionPct / 100) * 0.35;
  const pcwDptTarget =
    runningPcw.length > 0
      ? Math.max(0.2, 3.15 * Math.pow(avgPcwHz / 50, 2) * (0.9 + 0.05 * runningPcw.length) - xvBypassDrop)
      : 0.05;
  sensors['B51F_DPT10501'] = updateSensorPv(sensors['B51F_DPT10501'], pcwDptTarget, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  const pcwFlowTarget = runningPcw.length * 95 * (avgPcwHz / 50);
  sensors['B51F_FIT10501'] = updateSensorPv(sensors['B51F_FIT10501'], pcwFlowTarget, 2.5, pcwFlowTarget * 0.015, nextSimTimeSec, noisePct, dt);

  // PIT10501 responds gently to XV10502 (RO/DI Makeup from RO-DI Package) & XV10501 (Drain to TK-501)
  const makeupRate = (valves['B51F_XV10502'].positionPct / 100) * 0.08 * (prev.sandbox.diPackageConnected ? 1 : 0.25);
  const drainRate = (valves['B51F_XV10501'].positionPct / 100) * 0.14;
  const bleedLoss = 0.015;
  const nextPit10501Target = clamp(sensors['B51F_PIT10501'].pv + (makeupRate - drainRate - bleedLoss) * dt * 2.0, 0.5, 3.6);
  sensors['B51F_PIT10501'] = updateSensorPv(sensors['B51F_PIT10501'], nextPit10501Target, 1.5, 0.02, nextSimTimeSec, noisePct, dt);

  // TK-501 Rejected PCW Tank Level (LT10501): fills when XV-10501 drains into TK-501, empties when P-502 runs
  const tk501Inflow = (valves['B51F_XV10501'].positionPct / 100) * 3.2 + 0.04;
  const tk501Outflow = equipment['B51F_P502'].status === 'RUNNING' ? 4.5 : 0;
  const nextLt501Target = clamp(sensors['B51F_LT10501'].pv + (tk501Inflow - tk501Outflow) * dt, 5, 98);
  sensors['B51F_LT10501'] = updateSensorPv(sensors['B51F_LT10501'], nextLt501Target, 1.5, 0.2, nextSimTimeSec, noisePct, dt);

  // PCW HX Supply Temps (TT10501 -> E-501A/TCV10501, TT10502 -> E-501B/TCV10502, TT10503 -> 2F Return)
  const pcwHeat = 24.5 + (prev.sandbox.pcwToolLoadPct / 100) * 6.5;
  const tcv1Cool = (valves['B51F_TCV10501'].positionPct / 100) * 11.8;
  const tcv2Cool = (valves['B51F_TCV10502'].positionPct / 100) * 12.2;
  sensors['B51F_TT10501'] = updateSensorPv(sensors['B51F_TT10501'], pcwHeat - tcv1Cool, 4.0, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_TT10502'] = updateSensorPv(sensors['B51F_TT10502'], pcwHeat - tcv2Cool, 4.0, 0.15, nextSimTimeSec, noisePct, dt);
  sensors['B51F_TT10503'] = updateSensorPv(sensors['B51F_TT10503'], (sensors['B51F_TT10501'].pv + sensors['B51F_TT10502'].pv) / 2 + 2.2 + (prev.sandbox.pcwToolLoadPct / 100) * 2.2, 4.5, 0.15, nextSimTimeSec, noisePct, dt);

  // DI Water 2F PRVs (B52F_PCV10701..03 PID tracking PIT10701..03)
  const diDemand = prev.sandbox.diBranchDemandPct / 100;
  const diBranches: [string, string, string, number][] = [
    ['B52F_PCV10701', 'B52F_PIT10701', 'B52F_FIT10701', 31],
    ['B52F_PCV10702', 'B52F_PIT10702', 'B52F_FIT10702', 24],
    ['B52F_PCV10703', 'B52F_PIT10703', 'B52F_FIT10703', 36],
  ];
  for (const [vTag, pTag, fTag, maxFlow] of diBranches) {
    const pos = valves[vTag].positionPct / 100;
    const supplyPress = 5.6;
    const branchPressTarget = clamp(supplyPress * pos / (0.65 + 0.65 * diDemand), 0.1, 5.5);
    sensors[pTag] = updateSensorPv(sensors[pTag], branchPressTarget, 2.0, 0.04, nextSimTimeSec, noisePct, dt);
    const branchFlowTarget = maxFlow * diDemand * Math.sqrt(Math.max(0, sensors[pTag].pv / 3.0));
    sensors[fTag] = updateSensorPv(sensors[fTag], branchFlowTarget, 2.0, branchFlowTarget * 0.015, nextSimTimeSec, noisePct, dt);
  }

  // 7f. OFLAC, OFRAC & PV Physics
  // OFLAC: AC204 VSD tracks 7.0 bar, AC201/202 Fix contribute base capacity
  const oflacDemand = prev.sandbox.oflacAirDemandPct / 100;
  const fixOflacRun = ['B51F_AC201', 'B51F_AC202'].filter((t) => equipment[t].status === 'RUNNING');
  const fixSupply = fixOflacRun.length * 0.55;
  const ac204 = equipment['B51F_AC204'];
  let vsdSupply = 0;
  if (ac204.status === 'RUNNING') {
    const neededFromVsd = clamp((oflacDemand * 1.15 - fixSupply) / 0.72, 0.25, 1.0);
    const targetCap = ac204.mode === 'AUTO' ? neededFromVsd * 100 : ac204.manualSP;
    ac204.loadPct = Number(firstOrderLag(ac204.loadPct, targetCap, 2.0, dt).toFixed(1));
    vsdSupply = (ac204.loadPct / 100) * 0.72;
    ac204.telemetry.stage1Temp = Number((68 + ac204.loadPct * 0.16).toFixed(1));
    ac204.telemetry.stage2Temp = Number((73 + ac204.loadPct * 0.18).toFixed(1));
  } else {
    ac204.loadPct = 0;
  }
  for (const t of ['B51F_AC201', 'B51F_AC202']) {
    const u = equipment[t];
    if (u.status === 'RUNNING') {
      const loaded = sensors['B51F_PIT20101'].pv < (u.telemetry.unloadPress ?? 7.4);
      u.telemetry.loaded = loaded ? 1 : 0;
      u.loadPct = loaded ? 92 : 25;
      u.telemetry.stage1Temp = loaded ? 80.5 : 54.0;
      u.telemetry.stage2Temp = loaded ? 86.0 : 58.0;
    } else {
      u.loadPct = 0;
      u.telemetry.loaded = 0;
    }
  }
  const oflacBalance = (vsdSupply + fixSupply) - oflacDemand * 1.15;
  const pit20101Target = clamp(7.0 + oflacBalance * 2.6, 4.0, 8.6);
  sensors['B51F_PIT20101'] = updateSensorPv(sensors['B51F_PIT20101'], pit20101Target, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  sensors['B51F_AIT20101'] = updateSensorPv(sensors['B51F_AIT20101'], equipment['B51F_AD201A'].status === 'RUNNING' ? -40.2 : -18.0, 8.0, 0.25, nextSimTimeSec, noisePct, dt);
  ac204.telemetry.systemPressure = sensors['B51F_PIT20101'].pv;
  ac204.telemetry.dischargePressure = Number((sensors['B51F_PIT20101'].pv + 0.2).toFixed(2));

  // OFRAC
  const ofracDemand = prev.sandbox.ofracAirDemandPct / 100;
  const ac101 = equipment['B51F_AC101'];
  const ac102 = equipment['B51F_AC102'];
  const ofracFixSupply = ac102.status === 'RUNNING' ? 0.6 : 0;
  let ofracVsdSupply = 0;
  if (ac101.status === 'RUNNING') {
    const targetCap = ac101.mode === 'AUTO' ? clamp((ofracDemand * 1.1 - ofracFixSupply) / 0.72, 0.25, 1.0) * 100 : ac101.manualSP;
    ac101.loadPct = Number(firstOrderLag(ac101.loadPct, targetCap, 2.0, dt).toFixed(1));
    ofracVsdSupply = (ac101.loadPct / 100) * 0.72;
  } else {
    ac101.loadPct = 0;
  }
  ac102.loadPct = ac102.status === 'RUNNING' ? 88 : 0;
  const pit10101Target = clamp(7.0 + (ofracVsdSupply + ofracFixSupply - ofracDemand * 1.1) * 2.6, 4.0, 8.6);
  sensors['B51F_PIT10101'] = updateSensorPv(sensors['B51F_PIT10101'], pit10101Target, 2.5, 0.04, nextSimTimeSec, noisePct, dt);
  sensors['B51F_AIT10101'] = updateSensorPv(sensors['B51F_AIT10101'], equipment['B51F_AD101A'].status === 'RUNNING' ? -41.5 : -20.0, 8.0, 0.25, nextSimTimeSec, noisePct, dt);
  ac101.telemetry.systemPressure = sensors['B51F_PIT10101'].pv;
  ac101.telemetry.dischargePressure = Number((sensors['B51F_PIT10101'].pv + 0.2).toFixed(2));

  // Process Vacuum (PV)
  const pvDemand = prev.sandbox.pvVacuumDemandPct / 100;
  const runningPv = ['B51F_PV1301A', 'B51F_PV1301B'].filter((t) => equipment[t].status === 'RUNNING');
  const pvCap = runningPv.length * 0.72;
  const pvBalance = pvCap - pvDemand * 1.05;
  const pit1301Target = runningPv.length > 0 ? clamp(-75.0 - pvBalance * 20.0, -92, -35) : -10.0;
  sensors['B51F_PIT1301'] = updateSensorPv(sensors['B51F_PIT1301'], pit1301Target, 3.0, 0.6, nextSimTimeSec, noisePct, dt);
  sensors['B52F_PIT1303'] = updateSensorPv(sensors['B52F_PIT1303'], sensors['B51F_PIT1301'].pv + 0.8, 3.0, 0.6, nextSimTimeSec, noisePct, dt);
  for (const t of ['B51F_PV1301A', 'B51F_PV1301B']) {
    const u = equipment[t];
    if (u.status === 'RUNNING') {
      u.loadPct = Number(clamp((pvDemand * 100) / Math.max(1, runningPv.length), 30, 98).toFixed(1));
      u.telemetry.t2AirendTemp = Number((66 + u.loadPct * 0.14).toFixed(1));
      u.telemetry.t3OilTemp = Number((60 + u.loadPct * 0.12).toFixed(1));
    } else {
      u.loadPct = 0;
    }
  }

  // =========================================================================
  // STEP 7.5: BUILDING 2 (B2_PLC) & BUILDING 3 (B3_PLC) SUBSYSTEMS
  // =========================================================================
  stepBuilding2Subsystems(prev, equipment, valves, sensors, pids, demands, nextSimTimeSec, noisePct, dt);
  stepBuilding3Subsystems(prev, equipment, valves, sensors, pids, demands, nextSimTimeSec, noisePct, dt);

  // =========================================================================
  // STEP 8: PMS SINGLE-LINE DIAGRAM POWER AGGREGATION (ALL BUILDINGS MDB -> DB)
  // =========================================================================
  const dbKwSum: Record<string, number> = {};
  for (const mTag of Object.keys(meters)) {
    dbKwSum[mTag] = meters[mTag].baseKw;
  }
  for (const eqTag of Object.keys(equipment)) {
    const u = equipment[eqTag];
    if (u.status !== 'RUNNING') continue;
    let kw = 0;
    if (u.kind === 'vfd') {
      // Affinity law approximation for centrifugal pumps/fans: P ~ P_rated * (f/50)^2.5
      kw = u.ratedKw * Math.pow(u.frequencyHz / 50, 2.5);
    } else if (u.kind === 'chiller' || u.kind === 'ac_vsd' || u.kind === 'ac_fix' || u.kind === 'pv') {
      kw = u.ratedKw * (0.2 + 0.8 * (u.loadPct / 100));
    } else {
      kw = u.ratedKw * 0.82;
    }
    if (dbKwSum[u.powerMeterTag] !== undefined) {
      dbKwSum[u.powerMeterTag] += kw;
    }
  }

  // First update leaf DB meters
  for (const mTag of Object.keys(meters)) {
    const m = meters[mTag];
    if (m.parentTag === null) continue;
    const kw = Number((dbKwSum[mTag] + sensorPerturbation(mTag, nextSimTimeSec, 0.35, noisePct)).toFixed(1));
    const pf = 0.91;
    const vLL = Number((400.0 + sensorPerturbation(mTag + '_V', nextSimTimeSec, 1.2, noisePct)).toFixed(1));
    const kva = kw / pf;
    const current = (kva * 1000) / (Math.sqrt(3) * vLL);
    meters[mTag] = {
      ...m,
      voltageLL: vLL,
      voltageLN: Number((vLL / Math.sqrt(3)).toFixed(1)),
      frequencyHz: Number((50.0 + sensorPerturbation('GRID_HZ', nextSimTimeSec, 0.03, noisePct)).toFixed(2)),
      activeKw: Math.max(0, kw),
      powerFactor: pf,
      apparentKva: Number(kva.toFixed(1)),
      reactiveKvar: Number(Math.sqrt(Math.max(0, kva * kva - kw * kw)).toFixed(1)),
      currentAvg: Number(current.toFixed(1)),
      energyKwh: Number((m.energyKwh + (Math.max(0, kw) * dt) / 3600).toFixed(2)),
    };
  }

  // Aggregate leaf DBs up to ALL root MDBs (B5: MDB 5.1..5.3; B2: MDB 2.1 & MDB A0-7)
  const rootMdbs = Object.keys(meters).filter((t) => meters[t].parentTag === null);
  for (const mdbTag of rootMdbs) {
    const m = meters[mdbTag];
    const children = Object.values(meters).filter((c) => c.parentTag === mdbTag);
    const totalKw = Number((m.baseKw + children.reduce((s, c) => s + c.activeKw, 0)).toFixed(1));
    const pf = 0.92;
    const vLL = Number((400.2 + sensorPerturbation(mdbTag, nextSimTimeSec, 0.9, noisePct)).toFixed(1));
    const kva = totalKw / pf;
    const current = (kva * 1000) / (Math.sqrt(3) * vLL);
    meters[mdbTag] = {
      ...m,
      voltageLL: vLL,
      voltageLN: Number((vLL / Math.sqrt(3)).toFixed(1)),
      frequencyHz: Number((50.0 + sensorPerturbation('GRID_HZ', nextSimTimeSec, 0.03, noisePct)).toFixed(2)),
      activeKw: totalKw,
      powerFactor: pf,
      apparentKva: Number(kva.toFixed(1)),
      reactiveKvar: Number(Math.sqrt(Math.max(0, kva * kva - totalKw * totalKw)).toFixed(1)),
      currentAvg: Number(current.toFixed(1)),
      energyKwh: Number((m.energyKwh + (totalKw * dt) / 3600).toFixed(2)),
    };
  }

  // =========================================================================
  // STEP 9: ALARMS & MULTI-PEN TREND BUFFER
  // =========================================================================
  const { alarms, trends } = updateAlarmsAndTrends(prev, sensors, equipment, meters, nextSimTimeSec, nextTickCount, pids);

  return {
    ...prev,
    simTimeSec: nextSimTimeSec,
    tickCount: nextTickCount,
    equipment,
    valves,
    sensors,
    pids,
    demands,
    meters,
    alarms,
    trends,
  };
}
