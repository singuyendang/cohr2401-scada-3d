import type { EquipmentUnit, ValveUnit, AnalogSensor } from '../types/scada.ts';
import { clamp } from './pid.ts';

/**
 * Advances valve actuator stroke (XVAL ~25%/s -> ~4s full stroke; CVAL ~20%/s).
 * Strictly enforces manualOnly on BPMV, HBPMV, HEMV, XV10503, XV10504.
 */
export function stepValveStroke(valve: ValveUnit, autoTargetPct: number | null, autoCmdOpen: boolean | null, dt: number): ValveUnit {
  const effectiveMode = valve.manualOnly ? 'MANUAL' : valve.mode;
  let targetPct = valve.targetPct;
  let cmdOpen = valve.cmdOpen;

  if (effectiveMode === 'AUTO') {
    if (valve.kind === 'XVAL' && autoCmdOpen !== null) {
      cmdOpen = autoCmdOpen;
      targetPct = autoCmdOpen ? 100 : 0;
    } else if (valve.kind === 'CVAL' && autoTargetPct !== null) {
      targetPct = clamp(autoTargetPct, 0, 100);
    }
  } else if (valve.kind === 'XVAL') {
    targetPct = valve.cmdOpen ? 100 : 0;
  }

  let positionPct = valve.positionPct;
  if (!valve.faulted) {
    const strokeRate = valve.kind === 'XVAL' ? 35 : 28; // % per second
    const maxStep = strokeRate * dt;
    const diff = targetPct - positionPct;
    if (Math.abs(diff) <= maxStep) {
      positionPct = targetPct;
    } else {
      positionPct += Math.sign(diff) * maxStep;
    }
    positionPct = Number(clamp(positionPct, 0, 100).toFixed(1));
  }

  return {
    ...valve,
    mode: effectiveMode,
    cmdOpen,
    targetPct: Number(clamp(targetPct, 0, 100).toFixed(1)),
    positionPct,
    openFB: positionPct >= 95,
    closeFB: positionPct <= 5,
  };
}

/**
 * Evaluates Chilled Water & Condenser start/stop interlock chain for B51F_CH11..13:
 *  Evaporator side: CHxxCHV OpenFB -> CHxxCHWP Running -> DPT10501 / Flow permissive
 *  Condenser side:  >=2 CT (IV/OV OpenFB + CT Fan Running) -> CHxxCDV OpenFB -> >=1 CWP Running -> PIT10505 permissive
 */
