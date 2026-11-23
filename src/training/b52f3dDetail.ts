import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B52fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B52F_CEILING_Y = 3.85; // Cleanroom suspended ceiling panel height (dividing cleanroom below & utility plenum above!)
export const B52F_PLENUM_TOP_Y = 6.1; // Structural roof slab above 2F overhead utility plenum
export const B52F_HALF_X = 18.0; // X = -18 .. +18 (36m wide)
export const B52F_HALF_Z = 13.0; // Z = -13 .. +13 (26m deep)

/**
 * Generates the 100% SCADA- & Scr_B5_2F_Overview-faithful 3D assembly for Building 5 — 2nd Floor Cleanroom (`b5_2f`):
 *   - BELOW CEILING (Y = 0 .. 3.85m): Cleanroom Environmental Sensors mounted on columns + SLENDER vertical PCW
 *     Supply/Return drop pipes descending from ceiling plenum directly INTO every Production & Edge Grind tool!
 *   - ABOVE CEILING PANEL (Y = 4.1 .. 5.9m): All 2F Overhead Utility Plenum Piping & Instruments:
 *       1. 3× RO-DI Distribution Loops (PCV/PIT/FIT 10701 Disco Dicing, 10702 Sand Blasting, 10703 Cleaning)
 *       2. 2F PCW Process Cooling Network matching Scr_B5_PCW.Pdl (Production Area F-03C/F-01/F-03F, Auto Grind F-04/C-01,
 *          Edge Grind E-01 with DPT10501 on Supply & TT10503 on Return) + slender drops straight into the tools below!
 *       3. 2F Process Vacuum EoL Header (B52F_PIT1303)
 *       4. 2F Process Exhaust Rectangular Duct Headers (PIT11201 & PIT11202)
 */
