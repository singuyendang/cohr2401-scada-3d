import type { B5ScreenId, FaceplateType } from '../types/scada.ts';

export type Zone3DId =
  | 'site'
  | 'b5_chiller'
  | 'b5_m1f'
  | 'b5_2f'
  | 'b5_utilities'
  | 'b5_air'
  | 'b2_plant'
  | 'b2_2f'
  | 'b2_3f'
  | 'b2_m3f'
  | 'b3_plant'
  | 'b3_2f';

export type B51FLayerId = 'chiller' | 'pcw' | 'ac' | 'di';

export type Mesh3DType =
  | 'building'
  | 'water_chiller'
  | 'air_chiller'
  | 'heat_fan'
  | 'cooling_tower'
  | 'pump'
  | 'horizontal_pump'
  | 'tank'
  | 'phe'
  | 'compressor'
  | 'air_dryer'
  | 'air_filter'
  | 'metal_filter'
  | 'air_separator'
  | 'vacuum'
  | 'ahu'
  | 'fcu'
  | 'ffu'
  | 'pauct'
  | 'exhaust_fan'
  | 'duct_fan'
  | 'rodi_skid';

export type FluidType =
  | 'chw'
  | 'chwr'
  | 'cdw'
  | 'cdw_sup'
  | 'cdw_ret'
  | 'hw'
  | 'hw_sup'
  | 'hw_ret'
  | 'pcw'
  | 'pcw_ret'
  | 'air'
  | 'vac'
  | 'di'
  | 'di_sup'
  | 'di_ret'
  | 'exh';

export interface NodeTransformOverride {
  x: number;
  z: number;
  rotY: number; // radians: 0, PI/2, PI, 3*PI/2
}

export interface Equipment3DNode {
  id: string;
  tag: string; // Real PlantState equipment/valve/sensor tag (or building label for site view)
  label: string;
  zone: Zone3DId;
  layer?: B51FLayerId; // Subsystem layer inside unified Building 5 1F
  b2Layer?: 'pcw' | 'cleanroom'; // Subsystem layer inside Building 2 1F
  b3Layer?: 'outdoor' | 'warehouse'; // Subsystem layer inside Building 3 1F
  meshType: Mesh3DType;
  pos: [number, number, number]; // [x, baseY, z]
  rotY?: number;
  size: [number, number, number]; // [w, h, d] in meters
  scadaScreen: B5ScreenId;
  faceplateType?: FaceplateType;
  levelSensorTag?: string; // For live animated water level inside tanks
  statusTag?: string; // Optional override tag for running/fault status
  targetZoneOnClick?: Zone3DId; // For Site 3D buildings to fly directly into that building's zone
  buildingColor?: string;
}

export const B51F_CAMERA_PRESETS: Record<
  B51FLayerId | 'all',
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  all: { pos: [14, 34, 52], target: [14, 4.5, -1.5], label: 'All 1F' },
  chiller: { pos: [3, 19, 29], target: [0, 5.2, -2.5], label: 'Chiller & HR' },
  pcw: { pos: [-37, 11, 8], target: [-23.8, 2.4, 1.5], label: 'PCW' },
  ac: { pos: [35, 16, 23], target: [34, 3.0, 1.2], label: 'AC & PV' },
  di: { pos: [58, 16, 21], target: [57.5, 4.8, 1.5], label: 'DI Water' },
};

export interface Pipe3DLink {
  id: string;
  zone: Zone3DId;
  fromId: string;
  toId: string;
  fluid: FluidType;
  flowSourceTag: string; // Equipment/valve tag whose running/Hz/open state drives particle speed
  elevationY: number; // Pipe rack elevation in meters
  label?: string;
}

export interface Zone3DMeta {
  id: Zone3DId;
  shortName: string;
  title: string;
  subtitle: string;
  floorColor: string;
  borderColor: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  floorSize: [number, number];
  scadaScreen: B5ScreenId;
  keySensorTags: string[];
}

export const FLUID_COLORS: Record<FluidType, { pipe: string; particle: string; label: string }> = {
  chw: { pipe: '#00cfe8', particle: '#cffafe', label: 'CHW Supply (Nước lạnh cấp)' },
  chwr: { pipe: '#008f91', particle: '#5eead4', label: 'CHW Return (Nước hồi về bơm CHWP)' },
  cdw: { pipe: '#5da0e8', particle: '#bae6fd', label: 'CDW (Nước giải nhiệt)' },
  cdw_sup: { pipe: '#5da0e8', particle: '#e0f2fe', label: 'CDW Supply (Từ CT → CWP → Chiller)' },
  cdw_ret: { pipe: '#2c5ec4', particle: '#93c5fd', label: 'CDW Return (Chiller → CDV → CT)' },
  hw: { pipe: '#eb9ee3', particle: '#fdf2f8', label: 'HW (Nước nóng Heat Recovery)' },
  hw_sup: { pipe: '#eb9ee3', particle: '#ffffff', label: 'HW Supply (CH-14 → CDV1-4 → Tòa nhà)' },
  hw_ret: { pipe: '#e03c86', particle: '#fbcfe8', label: 'HW Return (Hồi về HWP → CH-14)' },
  pcw: { pipe: '#00cfe8', particle: '#cffafe', label: 'PCW Supply (Nước làm mát cấp)' },
  pcw_ret: { pipe: '#009999', particle: '#5eead4', label: 'PCW Return (Nước PCW hồi)' },
  air: { pipe: '#cbd5e1', particle: '#fef08a', label: 'Compressed Air (Khí nén OFRAC / OFLAC)' },
  vac: { pipe: '#a8a228', particle: '#fef08a', label: 'Process Vacuum (Chân không PV)' },
  di: { pipe: '#38bdf8', particle: '#e0f2fe', label: 'DI Water (Nước siêu tinh khiết)' },
  di_sup: { pipe: '#f1f5f9', particle: '#38bdf8', label: 'DI Supply (Nước DI cấp tầng 2)' },
  di_ret: { pipe: '#64748b', particle: '#cbd5e1', label: 'DI Return (Nước DI hồi RO-DI)' },
  exh: { pipe: '#f97316', particle: '#fed7aa', label: 'Process Exhaust (Khí thải EXH)' },
};

