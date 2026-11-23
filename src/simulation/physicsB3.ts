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
import { stepValveStroke } from './interlocks.ts';

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
  const startDuration = unit.kind === 'chiller' ? 2.0 : 0.5;
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
    loadPct: isRunning
      ? unit.kind === 'vfd'
        ? Number(((frequencyHz / 50) * 100).toFixed(1))
        : unit.kind === 'chiller'
        ? unit.loadPct || 55
        : 75
      : 0,
    runHours: isRunning ? Number((unit.runHours + dt / 3600).toFixed(4)) : unit.runHours,
    interlockOk: permissiveOk,
    interlockReason: reason,
    sttPerm: permissiveOk,
  };
}

/**
 * Steps all Building 3 (B3_PLC) subsystems:
 *  - Air-Cooled Chiller Plant (CH-21/22 + CH21/22CHV + CH21/22CHWP + BPMV — NO Cooling Towers!)
 *  - Hot Water Heat Fan Plant (HP-01/02/03 + HP01..03V + HPP21/22 + HPBPMV)
 *  - 8 PLC-Monitored FCUs + 8 XV Valves (coupled strictly to B31F_CHSTS1!)
 *  - Process Exhaust (FA-11101A/02A VFDs + FA-11103A DOL) & Aux Exhaust (EAF-01..05, TEF-01)
 */
