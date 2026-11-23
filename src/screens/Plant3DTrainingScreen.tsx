import React, { useCallback, useRef } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Box,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { Plant3DCanvas, type Plant3DCanvasHandle } from '../components/training/Plant3DCanvas.tsx';
import {
  DEFAULT_3D_NODES,
  FLUID_COLORS,
  ZONES_3D,
  type Equipment3DNode,
  type Zone3DId,
} from '../training/plant3dLayout.ts';
import { SOP_MANUALS } from '../training/sopManual.ts';
import { TRAINING_CHALLENGES } from '../training/trainingScenarios.ts';
import { useB5Store } from '../store/b5Store.ts';
import { useTrainingStore } from '../store/trainingStore.ts';

type Building3DGroup = 'site' | 'B5' | 'B2' | 'B3';

interface FloorOption {
  zone: Zone3DId;
  label: string;
}

const BUILDING_FLOORS: Record<Exclude<Building3DGroup, 'site'>, FloorOption[]> = {
  B5: [
    { zone: 'b5_chiller', label: '1F (Main Plant)' },
    { zone: 'b5_m1f', label: 'M1F (AHU Room)' },
    { zone: 'b5_2f', label: '2F (Cleanroom)' },
    { zone: 'b5_air', label: 'M2F (AHU / EXH)' },
  ],
  B2: [
    { zone: 'b2_plant', label: '1F (Cleanroom & PCW)' },
    { zone: 'b2_2f', label: '2F (AHU/PAU & EXH)' },
    { zone: 'b2_3f', label: '3F (Cleanroom)' },
    { zone: 'b2_m3f', label: 'M3F (AHU / PAU)' },
  ],
  B3: [
    { zone: 'b3_plant', label: '1F (Warehouse · Chiller · Heat)' },
    { zone: 'b3_2f', label: '2F (AHU / EXH & MSB)' },
  ],
};

function getBuildingForZone(zone: Zone3DId): Building3DGroup {
  if (zone === 'site') return 'site';
  if (zone === 'b2_plant' || zone === 'b2_2f' || zone === 'b2_3f' || zone === 'b2_m3f') return 'B2';
  if (zone === 'b3_plant' || zone === 'b3_2f') return 'B3';
  return 'B5';
}