export function buildB52fDetailAssembly(): B52fDetailAssembly {
  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const pcwTags = ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'];
  const pvTags = ['B51F_PV1301A', 'B51F_PV1301B'];

  // =========================================================================
  // 1. OVERHEAD UTILITY PLENUM (ABOVE Y = 3.85m CEILING PANEL!): 3× RO-DI LOOPS
  // =========================================================================
  const X_DI_SUP = 1.4;
  const X_DI_RET = 2.0;
  const X_DI_END = 16.6;
  const Y_DI_SUP = 4.58;
  const Y_DI_RET = 4.24;

  pipes.push(
    {
      id: 'b52f_di_sup_main',
      layer: 'di',
      fluid: 'di_sup',
      flowSourceTags: ['B52F_PCV10701', 'B52F_PCV10702', 'B52F_PCV10703'],
      points: [
        [X_DI_SUP, Y_DI_SUP, -11.8],
        [X_DI_SUP, Y_DI_SUP, 4.8],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    {
      id: 'b52f_di_ret_main',
      layer: 'di',
      fluid: 'di_ret',
      flowSourceTags: ['B52F_PCV10701', 'B52F_PCV10702', 'B52F_PCV10703'],
      points: [
        [X_DI_RET, Y_DI_RET, 4.8],
        [X_DI_RET, Y_DI_RET, -11.8],
      ],
      radius: 0.095,
      particleCount: 9,
    }
  );

  for (const loop of [
    { z: -8.6, code: '10701', pcv: 'B52F_PCV10701', pit: 'B52F_PIT10701', fit: 'B52F_FIT10701' },
    { z: -2.6, code: '10702', pcv: 'B52F_PCV10702', pit: 'B52F_PIT10702', fit: 'B52F_FIT10702' },
    { z: 4.8, code: '10703', pcv: 'B52F_PCV10703', pit: 'B52F_PIT10703', fit: 'B52F_FIT10703' },
  ] as const) {
    pipes.push(
      {
        id: `b52f_di_sup_${loop.code}`,
        layer: 'di',
        fluid: 'di_sup',
        flowSourceTags: [loop.pcv],
        points: [
          [X_DI_SUP, Y_DI_SUP, loop.z],
          [X_DI_END, Y_DI_SUP, loop.z],
          [X_DI_END, Y_DI_RET, loop.z],
        ],
        radius: 0.08,
        particleCount: 6,
      },
      {
        id: `b52f_di_ret_${loop.code}`,
        layer: 'di',
        fluid: 'di_ret',
        flowSourceTags: [loop.pcv],
        points: [
          [X_DI_END, Y_DI_RET, loop.z],
          [X_DI_RET, Y_DI_RET, loop.z],
        ],
        radius: 0.08,
        particleCount: 5,
      }
    );
    valves.push({
      id: `vl_2f_pcv${loop.code}`,
      layer: 'di',
      tag: loop.pcv,
      shortLabel: `PCV${loop.code}`,
      pos: [X_DI_SUP + 3.2, Y_DI_SUP, loop.z],
      orientation: 'horizontal_x',
      valveStyle: 'control',
    });
    sensors.push(
      { id: `sn_2f_pit${loop.code}`, layer: 'di', tag: loop.pit, shortLabel: `PIT${loop.code}`, pos: [X_DI_SUP + 7.4, Y_DI_SUP + 0.55, loop.z], fluid: 'di_sup' },
      { id: `sn_2f_fit${loop.code}`, layer: 'di', tag: loop.fit, shortLabel: `FIT${loop.code}`, pos: [X_DI_SUP + 11.4, Y_DI_SUP + 0.55, loop.z], fluid: 'di_sup' }
    );
  }

  // =========================================================================
  // 2. OVERHEAD 2F PCW PROCESS COOLING NETWORK (EXACT MATCH TO Scr_B5_PCW.Pdl!)
  //    Serves Production Area (Auto Grind / Production F-03C, F-01, F-03F, F-04, C-01 & Edge Grind E-01)
  //    with SLENDER vertical Supply (#00cfe8) & Return (#009999) drops penetrating ceiling straight INTO each tool!
  // =========================================================================
  const Y_PCW_SUP = 5.1;
  const Y_PCW_RET = 4.82;
  const X_PCW_SUP_TRUNK = 0.65;
  const X_PCW_RET_TRUNK = 1.05;
  const X_PCW_END = 15.8;

  // Main Vertical/Longitudinal PCW Supply & Return Trunks feeding all 3 Production/Grind tool rows
  pipes.push(
    {
      id: 'b52f_pcw_sup_trunk',
      layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: pcwTags,
      points: [
        [X_PCW_SUP_TRUNK, Y_PCW_SUP, -11.8],
        [X_PCW_SUP_TRUNK, Y_PCW_SUP, 7.8],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    {
      id: 'b52f_pcw_ret_trunk',
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwTags,
      points: [
        [X_PCW_RET_TRUNK, Y_PCW_RET, 7.4],
        [X_PCW_RET_TRUNK, Y_PCW_RET, -11.8],
      ],
      radius: 0.095,
      particleCount: 9,
    }
  );

  // 3 Overhead PCW Distribution Branches over Production Area Tool Rows + Slender Drops INTO Every Tool!
  const pcwToolRows: {
    code: string;
    zSup: number;
    zRet: number;
    tools: { x: number; topY: number }[];
  }[] = [
    // Row 1: Production Area / Auto Grind (F-03C, F-01, F-03F, F-04) — Z = -6.2
    {
      code: 'row1',
      zSup: -6.0,
      zRet: -6.4,
      tools: [
        { x: 3.5, topY: 2.15 },
        { x: 9.0, topY: 2.15 },
        { x: 14.5, topY: 2.15 },
      ],
    },
    // Row 2: Production Area / Auto Grind (C-01, F-07) — Z = +1.0
    {
      code: 'row2',
      zSup: 1.2,
      zRet: 0.8,
      tools: [
        { x: 3.5, topY: 2.15 },
        { x: 9.0, topY: 2.15 },
        { x: 14.5, topY: 2.15 },
      ],
    },
    // Row 3: Edge Grind Area (E-01) — Z = +7.6 (hosts DPT10501 on Supply & TT10503 on Return per SCADA!)
    {
      code: 'edge',
      zSup: 7.8,
      zRet: 7.4,
      tools: [
        { x: 4.8, topY: 0.96 },
        { x: 12.2, topY: 0.96 },
      ],
    },
  ];

  for (const row of pcwToolRows) {
    // Overhead branch Supply (#00cfe8) & Return (#009999) above ceiling
    pipes.push(
      {
        id: `b52f_pcw_sup_${row.code}`,
        layer: 'pcw',
        fluid: 'pcw',
        flowSourceTags: pcwTags,
        points: [
          [X_PCW_SUP_TRUNK, Y_PCW_SUP, row.zSup],
          [X_PCW_END, Y_PCW_SUP, row.zSup],
        ],
        radius: 0.075,
        particleCount: 6,
      },
      {
        id: `b52f_pcw_ret_${row.code}`,
        layer: 'pcw',
        fluid: 'pcw_ret',
        flowSourceTags: pcwTags,
        points: [
          [X_PCW_END, Y_PCW_RET, row.zRet],
          [X_PCW_RET_TRUNK, Y_PCW_RET, row.zRet],
        ],
        radius: 0.075,
        particleCount: 6,
      }
    );

    // SLENDER Vertical Supply & Return Drop Pipes (radius = 0.036m!) piercing ceiling straight INTO each tool!
    row.tools.forEach((tool, ti) => {
      pipes.push(
        {
          id: `b52f_pcw_drop_sup_${row.code}_${ti}`,
          layer: 'pcw',
          fluid: 'pcw',
          flowSourceTags: pcwTags,
          points: [
            [tool.x - 0.25, Y_PCW_SUP, row.zSup],
            [tool.x - 0.25, tool.topY, row.zSup],
          ],
          radius: 0.036,
          particleCount: 3,
        },
        {
          id: `b52f_pcw_drop_ret_${row.code}_${ti}`,
          layer: 'pcw',
          fluid: 'pcw_ret',
          flowSourceTags: pcwTags,
          points: [
            [tool.x + 0.25, tool.topY, row.zRet],
            [tool.x + 0.25, Y_PCW_RET, row.zRet],
          ],
          radius: 0.036,
          particleCount: 3,
        }
      );
    });
  }

  // Exact SCADA End-of-Line PCW Sensors on Edge Grind Area (E-01) branch: DPT10501 (Supply) & TT10503 (Return)!
  sensors.push(
    { id: 'sn_2f_dpt10501', layer: 'pcw', tag: 'B51F_DPT10501', shortLabel: 'DPT10501', pos: [8.6, Y_PCW_SUP + 0.55, 7.8], fluid: 'pcw' },
    { id: 'sn_2f_tt10503', layer: 'pcw', tag: 'B51F_TT10503', shortLabel: 'TT10503', pos: [8.6, Y_PCW_RET + 0.55, 7.4], fluid: 'pcw_ret' }
  );

  // =========================================================================
  // 3. OVERHEAD UTILITY PLENUM: 2F PROCESS VACUUM HEADER (B52F_PIT1303)
  // =========================================================================
  const Y_PV_PLENUM = 5.38;
  const Z_PV_LINE = 3.5;
  pipes.push({
    id: 'b52f_pv_eol_header',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: pvTags,
    points: [
      [-16.2, Y_PV_PLENUM, Z_PV_LINE],
      [15.8, Y_PV_PLENUM, Z_PV_LINE],
    ],
    radius: 0.1,
    particleCount: 10,
  });
  sensors.push({
    id: 'sn_2f_pit1303',
    layer: 'ac',
    tag: 'B52F_PIT1303',
    shortLabel: 'PIT1303 (PV)',
    pos: [-11.5, Y_PV_PLENUM + 0.55, Z_PV_LINE],
    fluid: 'vac',
  });

  // =========================================================================
  // 4. OVERHEAD UTILITY PLENUM: 2F PROCESS EXHAUST RECTANGULAR DUCT HEADERS
  // =========================================================================
  const Y_EXH_PLENUM = 5.55;
  ducts.push(
    {
      id: 'b52f_exh_duct_1',
      kind: 'exhaust',
      flowSourceTags: ['B5M2F_FA11201A'],
      points: [
        [-16.5, Y_EXH_PLENUM, -4.6],
        [-1.0, Y_EXH_PLENUM, -4.6],
      ],
      width: 0.85,
      height: 0.72,
      particleCount: 6,
    },
    {
      id: 'b52f_exh_duct_2',
      kind: 'exhaust',
      flowSourceTags: ['B5M2F_FA11203A'],
      points: [
        [-16.5, Y_EXH_PLENUM, 2.2],
        [15.5, Y_EXH_PLENUM, 2.2],
      ],
      width: 0.85,
      height: 0.72,
      particleCount: 8,
    }
  );
  sensors.push(
    { id: 'sn_2f_pit11201', layer: 'ac', tag: 'B51F_PIT11201', shortLabel: 'PIT11201', pos: [-6.5, Y_EXH_PLENUM + 0.36 + 0.55, -4.6], fluid: 'exh' },
    { id: 'sn_2f_pit11202', layer: 'ac', tag: 'B51F_PIT11202', shortLabel: 'PIT11202', pos: [-5.5, Y_EXH_PLENUM + 0.36 + 0.55, 2.2], fluid: 'exh' }
  );

  // =========================================================================
  // 5. COLUMN-MOUNTED CLEANROOM ENVIRONMENTAL SENSORS (BELOW Y = 3.85m CEILING!)
  // =========================================================================
  sensors.push(
    { id: 'sn_2f_ahu04_rt', layer: 'ac', tag: 'B5M2F_AHU04_RAT', shortLabel: 'AHU04 T', pos: [-6.0, 2.35, -7.22], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu04_rh', layer: 'ac', tag: 'B5M2F_AHU04_RAH', shortLabel: 'AHU04 RH', pos: [-6.0, 1.45, -7.22], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu01_rt', layer: 'ac', tag: 'B5M2F_AHU01_RAT', shortLabel: 'AHU01 T', pos: [-9.2, 2.35, 2.18], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu01_rh', layer: 'ac', tag: 'B5M2F_AHU01_RAH', shortLabel: 'AHU01 RH', pos: [-9.2, 1.45, 2.18], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu02_rt', layer: 'ac', tag: 'B5M2F_AHU02_RAT', shortLabel: 'AHU02 T', pos: [6.0, 2.35, -2.12], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu02_rh', layer: 'ac', tag: 'B5M2F_AHU02_RAH', shortLabel: 'AHU02 RH', pos: [6.0, 1.45, -2.12], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu02_dp', layer: 'ac', tag: 'B5M2F_AHU02_DP', shortLabel: 'AHU02 DP', pos: [12.0, 1.9, 4.58], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu03_rt', layer: 'ac', tag: 'B5M2F_AHU03_RAT', shortLabel: 'AHU03 T', pos: [-4.5, 2.35, 9.18], fluid: 'air', kind: 'room_sensor' },
    { id: 'sn_2f_ahu03_rh', layer: 'ac', tag: 'B5M2F_AHU03_RAH', shortLabel: 'AHU03 RH', pos: [-4.5, 1.45, 9.18], fluid: 'air', kind: 'room_sensor' }
  );

  return { pipes, ducts, valves, sensors };
}