export const ZONES_3D: Zone3DMeta[] = [
  {
    id: 'site',
    shortName: 'Site Overview',
    title: 'Coherent NT1 Campus — 6-Building Site Overview (COHR2401)',
    subtitle: '6 Tòa nhà B1–B6 · Cổng Logo COHERENT · Cầu ống liên thông từ Nhà 5 → Nhà 2 & Nhà 3 · Đường Trần Phú',
    floorColor: '#2d4a2b',
    borderColor: '#38bdf8',
    cameraPos: [-18, 28, 42],
    cameraTarget: [0, 2.0, 2.0],
    floorSize: [72, 54],
    scadaScreen: 'site_overview',
    keySensorTags: ['B51F_CHSTS1', 'B51F_HSTS1', 'B51F_PIT20101', 'B51F_PIT1301', 'B22F_PIT10704', 'B31F_CHSTS1'],
  },
  {
    id: 'b5_chiller',
    shortName: 'B5 · 1F',
    title: 'Building 5 — 1F Main Utility Plant (PCW · Chiller/HR · AC/PV · DI)',
    subtitle: 'Trần 7.2m · 9 Tháp KingSun cao 8.6m · Trái ngoài trời: PCW → Giữa: 4 Chiller Daikin & Bơm đứng → Phải: AC101..204 (IR) → RO-DI & Tầng 2',
    floorColor: '#1e293b',
    borderColor: '#00cfe8',
    cameraPos: [14, 34, 52],
    cameraTarget: [14, 4.5, -1.5],
    floorSize: [112, 34],
    scadaScreen: 'b5_chiller',
    keySensorTags: [
      'B51F_CHSTS1',
      'B51F_HSTS1',
      'B51F_TT10505',
      'B51F_FIT10501',
      'B51F_LT10501',
      'B51F_PIT10101',
      'B51F_PIT20101',
      'B52F_PIT10701',
    ],
  },
  {
    id: 'b5_m1f',
    shortName: 'B5 · M1F',
    title: 'Building 5 — M1F Mezzanine AHU Room (AHU-B5-1F-01 · MEP 5-MF1)',
    subtitle: 'AHU Daikin nằm chính giữa tường (chiếm ~1/8 phòng) · Supply Air sát tường · Return Air & CHW/HW từ trần · Fresh Air Damper',
    floorColor: '#1e293b',
    borderColor: '#38bdf8',
    cameraPos: [-5.5, 11.5, 17.5],
    cameraTarget: [2.0, 2.3, 0.0],
    floorSize: [22, 14],
    scadaScreen: 'b5_air_ahu',
    keySensorTags: ['B5M1F_AHU01_RAT', 'B5M1F_AHU01_RAH', 'B5M1F_AHU01_SAT', 'B5M1F_AHU01_SAS', 'B5M1F_AHU01_DP'],
  },
  {
    id: 'b5_2f',
    shortName: 'B5 · 2F (Cleanroom)',
    title: 'Building 5 — 2F Production Cleanroom & Overhead Utility Plenum',
    subtitle: 'Phân Zone màu theo 2F Overview · Cảm biến phòng gắn cột · Đèn LED & thiết bị phòng sạch · Ống DI / PCW / PV / EXH trên trần',
    floorColor: '#dbe4ee',
    borderColor: '#38bdf8',
    cameraPos: [-12, 16.5, 28],
    cameraTarget: [0, 2.4, 0],
    floorSize: [38, 28],
    scadaScreen: 'b5_overview_2f',
    keySensorTags: ['B5M2F_AHU02_RAT', 'B5M2F_AHU02_RAH', 'B51F_DPT10501', 'B51F_TT10503', 'B52F_PIT10701', 'B52F_PIT1303'],
  },
  {
    id: 'b5_air',
    shortName: 'B5 · M2F (AHU/EXH & MSB)',
    title: 'Building 5 — M2F Technical Floor (PAU · 4 AHU · EXH · MSB Room)',
    subtitle: 'PAU-2F-01 cấp gió tươi → 4 AHU nối tiếp · CHW/HW từ trần · 3 Quạt ly tâm FA có bạt mềm · Cầu thang & Phòng điện MSB 2 dãy tủ điện cao ngang AHU bên phải',
    floorColor: '#1e293b',
    borderColor: '#60a5fa',
    cameraPos: [4, 24, 34],
    cameraTarget: [5, 2.8, -0.5],
    floorSize: [52, 22],
    scadaScreen: 'b5_air_ahu',
    keySensorTags: ['B5M2F_PAU01_SAT', 'B5M2F_AHU01_RAT', 'B5M2F_AHU02_RAT', 'B5M2F_AHU03_RAT', 'B51F_PIT11201', 'B51F_PIT11202'],
  },
  {
    id: 'b2_plant',
    shortName: 'B2 · 1F (Cleanroom & PCW)',
    title: 'Building 2 — 1F Optics Cleanroom & Outdoor PCW Station',
    subtitle: 'Trạm PCW 4 bơm P-601A..D đặt ngoài trời đối diện Tháp CT Nhà 5 (cấp nước lạnh CHW từ Nhà 5) · Phòng sạch 1F + trần FFU/FCU/EAF/TEF & nhánh PCW cấp xuống tool',
    floorColor: '#dbe4ee',
    borderColor: '#00cfe8',
    cameraPos: [-22, 24, 30],
    cameraTarget: [0, 2.6, -4.0],
    floorSize: [38, 36],
    scadaScreen: 'b2_overview_1f',
    keySensorTags: ['B21F_PIT10601', 'B21F_LT10601', 'B21F_TT10601', 'B21F_FIT10601', 'B22F_AHU04_RAT', 'B21F_FCU02RT1'],
  },
  {
    id: 'b2_2f',
    shortName: 'B2 · 2F (AHU/PAU & EXH)',
    title: 'Building 2 — 2F Dual-Zone AHU/PAU, EXH 1/2 & DI Loop 4',
    subtitle: 'Chia 2 gian Zone A (Trái: PAU-1F-01 + AHU-06,01,04,03,05 + EXH 1) & Zone B (Phải: PAU-1F-02 + AHU-02,07,08,10,09 + EXH 2) cách nhau bởi hành lang cầu thang · Quạt EAF/ERV/PAUCT/TEF & DI Loop 4 trên trần',
    floorColor: '#1e293b',
    borderColor: '#60a5fa',
    cameraPos: [-12, 26, 36],
    cameraTarget: [0, 3.0, -0.5],
    floorSize: [58, 26],
    scadaScreen: 'b2_overview_2f',
    keySensorTags: ['B21F_PAU01_SAT', 'B21F_PAU02_SAT', 'B21F_PIT11003', 'B22F_PIT11001', 'B21F_TIT11001', 'B22F_PIT10704'],
  },
  {
    id: 'b2_3f',
    shortName: 'B2 · 3F (Cleanroom)',
    title: 'Building 2 — 3F Optics Cleanroom & Overhead Utility Plenum',
    subtitle: '11 Zone phòng sạch tầng 3F theo 3F Overview · Nhánh PCW tầng 3F (DPT10601 / TT10603) rẽ xuống từng tool · FFU-3F-01, FCU-3F-02, TEF-3F & PV EoL (PIT1302) trên trần',
    floorColor: '#dbe4ee',
    borderColor: '#38bdf8',
    cameraPos: [-14, 17.5, 28],
    cameraTarget: [0, 2.4, 0],
    floorSize: [38, 27],
    scadaScreen: 'b2_overview_3f',
    keySensorTags: ['B2M3F_AHU01_RAT', 'B2M3F_AHU10_RAT', 'B21F_DPT10601', 'B21F_TT10603', 'B23F_PIT1302', 'B23F_FCU02RT1'],
  },
  {
    id: 'b2_m3f',
    shortName: 'B2 · M3F (AHU / PAU)',
    title: 'Building 2 — M3F Dual-Zone Mechanical Deck (2 PAU · 11 M3F AHUs)',
    subtitle: 'Chia 2 gian Zone A (Trái: PAU-2F-01 → AHU-M3F-01,02,03,06,05) & Zone B (Phải: PAU-2F-02 → AHU-M3F-04,08,07,10,09,11) theo đúng sơ đồ SCADA AIR AHU',
    floorColor: '#1e293b',
    borderColor: '#a855f7',
    cameraPos: [-10, 25, 34],
    cameraTarget: [0, 2.8, -1.5],
    floorSize: [62, 23],
    scadaScreen: 'b2_overview_m3f',
    keySensorTags: ['B22F_PAU01_SAT', 'B22F_PAU02_SAT', 'B2M3F_AHU01_SAT', 'B2M3F_AHU05_SAT', 'B2M3F_AHU09_SAT', 'B2M3F_AHU11_SAT'],
  },
  {
    id: 'b3_plant',
    shortName: 'B3 · 1F (Warehouse · Chiller · Heat)',
    title: 'Building 3 — 1F Warehouse & Outdoor Chiller / Heat Fan Yard (Road No. 2)',
    subtitle: 'Ngoài trời sát vách mặt đường Số 2 (giao Trần Phú): 2 Air-Cooled Chiller Daikin EWAD-TZ + 3 Heat Fan + Bơm · Trong nhà: Kho kệ xanh-cam, Cleanse/Chemical, DI Cistern & quạt EAF/FCU trần',
    floorColor: '#dbe4ee',
    borderColor: '#f43f5e',
    cameraPos: [-26, 24, 30],
    cameraTarget: [-2, 2.5, 0],
    floorSize: [44, 28],
    scadaScreen: 'b3_overview_1f',
    keySensorTags: ['B31F_CHSTS1', 'B31F_CHWPS1', 'B31F_HPSTS1', 'B31F_HWPS1', 'B31F_PIT10705', 'B31F_FCU03RT1'],
  },
  {
    id: 'b3_2f',
    shortName: 'B3 · 2F (AHU / EXH & MSB)',
    title: 'Building 3 — 2F / M1F Technical Floor (AHU-01/02 · EXH · 7 FCUs · MSB Room)',
    subtitle: '2 AHU Daikin + 3 Quạt ly tâm thải FA-11101..03 có bạt mềm · Cầu thang 3D · 7 FCU văn phòng trên trần · Phòng điện MSB 2 dãy tủ điện cao ngang AHU (MDB-3.1/3.2/3.3)',
    floorColor: '#1e293b',
    borderColor: '#fb7185',
    cameraPos: [-10, 23, 30],
    cameraTarget: [0, 2.6, 0],
    floorSize: [46, 24],
    scadaScreen: 'b3_overview_m1f',
    keySensorTags: ['B3M1F_AHU01_RAT', 'B3M1F_AHU02_RAT', 'B3M1F_PIT11101', 'B3M1F_PIT11102', 'B3M1F_FCU01RT1', 'B3M1F_FCU06RT1'],
  },
];

