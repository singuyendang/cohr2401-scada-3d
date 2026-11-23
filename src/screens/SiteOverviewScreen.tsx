import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import type { BuildingId } from '../types/scada.ts';

/**
 * Scr_Overview.Pdl — Authentic WinCC Coherent 3D 6-Building Site Overview
 *  - Grounded directly in References/COHR2401_SCADA/COHR2401/GraCS/OverViewMainScreen.jpg & OverView.jpg:
 *      * Back row  (L -> R): BUILDING 04 (static) | BUILDING 05 SILICON CARBIDE (clickable) | BUILDING 06 (static)
 *      * Front row (L -> R): BUILDING 03 ADVANCED OPTICS (clickable) | BUILDING 02 ADVANCED OPTICS (clickable) | BUILDING 01 (static)
 *  - Clicking Building 02, Building 03, or Building 05 navigates straight to that building's Plant Summary screen.
 */
export const SiteOverviewScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const setActiveBuilding = useB5Store((s) => s.setActiveBuilding);

  const b5Kw =
    (plant.meters['PMDB_B5M2F_MDB51']?.activeKw ?? 0) +
    (plant.meters['PMDB_B5M2F_MDB52']?.activeKw ?? 0) +
    (plant.meters['PMDB_B5M2F_MDB53']?.activeKw ?? 0);
  const b2Kw =
    (plant.meters['PMDB_B2_MDB21']?.activeKw ?? 0) +
    (plant.meters['PMDB_B2_MDBA07']?.activeKw ?? 0);
  const b3Kw =
    (plant.meters['PMDB_B3M1F_MDB31']?.activeKw ?? 0) +
    (plant.meters['PMDB_B3M1F_MDB32']?.activeKw ?? 0) +
    (plant.meters['PMDB_B3M1F_MDB33']?.activeKw ?? 0);

  const activeAlarmCount = (b: BuildingId) =>
    plant.alarms.filter((a) => a.building === b && a.active).length;

  const activeBuildings: {
    id: BuildingId;
    title: string;
    subtitle: string;
    x: number;
    y: number;
    w: number;
    h: number;
    zonePath: string;
    kw: number;
    alarms: number;
  }[] = [
    {
      id: 'B5',
      title: 'BUILDING 05',
      subtitle: 'SILICON CARBIDE',
      x: 590,
      y: 234,
      w: 146,
      h: 48,
      zonePath: 'M 556 266 L 714 266 L 732 342 L 542 342 Z',
      kw: b5Kw,
      alarms: activeAlarmCount('B5'),
    },
    {
      id: 'B3',
      title: 'BUILDING 03',
      subtitle: 'ADVANCED OPTICS',
      x: 208,
      y: 344,
      w: 162,
      h: 48,
      zonePath: 'M 72 478 L 288 334 L 460 334 L 382 558 L 98 558 Z',
      kw: b3Kw,
      alarms: activeAlarmCount('B3'),
    },
    {
      id: 'B2',
      title: 'BUILDING 02',
      subtitle: 'ADVANCED OPTICS',
      x: 554,
      y: 344,
      w: 174,
      h: 48,
      zonePath: 'M 476 476 L 540 340 L 732 340 L 764 476 L 758 564 L 472 564 Z',
      kw: b2Kw,
      alarms: activeAlarmCount('B2'),
    },
  ];

  const staticBuildings = [
    { label: 'BUILDING 04', x: 342, y: 234, w: 136, h: 44 },
    { label: 'BUILDING 06', x: 800, y: 234, w: 146, h: 44 },
    { label: 'BUILDING 01', x: 874, y: 344, w: 166, h: 48 },
  ];

  return (
    <div className="p-3 h-full flex flex-col gap-2.5 bg-[#8f96a0]">
      {/* Exact WinCC GraCS Title Banner (from OverViewMainScreen.jpg) */}
      <div className="w-full rounded border-2 border-[#0284c7] bg-gradient-to-b from-[#38f0ff] via-[#ffffff] to-[#2de8ff] py-1.5 px-4 text-center shadow">
        <div className="text-base md:text-lg font-black tracking-wide text-[#0000cc] leading-tight">
          BUILDING MANAGEMENT SYSTEM
        </div>
        <div className="text-xs md:text-sm font-black tracking-wide text-[#0000cc] leading-tight">
          ADVANCED OPTICS &amp; SILICON CARBIDE BUILDING
        </div>
      </div>

      {/* Full 3D 6-Building Coherent Campus Interactive Canvas */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0f172a] border-2 border-[#334155] rounded overflow-hidden shadow-lg">
        <svg
          viewBox="0 0 1280 760"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-[calc(100vh-148px)] select-none"
        >
          <defs>
            <linearGradient id="wincc-active-bldg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67f8ff" />
              <stop offset="48%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#12e3ff" />
            </linearGradient>
            <linearGradient id="wincc-static-bldg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <filter id="bldg-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Original 3D Campus Aerial Image (6 Buildings) */}
          <image
            href="/scada/OverView.jpg"
            x={0}
            y={0}
            width={1280}
            height={760}
            preserveAspectRatio="xMidYMid slice"
          />

          {/* Non-monitored Buildings 01, 04, 06 (exact WinCC white/gray plaques) */}
          {staticBuildings.map((b) => (
            <g key={b.label} filter="url(#bldg-shadow)">
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={2}
                fill="url(#wincc-static-bldg)"
                stroke="#334155"
                strokeWidth={1.6}
              />
              <text
                x={b.x + b.w / 2}
                y={b.y + b.h / 2 + 4.5}
                textAnchor="middle"
                fill="#475569"
                fontSize="13.5"
                fontFamily="sans-serif"
                fontWeight="800"
              >
                {b.label}
              </text>
            </g>
          ))}

          {/* Interactive Clickable Buildings 05, 03, 02 (exact WinCC cyan glowing callouts + clickable 3D footprints) */}
          {activeBuildings.map((b) => (
            <g
              key={b.id}
              onClick={() => setActiveBuilding(b.id)}
              className="cursor-pointer group"
            >
              {/* Subtle translucent hover highlight over the physical 3D building roof */}
              <path
                d={b.zonePath}
                fill="#22d3ee"
                fillOpacity={0.0}
                stroke="#22d3ee"
                strokeWidth={2.5}
                strokeOpacity={0}
                className="transition-all duration-150 group-hover:fill-opacity-20 group-hover:stroke-opacity-90"
              />

              {/* WinCC Cyan Callout Plaque */}
              <g filter="url(#bldg-shadow)">
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={2.5}
                  fill="url(#wincc-active-bldg)"
                  stroke={b.alarms > 0 ? '#dc2626' : '#0369a1'}
                  strokeWidth={b.alarms > 0 ? 2.4 : 1.8}
                  className="transition group-hover:brightness-110 group-hover:stroke-[#0000cc]"
                />
                {/* Status Indicator LED (exact WinCC top-left dot on each active building plaque) */}
                <circle
                  cx={b.x + 12}
                  cy={b.y + 13}
                  r={4.5}
                  fill={b.alarms > 0 ? '#ff0000' : '#00ce00'}
                  stroke="#0f172a"
                  strokeWidth={1.2}
                  className={b.alarms > 0 ? 'animate-alarm-flash' : ''}
                />
                <text
                  x={b.x + b.w / 2 + 4}
                  y={b.y + 20}
                  textAnchor="middle"
                  fill="#0000cc"
                  fontSize="13.5"
                  fontFamily="sans-serif"
                  fontWeight="900"
                >
                  {b.title}
                </text>
                <text
                  x={b.x + b.w / 2 + 4}
                  y={b.y + 38}
                  textAnchor="middle"
                  fill="#0000cc"
                  fontSize="12"
                  fontFamily="sans-serif"
                  fontWeight="800"
                >
                  {b.subtitle}
                </text>
              </g>

              {/* Compact Live Telemetry Pill under plaque */}
              <g transform={`translate(${b.x + 6}, ${b.y + b.h + 5})`}>
                <rect
                  x={0}
                  y={0}
                  width={b.w - 12}
                  height={19}
                  rx={3}
                  fill="#0f172a"
                  fillOpacity={0.86}
                  stroke={b.alarms > 0 ? '#ef4444' : '#38bdf8'}
                  strokeWidth={1}
                />
                <text
                  x={(b.w - 12) / 2}
                  y={12.8}
                  textAnchor="middle"
                  fill={b.alarms > 0 ? '#fca5a5' : '#67e8f9'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="800"
                >
                  {b.kw.toFixed(0)} kW{b.alarms > 0 ? ` · ${b.alarms} ALM` : ' · NORMAL'}
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
