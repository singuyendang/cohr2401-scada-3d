import React, { useRef } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';
import type { OpenFaceplate } from '../../types/scada.ts';
import { FplVfdDol } from './FplVfdDol.tsx';
import { FplValve } from './FplValve.tsx';
import { FplPid } from './FplPid.tsx';
import { FplSensor } from './FplSensor.tsx';
import { FplDemand } from './FplDemand.tsx';
import { FplChiller } from './FplChiller.tsx';
import { FplProcessData } from './FplProcessData.tsx';
import { FplAhuPau } from './FplAhuPau.tsx';
import { FplPowerMeter } from './FplPowerMeter.tsx';

const DraggableWindow: React.FC<{ win: OpenFaceplate }> = ({ win }) => {
  const closeFaceplate = useB5Store((s) => s.closeFaceplate);
  const focusFaceplate = useB5Store((s) => s.focusFaceplate);
  const moveFaceplate = useB5Store((s) => s.moveFaceplate);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onPointerDownHeader = (e: React.PointerEvent) => {
    // CRITICAL FIX: never capture pointer or start drag when clicking a button (e.g., Close X)
    if ((e.target as HTMLElement).closest('button')) return;
    focusFaceplate(win.id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMoveHeader = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const nextX = Math.max(8, Math.min(window.innerWidth - 330, dragRef.current.origX + dx));
    const nextY = Math.max(56, Math.min(window.innerHeight - 100, dragRef.current.origY + dy));
    moveFaceplate(win.id, nextX, nextY);
  };

  const onPointerUpHeader = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      }
    }
  };

  const renderBody = () => {
    switch (win.type) {
      case 'Fpl_VFD':
      case 'Fpl_DOL':
        return <FplVfdDol tag={win.targetTag} />;
      case 'Fpl_CH':
        return <FplChiller tag={win.targetTag} mode="control" />;
      case 'Fpl_CHData':
        return <FplChiller tag={win.targetTag} mode="data" />;
      case 'Fpl_CVAL':
      case 'Fpl_XVAL':
        return <FplValve tag={win.targetTag} />;
      case 'Fpl_PID':
        return <FplPid pidTag={win.targetTag} />;
      case 'Fpl_Sensor':
        return <FplSensor tag={win.targetTag} />;
      case 'Fpl_Demand':
        return <FplDemand demandId={win.targetTag} />;
      case 'Fpl_AC':
        return <FplProcessData tag={win.targetTag} view="ac_control" />;
      case 'Fpl_ACVSDData':
        return <FplProcessData tag={win.targetTag} view="ac_vsd_data" />;
      case 'Fpl_ACFIXData':
        return <FplProcessData tag={win.targetTag} view="ac_fix_data" />;
      case 'Fpl_PV':
        return <FplProcessData tag={win.targetTag} view="pv_control" />;
      case 'Fpl_PVData':
        return <FplProcessData tag={win.targetTag} view="pv_data" />;
      case 'Fpl_AHU_DewPoint':
      case 'Fpl_PAU':
        return <FplAhuPau ahuTag={win.targetTag} />;
      case 'Fpl_PM8000':
      case 'Fpl_PMMFM383AC':
      case 'Fpl_PM2000':
        return <FplPowerMeter meterTag={win.targetTag} />;
      default:
        return (
          <div className="p-3 text-xs text-slate-300 font-mono">
            Faceplate {win.type} ({win.targetTag}) — scheduled in next phase.
          </div>
        );
    }
  };

  return (
    <div
      style={{ left: win.x, top: win.y, zIndex: win.zIndex }}
      onPointerDown={() => focusFaceplate(win.id)}
      className="fixed w-[364px] bg-[#dfe4ec] text-slate-900 border-2 border-[#475569] rounded-md shadow-[0_14px_34px_rgba(15,23,42,0.45)] overflow-hidden select-none"
    >
      {/* Classic WinCC Industrial Steel-Blue Title Bar (Light Faceplate Theme) */}
      <div
        onPointerDown={onPointerDownHeader}
        onPointerMove={onPointerMoveHeader}
        onPointerUp={onPointerUpHeader}
        className="h-8 px-2.5 bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#1e40af] border-b-2 border-[#1e3a8a] flex items-center justify-between cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-sky-100 shrink-0" />
          <span className="text-[11px] font-mono font-bold text-white truncate drop-shadow-sm">{win.title}</span>
        </div>
        <button
          type="button"
          aria-label="Close faceplate"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            closeFaceplate(win.id);
          }}
          className="w-6 h-5 flex items-center justify-center rounded bg-red-600 hover:bg-red-500 border border-red-900 text-white cursor-pointer shrink-0 transition shadow-sm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-[78vh] overflow-y-auto bg-[#e2e7ef] text-slate-900">{renderBody()}</div>
    </div>
  );
};

export const FaceplateManager: React.FC = () => {
  const openFaceplates = useB5Store((s) => s.openFaceplates);
  if (openFaceplates.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {openFaceplates.map((win) => (
        <div key={win.id} className="pointer-events-auto">
          <DraggableWindow win={win} />
        </div>
      ))}
    </div>
  );
};
