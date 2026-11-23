import type { DetailedPipe3D, InlineSensor3D, InlineValve3D } from './b5Chiller3dDetail.ts';
import type { DetailedDuct3D } from './b5M1f3dDetail.ts';

export interface B23fDetailAssembly {
  pipes: DetailedPipe3D[];
  ducts: DetailedDuct3D[];
  valves: InlineValve3D[];
  sensors: InlineSensor3D[];
}

export const B23F_CEILING_Y = 3.85; // Cleanroom suspended ceiling panel height
export const B23F_PLENUM_TOP_Y = 6.1; // Roof slab above 3F overhead utility plenum
export const B23F_HALF_X = 18.0; // X = -18 .. +18 (36m wide)
export const B23F_HALF_Z = 12.5; // Z = -12.5 .. +12.5 (25m deep)

/**
 * Generates the complete 3D MEP assembly for Building 2 — 3rd Floor Optics Cleanroom (`b2_3f`):
 *   - ABOVE CEILING PANEL (Y = 4.0 .. 5.8m):
 *       1. ONLY the 3F PCW branches from Scr_B2_PCW.Pdl:
 *          * B2 3F DISCO DICING (CLEAN LINE)
 *          * B2 3F GRINDING 1 & 2 / SURFACE GRINDING (GRINDING 01-02)
 *          * B2 3F WAX / CLEANING (CL-2 / PO-2.1)
 *          * B2 3F OPTICAL POLISHING & END-OF-LINE LOOP -> carries B21F_DPT10601 (Supply) & B21F_TT10603 (Return)!
 *          Each 3F process tool receives slender vertical PCW drops (radius 0.036m) descending cleanly from ceiling!
 *       2. FFU-3F-01 (B22F_FFU01) blowing laminar clean air downward into Optical Mounting
 *       3. FCU-3F-02 (B23F_FCU02) with CHW supply/return & motorized XV valve B23F_FCU02V blowing cool air downward into 3F Office
 *       4. Toilet Exhaust Fans TEF-3F-01 & TEF-3F-02 ceiling exhaust ducts
 *       5. Process Vacuum End-of-Line Header carrying B23F_PIT1302 (-73.8 kPa)
 *   - BELOW CEILING PANEL (Y = 0 .. 3.85m):
 *       * Column-mounted cleanroom environmental sensors (M3F AHU01..11 RAT/RAH & FCU02RT1) inside all 11 color-coded 3F zones!
 */
