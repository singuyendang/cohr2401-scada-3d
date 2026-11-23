import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Bell,
  Check,
  CheckCheck,
  Download,
  History,
  Radio,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import type { AlarmRecord, B5SubsystemId, BuildingId, WinccAlarmState } from '../types/scada.ts';

type SortField = 'time' | 'number' | 'building' | 'severity' | 'alarmClass' | 'tag' | 'state';
type SortDir = 'asc' | 'desc';

interface B5AlarmsScreenProps {
  mode: 'online' | 'history';
}

/**
 * WinCC Alarm Logging Color Rules (forensically extracted from COHR2401.mdf dbo.MSTypes Page 736 Slot 3):
 *  - CAME_IN      (Active, Unacknowledged):  BG #ff0000, Text #ffffff
 *  - WENT_OUT     (Cleared, Unacknowledged): BG #00ce00, Text #ffffff (stays in Online Alarm until ACK!)
 *  - CAME_IN_ACK  (Active, Acknowledged):    BG #249cff, Text #ffffff
 *  - WENT_OUT_ACK (Cleared, Acknowledged):   Archived in History Alarm only (BG #ffffff, Text #0f172a)
 */
const WINCC_ROW_STYLE: Record<WinccAlarmState, { bg: string; color: string; statusCode: string; statusLabel: string }> = {
  CAME_IN: {
    bg: '#ff0000',
    color: '#ffffff',
    statusCode: '+',
    statusLabel: 'Came In (Unack)',
  },
  WENT_OUT: {
    bg: '#00ce00',
    color: '#ffffff',
    statusCode: '-',
    statusLabel: 'Went Out (Unack)',
  },
  CAME_IN_ACK: {
    bg: '#249cff',
    color: '#ffffff',
    statusCode: '+*',
    statusLabel: 'Came In (ACK)',
  },
  WENT_OUT_ACK: {
    bg: '#ffffff',
    color: '#0f172a',
    statusCode: '-*',
    statusLabel: 'Went Out (ACK)',
  },
};

const SEV_RANK: Record<AlarmRecord['severity'], number> = {
  FAULT: 5,
  HHA: 4,
  LLA: 3,
  HA: 2,
  LA: 1,
};