export const DEFAULT_3D_NODES: Equipment3DNode[] = [
  // =========================================================================
  // ZONE 0: SITE OVERVIEW (COHERENT NT1 — EXACT 3×2 MASTERPLAN LAYOUT!)
  //   Back Row (Z = -10.5):  B4 (Left) · B5 Silicon Carbide (Center) · B6 (Right)
  //   Front Row (Z = +4.0):  B3 Advanced Optics (Left) · B2 Main Coherent (Center) · B1 (Right)
  // =========================================================================
  {
    id: 'site_b4',
    tag: 'BUILDING_04',
    label: 'BUILDING 04 (Future)',
    zone: 'site',
    meshType: 'building',
    pos: [-14.0, 0, -10.5],
    size: [10.0, 4.6, 11.4],
    scadaScreen: 'site_overview',
    buildingColor: '#475569',
  },
  {
    id: 'site_b5',
    tag: 'B51F_CH11',
    label: 'BUILDING 05 · SILICON CARBIDE',
    zone: 'site',
    meshType: 'building',
    pos: [0.0, 0, -10.5],
    size: [10.4, 5.2, 11.4],
    scadaScreen: 'b5_overview',
    targetZoneOnClick: 'b5_chiller',
    buildingColor: '#10b981',
  },
  {
    id: 'site_b6',
    tag: 'BUILDING_06',
    label: 'BUILDING 06 (Future)',
    zone: 'site',
    meshType: 'building',
    pos: [14.0, 0, -10.5],
    size: [10.0, 4.6, 11.4],
    scadaScreen: 'site_overview',
    buildingColor: '#475569',
  },
  {
    id: 'site_b3',
    tag: 'B31F_CH21',
    label: 'BUILDING 03 · ADVANCED OPTICS',
    zone: 'site',
    meshType: 'building',
    pos: [-14.0, 0, 4.0],
    size: [10.0, 4.8, 11.4],
    scadaScreen: 'b3_overview',
    targetZoneOnClick: 'b3_plant',
    buildingColor: '#f43f5e',
  },
  {
    id: 'site_b2',
    tag: 'B21F_P601A',
    label: 'BUILDING 02 · ADVANCED OPTICS',
    zone: 'site',
    meshType: 'building',
    pos: [0.0, 0, 4.0],
    size: [10.4, 5.4, 11.4],
    scadaScreen: 'b2_overview',
    targetZoneOnClick: 'b2_plant',
    buildingColor: '#2563eb',
  },
  {
    id: 'site_b1',
    tag: 'BUILDING_01',
    label: 'BUILDING 01 (Admin / Future)',
    zone: 'site',
    meshType: 'building',
    pos: [14.0, 0, 4.0],
    size: [10.0, 4.8, 11.4],
    scadaScreen: 'site_overview',
    buildingColor: '#475569',
  },

  // =========================================================================
  // ZONE 1: BUILDING 5 (1F) — CHILLER, HEAT RECOVERY & ELEVATED OUTDOOR CT DECK
  // Exact real-plant layout per user specification:
  //   - Inner wall pump row (Z = +6.6): 3× CHWP -> CH14CHWP -> CH11HWP -> 3× CWP
  //   - Indoor Chiller bay (Z = -0.8): CH-11 -> CH-12 -> CH-13 -> CH-14 (Heat Recovery)
  //     Both waterboxes on front (+Z) face: RIGHT (+X) = CHW, LEFT (-X) = CDW / HW!
  //   - Outdoor Elevated Steel Deck (Z = -10.8, Y = 5.4m ceiling height + staircase): CT-11..CT-19
  // =========================================================================
  {
    id: 'b5_ch11',
    tag: 'B51F_CH11',
    label: 'CH-11 (Chiller 1)',
    zone: 'b5_chiller',
    meshType: 'water_chiller',
    pos: [-11.5, 0, -0.8],
    size: [2.6, 2.3, 3.2],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_CH',
  },
  {
    id: 'b5_ch12',
    tag: 'B51F_CH12',
    label: 'CH-12 (Chiller 2)',
    zone: 'b5_chiller',
    meshType: 'water_chiller',
    pos: [-4.5, 0, -0.8],
    size: [2.6, 2.3, 3.2],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_CH',
  },
  {
    id: 'b5_ch13',
    tag: 'B51F_CH13',
    label: 'CH-13 (Standby)',
    zone: 'b5_chiller',
    meshType: 'water_chiller',
    pos: [2.5, 0, -0.8],
    size: [2.6, 2.3, 3.2],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_CH',
  },
  {
    id: 'b5_ch14',
    tag: 'B51F_CH14',
    label: 'CH-14 (Heat Recovery)',
    zone: 'b5_chiller',
    meshType: 'water_chiller',
    pos: [10.0, 0, -0.8],
    size: [2.6, 2.3, 3.2],
    scadaScreen: 'b5_heat_recovery',
    faceplateType: 'Fpl_CH',
  },

  // Pump Row along Inner Wall (Z = +6.6):
  //   3× CHWP (left) -> 3× CWP (shifted left) -> CH11HWP & CH14CHWP (aligned straight with CH-14!)
  {
    id: 'b5_ch11p',
    tag: 'B51F_CH11CHWP',
    label: 'CH11CHWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [-14.5, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_ch12p',
    tag: 'B51F_CH12CHWP',
    label: 'CH12CHWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [-12.0, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_ch13p',
    tag: 'B51F_CH13CHWP',
    label: 'CH13CHWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [-9.5, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_cwp11',
    tag: 'B51F_CT11CWP',
    label: 'CT11CWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [-4.5, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_cwp12',
    tag: 'B51F_CT12CWP',
    label: 'CT12CWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [-2.0, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_cwp13',
    tag: 'B51F_CT13CWP',
    label: 'CT13CWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [0.5, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_ch11hwp',
    tag: 'B51F_CH11HWP',
    label: 'CH11HWP (HW)',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [7.8, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_heat_recovery',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_ch14p',
    tag: 'B51F_CH14CHWP',
    label: 'CH14CHWP',
    zone: 'b5_chiller',
    meshType: 'pump',
    pos: [10.6, 0, 6.6],
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_chiller',
    faceplateType: 'Fpl_VFD',
  },

  // 9 Outdoor KingSun Cooling Towers CT-11..CT-19 mounted on Elevated Steel Deck (Y = 8.6m, higher than 7.2m ceiling!)
  ...Array.from({ length: 9 }, (_, i): Equipment3DNode => {
    const n = 11 + i;
    return {
      id: `b5_ct${n}`,
      tag: `B51F_CT${n}FN`,
      label: `CT-${n}`,
      zone: 'b5_chiller',
      layer: 'chiller',
      meshType: 'cooling_tower',
      pos: [-13.6 + i * 3.4, 8.6, -10.8],
      size: [2.45, 2.9, 2.3],
      scadaScreen: 'b5_chiller',
      faceplateType: 'Fpl_VFD',
    };
  }),

  // =========================================================================
  // B5 1F LAYER 'pcw': COMPACT OUTDOOR PCW SILICON STATION (Hugging Left Wall beside CH-11: X = -29.6..-18.2)
  //   - 2× PHE E-501A & E-501B arranged PERPENDICULAR to Left Wall (along X at Z = -2.8, 4-port front face facing +Z!)
  //   - 2× Stainless Metal Bag Filters FLT-501A & FLT-501B tightly in front of PHEs (Z = +1.0)
  //   - 3× Vertical PCW Pumps P-501A -> P-501C along outermost left edge (X = -27.2, farthest from wall!)
  //   - Far Right edge (+Z looking from pumps inward): A-501 & TK-502 -> TK-501 (top-in, bottom-out) -> P-502 right of TK-501!
  // =========================================================================
  {
    id: 'b5_e501a',
    tag: 'B51F_TCV10501',
    label: 'PHE E-501A',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'phe',
    pos: [-20.0, 0, -2.8],
    rotY: 0, // 4-port front face faces +Z (Left -X = CHW, Right +X = PCW!)
    size: [1.55, 2.35, 1.85],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501A',
  },
  {
    id: 'b5_e501b',
    tag: 'B51F_TCV10502',
    label: 'PHE E-501B',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'phe',
    pos: [-23.0, 0, -2.8],
    rotY: 0,
    size: [1.55, 2.35, 1.85],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501B',
  },
  {
    id: 'b5_flt501a',
    tag: 'B51F_P501A',
    label: 'FLT-501A',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'metal_filter',
    pos: [-20.0, 0, 1.0],
    size: [0.95, 2.05, 0.95],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501A',
  },
  {
    id: 'b5_flt501b',
    tag: 'B51F_P501B',
    label: 'FLT-501B',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'metal_filter',
    pos: [-23.0, 0, 1.0],
    size: [0.95, 2.05, 0.95],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501B',
  },
  {
    id: 'b5_p501a',
    tag: 'B51F_P501A',
    label: 'P-501A',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'pump',
    pos: [-27.2, 0, -3.2],
    rotY: -Math.PI / 2, // Rear suction (-X outer bus), Front discharge (+X toward FLT/PHE)
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_pcw',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_p501b',
    tag: 'B51F_P501B',
    label: 'P-501B',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'pump',
    pos: [-27.2, 0, -1.0],
    rotY: -Math.PI / 2,
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_pcw',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_p501c',
    tag: 'B51F_P501C',
    label: 'P-501C',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'pump',
    pos: [-27.2, 0, 1.2],
    rotY: -Math.PI / 2,
    size: [1.35, 2.25, 1.5],
    scadaScreen: 'b5_pcw',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_a501',
    tag: 'B51F_PIT10501',
    label: 'A-501 (Air Sep)',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'air_separator',
    pos: [-26.8, 0, 3.6],
    size: [1.25, 2.1, 1.25],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501A',
  },
  {
    id: 'b5_tk502',
    tag: 'B51F_PIT10501',
    label: 'TK-502 (Exp 1000L)',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'tank',
    pos: [-24.0, 0, 3.8],
    size: [1.65, 2.75, 1.65],
    scadaScreen: 'b5_pcw',
    statusTag: 'B51F_P501A',
  },
  {
    id: 'b5_tk501',
    tag: 'B51F_LT10501',
    label: 'TK-501 (Reject)',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'tank',
    pos: [-23.8, 0, 6.2],
    size: [2.1, 3.2, 2.1],
    scadaScreen: 'b5_pcw',
    levelSensorTag: 'B51F_LT10501',
    statusTag: 'B51F_P502',
  },
  {
    id: 'b5_p502',
    tag: 'B51F_P502',
    label: 'P-502 (Reject)',
    zone: 'b5_chiller',
    layer: 'pcw',
    meshType: 'pump',
    pos: [-23.8, 0, 8.6],
    rotY: Math.PI, // Rear suction (-Z) <- Bottom of TK-501, Front discharge (+Z) -> WW Distribution
    size: [1.2, 2.0, 1.35],
    scadaScreen: 'b5_pcw',
    faceplateType: 'Fpl_DOL',
  },

  // =========================================================================
  // B5 1F LAYER 'ac': COMPRESSED AIR (OFRAC + OFLAC) & VACUUM ROOM (Right of CH-14 after walkway aisle!)
  // Exact physical order from Inner Wall (+Z) toward CT Wall (-Z):
  //   AC-101 -> AC-102 -> AC-201 -> AC-202 -> AC-204
  // To the right (+X): Receivers (V-101A/B, V-201A/B), Twin-Tower IR Dryers (AD), IR Filters, Cooling Pumps & PV!
  // =========================================================================
  {
    id: 'b5_ac101',
    tag: 'B51F_AC101',
    label: 'AC-101 (OFRAC VSD)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'compressor',
    pos: [24.8, 0, 7.0],
    size: [2.8, 2.15, 1.85],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_AC',
  },
  {
    id: 'b5_ac102',
    tag: 'B51F_AC102',
    label: 'AC-102 (OFRAC Fix)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'compressor',
    pos: [24.8, 0, 4.3],
    size: [2.8, 2.15, 1.85],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_AC',
  },
  {
    id: 'b5_ac201',
    tag: 'B51F_AC201',
    label: 'AC-201 (OFLAC Fix)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'compressor',
    pos: [24.8, 0, 1.1],
    size: [2.8, 2.15, 1.85],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_AC',
  },
  {
    id: 'b5_ac202',
    tag: 'B51F_AC202',
    label: 'AC-202 (OFLAC Fix)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'compressor',
    pos: [24.8, 0, -1.6],
    size: [2.8, 2.15, 1.85],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_AC',
  },
  {
    id: 'b5_ac204',
    tag: 'B51F_AC204',
    label: 'AC-204 (OFLAC VSD)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'compressor',
    pos: [24.8, 0, -4.2],
    size: [2.8, 2.15, 1.85],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_AC',
  },
  // OFRAC Air Receivers, Twin-Tower IR Dryers (AD-101A/B, AD-102A/B) & Horizontal Cooling Pumps (P-10101A/B)
  {
    id: 'b5_v101a',
    tag: 'B51F_PIT10101',
    label: 'V-101A (Wet)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'tank',
    pos: [29.4, 0, 5.35],
    size: [1.6, 3.2, 1.6],
    scadaScreen: 'b5_ofrac',
    statusTag: 'B51F_AC101',
  },
  {
    id: 'b5_ad101a',
    tag: 'B51F_AD101A',
    label: 'AD-101A',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [33.2, 0, 6.3],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_ad102a',
    tag: 'B51F_AD102A',
    label: 'AD-102A',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [36.8, 0, 6.3],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_ad101b',
    tag: 'B51F_AD101B',
    label: 'AD-101B',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [33.2, 0, 4.4],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_ad102b',
    tag: 'B51F_AD102B',
    label: 'AD-102B',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [36.8, 0, 4.4],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_v101b',
    tag: 'B51F_PIT10101',
    label: 'V-101B (Dry)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'tank',
    pos: [41.2, 0, 5.35],
    size: [1.6, 3.2, 1.6],
    scadaScreen: 'b5_ofrac',
    statusTag: 'B51F_AC101',
  },
  {
    id: 'b5_p10101a',
    tag: 'B51F_P10101A',
    label: 'P-10101A',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'horizontal_pump',
    pos: [28.8, 0, 8.2],
    size: [0.9, 1.15, 1.55],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_p10101b',
    tag: 'B51F_P10101B',
    label: 'P-10101B',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'horizontal_pump',
    pos: [31.0, 0, 8.2],
    size: [0.9, 1.15, 1.55],
    scadaScreen: 'b5_ofrac',
    faceplateType: 'Fpl_DOL',
  },
  // OFLAC Air Receivers & Twin-Tower IR Dryers (AD-201A, AD-202A, AD-202B)
  {
    id: 'b5_v201a',
    tag: 'B51F_PIT20101',
    label: 'V-201A (Wet)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'tank',
    pos: [29.4, 0, -1.6],
    size: [1.6, 3.2, 1.6],
    scadaScreen: 'b5_oflac',
    statusTag: 'B51F_AC204',
  },
  {
    id: 'b5_ad201a',
    tag: 'B51F_AD201A',
    label: 'AD-201A',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [33.2, 0, 0.2],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_ad202a',
    tag: 'B51F_AD202A',
    label: 'AD-202A',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [36.8, 0, 0.2],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_ad202b',
    tag: 'B51F_AD202B',
    label: 'AD-202B',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'air_dryer',
    pos: [35.0, 0, -3.4],
    size: [1.85, 2.75, 1.05],
    scadaScreen: 'b5_oflac',
    faceplateType: 'Fpl_DOL',
  },
  {
    id: 'b5_v201b',
    tag: 'B51F_PIT20101',
    label: 'V-201B (Dry)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'tank',
    pos: [41.2, 0, -1.6],
    size: [1.6, 3.2, 1.6],
    scadaScreen: 'b5_oflac',
    statusTag: 'B51F_AC204',
  },
  // Process Vacuum Station: Receiver Tank V-1301 + Dual Dry Vacuum Skids PV-1301A / PV-1301B
  {
    id: 'b5_v1301',
    tag: 'B51F_PIT1301',
    label: 'V-1301 (Vac Tank)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'tank',
    pos: [35.2, 0, 8.2],
    size: [1.45, 2.9, 1.45],
    scadaScreen: 'b5_pv',
    statusTag: 'B51F_PV1301A',
  },
  {
    id: 'b5_pv1301a',
    tag: 'B51F_PV1301A',
    label: 'PV-1301A (Vac)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'vacuum',
    pos: [38.8, 0, 8.2],
    size: [2.4, 1.85, 1.7],
    scadaScreen: 'b5_pv',
    faceplateType: 'Fpl_PV',
  },
  {
    id: 'b5_pv1301b',
    tag: 'B51F_PV1301B',
    label: 'PV-1301B (Vac)',
    zone: 'b5_chiller',
    layer: 'ac',
    meshType: 'vacuum',
    pos: [42.8, 0, 8.2],
    size: [2.4, 1.85, 1.7],
    scadaScreen: 'b5_pv',
    faceplateType: 'Fpl_PV',
  },

  // =========================================================================
  // B5 1F LAYER 'di': 3RD-PARTY RO-DI WATER PACKAGE SKID + B5 2F INSTRUMENTATION (Right of AC!)
  // =========================================================================
  {
    id: 'b5_rodi',
    tag: 'B52F_PCV10701',
    label: 'RO-DI Package (3rd Party)',
    zone: 'b5_chiller',
    layer: 'di',
    meshType: 'rodi_skid',
    pos: [56.5, 0, 1.5],
    size: [7.4, 3.3, 3.6],
    scadaScreen: 'b5_di',
  },

  // =========================================================================
  // ZONE 2: BUILDING 5 — 1ST MEZZANINE FLOOR (M1F · MEP SPACE 5-MF1)
  // =========================================================================
  {
    id: 'b5_ahu1f',
    tag: 'B5M1F_AHU01',
    label: 'AHU-B5-1F-01 (Daikin)',
    zone: 'b5_m1f',
    meshType: 'ahu',
    pos: [5.2, 0, 0],
    size: [5.6, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_AHU_DewPoint',
  },
  {
    id: 'b5_m1f_eaf01',
    tag: 'B51F_EAF01',
    label: 'EAF-B5-1F-01',
    zone: 'b5_m1f',
    meshType: 'duct_fan',
    pos: [5.2, 5.15, -3.2],
    rotY: Math.PI / 2, // Aligned along Z ceiling exhaust relief duct branching off Return Air!
    size: [1.1, 1.1, 1.1],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },

  // =========================================================================
  // ZONE 3: BUILDING 5 — 2ND MEZZANINE (M2F): 1× PAU (FAR LEFT) + 4× AHU (IN A ROW) | WALKWAY | 3× EXH FA + CEILING EAF/FAF
  //   rotY = +Math.PI / 2: Supply Air (-Z) faces INTO rear wall, Fresh Air Damper (+Z) faces INTO room, Coils (+X) open to aisle!
  // =========================================================================
  {
    id: 'b5_pau01',
    tag: 'B5M2F_PAU01',
    label: 'PAU-2F-01 (Fresh)',
    zone: 'b5_air',
    meshType: 'ahu',
    pos: [-14.5, 0, -5.0],
    rotY: Math.PI / 2, // Far left beside left exterior wall (-19.0) drawing outdoor fresh air!
    size: [4.2, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_PAU',
  },
  {
    id: 'b5_ahu01',
    tag: 'B5M2F_AHU01',
    label: 'AHU-2F-01 (Leak)',
    zone: 'b5_air',
    meshType: 'ahu',
    pos: [-9.0, 0, -5.0],
    rotY: Math.PI / 2, // Supply Air (-Z) into rear wall, Damper (+Z) into room, Coils (+X) open to aisle!
    size: [5.0, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_AHU_DewPoint',
  },
  {
    id: 'b5_ahu02',
    tag: 'B5M2F_AHU02',
    label: 'AHU-2F-02 (Prod)',
    zone: 'b5_air',
    meshType: 'ahu',
    pos: [-3.5, 0, -5.0],
    rotY: Math.PI / 2,
    size: [5.0, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_AHU_DewPoint',
  },
  {
    id: 'b5_ahu03',
    tag: 'B5M2F_AHU03',
    label: 'AHU-2F-03 (Parts)',
    zone: 'b5_air',
    meshType: 'ahu',
    pos: [2.0, 0, -5.0],
    rotY: Math.PI / 2,
    size: [5.0, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_AHU_DewPoint',
  },
  {
    id: 'b5_ahu04',
    tag: 'B5M2F_AHU04',
    label: 'AHU-2F-04 (Metro)',
    zone: 'b5_air',
    meshType: 'ahu',
    pos: [7.5, 0, -5.0],
    rotY: Math.PI / 2,
    size: [5.0, 2.45, 2.35],
    scadaScreen: 'b5_air_ahu',
    faceplateType: 'Fpl_AHU_DewPoint',
  },
  // Floor-Mounted Process Exhaust Centrifugal Blowers (FA-11201A / 03A / 04A) lined up from wall outward (+Z) across walkway!
  {
    id: 'b5_fa11201',
    tag: 'B5M2F_FA11201A',
    label: 'FA-11201A (EXH)',
    zone: 'b5_air',
    meshType: 'exhaust_fan',
    pos: [15.0, 0, -5.5],
    size: [2.2, 2.4, 2.0],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_fa11203',
    tag: 'B5M2F_FA11203A',
    label: 'FA-11203A (EXH)',
    zone: 'b5_air',
    meshType: 'exhaust_fan',
    pos: [15.0, 0, 0.0],
    size: [2.2, 2.4, 2.0],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_fa11204',
    tag: 'B5M2F_FA11204A',
    label: 'FA-11204A (EXH)',
    zone: 'b5_air',
    meshType: 'exhaust_fan',
    pos: [15.0, 0, 5.5],
    size: [2.2, 2.4, 2.0],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },
  // Ceiling-Mounted Inline Black Axial Duct Fans (EAF-02 on RA Exhaust Relief duct & FAF-01 on overhead Exhaust duct!)
  {
    id: 'b5_eaf02',
    tag: 'B51F_EAF02',
    label: 'EAF-02 (Ceiling)',
    zone: 'b5_air',
    meshType: 'duct_fan',
    pos: [11.2, 5.15, -3.2],
    size: [1.15, 1.15, 1.15],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },
  {
    id: 'b5_faf01',
    tag: 'B51F_FAF01',
    label: 'FAF-01 (Ceiling)',
    zone: 'b5_air',
    meshType: 'duct_fan',
    pos: [-6.5, 5.45, 7.2],
    size: [1.15, 1.15, 1.15],
    scadaScreen: 'b5_exh',
    faceplateType: 'Fpl_VFD',
  },

  // =========================================================================
  // ZONE 4A: BUILDING 2 — 1F OUTDOOR PCW STATION (EXACT B5 PCW LAYOUT ALONG WALL Z=-12.5) & 1F CLEANROOM EQUIPMENT
  //   - Left: 2× PHE E-601A/B PERPENDICULAR to wall Z=-12.5 (rotY = +PI/2 -> ALL 4 ports on ONE single +X front face!)
  //   - Center-Left: 2× Stainless Filters FLT-601A/B (rotY = PI -> inlet faces +X pumps, outlet faces -X into PHE!)
  //   - Outermost Edge (farthest from wall, Z = -20.2): 4× VFD Main Pumps P-601A/B/C/D (rear suction -Z, front disch +Z!)
  //   - Far Right: A-601 Air Sep + TK-602 Exp Tank + TK-601 Reject Tank (LT10601) + DOL Pump P-602!
  // =========================================================================
  { id: 'b2_e601a', tag: 'B21F_TCV10601', label: 'PHE E-601A', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'phe', pos: [-12.5, 0, -14.2], rotY: Math.PI / 2, size: [1.55, 2.35, 1.85], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601A' },
  { id: 'b2_e601b', tag: 'B21F_TCV10602', label: 'PHE E-601B', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'phe', pos: [-12.5, 0, -17.2], rotY: Math.PI / 2, size: [1.55, 2.35, 1.85], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601B' },
  { id: 'b2_flt601a', tag: 'B21F_P601A', label: 'FLT-601A', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'metal_filter', pos: [-8.6, 0, -14.2], rotY: Math.PI, size: [0.95, 2.05, 0.95], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601A' },
  { id: 'b2_flt601b', tag: 'B21F_P601B', label: 'FLT-601B', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'metal_filter', pos: [-8.6, 0, -17.2], rotY: Math.PI, size: [0.95, 2.05, 0.95], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601B' },
  { id: 'b2_p601a', tag: 'B21F_P601A', label: 'P-601A (VFD)', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'pump', pos: [-6.0, 0, -20.2], rotY: 0, size: [1.35, 2.25, 1.5], scadaScreen: 'b2_pcw', faceplateType: 'Fpl_VFD' },
  { id: 'b2_p601b', tag: 'B21F_P601B', label: 'P-601B (VFD)', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'pump', pos: [-3.5, 0, -20.2], rotY: 0, size: [1.35, 2.25, 1.5], scadaScreen: 'b2_pcw', faceplateType: 'Fpl_VFD' },
  { id: 'b2_p601c', tag: 'B21F_P601C', label: 'P-601C (VFD)', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'pump', pos: [-1.0, 0, -20.2], rotY: 0, size: [1.35, 2.25, 1.5], scadaScreen: 'b2_pcw', faceplateType: 'Fpl_VFD' },
  { id: 'b2_p601d', tag: 'B21F_P601D', label: 'P-601D (VFD)', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'pump', pos: [1.5, 0, -20.2], rotY: 0, size: [1.35, 2.25, 1.5], scadaScreen: 'b2_pcw', faceplateType: 'Fpl_VFD' },
  { id: 'b2_a601', tag: 'B21F_P601A', label: 'A-601 Air Sep', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'air_separator', pos: [5.0, 0, -20.0], size: [1.25, 2.1, 1.25], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601A' },
  { id: 'b2_tk602', tag: 'B21F_PIT10601', label: 'TK-602 Exp Tank', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'tank', pos: [7.4, 0, -17.4], size: [1.6, 2.65, 1.6], scadaScreen: 'b2_pcw', statusTag: 'B21F_P601A' },
  { id: 'b2_tk601', tag: 'B21F_LT10601', label: 'TK-601 Reject Tank', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'tank', pos: [10.8, 0, -17.4], size: [2.1, 3.1, 2.1], scadaScreen: 'b2_pcw', levelSensorTag: 'B21F_LT10601', statusTag: 'B21F_P601A' },
  { id: 'b2_p602', tag: 'B21F_P602', label: 'P-602 (DOL)', zone: 'b2_plant', b2Layer: 'pcw', meshType: 'pump', pos: [13.8, 0, -17.4], rotY: -Math.PI / 2, size: [1.2, 1.95, 1.35], scadaScreen: 'b2_pcw', faceplateType: 'Fpl_DOL' },

  // 1F Overhead Ceiling Cleanroom Cooling (FFU-1F-01..03, FCU-1F-01..04), Under-Ceiling Suspended PAUCT-01..04 & Exhaust Fans (EAF/TEF)
  { id: 'b2_ffu01', tag: 'B21F_FFU01', label: 'FFU-1F-01', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'ffu', pos: [-14.2, 4.0, -9.2], size: [1.8, 0.75, 1.8], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_VFD' },
  { id: 'b2_ffu02', tag: 'B21F_FFU02', label: 'FFU-1F-02', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'ffu', pos: [-9.2, 4.0, -9.2], size: [1.8, 0.75, 1.8], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_VFD' },
  { id: 'b2_ffu03', tag: 'B21F_FFU03', label: 'FFU-1F-03', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'ffu', pos: [-4.2, 4.0, -9.2], size: [1.8, 0.75, 1.8], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_VFD' },
  // 4× Ceiling-Hung PAUCT Units suspended directly beneath 3.85m 1F ceiling by 2 threaded rods ("2 thanh ti treo") with CHW feed!
  { id: 'b2_1f_pauct01', tag: 'B22F_PAUCT01', label: 'PAUCT-01', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'pauct', pos: [-13.5, 3.15, -2.4], rotY: 0, size: [1.35, 0.45, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_pauct02', tag: 'B22F_PAUCT02', label: 'PAUCT-02', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'pauct', pos: [-6.0, 3.15, -2.4], rotY: 0, size: [1.35, 0.45, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_pauct03', tag: 'B22F_PAUCT03', label: 'PAUCT-03', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'pauct', pos: [-13.5, 3.15, 2.4], rotY: 0, size: [1.35, 0.45, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_pauct04', tag: 'B22F_PAUCT04', label: 'PAUCT-04', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'pauct', pos: [-6.0, 3.15, 2.4], rotY: 0, size: [1.35, 0.45, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_fcu01', tag: 'B21F_FCU01', label: 'FCU-1F-01', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'fcu', pos: [5.5, 4.15, 2.2], size: [1.7, 0.65, 1.15], scadaScreen: 'b2_air_fcu', faceplateType: 'Fpl_DOL' },
  { id: 'b2_fcu02', tag: 'B21F_FCU02', label: 'FCU-1F-02', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'fcu', pos: [11.5, 4.15, 2.2], size: [1.7, 0.65, 1.15], scadaScreen: 'b2_air_fcu', faceplateType: 'Fpl_DOL' },
  { id: 'b2_fcu03', tag: 'B21F_FCU03', label: 'FCU-1F-03', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'fcu', pos: [5.5, 4.15, 7.6], size: [1.7, 0.65, 1.15], scadaScreen: 'b2_air_fcu', faceplateType: 'Fpl_DOL' },
  { id: 'b2_fcu04', tag: 'B21F_FCU04', label: 'FCU-1F-04', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'fcu', pos: [11.5, 4.15, 7.6], size: [1.7, 0.65, 1.15], scadaScreen: 'b2_air_fcu', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_eaf01', tag: 'B21F_EAF01', label: 'EAF-1F-01', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'duct_fan', pos: [-12.0, 5.4, -3.2], size: [0.95, 0.9, 0.95], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_eaf02', tag: 'B21F_EAF02', label: 'EAF-1F-02', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'duct_fan', pos: [4.5, 5.4, -3.2], size: [0.95, 0.9, 0.95], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_eaf03', tag: 'B21F_EAF03', label: 'EAF-1F-03', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'duct_fan', pos: [12.5, 5.4, -3.2], size: [0.95, 0.9, 0.95], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_tef01', tag: 'B21F_TEF01', label: 'TEF-1F-01', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'duct_fan', pos: [14.5, 5.35, 3.6], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_1f_tef02', tag: 'B21F_TEF02', label: 'TEF-1F-02', zone: 'b2_plant', b2Layer: 'cleanroom', meshType: 'duct_fan', pos: [14.5, 5.35, 9.6], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },

  // =========================================================================
  // ZONE 4B: BUILDING 2 — 2F DUAL-ZONE MECHANICAL DECK (ZONE A LEFT & ZONE B RIGHT)
  //   Zone A (Left):  PAU-1F-01 + AHU-2F-06, 01, 04, 03, 05 + EXH 1 (FA-11001A, 02A, 02C, 03A)
  //   Zone B (Right): AHU-2F-02, 07, 08, 10, 09 + PAU-1F-02 + EXH 2 (FA-11004A, 04B, 05A)
  //   Overhead Ceiling: 14× 2F EAF/ERV/PAUCT/PAUO/TEF inline duct fans
  // =========================================================================
  // Zone A (Left Hall) — PAU & 5 AHUs (rotY = +PI/2: Supply -Z into rear wall, Damper +Z into room!)
  { id: 'b2_2f_pau01', tag: 'B21F_PAU01', label: 'PAU-B2-1F-01', zone: 'b2_2f', meshType: 'ahu', pos: [-24.5, 0, -5.2], rotY: Math.PI / 2, size: [3.6, 2.3, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_PAU' },
  { id: 'b2_2f_ahu06', tag: 'B22F_AHU06', label: 'AHU-B2-2F-06', zone: 'b2_2f', meshType: 'ahu', pos: [-20.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu01', tag: 'B22F_AHU01', label: 'AHU-B2-2F-01', zone: 'b2_2f', meshType: 'ahu', pos: [-16.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu04', tag: 'B22F_AHU04', label: 'AHU-B2-2F-04', zone: 'b2_2f', meshType: 'ahu', pos: [-12.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu03', tag: 'B22F_AHU03', label: 'AHU-B2-2F-03', zone: 'b2_2f', meshType: 'ahu', pos: [-8.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu05', tag: 'B22F_AHU05', label: 'AHU-B2-2F-05', zone: 'b2_2f', meshType: 'ahu', pos: [-4.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  // Zone B (Right Hall) — 5 AHUs & PAU-1F-02
  { id: 'b2_2f_ahu02', tag: 'B22F_AHU02', label: 'AHU-B2-2F-02', zone: 'b2_2f', meshType: 'ahu', pos: [4.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu07', tag: 'B22F_AHU07', label: 'AHU-B2-2F-07', zone: 'b2_2f', meshType: 'ahu', pos: [8.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu08', tag: 'B22F_AHU08', label: 'AHU-B2-2F-08', zone: 'b2_2f', meshType: 'ahu', pos: [12.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu10', tag: 'B22F_AHU10', label: 'AHU-B2-2F-10', zone: 'b2_2f', meshType: 'ahu', pos: [16.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_ahu09', tag: 'B22F_AHU09', label: 'AHU-B2-2F-09', zone: 'b2_2f', meshType: 'ahu', pos: [20.5, 0, -5.2], rotY: Math.PI / 2, size: [3.8, 2.35, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_2f_pau02', tag: 'B21F_PAU02', label: 'PAU-B2-1F-02', zone: 'b2_2f', meshType: 'ahu', pos: [24.5, 0, -5.2], rotY: Math.PI / 2, size: [3.6, 2.3, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_PAU' },
  // Floor-Mounted Process Exhaust Fans: EXH 1 (Zone A) & EXH 2 (Zone B)
  { id: 'b2_2f_fa11001a', tag: 'B22F_FA11001A', label: 'FA-11001A (Acid)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [-22.0, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11002a', tag: 'B22F_FA11002A', label: 'FA-11002A (Solv A)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [-16.5, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11002c', tag: 'B22F_FA11002C', label: 'FA-11002C (Solv C)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [-11.0, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11003a', tag: 'B22F_FA11003A', label: 'FA-11003A (Grind)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [-5.5, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11004a', tag: 'B22F_FA11004A', label: 'FA-11004A (Heat A)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [7.0, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11004b', tag: 'B22F_FA11004B', label: 'FA-11004B (Heat B)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [14.0, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b2_2f_fa11005a', tag: 'B22F_FA11005A', label: 'FA-11005A (Gen)', zone: 'b2_2f', meshType: 'exhaust_fan', pos: [21.0, 0, 6.4], rotY: Math.PI / 2, size: [2.0, 2.5, 2.0], scadaScreen: 'b2_exh', faceplateType: 'Fpl_VFD' },
  // 10× Overhead Ceiling Inline Duct Fans on 2F (ERV, PAUO, EAF, TEF — PAUCT-01..04 are ceiling-hung in 1F!)
  { id: 'b2_2f_erv01', tag: 'B22F_ERV01', label: 'ERV-2F-01', zone: 'b2_2f', meshType: 'duct_fan', pos: [-22.5, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_erv02', tag: 'B22F_ERV02', label: 'ERV-2F-02', zone: 'b2_2f', meshType: 'duct_fan', pos: [-16.5, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_eaf01', tag: 'B22F_EAF01', label: 'EAF-2F-01', zone: 'b2_2f', meshType: 'duct_fan', pos: [-10.5, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_tef01', tag: 'B22F_TEF01', label: 'TEF-2F-01', zone: 'b2_2f', meshType: 'duct_fan', pos: [-5.0, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_erv03', tag: 'B22F_ERV03', label: 'ERV-2F-03', zone: 'b2_2f', meshType: 'duct_fan', pos: [5.5, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_erv04', tag: 'B22F_ERV04', label: 'ERV-2F-04', zone: 'b2_2f', meshType: 'duct_fan', pos: [10.0, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_pauo01', tag: 'B22F_PAUO01', label: 'PAUO-01', zone: 'b2_2f', meshType: 'duct_fan', pos: [14.5, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_eaf02', tag: 'B22F_EAF02', label: 'EAF-2F-02', zone: 'b2_2f', meshType: 'duct_fan', pos: [19.0, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_tef02', tag: 'B22F_TEF02', label: 'TEF-2F-02', zone: 'b2_2f', meshType: 'duct_fan', pos: [23.0, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_2f_tef03', tag: 'B22F_TEF03', label: 'TEF-2F-03', zone: 'b2_2f', meshType: 'duct_fan', pos: [26.2, 5.55, 1.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },

  // =========================================================================
  // ZONE 4C: BUILDING 2 — 3F CLEANROOM OVERHEAD EQUIPMENT (FFU-3F-01, FCU-3F-02, TEF-3F-01/02)
  // =========================================================================
  { id: 'b2_3f_ffu01', tag: 'B22F_FFU01', label: 'FFU-3F-01', zone: 'b2_3f', meshType: 'ffu', pos: [-12.0, 4.0, 8.2], size: [2.0, 0.75, 2.0], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_VFD' },
  { id: 'b2_3f_fcu02', tag: 'B23F_FCU02', label: 'FCU-3F-02', zone: 'b2_3f', meshType: 'fcu', pos: [10.6, 4.15, 8.2], size: [1.8, 0.65, 1.2], scadaScreen: 'b2_air_fcu', faceplateType: 'Fpl_DOL' },
  { id: 'b2_3f_tef01', tag: 'B23F_TEF01', label: 'TEF-3F-01', zone: 'b2_3f', meshType: 'duct_fan', pos: [15.4, 5.25, 6.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b2_3f_tef02', tag: 'B23F_TEF02', label: 'TEF-3F-02', zone: 'b2_3f', meshType: 'duct_fan', pos: [15.4, 5.25, 10.2], size: [0.85, 0.85, 0.85], scadaScreen: 'b2_exh', faceplateType: 'Fpl_DOL' },

  // =========================================================================
  // ZONE 4D: BUILDING 2 — M3F DUAL-ZONE MECHANICAL DECK (2 PAU + 11 M3F AHUs)
  //   Zone A (Left):  PAU-2F-01 -> AHU-M3F-01, 02, 03, 06, 05
  //   Zone B (Right): AHU-M3F-04, 08, 07, 10, 09, 11 <- PAU-2F-02
  // =========================================================================
  { id: 'b2_m3f_pau01', tag: 'B22F_PAU01', label: 'PAU-B2-2F-01', zone: 'b2_m3f', meshType: 'ahu', pos: [-26.5, 0, -4.4], rotY: Math.PI / 2, size: [3.4, 2.3, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_PAU' },
  { id: 'b2_m3f_ahu01', tag: 'B2M3F_AHU01', label: 'AHU-M3F-01', zone: 'b2_m3f', meshType: 'ahu', pos: [-22.0, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu02', tag: 'B2M3F_AHU02', label: 'AHU-M3F-02', zone: 'b2_m3f', meshType: 'ahu', pos: [-17.5, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu03', tag: 'B2M3F_AHU03', label: 'AHU-M3F-03', zone: 'b2_m3f', meshType: 'ahu', pos: [-13.0, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu06', tag: 'B2M3F_AHU06', label: 'AHU-M3F-06', zone: 'b2_m3f', meshType: 'ahu', pos: [-8.5, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu05', tag: 'B2M3F_AHU05', label: 'AHU-M3F-05', zone: 'b2_m3f', meshType: 'ahu', pos: [-4.0, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.9], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  // Zone B (Right Hall)
  { id: 'b2_m3f_ahu04', tag: 'B2M3F_AHU04', label: 'AHU-M3F-04', zone: 'b2_m3f', meshType: 'ahu', pos: [4.0, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu08', tag: 'B2M3F_AHU08', label: 'AHU-M3F-08', zone: 'b2_m3f', meshType: 'ahu', pos: [7.8, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu07', tag: 'B2M3F_AHU07', label: 'AHU-M3F-07', zone: 'b2_m3f', meshType: 'ahu', pos: [11.6, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu10', tag: 'B2M3F_AHU10', label: 'AHU-M3F-10', zone: 'b2_m3f', meshType: 'ahu', pos: [15.4, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu09', tag: 'B2M3F_AHU09', label: 'AHU-M3F-09', zone: 'b2_m3f', meshType: 'ahu', pos: [19.2, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_ahu11', tag: 'B2M3F_AHU11', label: 'AHU-M3F-11', zone: 'b2_m3f', meshType: 'ahu', pos: [23.0, 0, -4.4], rotY: Math.PI / 2, size: [3.6, 2.35, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b2_m3f_pau02', tag: 'B22F_PAU02', label: 'PAU-B2-2F-02', zone: 'b2_m3f', meshType: 'ahu', pos: [27.0, 0, -4.4], rotY: Math.PI / 2, size: [3.4, 2.3, 1.85], scadaScreen: 'b2_air_ahu', faceplateType: 'Fpl_PAU' },

  // =========================================================================
  // ZONE 5A: BUILDING 3 — 1F OUTDOOR CHILLER & HEAT FAN YARD (ROAD NO. 2) + INDOOR WAREHOUSE
  // =========================================================================
  // Outdoor Yard (X = -21.5 .. -11.2, facing Road No. 2 along -X with 2.55m Grey B40 Fence & Trần Phú at +Z!):
  // Sequence walking IN from Đường Trần Phú (+Z -> -Z), ALL aligned lengthwise parallel to Road No. 2 along X = -16.8:
  //   CH-21 (lengthwise) -> CH-22 (lengthwise) -> CH21/22CHWP -> HPP-21/22 -> HP-01 -> HP-02 -> HP-03!
  //   Pipes run BEHIND units (Road No. 2 side, X = -19.2..-20.4) -> climb UP onto Overhead Support Bridge -> cross walkway into Building 3!
  { id: 'b3_ch21', tag: 'B31F_CH21', label: 'CH-21 (EWAD-TZ)', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'air_chiller', pos: [-16.8, 0, 9.6], rotY: Math.PI / 2, size: [4.4, 2.55, 2.2], scadaScreen: 'b3_chiller', faceplateType: 'Fpl_CH' },
  { id: 'b3_ch22', tag: 'B31F_CH22', label: 'CH-22 (Standby)', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'air_chiller', pos: [-16.8, 0, 4.4], rotY: Math.PI / 2, size: [4.4, 2.55, 2.2], scadaScreen: 'b3_chiller', faceplateType: 'Fpl_CH' },
  { id: 'b3_ch21p', tag: 'B31F_CH21CHWP', label: 'CH21CHWP', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'pump', pos: [-16.8, 0, 1.0], size: [1.35, 2.15, 1.45], scadaScreen: 'b3_chiller', faceplateType: 'Fpl_VFD' },
  { id: 'b3_ch22p', tag: 'B31F_CH22CHWP', label: 'CH22CHWP', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'pump', pos: [-16.8, 0, -1.1], size: [1.35, 2.15, 1.45], scadaScreen: 'b3_chiller', faceplateType: 'Fpl_VFD' },
  { id: 'b3_hpp21', tag: 'B31F_HPP21', label: 'HPP-21 (HW)', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'pump', pos: [-16.8, 0, -3.4], size: [1.3, 2.05, 1.4], scadaScreen: 'b3_heat', faceplateType: 'Fpl_VFD' },
  { id: 'b3_hpp22', tag: 'B31F_HPP22', label: 'HPP-22 (HW)', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'pump', pos: [-16.8, 0, -5.5], size: [1.3, 2.05, 1.4], scadaScreen: 'b3_heat', faceplateType: 'Fpl_VFD' },
  { id: 'b3_hp01', tag: 'B31F_HP01', label: 'Heat Fan HP-01', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'heat_fan', pos: [-16.8, 0, -7.6], rotY: -Math.PI / 2, size: [1.55, 2.25, 1.15], scadaScreen: 'b3_heat', faceplateType: 'Fpl_CH' },
  { id: 'b3_hp02', tag: 'B31F_HP02', label: 'Heat Fan HP-02', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'heat_fan', pos: [-16.8, 0, -9.6], rotY: -Math.PI / 2, size: [1.55, 2.25, 1.15], scadaScreen: 'b3_heat', faceplateType: 'Fpl_CH' },
  { id: 'b3_hp03', tag: 'B31F_HP03', label: 'Heat Fan HP-03', zone: 'b3_plant', b3Layer: 'outdoor', meshType: 'heat_fan', pos: [-16.8, 0, -11.6], rotY: -Math.PI / 2, size: [1.55, 2.25, 1.15], scadaScreen: 'b3_heat', faceplateType: 'Fpl_CH' },

  // Indoor 1F Warehouse, DI Cistern & Ceiling Ventilation (X = -11.2 .. +19.0)
  { id: 'b3_cistern', tag: 'B31F_PCV10705', label: 'B3 DI Cistern', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'rodi_skid', pos: [13.5, 0, -7.4], size: [4.2, 2.4, 2.5], scadaScreen: 'b3_di' },
  { id: 'b3_1f_fcu03', tag: 'B31F_FCU03', label: 'FCU-1F-03', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'fcu', pos: [12.5, 4.5, 8.2], size: [1.7, 0.65, 1.15], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_eaf01', tag: 'B31F_EAF01', label: 'EAF-01 (Cleanse)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [-4.5, 5.75, -8.0], size: [0.9, 0.9, 0.9], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_eaf02', tag: 'B31F_EAF02', label: 'EAF-02 (Chem)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [2.0, 5.75, -8.0], size: [0.9, 0.9, 0.9], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_eaf03', tag: 'B31F_EAF03', label: 'EAF-03 (Matl)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [7.5, 5.75, -8.0], size: [0.9, 0.9, 0.9], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_eaf04', tag: 'B31F_EAF04', label: 'EAF-04 (WH)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [14.5, 5.75, 2.2], size: [0.9, 0.9, 0.9], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_eaf05', tag: 'B31F_EAF05', label: 'EAF-05 (Yard)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [-7.0, 5.75, 8.8], size: [0.9, 0.9, 0.9], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  { id: 'b3_1f_tef01', tag: 'B31F_TEF01', label: 'TEF-01 (Toilet)', zone: 'b3_plant', b3Layer: 'warehouse', meshType: 'duct_fan', pos: [16.0, 5.7, 9.6], size: [0.85, 0.85, 0.85], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },

  // =========================================================================
  // ZONE 5B: BUILDING 3 — 2F / M1F MECHANICAL DECK (2 AHUs · 3 EXH FANS · 7 OFFICE FCUs · MSB ROOM)
  // =========================================================================
  { id: 'b3_ahu01', tag: 'B3M1F_AHU01', label: 'AHU-B3-M1F-01', zone: 'b3_2f', meshType: 'ahu', pos: [-14.8, 0, -4.6], rotY: Math.PI / 2, size: [4.6, 2.45, 2.3], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b3_ahu02', tag: 'B3M1F_AHU02', label: 'AHU-B3-M1F-02', zone: 'b3_2f', meshType: 'ahu', pos: [-8.2, 0, -4.6], rotY: Math.PI / 2, size: [4.6, 2.45, 2.3], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_AHU_DewPoint' },
  { id: 'b3_fa11101', tag: 'B3M1F_FA11101A', label: 'FA-11101A (Acid)', zone: 'b3_2f', meshType: 'exhaust_fan', pos: [-16.5, 0, 5.4], rotY: Math.PI / 2, size: [2.1, 2.5, 2.0], scadaScreen: 'b3_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b3_fa11102', tag: 'B3M1F_FA11102A', label: 'FA-11102A (Solv)', zone: 'b3_2f', meshType: 'exhaust_fan', pos: [-10.5, 0, 5.4], rotY: Math.PI / 2, size: [2.1, 2.5, 2.0], scadaScreen: 'b3_exh', faceplateType: 'Fpl_VFD' },
  { id: 'b3_fa11103', tag: 'B3M1F_FA11103A', label: 'FA-11103A (Chem)', zone: 'b3_2f', meshType: 'exhaust_fan', pos: [-4.5, 0, 5.4], rotY: Math.PI / 2, size: [2.1, 2.5, 2.0], scadaScreen: 'b3_exh', faceplateType: 'Fpl_DOL' },
  // 7× M1F Office & Lab Ceiling FCUs (B3M1F_FCU01..07)
  { id: 'b3_m1f_fcu01', tag: 'B3M1F_FCU01', label: 'FCU-M1F-01', zone: 'b3_2f', meshType: 'fcu', pos: [6.0, 4.15, -7.8], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu02', tag: 'B3M1F_FCU02', label: 'FCU-M1F-02', zone: 'b3_2f', meshType: 'fcu', pos: [10.4, 4.15, -7.8], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu03', tag: 'B3M1F_FCU03', label: 'FCU-M1F-03', zone: 'b3_2f', meshType: 'fcu', pos: [14.8, 4.15, -7.8], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu04', tag: 'B3M1F_FCU04', label: 'FCU-M1F-04', zone: 'b3_2f', meshType: 'fcu', pos: [19.0, 4.15, -7.8], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu05', tag: 'B3M1F_FCU05', label: 'FCU-M1F-05', zone: 'b3_2f', meshType: 'fcu', pos: [7.5, 4.15, -2.5], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu06', tag: 'B3M1F_FCU06', label: 'FCU-M1F-06', zone: 'b3_2f', meshType: 'fcu', pos: [13.2, 4.15, -2.5], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
  { id: 'b3_m1f_fcu07', tag: 'B3M1F_FCU07', label: 'FCU-M1F-07', zone: 'b3_2f', meshType: 'fcu', pos: [18.5, 4.15, -2.5], size: [1.5, 0.6, 1.05], scadaScreen: 'b3_air_ahu', faceplateType: 'Fpl_DOL' },
];

export const DEFAULT_3D_PIPES: Pipe3DLink[] = [
  // Site Inter-Building Utility Bridges (B5 -> B2 & B3)
  { id: 'site_chw_b2', zone: 'site', fromId: 'site_b5', toId: 'site_b2', fluid: 'chw', flowSourceTag: 'B51F_CH11CHWP', elevationY: 4.5, label: 'CHW Supply B5→B2' },
  { id: 'site_chwr_b2', zone: 'site', fromId: 'site_b2', toId: 'site_b5', fluid: 'chwr', flowSourceTag: 'B51F_CH11CHWP', elevationY: 4.0, label: 'CHW Return B2→B5' },
  { id: 'site_hw_b2', zone: 'site', fromId: 'site_b5', toId: 'site_b2', fluid: 'hw_sup', flowSourceTag: 'B51F_CH11HWP', elevationY: 3.5, label: 'HW B5→B2' },
  { id: 'site_air_b2', zone: 'site', fromId: 'site_b5', toId: 'site_b2', fluid: 'air', flowSourceTag: 'B51F_AC204', elevationY: 3.0, label: 'OFLAC B5→B2' },
  { id: 'site_pv_b2', zone: 'site', fromId: 'site_b2', toId: 'site_b5', fluid: 'vac', flowSourceTag: 'B51F_PV1301A', elevationY: 2.5, label: 'PV B2→B5' },
  { id: 'site_air_b3', zone: 'site', fromId: 'site_b5', toId: 'site_b3', fluid: 'air', flowSourceTag: 'B51F_AC204', elevationY: 3.2, label: 'OFLAC B5→B3' },
  { id: 'site_di_b3', zone: 'site', fromId: 'site_b5', toId: 'site_b3', fluid: 'di', flowSourceTag: 'B31F_PCV10705', elevationY: 2.4, label: 'RO-DI B5→B3' },

  // B5 Chiller & Cooling Towers
  { id: 'b5_p_ch11', zone: 'b5_chiller', fromId: 'b5_ch11p', toId: 'b5_ch11', fluid: 'chw', flowSourceTag: 'B51F_CH11CHWP', elevationY: 1.5 },
  { id: 'b5_p_ch12', zone: 'b5_chiller', fromId: 'b5_ch12p', toId: 'b5_ch12', fluid: 'chw', flowSourceTag: 'B51F_CH12CHWP', elevationY: 1.5 },
  { id: 'b5_p_ch13', zone: 'b5_chiller', fromId: 'b5_ch13p', toId: 'b5_ch13', fluid: 'chw', flowSourceTag: 'B51F_CH13CHWP', elevationY: 1.5 },
  { id: 'b5_p_ch14hw', zone: 'b5_chiller', fromId: 'b5_ch11hwp', toId: 'b5_ch14', fluid: 'hw', flowSourceTag: 'B51F_CH11HWP', elevationY: 1.6 },
  { id: 'b5_cwp_ch11', zone: 'b5_chiller', fromId: 'b5_cwp11', toId: 'b5_ch11', fluid: 'cdw', flowSourceTag: 'B51F_CT11CWP', elevationY: 2.3 },
  { id: 'b5_cwp_ch12', zone: 'b5_chiller', fromId: 'b5_cwp12', toId: 'b5_ch12', fluid: 'cdw', flowSourceTag: 'B51F_CT12CWP', elevationY: 2.3 },
  { id: 'b5_cwp_ch13', zone: 'b5_chiller', fromId: 'b5_cwp13', toId: 'b5_ch13', fluid: 'cdw', flowSourceTag: 'B51F_CT13CWP', elevationY: 2.3 },
  { id: 'b5_ct11_cwp', zone: 'b5_chiller', fromId: 'b5_ct11', toId: 'b5_cwp11', fluid: 'cdw', flowSourceTag: 'B51F_CT11FN', elevationY: 1.9 },
  { id: 'b5_ct12_cwp', zone: 'b5_chiller', fromId: 'b5_ct12', toId: 'b5_cwp11', fluid: 'cdw', flowSourceTag: 'B51F_CT12FN', elevationY: 1.9 },
  { id: 'b5_ct13_cwp', zone: 'b5_chiller', fromId: 'b5_ct13', toId: 'b5_cwp12', fluid: 'cdw', flowSourceTag: 'B51F_CT13FN', elevationY: 1.9 },
  { id: 'b5_ct14_cwp', zone: 'b5_chiller', fromId: 'b5_ct14', toId: 'b5_cwp12', fluid: 'cdw', flowSourceTag: 'B51F_CT14FN', elevationY: 1.9 },
  { id: 'b5_ct15_cwp', zone: 'b5_chiller', fromId: 'b5_ct15', toId: 'b5_cwp13', fluid: 'cdw', flowSourceTag: 'B51F_CT15FN', elevationY: 1.9 },

  // B5 Utilities (PCW, Air, PV, DI)
  { id: 'b5_tk_p501a', zone: 'b5_utilities', fromId: 'b5_tk501', toId: 'b5_p501a', fluid: 'pcw', flowSourceTag: 'B51F_P501A', elevationY: 1.2 },
  { id: 'b5_tk_p501b', zone: 'b5_utilities', fromId: 'b5_tk501', toId: 'b5_p501b', fluid: 'pcw', flowSourceTag: 'B51F_P501B', elevationY: 1.2 },
  { id: 'b5_tk_p501c', zone: 'b5_utilities', fromId: 'b5_tk501', toId: 'b5_p501c', fluid: 'pcw', flowSourceTag: 'B51F_P501C', elevationY: 1.2 },
  { id: 'b5_tk_p502', zone: 'b5_utilities', fromId: 'b5_tk501', toId: 'b5_p502', fluid: 'pcw', flowSourceTag: 'B51F_P502', elevationY: 0.9 },
  { id: 'b5_p501a_e', zone: 'b5_utilities', fromId: 'b5_p501a', toId: 'b5_e501a', fluid: 'pcw', flowSourceTag: 'B51F_P501A', elevationY: 1.6 },
  { id: 'b5_p501b_e', zone: 'b5_utilities', fromId: 'b5_p501b', toId: 'b5_e501b', fluid: 'pcw', flowSourceTag: 'B51F_P501B', elevationY: 1.6 },
  { id: 'b5_rodi_tk', zone: 'b5_utilities', fromId: 'b5_rodi', toId: 'b5_tk501', fluid: 'di', flowSourceTag: 'B51F_XV10502', elevationY: 2.2 },
  { id: 'b5_ac204_201', zone: 'b5_utilities', fromId: 'b5_ac204', toId: 'b5_ac201', fluid: 'air', flowSourceTag: 'B51F_AC204', elevationY: 2.4 },
  { id: 'b5_ac101_102', zone: 'b5_utilities', fromId: 'b5_ac101', toId: 'b5_ac102', fluid: 'air', flowSourceTag: 'B51F_AC101', elevationY: 2.4 },
  { id: 'b5_pva_pvb', zone: 'b5_utilities', fromId: 'b5_pv1301a', toId: 'b5_pv1301b', fluid: 'vac', flowSourceTag: 'B51F_PV1301A', elevationY: 2.1 },

  // B5 Air & EXH
  { id: 'b5_pau_ahu1', zone: 'b5_air', fromId: 'b5_pau01', toId: 'b5_ahu01', fluid: 'chw', flowSourceTag: 'B5M2F_PAU01', elevationY: 2.6 },
  { id: 'b5_pau_ahu3', zone: 'b5_air', fromId: 'b5_pau01', toId: 'b5_ahu03', fluid: 'chw', flowSourceTag: 'B5M2F_PAU01', elevationY: 2.6 },
  { id: 'b5_ahu1_2', zone: 'b5_air', fromId: 'b5_ahu01', toId: 'b5_ahu02', fluid: 'chw', flowSourceTag: 'B5M2F_AHU02', elevationY: 2.2 },
  { id: 'b5_ahu2_fa1', zone: 'b5_air', fromId: 'b5_ahu02', toId: 'b5_fa11201', fluid: 'exh', flowSourceTag: 'B5M2F_FA11201A', elevationY: 2.8 },
  { id: 'b5_ahu4_fa3', zone: 'b5_air', fromId: 'b5_ahu04', toId: 'b5_fa11203', fluid: 'exh', flowSourceTag: 'B5M2F_FA11203A', elevationY: 2.8 },
];

export function resolveNodeTransform(
  node: Equipment3DNode,
  overrides: Record<string, NodeTransformOverride>
): { x: number; y: number; z: number; rotY: number } {
  const ov = overrides[node.id];
  return {
    x: ov ? ov.x : node.pos[0],
    y: node.pos[1],
    z: ov ? ov.z : node.pos[2],
    rotY: ov ? ov.rotY : node.rotY ?? 0,
  };
}

/**
 * Computes a clean orthogonal 3D pipe route with vertical risers from equipment A to equipment B.
 * Recomputes live whenever equipment nodes are dragged or rotated in Edit Layout Mode!
 */
export function computeOrthogonalPipePath(
  from: { x: number; y: number; z: number; h: number },
  to: { x: number; y: number; z: number; h: number },
  elevationY: number
): [number, number, number][] {
  const yStart = from.y + Math.min(from.h * 0.65, elevationY);
  const yEnd = to.y + Math.min(to.h * 0.65, elevationY);
  const midX = Number(((from.x + to.x) / 2).toFixed(2));
  return [
    [from.x, yStart, from.z],
    [from.x, elevationY, from.z],
    [midX, elevationY, from.z],
    [midX, elevationY, to.z],
    [to.x, elevationY, to.z],
    [to.x, yEnd, to.z],
  ];
}

export interface ExportedLayout3D {
  version: number;
  project: 'COHR2401';
  exportedAt: string;
  overrides: Record<string, NodeTransformOverride>;
}

export function serializeLayoutOverrides(overrides: Record<string, NodeTransformOverride>): string {
  const payload: ExportedLayout3D = {
    version: 1,
    project: 'COHR2401',
    exportedAt: new Date().toISOString(),
    overrides,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseLayoutOverrides(jsonText: string): Record<string, NodeTransformOverride> | null {
  try {
    const parsed = JSON.parse(jsonText) as Partial<ExportedLayout3D>;
    if (!parsed || typeof parsed !== 'object' || !parsed.overrides || typeof parsed.overrides !== 'object') {
      return null;
    }
    const clean: Record<string, NodeTransformOverride> = {};
    for (const [id, ov] of Object.entries(parsed.overrides)) {
      if (
        ov &&
        typeof ov.x === 'number' &&
        Number.isFinite(ov.x) &&
        typeof ov.z === 'number' &&
        Number.isFinite(ov.z) &&
        typeof ov.rotY === 'number' &&
        Number.isFinite(ov.rotY)
      ) {
        clean[id] = { x: ov.x, z: ov.z, rotY: ov.rotY };
      }
    }
    return clean;
  } catch {
    return null;
  }
}