function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const Plant3DTrainingScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const jumpToTarget = useB5Store((s) => s.jumpToTarget);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const activeZone = useTrainingStore((s) => s.activeZone);
  const setActiveZone = useTrainingStore((s) => s.setActiveZone);
  const panelTab = useTrainingStore((s) => s.panelTab);
  const setPanelTab = useTrainingStore((s) => s.setPanelTab);
  const selectedNodeId = useTrainingStore((s) => s.selectedNodeId);
  const b51fLayers = useTrainingStore((s) => s.b51fLayers);
  const b51fFocusLayer = useTrainingStore((s) => s.b51fFocusLayer);
  const isolateB51FLayer = useTrainingStore((s) => s.isolateB51FLayer);
  const toggleB51FLayer = useTrainingStore((s) => s.toggleB51FLayer);
  const b21fLayers = useTrainingStore((s) => s.b21fLayers);
  const b21fFocusLayer = useTrainingStore((s) => s.b21fFocusLayer);
  const isolateB21FLayer = useTrainingStore((s) => s.isolateB21FLayer);
  const toggleB21FLayer = useTrainingStore((s) => s.toggleB21FLayer);
  const b31fLayers = useTrainingStore((s) => s.b31fLayers);
  const b31fFocusLayer = useTrainingStore((s) => s.b31fFocusLayer);
  const isolateB31FLayer = useTrainingStore((s) => s.isolateB31FLayer);
  const toggleB31FLayer = useTrainingStore((s) => s.toggleB31FLayer);

  const activeSopId = useTrainingStore((s) => s.activeSopId);
  const activeSopStepIndex = useTrainingStore((s) => s.activeSopStepIndex);
  const startSop = useTrainingStore((s) => s.startSop);
  const setSopStepIndex = useTrainingStore((s) => s.setSopStepIndex);
  const stopSop = useTrainingStore((s) => s.stopSop);

  const activeChallenge = useTrainingStore((s) => s.activeChallenge);
  const startChallenge = useTrainingStore((s) => s.startChallenge);
  const stopChallenge = useTrainingStore((s) => s.stopChallenge);

  const canvasRef = useRef<Plant3DCanvasHandle | null>(null);
  const lastB5FloorRef = useRef<Zone3DId>('b5_chiller');
  const lastB2FloorRef = useRef<Zone3DId>('b2_plant');
  const lastB3FloorRef = useRef<Zone3DId>('b3_plant');

  const activeBuildingGroup = getBuildingForZone(activeZone);
  React.useEffect(() => {
    if (activeBuildingGroup === 'B5') {
      lastB5FloorRef.current = activeZone;
    } else if (activeBuildingGroup === 'B2') {
      lastB2FloorRef.current = activeZone;
    } else if (activeBuildingGroup === 'B3') {
      lastB3FloorRef.current = activeZone;
    }
  }, [activeBuildingGroup, activeZone]);

  const zoneMeta = ZONES_3D.find((z) => z.id === activeZone) ?? ZONES_3D[0];
  const selectedNode = DEFAULT_3D_NODES.find((n) => n.id === selectedNodeId) ?? null;

  const handleSelectBuilding = (bldg: Building3DGroup) => {
    if (bldg === 'site') {
      setActiveZone('site');
    } else if (bldg === 'B5') {
      setActiveZone(lastB5FloorRef.current);
    } else if (bldg === 'B2') {
      setActiveZone(lastB2FloorRef.current);
    } else {
      setActiveZone(lastB3FloorRef.current);
    }
  };

  const handleSelectNode = useCallback((node: Equipment3DNode | null) => {
    if (!node) return;
    useTrainingStore.getState().setSelectedNodeId(node.id);
  }, []);

  const handleDoubleClickBuilding = useCallback(
    (targetZone: Zone3DId) => {
      setActiveZone(targetZone);
    },
    [setActiveZone]
  );

  const openNodeInScada = useCallback(
    (node: Equipment3DNode) => {
      if (node.targetZoneOnClick && node.zone === 'site') {
        setActiveScreen(node.scadaScreen);
        return;
      }
      jumpToTarget({
        screen: node.scadaScreen,
        tag: node.tag,
        label: node.label,
        faceplateType: node.faceplateType,
        faceplateTitle: node.faceplateType ? `${node.faceplateType} · ${node.tag}` : undefined,
      });
    },
    [jumpToTarget, setActiveScreen]
  );

  const selectedEq = selectedNode ? plant.equipment[selectedNode.statusTag ?? selectedNode.tag] : undefined;
  const selectedLevel =
    selectedNode?.levelSensorTag ? plant.sensors[selectedNode.levelSensorTag] : undefined;

  const activeSop = SOP_MANUALS.find((s) => s.id === activeSopId) ?? null;
  const currentChallengeDef = activeChallenge
    ? TRAINING_CHALLENGES.find((c) => c.id === activeChallenge.challengeId) ?? null
    : null;

  const activeFloors = activeBuildingGroup === 'site' ? [] : BUILDING_FLOORS[activeBuildingGroup];

  return (
    <div className="h-full flex flex-col p-2.5 gap-2 bg-[#0b1320] overflow-hidden">
      {/* Hierarchical 3D Plant Navigation: Level 1 (Buildings) -> Level 2 (Floors) -> Level 3 (Systems) */}
      <div className="bg-[#101c30] border border-[#243b61] rounded-lg px-3 py-2 shrink-0 space-y-1.5 font-mono text-[11px]">
        {/* Row 1: 3 Primary Buildings (+ Site Overview) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-300 mr-1">
              <Box className="w-4 h-4" />
              3D PLANT:
            </span>
            {(
              [
                ['B5', 'Building 5'],
                ['B2', 'Building 2'],
                ['B3', 'Building 3'],
              ] as const
            ).map(([id, label]) => {
              const active = activeBuildingGroup === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSelectBuilding(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${active
                    ? 'bg-cyan-400 border-white text-slate-950 font-black shadow'
                    : 'bg-[#152540] border-[#2c456e] text-slate-200 hover:border-cyan-400 hover:text-white'
                    }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleSelectBuilding('site')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${activeBuildingGroup === 'site'
              ? 'bg-sky-400 border-white text-slate-950 font-black shadow'
              : 'bg-[#13223b] border-[#2c456e] text-sky-200 hover:border-sky-400 hover:text-white'
              }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Site Overview
          </button>
        </div>

        {/* Row 2: Floor Selector for Active Building */}
        {activeFloors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#1e3354]">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-sky-300 mr-1">
              <Layers className="w-3.5 h-3.5" />
              FLOOR ({activeBuildingGroup}):
            </span>
            {activeFloors.map((fl) => {
              const active = activeZone === fl.zone;
              return (
                <button
                  key={fl.zone}
                  onClick={() => setActiveZone(fl.zone)}
                  className={`px-2.5 py-0.5 rounded border font-bold cursor-pointer transition ${active
                    ? 'bg-sky-400 border-white text-slate-950 font-black shadow'
                    : 'bg-[#13243f] border-[#2c456e] text-slate-200 hover:border-sky-400 hover:text-white'
                    }`}
                >
                  {fl.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Row 3: System Filter for Active Floor (shown when floor has multiple systems, e.g. B5 1F) */}
        {activeZone === 'b5_chiller' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#1e3354]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-black text-emerald-300 mr-1">SYSTEM (B5-1F):</span>
              {(
                [
                  ['all', 'All 1F'],
                  ['chiller', 'Chiller & HR'],
                  ['pcw', 'PCW'],
                  ['ac', 'AC & PV'],
                  ['di', 'DI Water'],
                ] as const
              ).map(([key, label]) => {
                const active = b51fFocusLayer === key;
                return (
                  <button
                    key={key}
                    onClick={() => isolateB51FLayer(key)}
                    className={`px-2.5 py-0.5 rounded border font-bold cursor-pointer transition ${active
                      ? 'bg-emerald-400 border-white text-slate-950 font-black shadow'
                      : 'bg-[#13243f] border-[#2c456e] text-slate-200 hover:border-emerald-400 hover:text-white'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">SHOW / HIDE:</span>
              {(
                [
                  ['pcw', 'PCW'],
                  ['chiller', 'Chiller & CT'],
                  ['ac', 'AC & PV'],
                  ['di', 'DI'],
                ] as const
              ).map(([lyr, lbl]) => {
                const on = b51fLayers[lyr];
                return (
                  <button
                    key={`tog-${lyr}`}
                    onClick={() => toggleB51FLayer(lyr)}
                    title={on ? `Showing ${lbl} — click to hide` : `Hidden ${lbl} — click to show`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-bold cursor-pointer transition ${on
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 hover:bg-sky-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-500 line-through hover:text-slate-300'
                      }`}
                  >
                    {on ? <Eye className="w-3 h-3 text-emerald-300" /> : <EyeOff className="w-3 h-3" />}
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3B: System Filter for Building 2 — 1F (Outdoor PCW vs 1F Cleanroom) */}
        {activeZone === 'b2_plant' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#1e3354]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-black text-emerald-300 mr-1">SYSTEM (B2-1F):</span>
              {(
                [
                  ['all', 'All 1F'],
                  ['pcw', 'Outdoor PCW'],
                  ['cleanroom', '1F Cleanroom'],
                ] as const
              ).map(([key, label]) => {
                const active = b21fFocusLayer === key;
                return (
                  <button
                    key={key}
                    onClick={() => isolateB21FLayer(key)}
                    className={`px-2.5 py-0.5 rounded border font-bold cursor-pointer transition ${active
                      ? 'bg-emerald-400 border-white text-slate-950 font-black shadow'
                      : 'bg-[#13243f] border-[#2c456e] text-slate-200 hover:border-emerald-400 hover:text-white'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">SHOW / HIDE:</span>
              {(
                [
                  ['pcw', 'Outdoor PCW'],
                  ['cleanroom', '1F Cleanroom'],
                ] as const
              ).map(([lyr, lbl]) => {
                const on = b21fLayers[lyr];
                return (
                  <button
                    key={`b2-tog-${lyr}`}
                    onClick={() => toggleB21FLayer(lyr)}
                    title={on ? `Showing ${lbl} — click to hide` : `Hidden ${lbl} — click to show`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-bold cursor-pointer transition ${on
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 hover:bg-sky-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-500 line-through hover:text-slate-300'
                      }`}
                  >
                    {on ? <Eye className="w-3 h-3 text-emerald-300" /> : <EyeOff className="w-3 h-3" />}
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3C: System Filter for Building 3 — 1F (Outdoor Chiller & Heat Fan vs 1F Warehouse) */}
        {activeZone === 'b3_plant' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#1e3354]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-black text-emerald-300 mr-1">SYSTEM (B3-1F):</span>
              {(
                [
                  ['all', 'All 1F'],
                  ['outdoor', 'Outdoor Chiller & Heat'],
                  ['warehouse', '1F Warehouse'],
                ] as const
              ).map(([key, label]) => {
                const active = b31fFocusLayer === key;
                return (
                  <button
                    key={key}
                    onClick={() => isolateB31FLayer(key)}
                    className={`px-2.5 py-0.5 rounded border font-bold cursor-pointer transition ${active
                      ? 'bg-emerald-400 border-white text-slate-950 font-black shadow'
                      : 'bg-[#13243f] border-[#2c456e] text-slate-200 hover:border-emerald-400 hover:text-white'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">SHOW / HIDE:</span>
              {(
                [
                  ['outdoor', 'Chiller & Heat Fan'],
                  ['warehouse', '1F Warehouse'],
                ] as const
              ).map(([lyr, lbl]) => {
                const on = b31fLayers[lyr];
                return (
                  <button
                    key={`b3-tog-${lyr}`}
                    onClick={() => toggleB31FLayer(lyr)}
                    title={on ? `Showing ${lbl} — click to hide` : `Hidden ${lbl} — click to show`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10.5px] font-bold cursor-pointer transition ${on
                      ? 'bg-sky-500/25 border-sky-400 text-sky-100 hover:bg-sky-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-500 line-through hover:text-slate-300'
                      }`}
                  >
                    {on ? <Eye className="w-3 h-3 text-emerald-300" /> : <EyeOff className="w-3 h-3" />}
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Split Body: Left 3D Viewport (68%) + Right SOP / Challenge Panel (32%) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* LEFT: 3D Scene + Selected Node Inspector */}
        <div className="lg:col-span-8 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-[380px]">
            <Plant3DCanvas
              ref={canvasRef}
              zone={activeZone}
              onSelectNode={handleSelectNode}
              onDoubleClickNode={openNodeInScada}
              onDoubleClickBuilding={handleDoubleClickBuilding}
            />
          </div>

          {/* Bottom Strip: Selected Node Quick Inspector OR Fluid Legend */}
          <div className="bg-[#101c30] border border-[#243b61] rounded-lg px-3 py-2 shrink-0 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
            {selectedNode ? (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-200 font-black">
                    {selectedNode.label}
                  </span>
                  <span className="text-slate-400">
                    Tag: <strong className="text-white">{selectedNode.tag}</strong>
                  </span>
                  {selectedEq && (
                    <span
                      className={`px-2 py-0.5 rounded font-black ${selectedEq.status === 'RUNNING'
                        ? 'bg-emerald-500/25 text-emerald-300'
                        : selectedEq.status === 'FAULTED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                        }`}
                    >
                      {selectedEq.status}
                      {selectedEq.kind === 'vfd' && selectedEq.status === 'RUNNING'
                        ? ` · ${selectedEq.frequencyHz.toFixed(1)} Hz`
                        : ''}
                      {selectedEq.kind === 'chiller' && selectedEq.status === 'RUNNING'
                        ? ` · ${selectedEq.loadPct.toFixed(0)}% FLA`
                        : ''}
                    </span>
                  )}
                  {selectedLevel && (
                    <span className="text-cyan-300 font-bold">
                      Tank Level: {selectedLevel.pv.toFixed(1)} {selectedLevel.unit}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedNode.targetZoneOnClick && (
                    <button
                      onClick={() => setActiveZone(selectedNode.targetZoneOnClick!)}
                      className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                    >
                      Enter 3D View
                    </button>
                  )}
                  <button
                    onClick={() => openNodeInScada(selectedNode)}
                    className="px-2.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open 2D SCADA
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-300">
                <span className="font-bold text-white">SCADA PIPE LEGEND:</span>
                {(['chw', 'chwr', 'cdw_sup', 'cdw_ret', 'hw_sup', 'hw_ret'] as const).map((f) => (
                  <span key={f} className="inline-flex items-center gap-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-white/40"
                      style={{ backgroundColor: FLUID_COLORS[f].pipe }}
                    />
                    {FLUID_COLORS[f].label.split(' (')[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: 3-Tab Panel (Explore Live Tags / 6 SOP Guides / 8 Timed OTS Challenges) */}
        <div className="lg:col-span-4 bg-[#101c30] border border-[#243b61] rounded-lg flex flex-col min-h-0 overflow-hidden">
          {/* Panel Tabs */}
          <div className="grid grid-cols-3 border-b border-[#243b61] bg-[#0c1627] font-mono text-[11px] font-bold shrink-0">
            <button
              onClick={() => setPanelTab('explore')}
              className={`py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition ${panelTab === 'explore'
                ? 'border-cyan-400 text-cyan-300 bg-[#13243f]'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              <Compass className="w-3.5 h-3.5" /> Explore
            </button>
            <button
              onClick={() => setPanelTab('sop')}
              className={`py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition ${panelTab === 'sop'
                ? 'border-sky-400 text-sky-300 bg-[#13243f]'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> SOP ({SOP_MANUALS.length})
            </button>
            <button
              onClick={() => setPanelTab('challenge')}
              className={`py-2.5 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition ${panelTab === 'challenge'
                ? 'border-amber-400 text-amber-300 bg-[#13243f]'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              <Award className="w-3.5 h-3.5" /> Challenges ({TRAINING_CHALLENGES.length})
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {/* TAB 1: EXPLORE LIVE ZONE TAGS */}
            {panelTab === 'explore' && (
              <>
                <div className="p-2.5 rounded-md bg-[#0b1424] border border-[#243b61] space-y-1">
                  <div className="font-mono font-black text-cyan-300 text-xs">{zoneMeta.title}</div>
                  <div className="text-[11px] text-slate-300 leading-relaxed">{zoneMeta.subtitle}</div>
                  {activeZone === 'b5_chiller' ? (
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => setActiveScreen('b5_chiller')}
                        className="py-1.5 px-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Chiller
                      </button>
                      <button
                        onClick={() => setActiveScreen('b5_heat_recovery')}
                        className="py-1.5 px-1.5 rounded bg-pink-400 hover:bg-pink-300 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Heat Rec
                      </button>
                      <button
                        onClick={() => setActiveScreen('b5_pcw')}
                        className="py-1.5 px-1.5 rounded bg-teal-400 hover:bg-teal-300 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> PCW
                      </button>
                      <button
                        onClick={() => setActiveScreen('b5_ofrac')}
                        className="py-1.5 px-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> OFRAC
                      </button>
                      <button
                        onClick={() => setActiveScreen('b5_oflac')}
                        className="py-1.5 px-1.5 rounded bg-amber-300 hover:bg-amber-200 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> OFLAC
                      </button>
                      <button
                        onClick={() => setActiveScreen('b5_di')}
                        className="py-1.5 px-1.5 rounded bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-black text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> DI Water
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveScreen(zoneMeta.scadaScreen)}
                      className="mt-2 w-full py-1.5 px-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open 2D SCADA Screen
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Live Telemetry
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {zoneMeta.keySensorTags.map((tag) => {
                      const s = plant.sensors[tag];
                      if (!s) return null;
                      const lvl = s.alarms.activeLevel;
                      const badge =
                        lvl === 'HHA' || lvl === 'LLA' || lvl === 'FAULT'
                          ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                          : lvl === 'HA' || lvl === 'LA'
                            ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                            : 'border-emerald-700/70 bg-[#0d192b] text-emerald-300';
                      return (
                        <div key={tag} className={`p-2 rounded border font-mono ${badge}`}>
                          <div className="text-[10px] text-slate-400 truncate">{s.tag}</div>
                          <div className="text-sm font-black">
                            {s.pv.toFixed(s.decimals)} <span className="text-[10px] font-semibold">{s.unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: GUIDED SOP PROCEDURES (Technical Manuals & Operating Instructions in Vietnamese) */}
            {panelTab === 'sop' && (
              <>
                {!activeSop ? (
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-sky-950/40 border border-sky-500/40 text-[11px] text-sky-200">
                      Bộ 6 quy trình SOP biên soạn trực tiếp từ tài liệu FDS (`COHR2401-AT-FDS-002/003`) &amp; logic liên động PLC TIA Portal V18.
                    </div>
                    {SOP_MANUALS.map((sop) => {
                      const doneSteps = sop.steps.filter((st) => st.checkDone(plant)).length;
                      return (
                        <div
                          key={sop.id}
                          className="p-2.5 rounded-lg bg-[#0c1627] border border-[#243b61] hover:border-sky-400 transition space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-black text-[10px]">
                              {sop.code} · {sop.building}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold">
                              {doneSteps}/{sop.steps.length} Done
                            </span>
                          </div>
                          <div className="font-bold text-white text-xs">{sop.title}</div>
                          <div className="text-[11px] text-slate-400 leading-snug">{sop.objective}</div>
                          <button
                            onClick={() => startSop(sop.id)}
                            className="w-full py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3" /> Start Step-by-Step Guide
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-black text-[11px]">
                        {activeSop.code}
                      </span>
                      <button
                        onClick={stopSop}
                        className="text-[11px] font-mono text-slate-300 hover:text-white underline cursor-pointer"
                      >
                        ← SOP List
                      </button>
                    </div>
                    <div className="font-bold text-white text-sm">{activeSop.title}</div>
                    <div className="text-[10.5px] font-mono text-slate-400">Source: {activeSop.sourceRef}</div>

                    <div className="space-y-2">
                      {activeSop.steps.map((step, idx) => {
                        const isDone = step.checkDone(plant);
                        const isCurrent = idx === activeSopStepIndex;
                        return (
                          <div
                            key={step.id}
                            onClick={() => {
                              setSopStepIndex(idx);
                              setActiveZone(step.targetZone);
                            }}
                            className={`p-2.5 rounded-lg border cursor-pointer transition space-y-1.5 ${isCurrent
                              ? 'bg-[#152847] border-sky-400'
                              : isDone
                                ? 'bg-emerald-950/25 border-emerald-700/60'
                                : 'bg-[#0c1627] border-[#243b61]'
                              }`}
                          >
                            <div className="flex items-start gap-2">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              )}
                              <div className="font-bold text-slate-100 text-[11.5px]">
                                Step {idx + 1}: {step.title}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed pl-6">{step.instruction}</p>
                            {step.safetyNote && (
                              <div className="ml-6 p-1.5 rounded bg-amber-950/40 border border-amber-500/40 text-[10.5px] text-amber-200 flex items-start gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{step.safetyNote}</span>
                              </div>
                            )}
                            <div className="pl-6 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSopStepIndex(idx);
                                  if (step.targetTag) {
                                    jumpToTarget({
                                      screen: step.targetScreen,
                                      tag: step.targetTag,
                                      label: step.title,
                                    });
                                  } else {
                                    setActiveScreen(step.targetScreen);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/70 text-cyan-200 font-mono font-bold text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" /> Open SCADA Screen
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 3: 8 AUTOMATED TIMED CHALLENGES */}
            {panelTab === 'challenge' && (
              <>
                {currentChallengeDef && activeChallenge ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-black text-[11px]">
                        {currentChallengeDef.code} · {currentChallengeDef.building}
                      </span>
                      <button
                        onClick={stopChallenge}
                        className="text-[11px] font-mono text-slate-300 hover:text-white underline cursor-pointer"
                      >
                        ← Challenge List
                      </button>
                    </div>

                    {/* Status & Countdown Banner */}
                    {(() => {
                      const elapsed =
                        (activeChallenge.finishedAtSimTimeSec ?? plant.simTimeSec) -
                        activeChallenge.startedSimTimeSec;
                      const remaining = Math.max(0, activeChallenge.durationSec - elapsed);
                      return (
                        <div
                          className={`p-3 rounded-lg border font-mono text-center space-y-1 ${activeChallenge.status === 'PASSED'
                            ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                            : activeChallenge.status === 'FAILED'
                              ? 'bg-rose-950/70 border-rose-400 text-rose-200'
                              : 'bg-[#0c1627] border-cyan-500 text-cyan-200'
                            }`}
                        >
                          <div className="flex items-center justify-center gap-2 text-base font-black">
                            {activeChallenge.status === 'PASSED' ? (
                              <>
                                <Award className="w-5 h-5 text-emerald-400" /> RESULT: PASSED
                              </>
                            ) : activeChallenge.status === 'FAILED' ? (
                              <>
                                <XCircle className="w-5 h-5 text-rose-400" /> RESULT: FAILED
                              </>
                            ) : (
                              <>
                                <Clock className="w-5 h-5 text-cyan-300" /> TIME LEFT: {formatCountdown(remaining)}
                              </>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-300">
                            {activeChallenge.status === 'RUNNING'
                              ? 'Hãy mở màn hình SCADA 2D tương ứng để xử lý sự cố và xác nhận Alarm!'
                              : `Completed in ${Math.round(elapsed)}s simulation time`}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-2.5 rounded-lg bg-rose-950/35 border border-rose-500/50 space-y-1">
                      <div className="font-mono font-black text-rose-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> FAULT SCENARIO:
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed">{currentChallengeDef.scenarioDesc}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10.5px] font-mono font-bold uppercase text-slate-400">
                        Auto-Grading Criteria (3 Live Tags)
                      </div>
                      {currentChallengeDef.criteria.map((cr) => {
                        const ok = cr.check(plant);
                        return (
                          <div
                            key={cr.id}
                            className={`p-2 rounded border font-mono text-[11px] flex items-center gap-2 ${ok
                              ? 'bg-emerald-950/45 border-emerald-500 text-emerald-200 font-bold'
                              : 'bg-[#0c1627] border-slate-700 text-slate-300'
                              }`}
                          >
                            {ok ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span>{cr.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <details className="p-2 rounded bg-[#0c1627] border border-slate-700 text-[11px] text-slate-300">
                      <summary className="cursor-pointer font-mono font-bold text-amber-300">
                        View SOP Hint
                      </summary>
                      <p className="mt-1.5 leading-relaxed text-slate-200">{currentChallengeDef.expectedAction}</p>
                    </details>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          jumpToTarget({
                            screen: currentChallengeDef.scadaScreen,
                            tag: currentChallengeDef.focusTag,
                            label: currentChallengeDef.title,
                          })
                        }
                        className="py-2 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open SCADA
                      </button>
                      <button
                        onClick={() => startChallenge(currentChallengeDef.id)}
                        className="py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restart
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2 rounded bg-amber-950/35 border border-amber-500/40 text-[11px] text-amber-100">
                      Mỗi bài thử thách kéo dài <strong>4 phút</strong> (hỗ trợ tua nhanh 5x/10x trên TopBar), tự bơm sự cố thực vào hệ SCADA và chấm <strong>PASSED / FAILED</strong> theo 3 tiêu chí Tag.
                    </div>
                    {TRAINING_CHALLENGES.map((ch) => (
                      <div
                        key={ch.id}
                        className="p-2.5 rounded-lg bg-[#0c1627] border border-[#243b61] hover:border-amber-400 transition space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-black text-[10px]">
                            {ch.code} · {ch.building}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">4 min · 3 criteria</span>
                        </div>
                        <div className="font-bold text-white text-xs">{ch.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-2">{ch.scenarioDesc}</div>
                        <button
                          onClick={() => startChallenge(ch.id)}
                          className="w-full py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" /> Start Challenge
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plant3DTrainingScreen;