function exportAlarmsCsv(rows: AlarmRecord[], mode: 'online' | 'history'): void {
  const header = [
    'Number',
    'Building',
    'Date',
    'CameInTime',
    'WentOutTime',
    'AckTime',
    'Status',
    'Class',
    'Severity',
    'Tag',
    'Subsystem',
    'Message',
  ];
  const escape = (v: string | number | null) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        r.number,
        r.building,
        r.cameInDate,
        r.cameInTime,
        r.wentOutTime ?? '',
        r.ackTime ?? '',
        WINCC_ROW_STYLE[r.state].statusLabel,
        r.alarmClass,
        r.severity,
        r.tag,
        r.subsystem,
        r.message,
      ]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `COHR2401_B5_${mode === 'online' ? 'OnlineAlarm' : 'HistoryAlarm'}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Scr_OnlineAlarm & Scr_AlarmSummary — WinCC AlarmControl
 *  - Exact COHR2401 WinCC Alarm Logging colors (#ff0000 Came In, #00ce00 Went Out Unack, #249cff ACK)
 *  - Online Alarm shows active alarms + unacknowledged cleared (Went Out) alarms
 *  - History Alarm shows full chronological archive including cleared & acknowledged alarms
 *  - Bottom-right page switch button between Online Alarm <-> History Alarm
 *  - ACK Single, ACK All, Sort by Type/Date/Severity/Tag/State, Filter, Search, Export CSV
 */
export const B5AlarmsScreen: React.FC<B5AlarmsScreenProps> = ({ mode }) => {
  const alarms = useB5Store((s) => s.plant.alarms);
  const acknowledgeAlarm = useB5Store((s) => s.acknowledgeAlarm);
  const acknowledgeAllAlarms = useB5Store((s) => s.acknowledgeAllAlarms);
  const clearAllFaults = useB5Store((s) => s.clearAllFaults);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bldgFilter, setBldgFilter] = useState<'ALL' | BuildingId>('ALL');
  const [sevFilter, setSevFilter] = useState<'ALL' | AlarmRecord['severity']>('ALL');
  const [classFilter, setClassFilter] = useState<'ALL' | AlarmRecord['alarmClass']>('ALL');
  const [subFilter, setSubFilter] = useState<'ALL' | B5SubsystemId>('ALL');
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Online Alarm: active OR unacknowledged (includes Came In, Came In ACK, and Went Out Unack!)
  // History Alarm: ALL alarms ever logged
  const scopedAlarms = useMemo(
    () => (mode === 'online' ? alarms.filter((a) => a.active || !a.acknowledged) : alarms),
    [alarms, mode]
  );

  const pendingCount = alarms.filter((a) => a.active).length;
  const toAckCount = alarms.filter((a) => !a.acknowledged).length;
  const wentOutUnackCount = alarms.filter((a) => !a.active && !a.acknowledged).length;

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = scopedAlarms.filter((a) => {
      if (bldgFilter !== 'ALL' && a.building !== bldgFilter) return false;
      if (sevFilter !== 'ALL' && a.severity !== sevFilter) return false;
      if (classFilter !== 'ALL' && a.alarmClass !== classFilter) return false;
      if (subFilter !== 'ALL' && a.subsystem !== subFilter) return false;
      if (q && !a.tag.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q) && !String(a.number).includes(q)) {
        return false;
      }
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortField) {
        case 'number':
          return (a.number - b.number) * dir;
        case 'building':
          return a.building.localeCompare(b.building) * dir;
        case 'severity':
          return (SEV_RANK[a.severity] - SEV_RANK[b.severity]) * dir;
        case 'alarmClass':
          return a.alarmClass.localeCompare(b.alarmClass) * dir;
        case 'tag':
          return a.tag.localeCompare(b.tag) * dir;
        case 'state':
          return a.state.localeCompare(b.state) * dir;
        case 'time':
        default:
          return (a.simTimeSec - b.simTimeSec || a.number - b.number) * dir;
      }
    });
  }, [scopedAlarms, bldgFilter, sevFilter, classFilter, subFilter, searchText, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'time' || field === 'number' || field === 'severity' ? 'desc' : 'asc');
    }
  };

  const selectedRecord = filtered.find((a) => a.id === selectedId) ?? null;
  const canAckSelected = Boolean(selectedRecord && !selectedRecord.acknowledged);

  const handleAckSingle = () => {
    if (selectedRecord && !selectedRecord.acknowledged) {
      acknowledgeAlarm(selectedRecord.id);
    }
  };

  return (
    <div className="p-3 h-full flex flex-col gap-2.5">
      {/* Authentic WinCC GraCS Screen Title Banner */}
      <div
        className={`w-full rounded border-2 px-4 py-1.5 text-center font-mono shadow-sm ${
          mode === 'online'
            ? 'bg-gradient-to-r from-[#fecaca] via-[#fee2e2] to-[#fca5a5] border-[#991b1b] text-[#7f1d1d]'
            : 'bg-gradient-to-r from-[#a5f3fc] via-[#e0f2fe] to-[#67e8f9] border-[#0369a1] text-[#00008b]'
        }`}
      >
        <div className="text-base font-black tracking-widest uppercase">
          {mode === 'online'
            ? 'ONLINE ALARM — COHR2401 SITE (B5 / B2 / B3)'
            : 'HISTORICAL ALARM — COHR2401 SITE (B5 / B2 / B3)'}
        </div>
        <div className="text-[10.5px] font-bold opacity-85">
          {mode === 'online'
            ? 'Scr_OnlineAlarm.Pdl · Live Pending & Unacknowledged Alarms'
            : 'Scr_AlarmSummary.Pdl · Complete Chronological Alarm Archive'}
        </div>
      </div>

      {/* Header Bar with Unified Top Mode Switcher (Online Alarm <-> History Alarm, synced with Trend) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Bell className={`w-4 h-4 ${mode === 'online' ? 'text-red-400' : 'text-sky-400'}`} />
              {mode === 'online'
                ? 'COHR2401 Site — Online Alarm (`Scr_OnlineAlarm`)'
                : 'COHR2401 Site — Historical Alarm (`Scr_AlarmSummary`)'}
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              {mode === 'online'
                ? 'Active alarms & unacknowledged cleared (Went Out) alarms per WinCC Alarm Logging'
                : 'Complete chronological history of all alarms including acknowledged & cleared events'}
            </p>
          </div>

          {/* Unified Online <-> Historical Segmented Switcher (same position & style as Trend) */}
          <div className="flex items-center bg-[#0d1626] border border-[#2a436b] rounded-md p-0.5 font-mono text-xs">
            <button
              onClick={() => setActiveScreen('b5_alarms_online')}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'online'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Online Alarm ({pendingCount + wentOutUnackCount})
            </button>
            <button
              onClick={() => setActiveScreen('b5_alarms_history')}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'history'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" /> History Alarm ({alarms.length})
            </button>
          </div>
        </div>

        {/* WinCC Alarm Logging Color Legend (verified from COHR2401.mdf Page 736) */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono font-bold">
          <span className="px-2 py-0.5 rounded border border-red-900" style={{ backgroundColor: '#ff0000', color: '#ffffff' }}>
            + Came In (Unack)
          </span>
          <span className="px-2 py-0.5 rounded border border-emerald-900" style={{ backgroundColor: '#00ce00', color: '#ffffff' }}>
            - Went Out (Unack)
          </span>
          <span className="px-2 py-0.5 rounded border border-blue-900" style={{ backgroundColor: '#249cff', color: '#ffffff' }}>
            +* Active (ACK)
          </span>
          <span className="px-2 py-0.5 rounded border border-slate-500 bg-white text-slate-900">
            -* Cleared (ACK)
          </span>
        </div>
      </div>

      {/* WinCC AlarmControl Toolbar: ACK Single, ACK All, Sort, Filter, Search, Export */}
      <div className="flex flex-wrap items-center gap-2 bg-[#dfe4ec] border-2 border-[#475569] rounded-lg px-2.5 py-2 font-mono text-xs text-slate-900">
        <button
          onClick={handleAckSingle}
          disabled={!canAckSelected}
          title="Select an unacknowledged alarm row and click to acknowledge"
          className="px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer border border-orange-800 shadow-2xs"
        >
          <Check className="w-3.5 h-3.5" /> ACK Single
        </button>

        <button
          onClick={acknowledgeAllAlarms}
          disabled={toAckCount === 0}
          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer border border-amber-900 shadow-2xs"
        >
          <CheckCheck className="w-3.5 h-3.5" /> ACK All ({toAckCount})
        </button>

        <button
          onClick={clearAllFaults}
          className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1 cursor-pointer border border-emerald-950 shadow-2xs"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Clear Faults
        </button>

        <span className="h-5 w-px bg-slate-400 mx-0.5" />

        {/* Building Filter (ALL / B5 / B2 / B3) */}
        <div className="flex rounded overflow-hidden border border-slate-500 bg-white shrink-0">
          {(['ALL', 'B5', 'B2', 'B3'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBldgFilter(b)}
              className={`px-1.5 py-0.5 text-[10.5px] font-black cursor-pointer ${
                bldgFilter === b ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-0.5">
          {(['ALL', 'FAULT', 'HHA', 'HA', 'LA', 'LLA'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSevFilter(sev)}
              className={`px-1.5 py-0.5 rounded font-bold text-[10.5px] cursor-pointer border ${
                sevFilter === sev
                  ? 'bg-slate-800 border-slate-950 text-white'
                  : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Class Filter */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value as 'ALL' | AlarmRecord['alarmClass'])}
          className="bg-white border border-slate-500 rounded px-1.5 py-1 text-[11px] text-slate-900 font-semibold"
        >
          <option value="ALL">All Classes</option>
          <option value="ALARM">Alarm (FAULT/HHA/LLA)</option>
          <option value="WARNING">Warning (HA/LA)</option>
        </select>

        {/* Subsystem Filter */}
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value as 'ALL' | B5SubsystemId)}
          className="bg-white border border-slate-500 rounded px-1.5 py-1 text-[11px] text-slate-900 font-semibold"
        >
          <option value="ALL">All Subsystems</option>
          <option value="chiller">Chiller & CT</option>
          <option value="heat_recovery">Heat Recovery</option>
          <option value="pcw">PCW</option>
          <option value="di">DI Water</option>
          <option value="oflac">OFLAC</option>
          <option value="ofrac">OFRAC</option>
          <option value="pv">Process Vacuum</option>
          <option value="ahu">AHU / PAU</option>
          <option value="exh">Exhaust</option>
        </select>

        {/* Sort Selector */}
        <div className="flex items-center gap-1">
          <ArrowDownUp className="w-3.5 h-3.5 text-slate-700" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-white border border-slate-500 rounded px-1.5 py-1 text-[11px] text-slate-900 font-semibold"
          >
            <option value="time">Sort: Date / Time</option>
            <option value="severity">Sort: Alarm Type</option>
            <option value="alarmClass">Sort: Class</option>
            <option value="state">Sort: Status</option>
            <option value="tag">Sort: Tag</option>
            <option value="number">Sort: Number</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="px-1.5 py-1 rounded bg-white border border-slate-500 text-[10.5px] font-bold hover:bg-slate-100 cursor-pointer"
            title="Toggle Ascending / Descending"
          >
            {sortDir === 'desc' ? 'DESC' : 'ASC'}
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-[230px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search tag / msg..."
            className="w-full pl-7 pr-2 py-1 rounded bg-white border border-slate-500 text-[11px] text-slate-900"
          />
        </div>

        {/* Export CSV */}
        <button
          onClick={() => exportAlarmsCsv(filtered, mode)}
          disabled={filtered.length === 0}
          className="ml-auto px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer border border-blue-950 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Authentic WinCC AlarmControl Grid */}
      <div className="flex-1 min-h-[340px] flex flex-col bg-[#f1f5f9] border-2 border-[#475569] rounded-lg overflow-hidden shadow-inner">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#e5e2d8] text-slate-900 text-[10.5px] border-b-2 border-slate-500 select-none">
                <th onClick={() => toggleSort('number')} className="px-2.5 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Number {sortField === 'number' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('building')} className="px-2 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Bldg {sortField === 'building' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('time')} className="px-2.5 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Date {sortField === 'time' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-2.5 py-1.5 border-r border-slate-400">Came In</th>
                <th className="px-2.5 py-1.5 border-r border-slate-400">Went Out</th>
                <th className="px-2.5 py-1.5 border-r border-slate-400">Ack Time</th>
                <th onClick={() => toggleSort('state')} className="px-2.5 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Status {sortField === 'state' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('severity')} className="px-2.5 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Type {sortField === 'severity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('tag')} className="px-2.5 py-1.5 border-r border-slate-400 cursor-pointer hover:bg-[#d8d4c8]">
                  Tag {sortField === 'tag' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-2.5 py-1.5 border-r border-slate-400">Message text</th>
                <th className="px-2 py-1.5 text-center">ACK</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-600 font-bold bg-white">
                    {mode === 'online'
                      ? 'No pending or unacknowledged alarms — Building 5 operating normally.'
                      : 'No historical alarms match the current filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const style = WINCC_ROW_STYLE[a.state];
                  const isSelected = a.id === selectedId;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      style={{ backgroundColor: style.bg, color: style.color }}
                      className={`border-b border-slate-300/80 cursor-pointer transition ${
                        isSelected ? 'outline-2 outline-slate-950 -outline-offset-2 brightness-95 font-black' : 'font-semibold'
                      }`}
                    >
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">{a.number}</td>
                      <td className="px-2 py-1.5 border-r border-black/15 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-black/25 font-black text-[10px]">{a.building}</span>
                      </td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">{a.cameInDate}</td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">{a.cameInTime}</td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">{a.wentOutTime ?? '—'}</td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">{a.ackTime ?? '—'}</td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-black/20 font-black mr-1">
                          {style.statusCode}
                        </span>
                        {style.statusLabel}
                      </td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-black/25 font-black text-[10px]">
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 border-r border-black/15 whitespace-nowrap font-black">{a.tag}</td>
                      <td className="px-2.5 py-1.5 border-r border-black/15">{a.message}</td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        {!a.acknowledged ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeAlarm(a.id);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-950 text-white text-[10px] font-bold border border-white/60 cursor-pointer"
                          >
                            ACK
                          </button>
                        ) : (
                          <span className="text-[11px] font-black">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Authentic WinCC AlarmControl Status Bar */}
        <div className="bg-[#d8dde6] border-t-2 border-slate-500 px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-emerald-800">Ready</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-400">
              Pending: <strong className="text-red-700">{pendingCount}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-400">
              To acknowledge: <strong className="text-amber-700">{toAckCount}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-400">
              Went Out (Unack): <strong className="text-emerald-700">{wentOutUnackCount}</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-400">
              List: <strong>{filtered.length}</strong> / {alarms.length}
            </span>
          </div>
          <span className="text-[10.5px] text-slate-600 font-semibold">
            {mode === 'online' ? 'Scr_OnlineAlarm.Pdl' : 'Scr_AlarmSummary.Pdl'}
          </span>
        </div>
      </div>
    </div>
  );
};
