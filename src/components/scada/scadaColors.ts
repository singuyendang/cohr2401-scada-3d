import type { AnalogSensor, EquipmentStatus, ValveUnit } from '../../types/scada.ts';

export function statusColor(status: EquipmentStatus): string {
  switch (status) {
    case 'RUNNING':
      return '#22c55e';
    case 'STARTING':
    case 'STOPPING':
      return '#2563eb';
    case 'FAULTED':
      return '#ef4444';
    case 'STOPPED':
    default:
      return '#64748b';
  }
}

export function valveColor(valve: ValveUnit): string {
  if (valve.faulted) return '#ef4444';
  if (valve.kind === 'XVAL') {
    if (valve.openFB) return '#22c55e';
    if (valve.closeFB) return '#64748b';
    return '#f59e0b';
  }
  return valve.positionPct > 2 ? '#22c55e' : '#64748b';
}

export function sensorAlarmColor(sensor: AnalogSensor): string {
  const lvl = sensor.alarms.activeLevel;
  if (lvl === 'FAULT' || lvl === 'HHA' || lvl === 'LLA') return '#ef4444';
  if (lvl === 'HA' || lvl === 'LA') return '#f59e0b';
  return '#38bdf8';
}