export function buildB23fDetailAssembly(): B23fDetailAssembly {
  const pipes: DetailedPipe3D[] = [];
  const ducts: DetailedDuct3D[] = [];
  const valves: InlineValve3D[] = [];
  const sensors: InlineSensor3D[] = [];

  const pcwPumps = ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'];
  const chwpTags = ['B51F_CH11CHWP', 'B51F_CH12CHWP', 'B51F_CH13CHWP'];
  const pvTags = ['B51F_PV1301A', 'B51F_PV1301B'];

  // =========================================================================
  // 1. 3F OVERHEAD PCW BRANCHES (EXACT MATCH TO Scr_B2_PCW.Pdl 3F LOOPS!)
  //    With SLENDER vertical drops (radius 0.036m) piercing ceiling straight INTO 3F tools!
  // =========================================================================
  const Y_PCW_SUP = 5.1;
  const Y_PCW_RET = 4.82;
  const X_SUP_TRUNK = -16.8;
  const X_RET_TRUNK = -16.3;

  pipes.push(
    {
      id: 'b23f_pcw_sup_trunk',
      layer: 'pcw',
      fluid: 'pcw',
      flowSourceTags: pcwPumps,
      points: [
        [X_SUP_TRUNK, Y_PCW_SUP, -11.5],
        [X_SUP_TRUNK, Y_PCW_SUP, 8.2],
      ],
      radius: 0.095,
      particleCount: 9,
    },
    {
      id: 'b23f_pcw_ret_trunk',
      layer: 'pcw',
      fluid: 'pcw_ret',
      flowSourceTags: pcwPumps,
      points: [
        [X_RET_TRUNK, Y_PCW_RET, 7.8],
        [X_RET_TRUNK, Y_PCW_RET, -11.5],
      ],
      radius: 0.095,
      particleCount: 9,
    }
  );

  // 3 Overhead 3F PCW Branch Rows matching Disco Dicing, Grinding 1/2, Wax/Cleaning, and Optical Polishing EoL!
  const pcw3fRows: { code: string; zSup: number; zRet: number; endX: number; tools: { x: number; topY: number }[] }[] = [
    {
      // Rear Row: Disco Dicing (-13.5), Grinding 1 (-4.5), Grinding 2 (+4.5), Wax Clean Line (+13.5)
      code: 'row1_dicing_grind_wax',
      zSup: -7.8,
      zRet: -8.2,
      endX: 15.0,
      tools: [
        { x: -13.5, topY: 2.15 },
        { x: -4.5, topY: 2.15 },
        { x: 4.5, topY: 2.15 },
        { x: 13.5, topY: 2.15 },
      ],
    },
    {
      // Mid Row: Cleaning Room (-13.5), 3F Clean Line (-4.5)
      code: 'row2_cleaning',
      zSup: 0.2,
      zRet: -0.2,
      endX: -2.0,
      tools: [
        { x: -13.5, topY: 0.98 },
        { x: -4.5, topY: 2.15 },
      ],
    },
    {
      // Front Row: 3F Optical Polishing & END-OF-LINE LOOP (carries B21F_DPT10601 & B21F_TT10603!)
      code: 'row3_polishing_eol',
      zSup: 8.2,
      zRet: 7.8,
      endX: 4.8,
      tools: [
        { x: -2.5, topY: 2.15 },
        { x: 3.0, topY: 0.98 },
      ],
    },
  ];

  for (const row of pcw3fRows) {
    pipes.push(
      {
        id: `b23f_pcw_sup_${row.code}`,
        layer: 'pcw',
        fluid: 'pcw',
        flowSourceTags: pcwPumps,
        points: [
          [X_SUP_TRUNK, Y_PCW_SUP, row.zSup],
          [row.endX, Y_PCW_SUP, row.zSup],
        ],
        radius: 0.072,
        particleCount: 7,
      },
      {
        id: `b23f_pcw_ret_${row.code}`,
        layer: 'pcw',
        fluid: 'pcw_ret',
        flowSourceTags: pcwPumps,
        points: [
          [row.endX, Y_PCW_RET, row.zRet],
          [X_RET_TRUNK, Y_PCW_RET, row.zRet],
        ],
        radius: 0.072,
        particleCount: 7,
      }
    );

    row.tools.forEach((tool, ti) => {
      pipes.push(
        {
          id: `b23f_pcw_drop_sup_${row.code}_${ti}`,
          layer: 'pcw',
          fluid: 'pcw',
          flowSourceTags: pcwPumps,
          points: [
            [tool.x - 0.18, Y_PCW_SUP, row.zSup],
            [tool.x - 0.18, tool.topY, row.zSup],
          ],
          radius: 0.036,
          particleCount: 3,
        },
        {
          id: `b23f_pcw_drop_ret_${row.code}_${ti}`,
          layer: 'pcw',
          fluid: 'pcw_ret',
          flowSourceTags: pcwPumps,
          points: [
            [tool.x + 0.18, tool.topY, row.zRet],
            [tool.x + 0.18, Y_PCW_RET, row.zRet],
          ],
          radius: 0.036,
          particleCount: 3,
        }
      );
    });
  }

  // Exact SCADA End-of-Line PCW Sensors mounted on 3F Polishing EoL loop!
  sensors.push(
    {
      id: 'sn_b23f_dpt10601',
      layer: 'pcw',
      tag: 'B21F_DPT10601',
      shortLabel: 'DPT10601',
      pos: [0.2, Y_PCW_SUP + 0.56, 8.2],
      fluid: 'pcw',
    },
    {
      id: 'sn_b23f_tt10603',
      layer: 'pcw',
      tag: 'B21F_TT10603',
      shortLabel: 'TT10603',
      pos: [0.2, Y_PCW_RET + 0.56, 7.2],
      fluid: 'pcw_ret',
    }
  );

  // =========================================================================
  // 2. OVERHEAD 3F PROCESS VACUUM HEADER (B23F_PIT1302) ABOVE CEILING PANEL!
  // =========================================================================
  const Y_PV = 5.52;
  pipes.push({
    id: 'b23f_pv_eol_header',
    layer: 'ac',
    fluid: 'vac',
    flowSourceTags: pvTags,
    points: [
      [-15.5, Y_PV, 4.4],
      [4.5, Y_PV, 4.4],
    ],
    radius: 0.085,
    particleCount: 7,
  });
  sensors.push({
    id: 'sn_b23f_pit1302',
    layer: 'ac',
    tag: 'B23F_PIT1302',
    shortLabel: 'PIT1302 (PV)',
    pos: [-1.5, Y_PV + 0.56, 4.4],
    fluid: 'vac',
  });

  // =========================================================================
  // 3. OVERHEAD 3F FFU-3F-01, FCU-3F-02 (+ XV VALVE B23F_FCU02V) & TOILET TEF-3F-01/02
  //    - Solid FCU/FFU discharge plenum stops AT ceiling face (Y = 3.85m); ONLY cool-air droplets descend into rooms!
  //    - TEF-3F-01/02 each have a vertical suction pickup reaching down to ceiling face (Y = 3.85m) pulling air UP -> OUT!
  // =========================================================================
  // FFU-3F-01 short collar to ceiling + particles-only laminar clean air stream descending into Optical Mounting!
  ducts.push(
    {
      id: 'b23f_ffu01_neck',
      kind: 'supply',
      flowSourceTags: ['B22F_FFU01'],
      points: [
        [-12.0, 4.02, 8.2],
        [-12.0, B23F_CEILING_Y, 8.2],
      ],
      width: 0.78,
      height: 0.78,
      particleCount: 1,
    },
    {
      id: 'b23f_ffu01_blow',
      kind: 'supply',
      flowSourceTags: ['B22F_FFU01'],
      points: [
        [-12.0, B23F_CEILING_Y - 0.04, 8.2],
        [-12.0, 1.55, 8.2],
      ],
      width: 0.78,
      height: 0.78,
      particlesOnly: true,
      particleCount: 6,
    }
  );

  // FCU-3F-02 CHW piping + B23F_FCU02V + short ceiling collar + particles-only cool-air stream into 3F Office!
  pipes.push(
    {
      id: 'b23f_fcu02_chws',
      layer: 'chiller',
      fluid: 'chw',
      flowSourceTags: chwpTags,
      requireAllTags: ['B23F_FCU02V'],
      points: [
        [10.2, 4.75, -11.5],
        [10.2, 4.75, 8.2],
        [10.2, 4.35, 8.2],
      ],
      radius: 0.06,
      particleCount: 7,
    },
    {
      id: 'b23f_fcu02_chwr',
      layer: 'chiller',
      fluid: 'chwr',
      flowSourceTags: chwpTags,
      requireAllTags: ['B23F_FCU02V'],
      points: [
        [11.0, 4.35, 8.2],
        [11.0, 4.45, 8.2],
        [11.0, 4.45, -11.5],
      ],
      radius: 0.06,
      particleCount: 7,
    }
  );
  valves.push({
    id: 'vl_b23f_fcu02v',
    layer: 'chiller',
    tag: 'B23F_FCU02V',
    shortLabel: 'FCU02V',
    pos: [10.2, 4.75, 6.2],
    orientation: 'horizontal_z',
    valveStyle: 'xv',
  });
  ducts.push(
    {
      id: 'b23f_fcu02_neck',
      kind: 'supply',
      flowSourceTags: ['B23F_FCU02'],
      points: [
        [10.6, 4.18, 8.2],
        [10.6, B23F_CEILING_Y, 8.2],
      ],
      width: 0.62,
      height: 0.62,
      particleCount: 1,
    },
    {
      id: 'b23f_fcu02_blow',
      kind: 'supply',
      flowSourceTags: ['B23F_FCU02'],
      points: [
        [10.6, B23F_CEILING_Y - 0.04, 8.2],
        [10.6, 1.6, 8.2],
      ],
      width: 0.62,
      height: 0.62,
      particlesOnly: true,
      particleCount: 6,
    }
  );

  // Toilet Exhaust Fans TEF-3F-01 & TEF-3F-02: Vertical suction drop down to ceiling edge (Y=3.85m) pulling room air UP -> THROUGH fan -> OUT!
  for (const [id, tag, z] of [
    ['tef01', 'B23F_TEF01', 6.2],
    ['tef02', 'B23F_TEF02', 10.2],
  ] as const) {
    ducts.push({
      id: `b23f_exh_${id}`,
      kind: 'exhaust',
      flowSourceTags: [tag],
      points: [
        [13.4, B23F_CEILING_Y, z],
        [13.4, 5.25, z],
        [15.4, 5.25, z],
        [18.0, 5.25, z],
      ],
      width: 0.52,
      height: 0.45,
      particleCount: 5,
    });
  }

  // =========================================================================
  // 4. COLUMN-MOUNTED CLEANROOM ENVIRONMENTAL SENSORS BELOW CEILING (Y = 1.7m)
  // =========================================================================
  const roomSensors: { tag: string; lbl: string; pos: [number, number, number] }[] = [
    // Rear Row (Disco Dicing, Grinding 1, Grinding 2, Wax Clean Line)
    { tag: 'B2M3F_AHU01_RAT', lbl: 'DICE T', pos: [-13.5, 1.85, -4.4] },
    { tag: 'B2M3F_AHU02_RAT', lbl: 'GRD1 T', pos: [-4.5, 1.85, -4.4] },
    { tag: 'B2M3F_AHU03_RAT', lbl: 'GRD2 T', pos: [4.5, 1.85, -4.4] },
    { tag: 'B2M3F_AHU04_RAT', lbl: 'WAX T', pos: [13.5, 1.85, -4.4] },
    // Mid Row (Cleaning Room, 3F Clean Line, Assembly Workshop, Assembly Inspection)
    { tag: 'B2M3F_AHU05_RAT', lbl: 'CLN T', pos: [-13.5, 1.85, 3.6] },
    { tag: 'B2M3F_AHU06_RAT', lbl: 'CLNL T', pos: [-4.5, 1.85, 3.6] },
    { tag: 'B2M3F_AHU07_RAT', lbl: 'ASSY T', pos: [4.5, 1.85, 3.6] },
    { tag: 'B2M3F_AHU08_RAT', lbl: 'INSP T', pos: [13.5, 1.85, 3.6] },
    // Front Row (Optical Mounting, 3F Polishing, Hand Clean / 3F Office)
    { tag: 'B2M3F_AHU09_RAT', lbl: 'OPT T', pos: [-12.0, 1.85, 10.6] },
    { tag: 'B2M3F_AHU10_RAT', lbl: 'POL3F T', pos: [0.0, 1.85, 10.6] },
    { tag: 'B2M3F_AHU11_RAT', lbl: 'HAND T', pos: [7.8, 1.85, 10.6] },
    { tag: 'B23F_FCU02RT1', lbl: '3F OFF T', pos: [12.0, 1.85, 10.6] },
  ];

  for (const rs of roomSensors) {
    sensors.push({
      id: `sn_b23f_${rs.tag}`,
      layer: 'ac',
      tag: rs.tag,
      shortLabel: rs.lbl,
      pos: rs.pos,
      fluid: 'air',
      kind: 'room_sensor',
    });
  }

  return { pipes, ducts, valves, sensors };
}
