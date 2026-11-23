import type { PIDLoop } from '../types/scada.ts';

export const VFD_MAX_HZ = 50.0;
export const VFD_MIN_RATIO = 0.3; // 30% of 50 Hz = 15.0 Hz (Constitution Principle I)
export const VFD_MIN_HZ = VFD_MAX_HZ * VFD_MIN_RATIO; // 15.0 Hz

export function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

/**
 * Maps a 0..100% PID CV output to VFD frequency in Hz.
 * Enforces the project-wide COHR2401 minimum running frequency floor of 15.0 Hz (30% of 50 Hz).
 */
export function cvToVfdHz(cvPct: number, isRunning: boolean): number {
  if (!isRunning) return 0.0;
  const rawHz = (clamp(cvPct, 0, 100) / 100) * VFD_MAX_HZ;
  return Number(clamp(rawHz, VFD_MIN_HZ, VFD_MAX_HZ).toFixed(2));
}

/**
 * Clamps a Manual VFD setpoint while running to [15.0, 50.0] Hz.
 */
export function manualSpToVfdHz(manualSpHz: number, isRunning: boolean): number {
  if (!isRunning) return 0.0;
  return Number(clamp(manualSpHz, VFD_MIN_HZ, VFD_MAX_HZ).toFixed(2));
}

/**
 * Advances a discrete PID controller (P + I + D) by dt seconds with anti-windup and sensor-fault freeze.
 * Clamps CV strictly to [autoOutMinPct, autoOutMaxPct] for BOTH modulating valves AND VFD motors in Auto mode.
 */
export function stepPidLoop(
  loop: PIDLoop,
  pv: number,
  sensorFaulted: boolean,
  dt: number
): PIDLoop {
  const minFloor = loop.isValvePid ? 0 : VFD_MIN_RATIO * 100; // VFD auto floor 30% (15.0 Hz), valve 0%
  const outMin = clamp(loop.autoOutMinPct, minFloor, 100);
  const outMax = clamp(loop.autoOutMaxPct, outMin, 100);

  // FDS rule: When sensor is faulted, hold last safe output instead of runaway oscillation.
  if (sensorFaulted || dt <= 0 || !Number.isFinite(pv)) {
    return {
      ...loop,
      cvPct: Number(clamp(loop.cvPct, outMin, outMax).toFixed(2)),
    };
  }

  // Error sign:
  // reverseActing = true  => PV < SP demands MORE output (pressure boost, heating)
  // reverseActing = false => PV > SP demands MORE output (cooling tower fans, cooling valves)
  const error = loop.reverseActing ? loop.sp - pv : pv - loop.sp;

  const pTerm = loop.kp * error;
  const candidateIntegral = clamp(loop.integral + loop.ki * error * dt, outMin, outMax);

  // Siemens PID_Compact style Derivative-on-PV with 1st-order low-pass filter (tau_d = 1.5s)
  // Prevents setpoint derivative kick & high-frequency sensor noise amplification
  const prevPv = loop.lastPv ?? pv;
  const pvRate = (pv - prevPv) / dt;
  const signedDeriv = loop.reverseActing ? -pvRate : pvRate;
  const alphaD = clamp(dt / (1.5 + dt), 0, 1);
  const nextDFiltered = (loop.dFiltered ?? 0) + alphaD * (signedDeriv - (loop.dFiltered ?? 0));
  const dTerm = loop.kd > 0 ? clamp(loop.kd * nextDFiltered, -15, 15) : 0;

  const rawOut = pTerm + candidateIntegral + dTerm;
  const clampedOut = clamp(rawOut, outMin, outMax);

  // Conditional integration anti-windup
  const saturatedHigh = rawOut > outMax && error > 0;
  const saturatedLow = rawOut < outMin && error < 0;
  const nextIntegral = saturatedHigh || saturatedLow ? loop.integral : candidateIntegral;

  return {
    ...loop,
    integral: Number(nextIntegral.toFixed(4)),
    lastError: Number(error.toFixed(4)),
    lastPv: Number(pv.toFixed(4)),
    dFiltered: Number(nextDFiltered.toFixed(4)),
    cvPct: Number(clampedOut.toFixed(2)),
  };
}
