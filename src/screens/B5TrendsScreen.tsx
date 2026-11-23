import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  History,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useB5Store } from '../store/b5Store.ts';
import type { AnalogSensor, TrendPoint } from '../types/scada.ts';

interface B5TrendsScreenProps {
  mode: 'online' | 'history';
}

type OnlineTimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

const UNIT_MULTIPLIER_MS: Record<OnlineTimeUnit, number> = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 3600 * 1000,
  days: 24 * 3600 * 1000,
};

const PEN_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#ea580c', // Orange
  '#7c3aed', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#854d0e', // Brown
];

interface CatalogEntry {
  tag: string;
  label: string;
  building: 'B5' | 'B3' | 'B2';
  subsystem: string;
  unit: string;
}

function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mi}:${ss}`;
}

function parseDateTimeInputs(dateStr: string, timeStr: string): number {
  const normTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr || '00:00:00';
  const parsed = new Date(`${dateStr}T${normTime}`).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function hashTag(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function formatAxisLabel(ms: number, durationMs: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  if (durationMs <= 2 * 3600 * 1000) return `${hh}:${mi}:${ss}`;
  if (durationMs <= 3 * 24 * 3600 * 1000) return `${dd}/${mm} ${hh}:${mi}`;
  return `${dd}/${mm} ${hh}:00`;
}

function formatFullDateTime(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

/**
 * Generates deterministic, physically realistic historical trend series across any operator-selected
 * [startMs, endMs] window (matching WinCC Historical Trend Time Axis start/end selector).
 */
function buildHistoricalSeries(
  tags: string[],
  sensors: Record<string, AnalogSensor>,
  liveTrends: TrendPoint[],
  startMs: number,
  endMs: number
): TrendPoint[] {
  const safeEnd = Math.max(endMs, startMs + 1000);
  const durationMs = safeEnd - startMs;
  const points = 150;
  const stepMs = durationMs / Math.max(1, points - 1);
  const nowMs = Date.now();
  const nearNow = Math.abs(nowMs - safeEnd) < 90_000;
  const out: TrendPoint[] = [];

  // Scale wave cycles smoothly with chosen duration
  const durationHours = durationMs / (3600 * 1000);
  const primaryCycles = Math.max(2, Math.min(20, durationHours < 2 ? 3 : durationHours / 6));

  for (let i = 0; i < points; i++) {
    const tMs = startMs + i * stepMs;
    const frac = i / Math.max(1, points - 1);
    const values: Record<string, number> = {};

    for (const tag of tags) {
      const s = sensors[tag];
      if (!s) continue;
      const liveVal = s.pv;
      const seed = hashTag(tag);
      const phase1 = (seed % 360) * (Math.PI / 180);
      const phase2 = ((seed >> 4) % 360) * (Math.PI / 180);
      const span = Math.max(0.2, s.maxRange - s.minRange);
      const amp = Math.min(span * 0.045, Math.max(0.08, Math.abs(liveVal) * 0.035));

      if (nearNow && i === points - 1 && liveTrends.length > 0) {
        values[tag] = liveTrends[liveTrends.length - 1].values[tag] ?? liveVal;
      } else {
        // Anchored to absolute wall-clock tMs so moving the Start/End range pans consistently!
        const tSec = tMs / 1000;
        const envelope = nearNow ? 1 - Math.pow(frac, 5) : 1;
        const wave =
          Math.sin((tSec / Math.max(60, durationMs / 1000 / primaryCycles)) * Math.PI * 2 + phase1) * 0.65 +
          Math.sin((tSec / Math.max(15, durationMs / 1000 / 17)) * Math.PI * 2 + phase2) * 0.25 +
          Math.cos((tSec / Math.max(5, durationMs / 1000 / 35)) * Math.PI * 2 + phase1 * 1.7) * 0.1;
        const val = liveVal + wave * amp * envelope;
        values[tag] = Number(Math.max(s.minRange, Math.min(s.maxRange, val)).toFixed(s.decimals + 1));
      }
    }

    out.push({
      simTimeSec: Math.round(tMs / 1000),
      wallMs: tMs,
      timeLabel: formatFullDateTime(tMs),
      values,
    });
  }
  return out;
}

function exportTrendCsv(data: TrendPoint[], tags: string[], mode: 'online' | 'history'): void {
  const header = ['Timestamp', ...tags];
  const lines = [
    header.join(','),
    ...data.map((pt) => [pt.timeLabel, ...tags.map((t) => pt.values[t] ?? '')].join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `COHR2401_B5_${mode === 'online' ? 'OnlineTrend' : 'HistoricalTrend'}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Scr_OnlineTrend & Scr_HistoricalTrend — WinCC Trend Controls
 *  - Unified top Online <-> Historical switcher (identical to Alarm screen)
 *  - Searchable Multi-Building Analog Input Tag Browser (B5 / B3 / B2)
 *  - Online Trend: configurable rolling time window (number + Seconds/Minutes/Hours/Days back from Now);
 *    resets plotted curve upon leaving/re-entering Online Trend while preserving selected tags
 *  - Historical Trend: WinCC-style Start & End calendar + HH:mm:ss time range selector
 */
