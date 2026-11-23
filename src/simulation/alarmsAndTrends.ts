import type {
  AlarmRecord,
  AnalogSensor,
  EquipmentUnit,
  PlantState,
  SensorAlarmLevel,
  TrendPoint,
} from '../types/scada.ts';

const MAX_TREND_POINTS = 360;
const MAX_ALARM_RECORDS = 500;

function formatSimTime(sec: number): string {
  const s = Math.floor(sec) % 60;
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatWinccDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatWinccTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

export function evaluateSensorAlarmLevel(sensor: AnalogSensor): SensorAlarmLevel {
  if (sensor.faulted) return 'FAULT';
  const { pv, alarms } = sensor;
  if (alarms.hhaEn && pv >= alarms.hhaSP) return 'HHA';
  if (alarms.llaEn && pv <= alarms.llaSP) return 'LLA';
  if (alarms.haEn && pv >= alarms.haSP) return 'HA';
  if (alarms.laEn && pv <= alarms.laSP) return 'LA';
  return 'NORMAL';
}

export function updateAlarmsAndTrends(
  prevState: PlantState,
  nextSensors: Record<string, AnalogSensor>,
  nextEquipment: Record<string, EquipmentUnit>,
  nextMeters: PlantState['meters'],
  nextSimTimeSec: number,
  nextTickCount: number,
  nextPids?: PlantState['pids']
): { alarms: AlarmRecord[]; trends: TrendPoint[] } {
  const alarms = prevState.alarms.map((a) => ({ ...a }));
  const nowDate = new Date();
  const dateStr = formatWinccDate(nowDate);
  const timeStr = formatWinccTime(nowDate);
  let maxMsgNo = alarms.reduce((mx, a) => Math.max(mx, a.number ?? 100), 100);

  const upsertAlarm = (
    tag: string,
    subsystem: AlarmRecord['subsystem'],
    severity: AlarmRecord['severity'],
    message: string,
    isActive: boolean
  ) => {
    const existingActiveIdx = alarms.findIndex(
      (a) => a.tag === tag && a.severity === severity && a.active
    );
    if (isActive && existingActiveIdx === -1) {
      maxMsgNo += 1;
      const alarmClass: AlarmRecord['alarmClass'] =
        severity === 'FAULT' || severity === 'HHA' || severity === 'LLA' ? 'ALARM' : 'WARNING';
      const building =
        tag.startsWith('B2') || tag.includes('_B2')
          ? 'B2'
          : tag.startsWith('B3') || tag.includes('_B3')
          ? 'B3'
          : 'B5';
      alarms.unshift({
        id: `${tag}-${severity}-${nextTickCount}-${maxMsgNo}`,
        number: maxMsgNo,
        building,
        timestamp: timeStr,
        cameInDate: dateStr,
        cameInTime: timeStr,
        wentOutTime: null,
        ackTime: null,
        simTimeSec: nextSimTimeSec,
        tag,
        subsystem,
        alarmClass,
        severity,
        message,
        state: 'CAME_IN',
        active: true,
        acknowledged: false,
      });
    } else if (!isActive && existingActiveIdx !== -1) {
      const target = alarms[existingActiveIdx];
      target.active = false;
      target.wentOutTime = timeStr;
      target.state = target.acknowledged ? 'WENT_OUT_ACK' : 'WENT_OUT';
    }
  };

  // Evaluate sensor alarms
  for (const tag of Object.keys(nextSensors)) {
    const s = nextSensors[tag];
    const lvl = evaluateSensorAlarmLevel(s);
    s.alarms = { ...s.alarms, activeLevel: lvl };

    const levels: ('FAULT' | 'HHA' | 'HA' | 'LA' | 'LLA')[] = ['FAULT', 'HHA', 'HA', 'LA', 'LLA'];
    for (const sev of levels) {
      const active = lvl === sev;
      const msg =
        sev === 'FAULT'
          ? `${s.label} Sensor Fault (PV held at last good value)`
          : `${s.label} ${sev} Alarm (${s.pv.toFixed(s.decimals)} ${s.unit})`;
      upsertAlarm(tag, s.subsystem, sev, msg, active);
    }
  }

  // Evaluate equipment faults
  for (const tag of Object.keys(nextEquipment)) {
    const eq = nextEquipment[tag];
    upsertAlarm(
      tag,
      eq.subsystem,
      'FAULT',
      `${eq.label} Trip / Hardware Fault`,
      eq.faulted
    );
  }

  // Evaluate third-party RO-DI Water Package connection status
  upsertAlarm(
    'B52F_RODI_COMM',
    'di',
    'FAULT',
    'Third-Party RO-DI Water Package Disconnected',
    !prevState.sandbox.diPackageConnected
  );

  const trimmedAlarms = alarms.slice(0, MAX_ALARM_RECORDS);

  // Record EVERY simulation tick (eliminates 2-tick Nyquist aliasing on fast VFD/PID oscillations!)
  const totalPlantKw =
    (nextMeters['PMDB_B5M2F_MDB51']?.activeKw ?? 0) +
    (nextMeters['PMDB_B5M2F_MDB52']?.activeKw ?? 0) +
    (nextMeters['PMDB_B5M2F_MDB53']?.activeKw ?? 0);

  const values: Record<string, number> = {
    B51F_CH11CHWP_HZ: nextEquipment['B51F_CH11CHWP']?.frequencyHz ?? 0,
    B51F_CT11CWP_HZ: nextEquipment['B51F_CT11CWP']?.frequencyHz ?? 0,
    B51F_CT11FN_HZ: nextEquipment['B51F_CT11FN']?.frequencyHz ?? 0,
    B5_TOTAL_KW: Number(totalPlantKw.toFixed(1)),
  };

  // Record ALL live analog sensors so EVERY sensor faceplate renders real history in its physical unit
  for (const sTag of Object.keys(nextSensors)) {
    values[sTag] = nextSensors[sTag].pv;
  }

  // Record ALL PID loops (Input SP, Output CV, Process PV) so EVERY PID faceplate renders live 3-pen trends
  const pidMap = nextPids ?? prevState.pids;
  for (const pTag of Object.keys(pidMap)) {
    const p = pidMap[pTag];
    values[`${pTag}__SP`] = p.sp;
    values[`${pTag}__CV`] = p.cvPct;
    values[`${pTag}__PV`] = nextSensors[p.sensorTag]?.pv ?? p.sp;
  }

  const point: TrendPoint = {
    simTimeSec: Number(nextSimTimeSec.toFixed(1)),
    wallMs: nowDate.getTime(),
    timeLabel: formatSimTime(nextSimTimeSec),
    values,
  };
  const trends = [...prevState.trends.slice(-(MAX_TREND_POINTS - 1)), point];

  return { alarms: trimmedAlarms, trends };
}
