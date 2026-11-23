import React from 'react';
import { useB5Store } from '../store/b5Store.ts';
import {
  PipeArrow,
  PipeSensorBadge,
  WinccPipeNetwork,
  WinccValveSymbol,
} from '../components/scada/PidPrimitives.tsx';
import { StatusLegend } from '../components/scada/StatusLegend.tsx';
import { IndustrialFanSvg } from '../components/scada/IndustrialFanIcon.tsx';

/**
 * Scr_B2_AIR_FCU.Pdl — Building 2 Office & Lobby Fan Coil Units (1F & 3F) with Motorized CHW XV Valves
 *  - 1st Floor: B21F_FCU01..04 + XV Valves B21F_FCU01V..04V (Fpl_XVAL) + B21F_FCU01RT1..04RT1
 *  - 3rd Floor: B23F_FCU02 + XV Valve B23F_FCU02V (Fpl_XVAL) + B23F_FCU02RT1
 *  - Fed live from Building 5 Central Chiller Plant (B51F_CHSTS1)
 *  - Click any XV Valve -> Fpl_XVAL; click any FCU -> Fpl_DOL; click any RT1 sensor -> Fpl_Sensor
 */
export const B2AirFcuScreen: React.FC = () => {
  const plant = useB5Store((s) => s.plant);
  const openFaceplate = useB5Store((s) => s.openFaceplate);

  const anyChwpRun = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'].some(
    (t) => plant.equipment[t].status === 'RUNNING'
  );

  const floor1Fcus = [
    { tag: 'B21F_FCU01', vTag: 'B21F_FCU01V', rt: 'B21F_FCU01RT1', code: 'FCU-B2-1F-01', vLbl: 'FCU01V', room: 'COATING MATERIAL RM', x: 240 },
    { tag: 'B21F_FCU02', vTag: 'B21F_FCU02V', rt: 'B21F_FCU02RT1', code: 'FCU-B2-1F-02', vLbl: 'FCU02V', room: '1F OFFICE AREA', x: 500 },
    { tag: 'B21F_FCU03', vTag: 'B21F_FCU03V', rt: 'B21F_FCU03RT1', code: 'FCU-B2-1F-03', vLbl: 'FCU03V', room: '1F LOBBY / REST AREA', x: 760 },
    { tag: 'B21F_FCU04', vTag: 'B21F_FCU04V', rt: 'B21F_FCU04RT1', code: 'FCU-B2-1F-04', vLbl: 'FCU04V', room: 'SAND PLATING / MTG', x: 1020 },
  ];

  const floor3Fcus = [
    { tag: 'B23F_FCU02', vTag: 'B23F_FCU02V', rt: 'B23F_FCU02RT1', code: 'FCU-B2-3F-02', vLbl: 'FCU02V', room: '3F OFFICE / HALL', x: 630 },
  ];

  const renderFcuCard = (
    item: { tag: string; vTag: string; rt: string; code: string; vLbl: string; room: string; x: number },
    y: number,
    yValve: number
  ) => {
    const eq = plant.equipment[item.tag];
    const valve = plant.valves[item.vTag];
    const rt = plant.sensors[item.rt];
    const isRun = eq.status === 'RUNNING';
    const isTransit = eq.status === 'STARTING' || eq.status === 'STOPPING';

    return (
      <g key={item.tag}>
        {/* Motorized CHW Isolation XV Valve directly upstream of the FCU! */}
        {valve && (
          <WinccValveSymbol
            x={item.x - 24}
            y={yValve}
            valve={valve}
            shortLabel={item.vLbl}
            vertical
            onClick={() => openFaceplate('Fpl_XVAL', item.vTag, `Fpl_XVAL · ${item.vTag} (${item.code})`)}
          />
        )}

        <rect
          x={item.x - 102}
          y={y - 24}
          width={204}
          height={178}
          rx={5}
          fill="#cbd5e1"
          fillOpacity={0.55}
          stroke="#334155"
          strokeWidth={1.3}
          strokeDasharray="4 2"
        />
        <text x={item.x} y={y - 8} textAnchor="middle" fill="#0f172a" fontSize="8.8" fontFamily="monospace" fontWeight="900">
          {item.room}
        </text>

        <g
          data-scada-tag={item.tag}
          transform={`translate(${item.x - 66}, ${y + 6})`}
          onClick={() => openFaceplate('Fpl_DOL', item.tag, `Fpl_DOL · ${item.code}`)}
          className="cursor-pointer group"
        >
          <rect
            x={0}
            y={0}
            width={132}
            height={74}
            rx={4}
            fill={isRun ? '#bbf7d0' : isTransit ? '#bfdbfe' : eq.faulted ? '#fecaca' : '#e2e8f0'}
            fillOpacity={0.78}
            stroke={eq.faulted ? '#dc2626' : isRun ? '#16a34a' : isTransit ? '#2563eb' : '#475569'}
            strokeWidth={1.6}
            className={eq.faulted ? 'animate-alarm-flash' : 'group-hover:stroke-blue-700'}
          />
          <image href="/scada/FCU.png" x={12} y={8} width={76} height={54} preserveAspectRatio="xMidYMid meet" />
          {/* Industrial 6-Blade HVAC Fan Indicator */}
          <IndustrialFanSvg x={110} y={22} radius={11.5} variant="hvac" status={eq.status} faulted={eq.faulted} isBadge />
          <text x={110} y={48} textAnchor="middle" fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            {eq.mode === 'AUTO' ? 'AUTO' : 'MAN'}
          </text>
          <text
            x={110}
            y={61}
            textAnchor="middle"
            fill={eq.faulted ? '#991b1b' : isRun ? '#14532d' : isTransit ? '#1d4ed8' : '#475569'}
            fontSize="8"
            fontFamily="monospace"
            fontWeight="900"
          >
            {eq.status}
          </text>
          <text x={66} y={87} textAnchor="middle" fill="#0f172a" fontSize="8.5" fontFamily="monospace" fontWeight="900">
            {item.code}
          </text>
        </g>

        <PipeSensorBadge
          x={item.x}
          y={y + 114}
          sensor={rt}
          shortLabel={item.rt}
          stemDir="bottom"
          labelPos="bottom"
          onClick={() => openFaceplate('Fpl_Sensor', item.rt, `Fpl_TIT · ${item.rt} (${item.room})`)}
        />
      </g>
    );
  };

  return (
    <div className="p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-white font-mono">
            Building 2 — Advanced Optics · Office & Lobby Fan Coil Units + CHW XV Valves (`Scr_B2_AIR_FCU.Pdl`)
          </h1>
          <p className="text-[11px] font-mono text-slate-400">
            CHW Supply from B5 CHSTS1: {plant.sensors['B51F_CHSTS1'].pv.toFixed(1)} °C · Click any XV Valve (`Fpl_XVAL`), FCU (`Fpl_DOL`), or Room Temp (`Fpl_TIT`)
          </p>
        </div>
        <StatusLegend />
      </div>

      <div className="bg-[#bcc2cb] border-2 border-[#475569] rounded shadow-inner overflow-x-auto">
        <svg viewBox="0 0 1240 690" className="w-full min-w-[1000px] h-auto select-none">
          <line x1={24} y1={348} x2={1216} y2={348} stroke="#475569" strokeWidth={1.2} strokeDasharray="4 4" />
          <text x={30} y={24} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 2 — 1ST FLOOR FCU ZONE (FCU-B2-1F-01..04 + MOTORIZED XV VALVES FCU01V..04V)
          </text>
          <text x={30} y={368} fill="#0f172a" fontSize="9.5" fontFamily="monospace" fontWeight="900">
            BUILDING 2 — 3RD FLOOR FCU ZONE (FCU-B2-3F-02 + MOTORIZED XV VALVE B23F_FCU02V)
          </text>

          {/* CHW Supply (#00cfe8) & Return (#009999) Headers with individual valve-gated branch flow */}
          <WinccPipeNetwork
            color="#00cfe8"
            strokeWidth={8}
            segments={[
              { d: 'M 72 658 L 72 46 L 1060 46', flowing: anyChwpRun },
              { d: 'M 72 390 L 660 390', flowing: anyChwpRun },
              ...floor1Fcus.map((f) => ({
                d: `M ${f.x - 24} 46 L ${f.x - 24} 150`,
                flowing: anyChwpRun && (plant.valves[f.vTag]?.openFB ?? false),
              })),
              {
                d: 'M 606 390 L 606 494',
                flowing: anyChwpRun && (plant.valves['B23F_FCU02V']?.openFB ?? false),
              },
            ]}
          />
          <WinccPipeNetwork
            color="#009999"
            strokeWidth={8}
            segments={[
              { d: 'M 96 658 L 96 62 L 1060 62', flowing: anyChwpRun, reverse: true },
              { d: 'M 96 406 L 660 406', flowing: anyChwpRun, reverse: true },
              ...floor1Fcus.map((f) => ({
                d: `M ${f.x + 24} 62 L ${f.x + 24} 150`,
                flowing: anyChwpRun && (plant.valves[f.vTag]?.openFB ?? false),
              })),
              {
                d: 'M 654 406 L 654 494',
                flowing: anyChwpRun && (plant.valves['B23F_FCU02V']?.openFB ?? false),
              },
            ]}
          />

          <PipeArrow x={72} y={240} dir="up" active={anyChwpRun} />
          <PipeArrow x={96} y={240} dir="down" active={anyChwpRun} />
          <PipeArrow x={370} y={46} dir="right" active={anyChwpRun} />
          <PipeArrow x={370} y={62} dir="left" active={anyChwpRun} />
          <PipeArrow x={370} y={390} dir="right" active={anyChwpRun} />
          <PipeArrow x={370} y={406} dir="left" active={anyChwpRun} />

          <text x={112} y={654} fill="#0f172a" fontSize="8" fontFamily="monospace" fontWeight="900">
            CHW SUPPLY / RETURN FROM BUILDING 5 CHILLER PLANT
          </text>

          {floor1Fcus.map((f) => renderFcuCard(f, 160, 102))}
          {floor3Fcus.map((f) => renderFcuCard(f, 504, 446))}
        </svg>
      </div>
    </div>
  );
};