export function stepBuilding3Subsystems(
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
  if (!equipment['B31F_CH21']) return;

  const ambientDryBulb = prev.sandbox.ambientWetBulbC + 8.5;

  // =========================================================================
  // 1. AIR-COOLED CHILLERS (CH-21/22) & CHWP DEMAND + INTERLOCKS
  // =========================================================================
  const b3ChRes = stepDemandSequencer(demands.B3CH, equipment, sensors, dt, 1);
  demands.B3CH = b3ChRes.nextSeq;
  const desiredChillers = b3ChRes.desiredAutoStartTags;

  const activeOrWantedCh = ['B31F_CH21', 'B31F_CH22'].filter((t) => {
    const u = equipment[t];
    if (!u || u.faulted) return false;
    return u.mode === 'AUTO' ? desiredChillers.has(t) : u.cmdStart;
  });
  const reqChCount = Math.max(1, activeOrWantedCh.length);

  const b3ChwpRes = stepDemandSequencer(demands.B3CHWP, equipment, sensors, dt, reqChCount);
  demands.B3CHWP = b3ChwpRes.nextSeq;

  const chwpCv = pids['B31F_CH21CHWP_PID'].cvPct;

  for (const n of [21, 22]) {
    const chTag = `B31F_CH${n}`;
    const chvTag = `${chTag}CHV`;
    const chwpTag = `${chTag}CHWP`;

    const ch = equipment[chTag];
    const chwp = equipment[chwpTag];
    const wantTrain = ch.mode === 'AUTO' ? desiredChillers.has(chTag) : ch.cmdStart;
    const wantChwp =
      chwp.mode === 'AUTO' ? wantTrain || b3ChwpRes.desiredAutoStartTags.has(chwpTag) : chwp.cmdStart;

    valves[chvTag] = stepValveStroke(valves[chvTag], null, wantTrain || wantChwp, dt);

    const chwpPerm = valves[chvTag].openFB && !valves[chvTag].faulted;
    equipment[chwpTag] = advanceMotorStatus(
      chwp,
      wantChwp,
      chwpPerm,
      chwpPerm ? `${chvTag} OpenFB OK` : `Waiting ${chvTag} OpenFB`,
      chwpCv,
      dt
    );

    const reasons: string[] = [];
    if (!valves[chvTag].openFB || valves[chvTag].faulted) reasons.push(`${chvTag} Not Open`);
    if (equipment[chwpTag].status !== 'RUNNING') reasons.push(`${chwpTag} Not Running`);
    const evapFlowOk =
      equipment[chwpTag].status === 'RUNNING' &&
      valves[chvTag].openFB &&
      sensors['B31F_CHWPS1'].pv >= 1.5;
    if (!evapFlowOk && equipment[chwpTag].status === 'RUNNING') reasons.push('Low CHW Header Press (<1.5 bar)');

    const chPerm = reasons.length === 0;
    equipment[chTag] = advanceMotorStatus(
      ch,
      wantTrain,
      chPerm,
      chPerm ? 'Air-Cooled Permissives OK' : reasons.join(' · '),
      null,
      dt
    );
    equipment[chTag].telemetry.evapFS = evapFlowOk ? 1 : 0;
  }

  // Manual-only B3 CHW Bypass Valve
  valves['B31F_BPMV'] = stepValveStroke(valves['B31F_BPMV'], null, null, dt);

  // B3 CHW Hydraulics
  const runningB3Chwps = ['B31F_CH21CHWP', 'B31F_CH22CHWP'].filter(
    (t) => equipment[t].status === 'RUNNING'
  );
  const avgChwpHz =
    runningB3Chwps.length > 0
      ? runningB3Chwps.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningB3Chwps.length
      : 0;
  const bpmvFactor = 1 - (valves['B31F_BPMV'].positionPct / 100) * 0.25;
  const chwpsTarget =
    runningB3Chwps.length > 0
      ? 6.06 * Math.pow(avgChwpHz / 50, 2) * (0.93 + 0.07 * runningB3Chwps.length) * bpmvFactor
      : 0.1;
  sensors['B31F_CHWPS1'] = updateSensorPv(sensors['B31F_CHWPS1'], chwpsTarget, 2.5, 0.03, nextSimTimeSec, noisePct, dt);
  sensors['B31F_BPPS1'] = updateSensorPv(sensors['B31F_BPPS1'], sensors['B31F_CHWPS1'].pv, 2.0, 0.025, nextSimTimeSec, noisePct, dt);
  sensors['B31F_BPPS2'] = updateSensorPv(sensors['B31F_BPPS2'], runningB3Chwps.length > 0 ? 0.9 : 0.1, 2.5, 0.02, nextSimTimeSec, noisePct, dt);

  // B3 Air-Cooled Chiller Thermodynamics (isolated from Building 5!)
  const runningB3Ch = ['B31F_CH21', 'B31F_CH22'].filter((t) => equipment[t].status === 'RUNNING');
  const b3AhuCwAvg =
    ((valves['B3M1F_AHU01_CWCV']?.positionPct ?? 55) + (valves['B3M1F_AHU02_CWCV']?.positionPct ?? 55)) / 2;
  const b3LoadFactor = (prev.sandbox.b3CoolingLoadPct * 0.75 + b3AhuCwAvg * 0.25) / 100;
  const requiredChUnits = b3LoadFactor * 1.12;
  const chLoadRatio = runningB3Ch.length > 0 ? requiredChUnits / runningB3Ch.length : 3.0;
  const chSupplySp = equipment['B31F_CH21'].telemetry.spTemp ?? 8.0;
  const chstsTarget =
    runningB3Ch.length > 0
      ? chSupplySp + Math.max(0, (chLoadRatio - 0.9) * 5.0) - Math.max(0, (0.42 - chLoadRatio) * 1.1)
      : 16.5;
  const chDeltaT = 2.0 + b3LoadFactor * 3.5;
  sensors['B31F_CHSTS1'] = updateSensorPv(sensors['B31F_CHSTS1'], chstsTarget, 5.0, 0.12, nextSimTimeSec, noisePct, dt);
  sensors['B31F_CHRTS2'] = updateSensorPv(sensors['B31F_CHRTS2'], sensors['B31F_CHSTS1'].pv + chDeltaT, 5.5, 0.12, nextSimTimeSec, noisePct, dt);
  sensors['B31F_BPTS3'] = updateSensorPv(sensors['B31F_BPTS3'], sensors['B31F_CHSTS1'].pv + 0.3, 4.0, 0.08, nextSimTimeSec, noisePct, dt);

  const perChFla = runningB3Ch.length > 0 ? clamp(chLoadRatio * 100, 24, 100) : 0;
  for (const n of [21, 22]) {
    const ch = equipment[`B31F_CH${n}`];
    if (ch.status === 'RUNNING') {
      ch.loadPct = Number(perChFla.toFixed(1));
      ch.telemetry.fla = ch.loadPct;
      ch.telemetry.chwrTemp = sensors['B31F_CHRTS2'].pv;
      ch.telemetry.condEWT = Number(ambientDryBulb.toFixed(1));
      ch.telemetry.evapPress = Number((3.0 + (sensors['B31F_CHSTS1'].pv - 7.0) * 0.15).toFixed(2));
      ch.telemetry.condPress = Number((10.2 + (ambientDryBulb - 28.0) * 0.32 + (ch.loadPct / 100) * 1.6).toFixed(2));
      ch.telemetry.oilDP = 2.3;
    } else {
      ch.loadPct = 0;
      ch.telemetry.fla = 0;
      ch.telemetry.oilDP = 0;
    }
  }

  // =========================================================================
  // 2. HOT WATER HEAT FAN PLANT (HP-01/02/03 + HP01..03V + HPP21/22 + HPBPMV)
  // =========================================================================
  const b3HpRes = stepDemandSequencer(demands.B3HP, equipment, sensors, dt, 1);
  demands.B3HP = b3HpRes.nextSeq;
  const desiredHps = b3HpRes.desiredAutoStartTags;

  let anyHpWanted = false;
  for (const n of ['01', '02', '03']) {
    const hpTag = `B31F_HP${n}`;
    const hpvTag = `${hpTag}V`;
    const hp = equipment[hpTag];
    const wantHp = hp.mode === 'AUTO' ? desiredHps.has(hpTag) : hp.cmdStart;
    if (wantHp && !hp.faulted) anyHpWanted = true;
    valves[hpvTag] = stepValveStroke(valves[hpvTag], null, wantHp, dt);
  }

  const anyHpvOpen = ['B31F_HP01V', 'B31F_HP02V', 'B31F_HP03V'].some(
    (v) => valves[v].openFB && !valves[v].faulted
  );
  const hppCv = pids['B31F_HPP21_PID'].cvPct;

  // Duty/Standby Hot Water Pumps (HPP-21 Lead, HPP-22 Standby failover on HPP-21 fault)
  const hpp21 = equipment['B31F_HPP21'];
  const hpp22 = equipment['B31F_HPP22'];
  const wantHpp21 = hpp21.mode === 'AUTO' ? anyHpWanted && !hpp21.faulted : hpp21.cmdStart;
  const wantHpp22 =
    hpp22.mode === 'AUTO'
      ? anyHpWanted && (hpp21.faulted || (hpp21.mode === 'MANUAL' && !hpp21.cmdStart))
      : hpp22.cmdStart;

  equipment['B31F_HPP21'] = advanceMotorStatus(
    hpp21,
    wantHpp21,
    anyHpvOpen,
    anyHpvOpen ? 'Heat Fan Valves OpenFB OK' : 'Waiting HP01..03V OpenFB',
    hppCv,
    dt
  );
  equipment['B31F_HPP22'] = advanceMotorStatus(
    hpp22,
    wantHpp22,
    anyHpvOpen,
    anyHpvOpen ? 'Heat Fan Valves OpenFB OK' : 'Waiting HP01..03V OpenFB',
    hppCv,
    dt
  );

  // Manual-only B3 HW Bypass Valve
  valves['B31F_HPBPMV'] = stepValveStroke(valves['B31F_HPBPMV'], null, null, dt);

  const runningHpps = ['B31F_HPP21', 'B31F_HPP22'].filter((t) => equipment[t].status === 'RUNNING');
  const hppRunning = runningHpps.length > 0;

  // Evaluate each Heat Fan permissives & status
  for (const n of ['01', '02', '03']) {
    const hpTag = `B31F_HP${n}`;
    const hpvTag = `${hpTag}V`;
    const hp = equipment[hpTag];
    const wantHp = hp.mode === 'AUTO' ? desiredHps.has(hpTag) : hp.cmdStart;

    const reasons: string[] = [];
    if (!valves[hpvTag].openFB || valves[hpvTag].faulted) reasons.push(`${hpvTag} Not Open`);
    if (!hppRunning) reasons.push('HPP-21/22 Not Running');
    if (hppRunning && sensors['B31F_HWPS1'].pv < 1.2) reasons.push('Low HW Press (<1.2 bar)');
    const hpPerm = reasons.length === 0;

    equipment[hpTag] = advanceMotorStatus(
      hp,
      wantHp,
      hpPerm,
      hpPerm ? 'Heat Fan Permissives OK' : reasons.join(' · '),
      null,
      dt
    );
    equipment[hpTag].telemetry.evapFS = hpPerm ? 1 : 0;
  }

  // B3 HW Hydraulics
  const avgHppHz =
    runningHpps.length > 0
      ? runningHpps.reduce((s, t) => s + equipment[t].frequencyHz, 0) / runningHpps.length
      : 0;
  const hpbpmvFactor = 1 - (valves['B31F_HPBPMV'].positionPct / 100) * 0.25;
  const hwpsTarget =
    runningHpps.length > 0
      ? 5.844 * Math.pow(avgHppHz / 50, 2) * (0.93 + 0.07 * runningHpps.length) * hpbpmvFactor
      : 0.15;
  sensors['B31F_HWPS1'] = updateSensorPv(sensors['B31F_HWPS1'], hwpsTarget, 2.5, 0.03, nextSimTimeSec, noisePct, dt);
  sensors['B31F_HPBPPS1'] = updateSensorPv(sensors['B31F_HPBPPS1'], sensors['B31F_HWPS1'].pv, 2.0, 0.025, nextSimTimeSec, noisePct, dt);
  sensors['B31F_HPBPPS2'] = updateSensorPv(sensors['B31F_HPBPPS2'], hppRunning ? 1.2 : 0.15, 2.5, 0.02, nextSimTimeSec, noisePct, dt);

  // B3 Heat Fan Thermodynamics (feeds B3M1F_AHU01/02 HWCV coils!)
  const runningHps = ['B31F_HP01', 'B31F_HP02', 'B31F_HP03'].filter((t) => equipment[t].status === 'RUNNING');
  const b3AhuHwAvg =
    ((valves['B3M1F_AHU01_HWCV']?.positionPct ?? 35) + (valves['B3M1F_AHU02_HWCV']?.positionPct ?? 35)) / 2;
  const hpReqUnits = 0.72 + (b3AhuHwAvg / 100) * 1.1;
  const hpLoadRatio = runningHps.length > 0 ? hpReqUnits / runningHps.length : 3.0;
  const hpSupplySp = equipment['B31F_HP01'].telemetry.spTemp ?? 45.0;
  const hpstsTarget =
    runningHps.length > 0
      ? hpSupplySp - Math.max(0, (hpLoadRatio - 0.92) * 5.0) + Math.max(0, (0.4 - hpLoadRatio) * 1.0)
      : 28.0;
  const hpDeltaT = runningHps.length > 0 ? 2.6 + (b3AhuHwAvg / 100) * 5.2 : 0.5;
  sensors['B31F_HPSTS1'] = updateSensorPv(sensors['B31F_HPSTS1'], hpstsTarget, 5.0, 0.12, nextSimTimeSec, noisePct, dt);
  sensors['B31F_HPRTS2'] = updateSensorPv(sensors['B31F_HPRTS2'], sensors['B31F_HPSTS1'].pv - hpDeltaT, 5.5, 0.12, nextSimTimeSec, noisePct, dt);
  sensors['B31F_HPBPTS3'] = updateSensorPv(sensors['B31F_HPBPTS3'], sensors['B31F_HPSTS1'].pv - 0.6, 4.0, 0.08, nextSimTimeSec, noisePct, dt);

  const perHpFla = runningHps.length > 0 ? clamp(hpLoadRatio * 100, 26, 100) : 0;
  for (const n of ['01', '02', '03']) {
    const hp = equipment[`B31F_HP${n}`];
    if (hp.status === 'RUNNING') {
      hp.loadPct = Number(perHpFla.toFixed(1));
      hp.telemetry.fla = hp.loadPct;
      hp.telemetry.condEWT = sensors['B31F_HPRTS2'].pv;
      hp.telemetry.chwrTemp = sensors['B31F_HPRTS2'].pv;
      hp.telemetry.evapPress = Number((4.1 + (ambientDryBulb - 28.0) * 0.12).toFixed(2));
      hp.telemetry.condPress = Number((12.4 + (sensors['B31F_HPSTS1'].pv - 42.0) * 0.35).toFixed(2));
      hp.telemetry.oilDP = 2.1;
    } else {
      hp.loadPct = 0;
      hp.telemetry.fla = 0;
      hp.telemetry.oilDP = 0;
    }
  }

  // =========================================================================
  // 3. BUILDING 3 8 PLC-MONITORED FCUs (+ XV VALVES, COUPLED TO B31F_CHSTS1!)
  // =========================================================================
  const b3ChSupply = sensors['B31F_CHSTS1'].pv;
  for (const [fcuTag, vTag, rtTag, sp] of [
    ['B31F_FCU03', 'B31F_FCU03V', 'B31F_FCU03RT1', 23.2],
    ['B3M1F_FCU01', 'B3M1F_FCU01V', 'B3M1F_FCU01RT1', 23.0],
    ['B3M1F_FCU02', 'B3M1F_FCU02V', 'B3M1F_FCU02RT1', 23.0],
    ['B3M1F_FCU03', 'B3M1F_FCU03V', 'B3M1F_FCU03RT1', 22.8],
    ['B3M1F_FCU04', 'B3M1F_FCU04V', 'B3M1F_FCU04RT1', 22.5],
    ['B3M1F_FCU05', 'B3M1F_FCU05V', 'B3M1F_FCU05RT1', 22.5],
    ['B3M1F_FCU06', 'B3M1F_FCU06V', 'B3M1F_FCU06RT1', 23.5],
    ['B3M1F_FCU07', 'B3M1F_FCU07V', 'B3M1F_FCU07RT1', 23.4],
  ] as const) {
    const u = equipment[fcuTag];
    equipment[fcuTag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, true, 'FCU Ready', null, dt);
    const isRun = equipment[fcuTag].status === 'RUNNING';
    if (valves[vTag]) {
      valves[vTag] = stepValveStroke(valves[vTag], null, isRun, dt);
    }
    const valveOpen = valves[vTag] ? valves[vTag].positionPct > 50 : true;
    const chwPenalty = Math.max(0, b3ChSupply - 9.0) * 0.45;
    const rtTarget = isRun && valveOpen ? sp + chwPenalty : isRun ? 26.2 : 27.5;
    sensors[rtTag] = updateSensorPv(sensors[rtTag], rtTarget, 8.0, 0.12, nextSimTimeSec, noisePct, dt);
  }

  // =========================================================================
  // 4. BUILDING 3 EXHAUST FANS (FA-11101A/02A VFDs, FA-11103A DOL, EAF/TEF)
  // =========================================================================
  for (const [eqTag, pidTag] of [
    ['B3M1F_FA11101A', 'B3M1F_FA11101A_PID'],
    ['B3M1F_FA11102A', 'B3M1F_FA11102A_PID'],
  ] as const) {
    const u = equipment[eqTag];
    equipment[eqTag] = advanceMotorStatus(
      u,
      u.mode === 'AUTO' ? !u.faulted : u.cmdStart,
      true,
      'EXH Ready',
      pids[pidTag].cvPct,
      dt
    );
  }

  const ratio = (t: string) => (equipment[t].status === 'RUNNING' ? equipment[t].frequencyHz / 50 : 0);
  sensors['B3M1F_PIT11101'] = updateSensorPv(
    sensors['B3M1F_PIT11101'],
    -0.76 * Math.pow(ratio('B3M1F_FA11101A'), 2),
    2.5,
    0.015,
    nextSimTimeSec,
    noisePct,
    dt
  );
  sensors['B3M1F_PIT11102'] = updateSensorPv(
    sensors['B3M1F_PIT11102'],
    -0.746 * Math.pow(ratio('B3M1F_FA11102A'), 2),
    2.5,
    0.015,
    nextSimTimeSec,
    noisePct,
    dt
  );

  for (const tag of [
    'B3M1F_FA11103A',
    'B31F_EAF01',
    'B31F_EAF02',
    'B31F_EAF03',
    'B31F_EAF04',
    'B31F_EAF05',
    'B31F_TEF01',
  ]) {
    const u = equipment[tag];
    if (u) equipment[tag] = advanceMotorStatus(u, u.mode === 'AUTO' ? !u.faulted : u.cmdStart, true, 'OK', null, dt);
  }
}