export const B5TrendsScreen: React.FC<B5TrendsScreenProps> = ({ mode }) => {
  const plant = useB5Store((s) => s.plant);
  const selectedTags = useB5Store((s) => s.selectedTrendTags);
  const addTrendTag = useB5Store((s) => s.addTrendTag);
  const removeTrendTag = useB5Store((s) => s.removeTrendTag);
  const setSelectedTrendTags = useB5Store((s) => s.setSelectedTrendTags);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  // Online Trend session start marker (resets automatically whenever Online Trend mounts fresh!)
  const [sessionStartSimSec, setSessionStartSimSec] = useState<number>(() => plant.simTimeSec);
  const [onlineAmount, setOnlineAmount] = useState<number>(60);
  const [onlineUnit, setOnlineUnit] = useState<OnlineTimeUnit>('seconds');
  const [frozen, setFrozen] = useState(false);
  const [frozenState, setFrozenState] = useState<{ points: TrendPoint[]; endMs: number } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Historical Trend WinCC Start/End Date + Time (HH:mm:ss) Picker
  const [initNowMs] = useState<number>(() => Date.now());
  const [startDate, setStartDate] = useState<string>(() => toDateInputValue(initNowMs - 3600 * 1000));
  const [startTime, setStartTime] = useState<string>(() => toTimeInputValue(initNowMs - 3600 * 1000));
  const [endDate, setEndDate] = useState<string>(() => toDateInputValue(initNowMs));
  const [endTime, setEndTime] = useState<string>(() => toTimeInputValue(initNowMs));
  const [appliedRange, setAppliedRange] = useState<{ startMs: number; endMs: number }>(() => ({
    startMs: initNowMs - 3600 * 1000,
    endMs: initNowMs,
  }));
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Searchable Multi-Building Analog Input Tag Browser State (ALL shows B5 + B2 live!)
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState<'ALL' | 'B5' | 'B3' | 'B2'>('ALL');
  const [subFilter, setSubFilter] = useState<string>('ALL');

  const catalog: CatalogEntry[] = useMemo(
    () =>
      Object.values(plant.sensors)
        .sort((a, b) => a.tag.localeCompare(b.tag))
        .map((s) => ({
          tag: s.tag,
          label: s.label,
          building: s.tag.startsWith('B2') ? 'B2' : s.tag.startsWith('B3') ? 'B3' : 'B5',
          subsystem: s.subsystem,
          unit: s.unit,
        })),
    [plant.sensors]
  );

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      if (buildingFilter !== 'ALL' && item.building !== buildingFilter) return false;
      if (subFilter !== 'ALL' && item.subsystem !== subFilter) return false;
      if (
        q &&
        !item.tag.toLowerCase().includes(q) &&
        !item.label.toLowerCase().includes(q) &&
        !item.unit.toLowerCase().includes(q) &&
        !item.subsystem.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [catalog, searchQuery, buildingFilter, subFilter]);

  const activePens = useMemo(
    () =>
      selectedTags.map((tag, idx) => {
        const s = plant.sensors[tag];
        return {
          tag,
          label: s?.label ?? tag,
          unit: s?.unit ?? '',
          decimals: s?.decimals ?? 2,
          color: PEN_COLORS[idx % PEN_COLORS.length],
        };
      }),
    [selectedTags, plant.sensors]
  );

  // Online Trend rolling window calculation (number * unit backward from latest wall-clock timestamp)
  const safeOnlineAmount = Math.max(1, Number.isFinite(onlineAmount) ? onlineAmount : 60);
  const onlineWindowMs = safeOnlineAmount * UNIT_MULTIPLIER_MS[onlineUnit];
  const latestWallMs = plant.trends[plant.trends.length - 1]?.wallMs ?? initNowMs;

  const onlineLivePoints = useMemo(() => {
    const cutoffWallMs = latestWallMs - onlineWindowMs;
    return plant.trends
      .filter((pt) => {
        if (pt.simTimeSec < sessionStartSimSec) return false;
        const w = pt.wallMs ?? latestWallMs;
        return w >= cutoffWallMs;
      })
      .map((pt) => ({
        ...pt,
        wallMs: pt.wallMs ?? latestWallMs,
        timeLabel: formatFullDateTime(pt.wallMs ?? latestWallMs),
      }));
  }, [plant.trends, sessionStartSimSec, latestWallMs, onlineWindowMs]);

  const historyPoints = useMemo(
    () =>
      mode === 'history'
        ? buildHistoricalSeries(
            selectedTags,
            plant.sensors,
            plant.trends,
            appliedRange.startMs,
            appliedRange.endMs
          )
        : [],
    [mode, selectedTags, plant.sensors, plant.trends, appliedRange]
  );

  const data = mode === 'online' ? (frozen && frozenState ? frozenState.points : onlineLivePoints) : historyPoints;
  const chartEndMs =
    mode === 'online'
      ? frozen && frozenState
        ? frozenState.endMs
        : latestWallMs
      : appliedRange.endMs;
  const chartStartMs =
    mode === 'online' ? chartEndMs - onlineWindowMs : appliedRange.startMs;
  const chartDurationMs = Math.max(1000, chartEndMs - chartStartMs);

  const toggleFreeze = () => {
    if (!frozen) {
      setFrozenState({ points: onlineLivePoints, endMs: latestWallMs });
    }
    setFrozen(!frozen);
  };

  const handleClearOnline = () => {
    setSessionStartSimSec(plant.simTimeSec);
    setFrozen(false);
    setFrozenState(null);
    setHoverIdx(null);
  };

  const applyCustomHistoryRange = () => {
    const sMs = parseDateTimeInputs(startDate, startTime);
    const eMs = parseDateTimeInputs(endDate, endTime);
    if (sMs >= eMs) {
      setRangeError('Start time must be earlier than End time.');
      return;
    }
    setRangeError(null);
    setAppliedRange({ startMs: sMs, endMs: eMs });
    setHoverIdx(null);
  };

  const applyQuickPreset = (durationSec: number) => {
    const now = Date.now();
    const sMs = now - durationSec * 1000;
    setStartDate(toDateInputValue(sMs));
    setStartTime(toTimeInputValue(sMs));
    setEndDate(toDateInputValue(now));
    setEndTime(toTimeInputValue(now));
    setRangeError(null);
    setAppliedRange({ startMs: sMs, endMs: now });
    setHoverIdx(null);
  };

  // SVG Chart Geometry
  const W = 980;
  const H = 370;
  const padL = 58;
  const padR = 24;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const penStats = useMemo(() => {
    const map = new Map<string, { min: number; max: number; avg: number; rangeMin: number; rangeMax: number }>();
    for (const pen of activePens) {
      const vals = data.map((d) => d.values[pen.tag]).filter((v): v is number => v !== undefined);
      const mn = vals.length > 0 ? Math.min(...vals) : 0;
      const mx = vals.length > 0 ? Math.max(...vals) : 100;
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const span = Math.max(mx - mn, Math.max(0.4, Math.abs(mx) * 0.06));
      map.set(pen.tag, { min: mn, max: mx, avg, rangeMin: mn - span * 0.2, rangeMax: mx + span * 0.2 });
    }
    return map;
  }, [activePens, data]);

  // Map every point onto the exact [chartStartMs .. chartEndMs] WinCC time axis!
  const xOfPoint = (pt: TrendPoint, idx: number) => {
    if (pt.wallMs !== undefined) {
      const frac = Math.max(0, Math.min(1, (pt.wallMs - chartStartMs) / chartDurationMs));
      return padL + frac * plotW;
    }
    return padL + (idx / Math.max(1, data.length - 1)) * plotW;
  };

  const yOf = (tag: string, val: number) => {
    const r = penStats.get(tag) ?? { rangeMin: 0, rangeMax: 100 };
    return padT + (1 - (val - r.rangeMin) / Math.max(0.0001, r.rangeMax - r.rangeMin)) * plotH;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.max(0, Math.min(1, (relX - padL) / plotW));
    const targetMs = chartStartMs + frac * chartDurationMs;
    // Find nearest sample point by timestamp
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const w = data[i].wallMs ?? chartStartMs;
      const dist = Math.abs(w - targetMs);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setHoverIdx(bestIdx);
  };

  const inspectedPoint = hoverIdx !== null && data[hoverIdx] ? data[hoverIdx] : data[data.length - 1];

  return (
    <div className="p-3 space-y-2.5">
      {/* Authentic WinCC GraCS Screen Title Banner */}
      <div
        className={`w-full rounded border-2 px-4 py-1.5 text-center font-mono shadow-sm ${
          mode === 'online'
            ? 'bg-gradient-to-r from-[#a5f3fc] via-[#e0f2fe] to-[#67e8f9] border-[#0284c7] text-[#00008b]'
            : 'bg-gradient-to-r from-[#c7d2fe] via-[#e0e7ff] to-[#a5b4fc] border-[#3730a3] text-[#1e1b4b]'
        }`}
      >
        <div className="text-base font-black tracking-widest uppercase">
          {mode === 'online'
            ? 'ONLINE TREND — COHR2401 SITE (B5 / B2 / B3)'
            : 'HISTORICAL TREND — COHR2401 SITE (B5 / B2 / B3)'}
        </div>
        <div className="text-[10.5px] font-bold opacity-85">
          {mode === 'online'
            ? 'Scr_OnlineTrend.Pdl · Real-Time Multi-Pen Process Trending'
            : 'Scr_HistoricalTrend.Pdl · Archived Process Trend Query'}
        </div>
      </div>

      {/* Header Bar with Unified Top Mode Switcher (identical to Alarm screen!) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-white font-mono">
              {mode === 'online'
                ? 'COHR2401 Site — Online Trend (`Scr_OnlineTrend`)'
                : 'COHR2401 Site — Historical Trend (`Scr_HistoricalTrend`)'}
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              {mode === 'online'
                ? 'Resets chart curve when re-entering while preserving selected tags · Rolling time window from Now backward'
                : 'WinCC Historical Time Range — Select Start & End date/time (DD/MM/YYYY HH:mm:ss)'}
            </p>
          </div>

          {/* Unified Online <-> Historical Segmented Switcher (same position & style as Alarm) */}
          <div className="flex items-center bg-[#0d1626] border border-[#2a436b] rounded-md p-0.5 font-mono text-xs">
            <button
              onClick={() => setActiveScreen('b5_trend_online')}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'online'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5" /> Online Trend
            </button>
            <button
              onClick={() => setActiveScreen('b5_trend_history')}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 cursor-pointer transition ${
                mode === 'history'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Historical Trend
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {mode === 'online' && (
            <>
              <button
                onClick={toggleFreeze}
                className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 cursor-pointer border ${
                  frozen ? 'bg-amber-600 border-amber-400 text-white' : 'bg-blue-700 border-blue-500 text-white'
                }`}
              >
                {frozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                {frozen ? 'Resume' : 'Freeze'}
              </button>
              <button
                onClick={handleClearOnline}
                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset Chart
              </button>
            </>
          )}

          <button
            onClick={() => exportTrendCsv(data, selectedTags, mode)}
            disabled={data.length === 0 || selectedTags.length === 0}
            className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold flex items-center gap-1 cursor-pointer border border-emerald-900"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* WinCC Time Axis Configuration Toolbar */}
      <div className="bg-[#dfe4ec] border-2 border-[#475569] rounded-lg px-3 py-2 font-mono text-xs text-slate-900 shadow-inner">
        {mode === 'online' ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-black text-slate-800 uppercase">
                <Clock className="w-4 h-4 text-blue-700" />
                Time Range (from Now backward):
              </span>
              <input
                type="number"
                min={1}
                max={9999}
                value={onlineAmount}
                onChange={(e) => {
                  const v = Number.parseInt(e.target.value, 10);
                  setOnlineAmount(Number.isNaN(v) ? 1 : Math.max(1, v));
                }}
                className="w-20 px-2 py-1 rounded bg-white border border-slate-500 text-slate-950 font-black text-right"
              />
              <select
                value={onlineUnit}
                onChange={(e) => setOnlineUnit(e.target.value as OnlineTimeUnit)}
                className="px-2 py-1 rounded bg-white border border-slate-500 text-slate-950 font-bold"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>

              <span className="h-4 w-px bg-slate-400 mx-1" />
              <span className="text-[11px] text-slate-600 font-bold">Quick:</span>
              {(
                [
                  [30, 'seconds', '30s'],
                  [60, 'seconds', '60s'],
                  [5, 'minutes', '5m'],
                  [1, 'hours', '1h'],
                  [1, 'days', '1d'],
                ] as const
              ).map(([amt, u, lbl]) => (
                <button
                  key={lbl}
                  onClick={() => {
                    setOnlineAmount(amt);
                    setOnlineUnit(u);
                  }}
                  className={`px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer ${
                    onlineAmount === amt && onlineUnit === u
                      ? 'bg-blue-700 border-blue-900 text-white'
                      : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="text-[10.5px] text-slate-700 font-semibold">
              Window: {formatFullDateTime(chartStartMs)} → {formatFullDateTime(chartEndMs)}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-black text-slate-800 uppercase">
                <Calendar className="w-4 h-4 text-blue-700" />
                WinCC Time Range:
              </span>

              {/* Start Date + Time (HH:mm:ss) */}
              <div className="flex items-center gap-1 bg-white border border-slate-500 rounded px-2 py-0.5">
                <span className="text-[10.5px] font-black text-blue-800">START:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-950 focus:outline-none"
                />
                <input
                  type="time"
                  step={1}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-xs font-bold text-slate-950 focus:outline-none border-l border-slate-300 pl-1"
                />
              </div>

              <span className="font-black text-slate-600">→</span>

              {/* End Date + Time (HH:mm:ss) */}
              <div className="flex items-center gap-1 bg-white border border-slate-500 rounded px-2 py-0.5">
                <span className="text-[10.5px] font-black text-emerald-800">END:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-950 focus:outline-none"
                />
                <input
                  type="time"
                  step={1}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-xs font-bold text-slate-950 focus:outline-none border-l border-slate-300 pl-1"
                />
              </div>

              <button
                onClick={applyCustomHistoryRange}
                className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-black border border-blue-950 cursor-pointer shadow-2xs"
              >
                Apply Range
              </button>

              <span className="h-4 w-px bg-slate-400 mx-0.5" />
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    ['15m', 15 * 60],
                    ['1h', 3600],
                    ['6h', 6 * 3600],
                    ['1d', 24 * 3600],
                    ['7d', 7 * 24 * 3600],
                    ['1mo', 30 * 24 * 3600],
                  ] as const
                ).map(([lbl, sec]) => (
                  <button
                    key={lbl}
                    onClick={() => applyQuickPreset(sec)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-400 text-[11px] font-bold text-slate-800 cursor-pointer"
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {rangeError && (
              <div className="text-[11px] font-bold text-red-700 bg-red-100 border border-red-400 rounded px-2 py-1">
                {rangeError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Split Layout: Left Searchable Analog Input Tag Picker + Right WinCC Trend Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* LEFT: Multi-Building Searchable Analog Input Tag Picker */}
        <div className="xl:col-span-4 bg-[#dfe4ec] border-2 border-[#475569] rounded-lg p-2.5 flex flex-col gap-2 text-slate-900 font-mono shadow-inner max-h-[540px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-800">
              Analog Input Tag Browser ({filteredCatalog.length})
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white">
              {selectedTags.length} / 8 Pens
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI tag, name, unit (e.g. PIT, °C, AHU)..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded bg-white border border-slate-500 text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <div className="flex rounded overflow-hidden border border-slate-500 bg-white shrink-0">
              {(['ALL', 'B5', 'B2', 'B3'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBuildingFilter(b);
                    setSubFilter('ALL');
                  }}
                  className={`px-2 py-1 font-bold cursor-pointer ${
                    buildingFilter === b ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <select
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="flex-1 bg-white border border-slate-500 rounded px-1.5 py-1 text-[11px] font-semibold text-slate-900"
            >
              <option value="ALL">All Subsystems</option>
              <option value="chiller">Chiller &amp; CT</option>
              <option value="heat_recovery">Heat Recovery / Heat Fan</option>
              <option value="pcw">PCW</option>
              <option value="di">DI Water</option>
              <option value="oflac">OFLAC</option>
              <option value="ofrac">OFRAC</option>
              <option value="pv">Process Vacuum</option>
              <option value="ahu">AHU / PAU</option>
              <option value="exh">Exhaust</option>
            </select>
          </div>

          {/* Selected Pens Chips */}
          <div className="bg-white border border-slate-400 rounded p-1.5 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>SELECTED TAGS (PERSISTED):</span>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTrendTags([])}
                  className="text-red-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            {activePens.length === 0 ? (
              <div className="text-[10.5px] text-slate-500 italic py-0.5">
                Select Analog Input tags from the list below to plot...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {activePens.map((pen) => (
                  <span
                    key={pen.tag}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-400 text-[10px] font-bold text-slate-900"
                  >
                    <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: pen.color }} />
                    {pen.tag}
                    <button
                      onClick={() => removeTrendTag(pen.tag)}
                      className="text-slate-500 hover:text-red-600 cursor-pointer"
                      title={`Remove ${pen.tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable Searchable AI Tag List */}
          <div className="flex-1 min-h-[240px] overflow-y-auto bg-white border border-slate-400 rounded divide-y divide-slate-200">
            {filteredCatalog.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No Analog Input tags match "{searchQuery}".
              </div>
            ) : (
              filteredCatalog.map((item) => {
                const isSelected = selectedTags.includes(item.tag);
                const liveSensor = plant.sensors[item.tag];
                return (
                  <button
                    key={item.tag}
                    onClick={() => (isSelected ? removeTrendTag(item.tag) : addTrendTag(item.tag))}
                    className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1 py-0.2 rounded bg-slate-800 text-white text-[9px] font-bold">
                          {item.building}
                        </span>
                        <span className="text-[11px] font-black text-slate-950 truncate">{item.tag}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 truncate">{item.label}</div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-[10.5px] font-bold text-slate-800">
                        {liveSensor ? `${liveSensor.pv.toFixed(liveSensor.decimals)} ${item.unit}` : item.unit}
                      </span>
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center border text-[10px] font-black ${
                          isSelected
                            ? 'bg-blue-600 border-blue-800 text-white'
                            : 'bg-slate-100 border-slate-400 text-slate-700'
                        }`}
                      >
                        {isSelected ? '✓' : <Plus className="w-3 h-3" />}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: WinCC Light Trend Chart + Live Crosshair + Statistics Table */}
        <div className="xl:col-span-8 bg-[#dfe4ec] border-2 border-[#475569] rounded-lg p-3 flex flex-col gap-2.5 shadow-inner">
          {/* Crosshair Readout Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-400 rounded px-3 py-1.5 font-mono text-xs text-slate-900">
            <span className="font-black text-slate-600">
              Time: {inspectedPoint?.timeLabel ?? '--/--/---- --:--:--'}
            </span>
            {activePens.map((pen) => {
              const val = inspectedPoint?.values[pen.tag];
              return (
                <span key={pen.tag} className="flex items-center gap-1 font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: pen.color }} />
                  <span className="text-slate-700">{pen.tag}:</span>
                  <span style={{ color: pen.color }} className="font-black">
                    {val !== undefined ? `${val.toFixed(pen.decimals)} ${pen.unit}` : '--'}
                  </span>
                </span>
              );
            })}
          </div>

          {/* WinCC OnlineTrendControl / Historical Trend SVG Plot */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIdx(null)}
            className="w-full h-auto bg-[#f7f6ee] border border-slate-500 rounded cursor-crosshair select-none"
          >
            {/* Horizontal Grid + Y Axis */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = padT + f * plotH;
              const singleRange = activePens.length === 1 ? penStats.get(activePens[0].tag) : undefined;
              const lbl = singleRange
                ? `${(singleRange.rangeMax - f * (singleRange.rangeMax - singleRange.rangeMin)).toFixed(activePens[0].decimals)}`
                : `${Math.round((1 - f) * 100)}%`;
              return (
                <g key={`hy-${f}`}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#cbd5e1" strokeWidth={0.9} strokeDasharray="3 3" />
                  <text x={padL - 6} y={y + 3.5} textAnchor="end" fill="#334155" fontSize="9.5" fontFamily="monospace" fontWeight="700">
                    {lbl}
                  </text>
                </g>
              );
            })}

            {/* Vertical Grid + Exact WinCC Time Axis Labels [chartStartMs .. chartEndMs] */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => {
              const x = padL + f * plotW;
              const tickMs = chartStartMs + f * chartDurationMs;
              return (
                <g key={`vx-${f}`}>
                  <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#e2e8f0" strokeWidth={0.8} />
                  <text x={x} y={H - 10} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="700">
                    {formatAxisLabel(tickMs, chartDurationMs)}
                  </text>
                </g>
              );
            })}

            <rect x={padL} y={padT} width={plotW} height={plotH} fill="none" stroke="#475569" strokeWidth={1.2} />

            {/* Active Pen Polylines */}
            {activePens.length === 0 ? (
              <text x={W / 2} y={H / 2} textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="monospace" fontWeight="700">
                Select one or more Analog Input tags on the left to display trend curves
              </text>
            ) : data.length < 2 ? (
              <text x={W / 2} y={H / 2} textAnchor="middle" fill="#475569" fontSize="12" fontFamily="monospace" fontWeight="700">
                Online Trend reset — streaming live samples ({safeOnlineAmount} {onlineUnit} window)...
              </text>
            ) : (
              activePens.map((pen) => {
                const pts = data
                  .map((d, i) => {
                    const v = d.values[pen.tag];
                    return v !== undefined ? `${xOfPoint(d, i).toFixed(1)},${yOf(pen.tag, v).toFixed(1)}` : null;
                  })
                  .filter(Boolean)
                  .join(' ');
                return <polyline key={pen.tag} fill="none" stroke={pen.color} strokeWidth={2.2} points={pts} />;
              })
            )}

            {/* Hover Crosshair */}
            {hoverIdx !== null && data[hoverIdx] && (
              <g>
                <line
                  x1={xOfPoint(data[hoverIdx], hoverIdx)}
                  y1={padT}
                  x2={xOfPoint(data[hoverIdx], hoverIdx)}
                  y2={padT + plotH}
                  stroke="#0f172a"
                  strokeWidth={1.2}
                  strokeDasharray="4 2"
                />
                {activePens.map((pen) => {
                  const v = data[hoverIdx].values[pen.tag];
                  if (v === undefined) return null;
                  return (
                    <circle
                      key={`dot-${pen.tag}`}
                      cx={xOfPoint(data[hoverIdx], hoverIdx)}
                      cy={yOf(pen.tag, v)}
                      r={4}
                      fill={pen.color}
                      stroke="#ffffff"
                      strokeWidth={1.2}
                    />
                  );
                })}
              </g>
            )}
          </svg>

          {/* WinCC Pen Statistics Table (Current / Min / Avg / Max) */}
          {activePens.length > 0 && (
            <div className="bg-white border border-slate-400 rounded overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] text-slate-900 border-collapse">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-400 text-[10px] uppercase">
                    <th className="px-2.5 py-1">Pen Tag</th>
                    <th className="px-2.5 py-1">Description</th>
                    <th className="px-2.5 py-1 text-right">Current</th>
                    <th className="px-2.5 py-1 text-right">Min</th>
                    <th className="px-2.5 py-1 text-right">Avg</th>
                    <th className="px-2.5 py-1 text-right">Max</th>
                    <th className="px-2.5 py-1">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {activePens.map((pen) => {
                    const st = penStats.get(pen.tag);
                    const cur = plant.sensors[pen.tag]?.pv;
                    return (
                      <tr key={pen.tag} className="border-b border-slate-200 last:border-0">
                        <td className="px-2.5 py-1 font-black flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: pen.color }} />
                          {pen.tag}
                        </td>
                        <td className="px-2.5 py-1 text-slate-600">{pen.label}</td>
                        <td className="px-2.5 py-1 text-right font-black" style={{ color: pen.color }}>
                          {cur !== undefined ? cur.toFixed(pen.decimals) : '--'}
                        </td>
                        <td className="px-2.5 py-1 text-right">{st && data.length > 0 ? st.min.toFixed(pen.decimals) : '--'}</td>
                        <td className="px-2.5 py-1 text-right">{st && data.length > 0 ? st.avg.toFixed(pen.decimals) : '--'}</td>
                        <td className="px-2.5 py-1 text-right">{st && data.length > 0 ? st.max.toFixed(pen.decimals) : '--'}</td>
                        <td className="px-2.5 py-1 text-slate-600">{pen.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
