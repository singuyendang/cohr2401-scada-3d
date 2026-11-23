import type {
  AnalogSensor,
  DemandId,
  DemandSequencer,
  EquipmentUnit,
  PIDLoop,
  PlantState,
  ValveUnit,
} from '../types/scada.ts';
import { clamp, cvToVfdHz, manualSpToVfdHz } from './pid.ts';
import { sensorPerturbation } from './perturbation.ts';
import { stepDemandSequencer } from './demand.ts';
import {
  evaluateP502TankLevelHysteresis,
  evaluatePcwValveHysteresis,
  stepValveStroke,
} from './interlocks.ts';

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
    };
  }
  let status = unit.status;
  let startTimerSec = unit.startTimerSec;
  if (desiredRun) {
    if (status === 'STOPPED' || status === 'STOPPING' || status === 'FAULTED') {
      status = 'STARTING';
      startTimerSec = 0;
    } else if (status === 'STARTING') {
      startTimerSec += dt;
      if (startTimerSec >= 0.5) {
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
      if (startTimerSec >= 0.5) {
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
      frequencyHz = targetHz;
    } else {
      const maxDelta = 10.0 * dt;
      const diff = targetHz - unit.frequencyHz;
      const stepped = Math.abs(diff) <= maxDelta ? targetHz : unit.frequencyHz + Math.sign(diff) * maxDelta;
      frequencyHz = Number(clamp(stepped, 15.0, 50.0).toFixed(2));
    }
  }

  return {
    ...unit,
    status,
    cmdStart: desiredRun,
    startTimerSec: Number(startTimerSec.toFixed(2)),
    frequencyHz,
    loadPct: isRunning ? (unit.kind === 'vfd' ? Number(((frequencyHz / 50) * 100).toFixed(1)) : 75) : 0,
    runHours: isRunning ? Number((unit.runHours + dt / 3600).toFixed(4)) : unit.runHours,
  };
}

/**
 * Steps all Building 2 (B2_PLC) process & HVAC subsystems, physically coupled to
 * Building 5's live Chiller CHW (B51F_CHSTS1), RO-DI Package, and PV header (B51F_PIT1301).
 */
export function stepBuilding2Subsystems(
  prev: PlantState,
  equipment: Record<string, EquipmentUnit>,
  valves: Record<string, ValveUnit>,
  sensors: Record<string, AnalogSensor>,
  pids: Record<string, PIDLoop>,
  demands: Record<DemandId, DemandSequencer>,
  nextSimTimeSec: number,
  noisePct: number,
  dt: number
): void {
  if (!equipment['B21F_P601A']) return;

  // =========================================================================
  // 1. B2 PCW STATION (4-Pump B2PCW Demand + P-602 H/L + PIT10601 Hysteresis)
  // =========================================================================
  const b2PcwDemand = stepDemandSequencer(demands.B2PCW, equipment, sensors, dt, 1);
  demands.B2PCW = b2PcwDemand.nextSeq;

  for (const tag of ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D']) {
    const u = equipment[tag];
    const want = u.mode === 'AUTO' ? b2PcwDemand.desiredAutoStartTags.has(tag) : u.cmdStart;
    equipment[tag] = advanceMotorStatus(u, want, pids['B21F_P601A_PID'].cvPct, dt);
  }

  // B21F_P602 Rejected PCW Pump: Auto High >= 85% -> RUN, Low <= 35% -> STOP
  const p602 = equipment['B21F_P602'];
  const p602AutoRun = evaluateP502TankLevelHysteresis(sensors['B21F_LT10601'], p602);
  equipment['B21F_P602'] = advanceMotorStatus(p602, p602.mode === 'AUTO' ? p602AutoRun : p602.cmdStart, null, dt);

  // PCW Suction Pressure Hysteresis -> XV10601 (Drain) & XV10602 (RO Makeup)
  const pcwHyst = evaluatePcwValveHysteresis(
    sensors['B21F_PIT10601'],
    valves['B21F_XV10601'],
    valves['B21F_XV10602']
  );
  valves['B21F_XV10601'] = stepValveStroke(valves['B21F_XV10601'], null, pcwHyst.xv10501AutoOpen, dt);
  valves['B21F_XV10602'] = stepValveStroke(valves['B21F_XV10602'], null, pcwHyst.xv10502AutoOpen, dt);
  valves['B21F_XV10603'] = stepValveStroke(valves['B21F_XV10603'], null, null, dt);
  valves['B21F_XV10604'] = stepValveStroke(valves['B21F_XV10604'], null, null, dt);
  valves['B21F_TCV10601'] = stepValveStroke(valves['B21F_TCV10601'], pids['B21F_TCV10601_PID'].cvPct, null, dt);
  valves['B21F_TCV10602'] = stepValveStroke(valves['B21F_TCV10602'], pids['B21F_TCV10602_PID'].cvPct, null, dt);

  // B2 PCW Hydraulics & Heat Exchange (coupled live to B5 CHW Supply B51F_CHSTS1!)
  const runningB2Pcw = ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'].filter(
    (t) => equipment[t].status === 'RUNNING'
  );
  const avgB2PcwHz =
    runningB2Pcw.length > 0
      ? runningB2Pcw.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningB2Pcw.length
      : 0;
  const b2PcwLoad = prev.sandbox.b2PcwToolLoadPct / 100;
  const b2DptTarget =
    runningB2Pcw.length > 0
      ? 2.85 * Math.pow(avgB2PcwHz / 50, 2) * (0.88 + 0.08 * runningB2Pcw.length) * (1.18 - 0.32 * b2PcwLoad)
      : 0.05;
  sensors['B21F_DPT10601'] = updateSensorPv(sensors['B21F_DPT10601'], b2DptTarget, 2.5, 0.03, nextSimTimeSec, noisePct, dt);

  const b2FitTarget = runningB2Pcw.length > 0 ? runningB2Pcw.length * 108 * (avgB2PcwHz / 50) * (0.8 + 0.35 * b2PcwLoad) : 0;
  sensors['B21F_FIT10601'] = updateSensorPv(sensors['B21F_FIT10601'], b2FitTarget, 2.5, 1.5, nextSimTimeSec, noisePct, dt);

  // Suction pressure PIT10601 responds to XV10602 (RO Makeup) & XV10601 (Drain)
  const makeupIn = valves['B21F_XV10602'].positionPct > 50 && prev.sandbox.diPackageConnected ? 0.045 : 0;
  const drainOut = valves['B21F_XV10601'].positionPct > 50 ? 0.07 : 0;
  const pit106Target = clamp(sensors['B21F_PIT10601'].pv + (makeupIn - drainOut - 0.004) * dt, 0.4, 3.4);
  sensors['B21F_PIT10601'] = updateSensorPv(sensors['B21F_PIT10601'], pit106Target, 1.5, 0.015, nextSimTimeSec, noisePct, dt);

  // Tank TK-601 level LT10601 responds to Drain XV10601 & Rejected Pump P-602
  const ltDelta =
    (valves['B21F_XV10601'].positionPct > 50 ? 1.8 : 0.04) -
    (equipment['B21F_P602'].status === 'RUNNING' ? 3.5 : 0);
  const lt106Target = clamp(sensors['B21F_LT10601'].pv + ltDelta * dt, 10, 96);
  sensors['B21F_LT10601'] = updateSensorPv(sensors['B21F_LT10601'], lt106Target, 1.5, 0.15, nextSimTimeSec, noisePct, dt);

  // HX E-601A & E-601B supply temperatures coupled live to B5 Chiller CHSTS1
  const chSupply = sensors['B51F_CHSTS1'].pv;
  const returnTempTarget = runningB2Pcw.length > 0 ? 22.0 + 2.5 + 3.2 * b2PcwLoad : 24.5;
  sensors['B21F_TT10603'] = updateSensorPv(sensors['B21F_TT10603'], returnTempTarget, 6.0, 0.12, nextSimTimeSec, noisePct, dt);

  const hxBase = sensors['B21F_TT10603'].pv;
  const tt10601Target = hxBase - (valves['B21F_TCV10601'].positionPct / 100) * Math.max(0, hxBase - chSupply) * 0.42;
  const tt10602Target = hxBase - (valves['B21F_TCV10602'].positionPct / 100) * Math.max(0, hxBase - chSupply) * 0.42;
  sensors['B21F_TT10601'] = updateSensorPv(sensors['B21F_TT10601'], tt10601Target, 4.0, 0.08, nextSimTimeSec, noisePct, dt);
  sensors['B21F_TT10602'] = updateSensorPv(sensors['B21F_TT10602'], tt10602Target, 4.0, 0.08, nextSimTimeSec, noisePct, dt);

  // =========================================================================
  // 2. B2 & B3 DI BRANCHES (PCV10704, PCV10705) & B2 PV END-OF-LINE (B23F_PIT1302)
  // =========================================================================
  valves['B22F_PCV10704'] = stepValveStroke(valves['B22F_PCV10704'], pids['B22F_PCV10704_PID'].cvPct, null, dt);
  const diDemand = prev.sandbox.diBranchDemandPct / 100;
  const diSupplyPress = prev.sandbox.diPackageConnected ? 4.8 : 0.2;
  const b2DiPitTarget = diSupplyPress * (0.28 + 0.78 * (valves['B22F_PCV10704'].positionPct / 100)) * (1.15 - 0.3 * diDemand);
  const b2DiFitTarget = prev.sandbox.diPackageConnected ? 36 * (valves['B22F_PCV10704'].positionPct / 100) * (0.55 + 0.75 * diDemand) : 0;
  sensors['B22F_PIT10704'] = updateSensorPv(sensors['B22F_PIT10704'], b2DiPitTarget, 2.0, 0.025, nextSimTimeSec, noisePct, dt);
  sensors['B22F_FIT10704'] = updateSensorPv(sensors['B22F_FIT10704'], b2DiFitTarget, 2.0, 0.35, nextSimTimeSec, noisePct, dt);

  if (valves['B31F_PCV10705']) {
    valves['B31F_PCV10705'] = stepValveStroke(valves['B31F_PCV10705'], pids['B31F_PCV10705_PID'].cvPct, null, dt);
    const b3DiPitTarget = diSupplyPress * (0.28 + 0.78 * (valves['B31F_PCV10705'].positionPct / 100)) * (1.14 - 0.28 * diDemand);
    const b3DiFitTarget = prev.sandbox.diPackageConnected ? 29 * (valves['B31F_PCV10705'].positionPct / 100) * (0.55 + 0.75 * diDemand) : 0;
    sensors['B31F_PIT10705'] = updateSensorPv(sensors['B31F_PIT10705'], b3DiPitTarget, 2.0, 0.025, nextSimTimeSec, noisePct, dt);
    sensors['B31F_FIT10705'] = updateSensorPv(sensors['B31F_FIT10705'], b3DiFitTarget, 2.0, 0.3, nextSimTimeSec, noisePct, dt);
  }

  // B2 PV End-of-Line tracks shared B51F_PIT1301 with realistic 1.2 kPa piping drop
  const b2PvTarget = clamp(sensors['B51F_PIT1301'].pv + 1.2, -98, 0);
  sensors['B23F_PIT1302'] = updateSensorPv(sensors['B23F_PIT1302'], b2PvTarget, 2.5, 0.3, nextSimTimeSec, noisePct, dt);

  // =========================================================================
  // 3. B2 FFUs, FCUs (+ XV Valves B21F_FCU01V..04V, B23F_FCU02V) & EXHAUST FANS
  // =========================================================================
  for (const tag of ['B21F_FFU01', 'B21F_FFU02', 'B21F_FFU03', 'B22F_FFU01']) {
    const u = equipment[tag];
    equipment[tag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, 72, dt);
  }

  for (const [fcuTag, vTag, rtTag, sp] of [
    ['B21F_FCU01', 'B21F_FCU01V', 'B21F_FCU01RT1', 23.0],
    ['B21F_FCU02', 'B21F_FCU02V', 'B21F_FCU02RT1', 23.2],
    ['B21F_FCU03', 'B21F_FCU03V', 'B21F_FCU03RT1', 23.5],
    ['B21F_FCU04', 'B21F_FCU04V', 'B21F_FCU04RT1', 22.8],
    ['B23F_FCU02', 'B23F_FCU02V', 'B23F_FCU02RT1', 23.0],
  ] as const) {
    const u = equipment[fcuTag];
    equipment[fcuTag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, null, dt);
    const isRun = equipment[fcuTag].status === 'RUNNING';
    if (valves[vTag]) {
      valves[vTag] = stepValveStroke(valves[vTag], null, isRun, dt);
    }
    const valveOpen = valves[vTag] ? valves[vTag].positionPct > 50 : true;
    const chwPenalty = Math.max(0, chSupply - 9.0) * 0.45;
    const rtTarget = isRun && valveOpen ? sp + chwPenalty : isRun ? 26.2 : 27.5;
    sensors[rtTag] = updateSensorPv(sensors[rtTag], rtTarget, 8.0, 0.15, nextSimTimeSec, noisePct, dt);
  }

  // B2 Process Exhaust VFDs (FA11001A..05A)
  const b2ExhPairs: [string, string][] = [
    ['B22F_FA11001A', 'B22F_FA11001A_PID'],
    ['B22F_FA11002A', 'B22F_FA11002A_PID'],
    ['B22F_FA11002C', 'B22F_FA11002C_PID'],
    ['B22F_FA11003A', 'B22F_FA11003A_PID'],
    ['B22F_FA11004A', 'B22F_FA11004A_PID'],
    ['B22F_FA11004B', 'B22F_FA11004B_PID'],
    ['B22F_FA11005A', 'B22F_FA11005A_PID'],
  ];
  for (const [eqTag, pidTag] of b2ExhPairs) {
    const u = equipment[eqTag];
    equipment[eqTag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, pids[pidTag].cvPct, dt);
  }

  const ratio = (t: string) => (equipment[t].status === 'RUNNING' ? equipment[t].frequencyHz / 50 : 0);
  sensors['B21F_PIT11003'] = updateSensorPv(sensors['B21F_PIT11003'], -0.76 * Math.pow(ratio('B22F_FA11001A'), 2), 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B21F_PIT11004'] = updateSensorPv(sensors['B21F_PIT11004'], -0.76 * Math.pow(ratio('B22F_FA11002A'), 2), 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B21F_PIT11005'] = updateSensorPv(sensors['B21F_PIT11005'], -0.76 * Math.pow(ratio('B22F_FA11002C'), 2), 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B21F_PIT11006'] = updateSensorPv(sensors['B21F_PIT11006'], -0.74 * Math.pow(ratio('B22F_FA11003A'), 2), 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  const exh2Ratio = (ratio('B22F_FA11004A') + ratio('B22F_FA11004B') + ratio('B22F_FA11005A')) / 3;
  sensors['B22F_PIT11001'] = updateSensorPv(sensors['B22F_PIT11001'], -0.74 * exh2Ratio * exh2Ratio, 2.5, 0.015, nextSimTimeSec, noisePct, dt);
  sensors['B21F_TIT11001'] = updateSensorPv(sensors['B21F_TIT11001'], prev.sandbox.ambientWetBulbC + 11.5, 10.0, 0.2, nextSimTimeSec, noisePct, dt);

  // Auxiliary DOL Exhaust / ERV / PAUCT / TEF fans
  for (const tag of [
    'B21F_EAF01', 'B21F_EAF02', 'B21F_EAF03', 'B22F_EAF01', 'B22F_EAF02',
    'B22F_ERV01', 'B22F_ERV02', 'B22F_ERV03', 'B22F_ERV04',
    'B22F_PAUCT01', 'B22F_PAUCT02', 'B22F_PAUCT03', 'B22F_PAUCT04', 'B22F_PAUO01',
    'B21F_TEF01', 'B21F_TEF02', 'B22F_TEF01', 'B22F_TEF02', 'B22F_TEF03', 'B23F_TEF01', 'B23F_TEF02',
  ]) {
    const u = equipment[tag];
    if (u) equipment[tag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, null, dt);
  }
}