export function evaluateChillerPermissives(
  chillerTag: string,
  equipment: Record<string, EquipmentUnit>,
  valves: Record<string, ValveUnit>,
  sensors: Record<string, AnalogSensor>
): { interlockOk: boolean; sttPerm: boolean; reason: string; evapFs: boolean } {
  const chvTag = `${chillerTag}CHV`;
  const cdvTag = `${chillerTag}CDV`;
  const chwpTag = `${chillerTag}CHWP`;

  const chv = valves[chvTag];
  const cdv = valves[cdvTag];
  const chwp = equipment[chwpTag];
  const chwps = sensors['B51F_CHWPS1'];
  const cwpPit = sensors['B51F_PIT10505'];

  // Heat recovery chiller CH14 has its own hot-loop pumps (CH11HWP + CH14CHWP) and does NOT require Cooling Towers
  if (chillerTag === 'B51F_CH14') {
    const hwp = equipment['B51F_CH11HWP'];
    const ch14Chwp = equipment['B51F_CH14CHWP'];
    const hwpOk = Boolean(hwp && hwp.status === 'RUNNING' && !hwp.faulted);
    const coldPumpOk = Boolean(ch14Chwp && ch14Chwp.status === 'RUNNING' && !ch14Chwp.faulted);
    const chvOk = Boolean(chv && chv.openFB && !chv.faulted);
    const cdvOk = Boolean(cdv && cdv.openFB && !cdv.faulted);
    const hbpPressOk = (sensors['B51F_HBPPS1']?.pv ?? 0) >= 1.2;

    const reasons: string[] = [];
    if (!chvOk) reasons.push(`${chvTag} not open`);
    if (!cdvOk) reasons.push(`${cdvTag} not open`);
    if (!hwpOk) reasons.push('B51F_CH11HWP stopped');
    if (!coldPumpOk) reasons.push('B51F_CH14CHWP stopped');
    if (!hbpPressOk) reasons.push('Hot loop pressure low');

    const ok = reasons.length === 0;
    return {
      interlockOk: ok,
      sttPerm: ok,
      reason: ok ? 'Permissive OK (Heat Recovery)' : reasons.join('; '),
      evapFs: chvOk && coldPumpOk,
    };
  }

  const chvOk = Boolean(chv && chv.openFB && !chv.faulted);
  const cdvOk = Boolean(cdv && cdv.openFB && !cdv.faulted);
  const chwpOk = Boolean(chwp && chwp.status === 'RUNNING' && !chwp.faulted);
  const evapPressOk = (chwps?.pv ?? 0) >= 1.5;

  const runningCwpCount = ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'].filter(
    (t) => equipment[t]?.status === 'RUNNING' && !equipment[t]?.faulted
  ).length;
  const cwpPressOk = (cwpPit?.pv ?? 0) >= 1.2;

  const activeCtCount = [11, 12, 13, 14, 15, 16, 17, 18, 19].filter((n) => {
    const iv = valves[`B51F_CT${n}IV`];
    const ov = valves[`B51F_CT${n}OV`];
    const fn = equipment[`B51F_CT${n}FN`];
    return iv?.openFB && ov?.openFB && fn?.status === 'RUNNING' && !fn.faulted;
  }).length;

  const reasons: string[] = [];
  if (!chvOk) reasons.push(`${chvTag} OpenFB missing`);
  if (!chwpOk) reasons.push(`${chwpTag} not running`);
  if (!evapPressOk) reasons.push('B51F_CHWPS1 < 1.5 bar');
  if (!cdvOk) reasons.push(`${cdvTag} OpenFB missing`);
  if (runningCwpCount < 1) reasons.push('No CWP running');
  if (!cwpPressOk) reasons.push('B51F_PIT10505 < 1.2 bar');
  if (activeCtCount < 2) reasons.push(`CT active (${activeCtCount}) < min 2`);

  const ok = reasons.length === 0;
  return {
    interlockOk: ok,
    sttPerm: ok,
    reason: ok ? 'All Evaporator & Condenser Permissives OK' : reasons.join('; '),
    evapFs: chvOk && chwpOk,
  };
}

/**
 * Evaluates PCW pump inlet pressure B51F_PIT10501 hysteresis for XV10502 (DI Makeup) & XV10501 (Drain):
 *  - XV10502 (DI Makeup): Open when PIT10501 < L (1.8 bar), Close when PIT10501 > H (2.2 bar)
 *  - XV10501 (Drain):     Open when PIT10501 > HH (2.6 bar), Close when PIT10501 < H (2.2 bar)
 *  - XV10503 & XV10504:   Strictly Manual-only
 */
export function evaluatePcwValveHysteresis(
  pit10501: AnalogSensor,
  xv10501: ValveUnit,
  xv10502: ValveUnit
): { xv10501AutoOpen: boolean; xv10502AutoOpen: boolean } {
  const pv = pit10501.pv;
  const lowSP = pit10501.alarms.laSP; // 1.8 bar
  const highSP = pit10501.alarms.haSP; // 2.2 bar
  const hhSP = pit10501.alarms.hhaSP; // 2.6 bar

  let xv10502AutoOpen = xv10502.cmdOpen;
  if (pv < lowSP) xv10502AutoOpen = true;
  else if (pv > highSP) xv10502AutoOpen = false;

  let xv10501AutoOpen = xv10501.cmdOpen;
  if (pv > hhSP) xv10501AutoOpen = true;
  else if (pv < highSP) xv10501AutoOpen = false;

  return { xv10501AutoOpen, xv10502AutoOpen };
}

/**
 * Evaluates TK-501 Rejected PCW Sump Pump B51F_P502 Auto level hysteresis on B51F_LT10501:
 *  - Start when LT10501 >= High (haSP, default 85%)
 *  - Stop when LT10501 <= Low (laSP, default 35%)
 *  - Latch previous state between Low and High
 */
export function evaluateP502TankLevelHysteresis(
  lt10501: AnalogSensor,
  p502: EquipmentUnit
): boolean {
  const pv = lt10501.pv;
  const highSP = lt10501.alarms.haSP; // 85%
  const lowSP = lt10501.alarms.laSP; // 35%

  if (pv >= highSP) return true;
  if (pv <= lowSP) return false;
  return p502.cmdStart;
}
