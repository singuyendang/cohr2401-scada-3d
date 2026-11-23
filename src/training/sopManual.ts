import type { B5ScreenId, PlantState } from '../types/scada.ts';
import type { Zone3DId } from './plant3dLayout.ts';

export interface SopStep {
  id: string;
  title: string;
  instruction: string;
  safetyNote?: string;
  targetZone: Zone3DId;
  targetScreen: B5ScreenId;
  targetTag?: string;
  checkDone: (plant: PlantState) => boolean;
}

export interface SopProcedure {
  id: string;
  code: string;
  title: string;
  building: 'B5' | 'B2' | 'B3' | 'ALL';
  zone: Zone3DId;
  estimatedMinutes: number;
  sourceRef: string;
  objective: string;
  steps: SopStep[];
}

/**
 * Standard Operating Procedures (SOP) authored directly from COHR2401-AT-FDS-002/003
 * & TIA Portal V18 PLC interlocks. Structured cleanly for effortless future updates
 * whenever official Coherent O&M PDF/Word SOPs are added into References/.
 */
export const SOP_MANUALS: SopProcedure[] = [
  {
    id: 'sop_b5_chiller',
    code: 'SOP-01',
    title: 'Vận hành & Liên động Hệ Chiller Nước Nhà 5 (B5CH)',
    building: 'B5',
    zone: 'b5_chiller',
    estimatedMinutes: 5,
    sourceRef: 'COHR2401-AT-FDS-002 §Chiller · B5_PLC FB_Demand_B5CH',
    objective:
      'Nắm vững chuỗi liên động an toàn Tháp giải nhiệt → CWP → Van CHV/CDV → CHWP → Chiller và cách kiểm soát áp suất/nhiệt độ nước lạnh trung tâm cấp cho Nhà 5 & Nhà 2.',
    steps: [
      {
        id: 's1_1',
        title: 'Kiểm tra Tháp giải nhiệt (CT-11..19) & Nhiệt độ nước giải nhiệt',
        instruction:
          'Mở màn hình CHILLER Nhà 5. Xác nhận tối thiểu 2 tháp CT đang RUNNING cho mỗi Chiller chạy (hiện >= 4 tháp) và nhiệt độ nước ra tháp B51F_TT10505 < 30.0 °C.',
        safetyNote: 'Nguyên tắc FDS: Mỗi Chiller chạy bắt buộc có ít nhất 2 tháp CT mở đủ van IV/OV (OpenFB = 1).',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_chiller',
        targetTag: 'B51F_TT10505',
        checkDone: (p) =>
          [11, 12, 13, 14, 15, 16, 17, 18, 19].filter((n) => p.equipment[`B51F_CT${n}FN`]?.status === 'RUNNING').length >= 4 &&
          (p.sensors['B51F_TT10505']?.pv ?? 99) < 30.0,
      },
      {
        id: 's1_2',
        title: 'Xác nhận Bơm giải nhiệt (CWP) & Áp suất ống góp PIT10505',
        instruction:
          'Kiểm tra tối thiểu 2 bơm CT11CWP / CT12CWP ở chế độ AUTO đang RUNNING và áp suất góp giải nhiệt B51F_PIT10505 >= 1.6 bar.',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_chiller',
        targetTag: 'B51F_CT11CWP',
        checkDone: (p) =>
          ['B51F_CT11CWP', 'B51F_CT12CWP', 'B51F_CT13CWP'].filter((t) => p.equipment[t]?.status === 'RUNNING').length >= 2 &&
          (p.sensors['B51F_PIT10505']?.pv ?? 0) >= 1.6,
      },
      {
        id: 's1_3',
        title: 'Kiểm tra chuỗi liên động Van CHV/CDV → Bơm CHWP → Chiller',
        instruction:
          'Xác nhận van B51F_CH11CHV & B51F_CH11CDV mở hoàn toàn (OpenFB), bơm B51F_CH11CHWP RUNNING (tần số >= 15 Hz) và áp góp B51F_CHWPS1 trong khoảng 3.2–4.8 bar.',
        safetyNote: 'VFD luôn có sàn tần số tối thiểu 15.0 Hz (30% của 50 Hz) khi chạy cả AUTO và MANUAL.',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_chiller',
        targetTag: 'B51F_CH11CHWP',
        checkDone: (p) =>
          Boolean(p.valves['B51F_CH11CHV']?.openFB) &&
          p.equipment['B51F_CH11CHWP']?.status === 'RUNNING' &&
          (p.sensors['B51F_CHWPS1']?.pv ?? 0) >= 3.2 &&
          (p.sensors['B51F_CHWPS1']?.pv ?? 99) <= 4.8,
      },
      {
        id: 's1_4',
        title: 'Kiểm tra bộ điều phối FB_Demand B5CH & Van Bypass BPMV',
        instruction:
          'Xác nhận bộ Demand B5CH đang ENABLE, Chiller chạy giữ nhiệt nước lạnh B51F_CHSTS1 <= 9.5 °C, và van bypass B51F_BPMV duy trì ở chế độ MANUAL.',
        safetyNote: 'Trong PLC gốc COHR2401, B51F_BPMV không có vòng Auto — chỉ vận hành Manual khi cân bằng thủy lực.',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_chiller',
        targetTag: 'B51F_BPMV',
        checkDone: (p) =>
          Boolean(p.demands.B5CH?.enable) &&
          (p.sensors['B51F_CHSTS1']?.pv ?? 99) <= 9.5 &&
          p.valves['B51F_BPMV']?.mode === 'MANUAL',
      },
    ],
  },
  {
    id: 'sop_b5_heat_recovery',
    code: 'SOP-02',
    title: 'Vận hành Hệ Thu hồi Nhiệt Heat Recovery (CH-14)',
    building: 'B5',
    zone: 'b5_chiller',
    estimatedMinutes: 4,
    sourceRef: 'COHR2401-AT-FDS-002 §HeatRecovery · Scr_B5_HeatRecovery',
    objective:
      'Đảm bảo cụm thu hồi nhiệt CH-14 cấp nước nóng ổn định (~45 °C) cho dàn sưởi tách ẩm (HWCV) của hệ AHU Nhà 5 và Nhà 2 mà không nối nhầm vào tháp giải nhiệt.',
    steps: [
      {
        id: 's2_1',
        title: 'Kiểm tra van cô lập CH14CHV / CH14CDV & 2 bơm CH11HWP / CH14CHWP',
        instruction:
          'Mở màn hình HEAT (Heat Recovery). Xác nhận cả 2 van CH14CHV & CH14CDV đang OPEN, bơm nước nóng CH11HWP và bơm lạnh CH14CHWP đang RUNNING.',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_heat_recovery',
        targetTag: 'B51F_CH11HWP',
        checkDone: (p) =>
          p.equipment['B51F_CH11HWP']?.status === 'RUNNING' && p.equipment['B51F_CH14CHWP']?.status === 'RUNNING',
      },
      {
        id: 's2_2',
        title: 'Kiểm tra Chiller thu hồi nhiệt CH-14 & Nhiệt độ nước nóng HSTS1',
        instruction:
          'Xác nhận B51F_CH14 đang RUNNING (không báo lỗi) và cảm biến B51F_HSTS1 đạt 41.0–49.0 °C.',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_heat_recovery',
        targetTag: 'B51F_CH14',
        checkDone: (p) =>
          p.equipment['B51F_CH14']?.status === 'RUNNING' &&
          (p.sensors['B51F_HSTS1']?.pv ?? 0) >= 41.0 &&
          (p.sensors['B51F_HSTS1']?.pv ?? 99) <= 49.0,
      },
      {
        id: 's2_3',
        title: 'Xác nhận 2 van HEMV & HBPMV ở chế độ Manual-Only',
        instruction:
          'Kiểm tra trạng thái 2 van B51F_HEMV và B51F_HBPMV đều đang ở MANUAL (đóng 0% khi vận hành bình thường để giữ áp HBPPS1 ổn định).',
        targetZone: 'b5_chiller',
        targetScreen: 'b5_heat_recovery',
        targetTag: 'B51F_HEMV',
        checkDone: (p) =>
          p.valves['B51F_HEMV']?.mode === 'MANUAL' && p.valves['B51F_HBPMV']?.mode === 'MANUAL',
      },
    ],
  },
  {
    id: 'sop_pcw_b5_b2',
    code: 'SOP-03',
    title: 'Vận hành Trạm Nước PCW Nhà 5 & Nhà 2 (Bơm VFD · PHE · Bồn TK)',
    building: 'ALL',
    zone: 'b5_utilities',
    estimatedMinutes: 5,
    sourceRef: 'COHR2401-AT-FDS-002 §PCW · Scr_B5_PCW & Scr_B2_PCW',
    objective:
      'Giám sát ổn định chênh áp cuối tuyến DPT, nhiệt độ qua bộ trao đổi nhiệt tấm PHE (TCV) và logic bảo vệ chống cạn / chống tràn bồn đệm TK-501 & TK-601.',
    steps: [
      {
        id: 's3_1',
        title: 'Kiểm tra trạm PCW Nhà 5 (P-501A/B/C & DPT10501)',
        instruction:
          'Mở màn hình PCW Nhà 5. Xác nhận tối thiểu 2 bơm P-501 đang RUNNING ở AUTO, chênh áp B51F_DPT10501 trong vùng 1.5–2.2 bar và nhiệt độ cấp TT10501/02 <= 24.0 °C.',
        targetZone: 'b5_utilities',
        targetScreen: 'b5_pcw',
        targetTag: 'B51F_DPT10501',
        checkDone: (p) =>
          ['B51F_P501A', 'B51F_P501B', 'B51F_P501C'].filter((t) => p.equipment[t]?.status === 'RUNNING').length >= 2 &&
          (p.sensors['B51F_DPT10501']?.pv ?? 0) >= 1.5 &&
          (p.sensors['B51F_DPT10501']?.pv ?? 99) <= 2.2,
      },
      {
        id: 's3_2',
        title: 'Kiểm tra bảo vệ mức bồn TK-501 & Bơm xả P-502',
        instruction:
          'Xác nhận mực bồn B51F_LT10501 ở vùng an toàn (35–85%) và bơm xả P-502 đang ở chế độ AUTO (tự chạy khi >= 85%, chốt chạy tới khi <= 35%).',
        safetyNote: 'Không khóa P-502 ở MANUAL STOP vì bồn sẽ tràn khi van xả XV10501 mở.',
        targetZone: 'b5_utilities',
        targetScreen: 'b5_pcw',
        targetTag: 'B51F_P502',
        checkDone: (p) =>
          p.equipment['B51F_P502']?.mode === 'AUTO' &&
          (p.sensors['B51F_LT10501']?.pv ?? 0) >= 35 &&
          (p.sensors['B51F_LT10501']?.pv ?? 100) <= 85,
      },
      {
        id: 's3_3',
        title: 'Kiểm tra trạm PCW Nhà 2 (4 bơm P-601A..D & TK-601)',
        instruction:
          'Chuyển sang màn hình PCW Nhà 2. Xác nhận ít nhất 2 bơm P-601 đang RUNNING, chênh áp B21F_DPT10601 ổn định 1.5–2.2 bar và mực bồn TK-601 (B21F_LT10601) < 85%.',
        targetZone: 'b2_plant',
        targetScreen: 'b2_pcw',
        targetTag: 'B21F_P601A',
        checkDone: (p) =>
          ['B21F_P601A', 'B21F_P601B', 'B21F_P601C', 'B21F_P601D'].filter((t) => p.equipment[t]?.status === 'RUNNING').length >= 2 &&
          (p.sensors['B21F_DPT10601']?.pv ?? 0) >= 1.5 &&
          (p.sensors['B21F_LT10601']?.pv ?? 100) <= 85,
      },
    ],
  },
  {
    id: 'sop_air_pv',
    code: 'SOP-04',
    title: 'Vận hành Hệ Khí nén Liên tòa (OFLAC/OFRAC) & Chân không (PV)',
    building: 'B5',
    zone: 'b5_utilities',
    estimatedMinutes: 4,
    sourceRef: 'COHR2401-AT-FDS-002 §OFLAC/OFRAC/PV',
    objective:
      'Đảm bảo áp suất khí nén OFLAC (~7.0 bar) cấp xuyên suốt Nhà 5 → Nhà 2 → Nhà 3 và áp suất chân không PV (-75 kPa) tới điểm cuối Nhà 2.',
    steps: [
      {
        id: 's4_1',
        title: 'Kiểm tra máy nén Lead VSD AC-204 & Áp suất OFLAC PIT20101',
        instruction:
          'Mở màn hình OFL AC. Xác nhận máy nén biến tần AC-204 đang RUNNING (hoặc dự phòng AC-201/202 gánh tải) giữ áp suất B51F_PIT20101 >= 6.5 bar và điểm sương AIT20101 <= -25 °C.',
        targetZone: 'b5_utilities',
        targetScreen: 'b5_oflac',
        targetTag: 'B51F_AC204',
        checkDone: (p) =>
          ['B51F_AC204', 'B51F_AC201', 'B51F_AC202'].some((t) => p.equipment[t]?.status === 'RUNNING') &&
          (p.sensors['B51F_PIT20101']?.pv ?? 0) >= 6.5,
      },
      {
        id: 's4_2',
        title: 'Kiểm tra liên động Bơm làm mát P-10101A/B & Máy nén không dầu OFRAC',
        instruction:
          'Mở màn hình OFR AC. Xác nhận bơm giải nhiệt P-10101A (hoặc B) RUNNING trước khi chạy AC-101/102 và áp suất B51F_PIT10101 >= 6.5 bar.',
        targetZone: 'b5_utilities',
        targetScreen: 'b5_ofrac',
        targetTag: 'B51F_AC101',
        checkDone: (p) =>
          (p.equipment['B51F_P10101A']?.status === 'RUNNING' || p.equipment['B51F_P10101B']?.status === 'RUNNING') &&
          (p.sensors['B51F_PIT10101']?.pv ?? 0) >= 6.5,
      },
      {
        id: 's4_3',
        title: 'Kiểm tra Hệ Chân không PV (Nhà 5 → cuối tuyến Nhà 2)',
        instruction:
          'Mở màn hình PV. Xác nhận ít nhất 1 bơm PV-1301A/B đang RUNNING, chân không góp chính B51F_PIT1301 <= -65 kPa và cuối tuyến B23F_PIT1302 <= -62 kPa.',
        targetZone: 'b5_utilities',
        targetScreen: 'b5_pv',
        targetTag: 'B51F_PV1301A',
        checkDone: (p) =>
          (p.equipment['B51F_PV1301A']?.status === 'RUNNING' || p.equipment['B51F_PV1301B']?.status === 'RUNNING') &&
          (p.sensors['B51F_PIT1301']?.pv ?? 0) <= -65 &&
          (p.sensors['B23F_PIT1302']?.pv ?? 0) <= -62,
      },
    ],
  },
  {
    id: 'sop_b3_independent',
    code: 'SOP-05',
    title: 'Vận hành Hệ Chiller Gió (CH-21/22) & Heat Fan (HP-01..03) Nhà 3',
    building: 'B3',
    zone: 'b3_plant',
    estimatedMinutes: 4,
    sourceRef: 'Scr_B3_HVAC_CHILLED · Scr_B3_HotWaterSystem · B3_PLC',
    objective:
      'Vận hành hệ lạnh & nhiệt hoàn toàn độc lập của Nhà 3: Chiller giải nhiệt gió V-Coil (không có tháp CT) và cụm 3 Heat Fan cấp nước nóng sưởi AHU.',
    steps: [
      {
        id: 's5_1',
        title: 'Kiểm tra cụm Chiller giải nhiệt gió CH-21/22 & Bơm CHWP',
        instruction:
          'Mở màn hình CHILLER Nhà 3. Xác nhận tối thiểu 1 Chiller gió (CH-21 hoặc CH-22) RUNNING cùng van CHV mở và bơm CHWP chạy giữ B31F_CHSTS1 <= 9.5 °C, B31F_CHWPS1 >= 2.0 bar.',
        targetZone: 'b3_plant',
        targetScreen: 'b3_chiller',
        targetTag: 'B31F_CH21',
        checkDone: (p) =>
          (p.equipment['B31F_CH21']?.status === 'RUNNING' || p.equipment['B31F_CH22']?.status === 'RUNNING') &&
          (p.sensors['B31F_CHSTS1']?.pv ?? 99) <= 9.5 &&
          (p.sensors['B31F_CHWPS1']?.pv ?? 0) >= 2.0,
      },
      {
        id: 's5_2',
        title: 'Kiểm tra cụm 3 Heat Fan HP-01/02/03 & Bơm HPP-21/22',
        instruction:
          'Mở màn hình HEAT Nhà 3. Xác nhận ít nhất 1 bơm HPP-21/22 RUNNING, Heat Fan chạy ổn định giữ nước nóng B31F_HPSTS1 >= 42.0 °C và áp B31F_HWPS1 >= 1.8 bar.',
        targetZone: 'b3_plant',
        targetScreen: 'b3_heat',
        targetTag: 'B31F_HP01',
        checkDone: (p) =>
          ['B31F_HP01', 'B31F_HP02', 'B31F_HP03'].some((t) => p.equipment[t]?.status === 'RUNNING') &&
          (p.sensors['B31F_HPSTS1']?.pv ?? 0) >= 42.0 &&
          (p.sensors['B31F_HWPS1']?.pv ?? 0) >= 1.8,
      },
      {
        id: 's5_3',
        title: 'Kiểm tra nhánh DI Cistern Nhà 3 (PCV10705)',
        instruction:
          'Mở màn hình DI tổng. Xác nhận gói RO-DI CONNECTED và van B31F_PCV10705 điều áp B31F_PIT10705 >= 2.2 bar.',
        targetZone: 'b3_plant',
        targetScreen: 'b3_di',
        targetTag: 'B31F_PCV10705',
        checkDone: (p) =>
          p.sandbox.diPackageConnected && (p.sensors['B31F_PIT10705']?.pv ?? 0) >= 2.2,
      },
    ],
  },
  {
    id: 'sop_wincc_alarm_trend',
    code: 'SOP-06',
    title: 'Quy trình Giám sát & Xác nhận Alarm 4 Trạng thái WinCC + Trend',
    building: 'ALL',
    zone: 'site',
    estimatedMinutes: 3,
    sourceRef: 'COHR2401.mdf dbo.MSTypes · Scr_OnlineAlarm & Scr_OnlineTrend',
    objective:
      'Phân biệt chính xác 4 trạng thái màu WinCC (Đỏ: CAME_IN, Xanh lá: WENT_OUT chưa ACK, Xanh dương: CAME_IN đã ACK, Trắng: History) và thực hành ACK đúng quy trình.',
    steps: [
      {
        id: 's6_1',
        title: 'Kiểm tra thanh báo động TopBar & Bảng Online Alarm',
        instruction:
          'Mở trang ALARM (Online Alarm). Đảm bảo không còn cảnh báo nghiêm trọng (ALARM Đỏ CAME_IN / FAULT / HHA / LLA) chưa được xác nhận.',
        safetyNote: 'Nguyên tắc WinCC: Alarm đã hết lỗi (WENT_OUT màu xanh lá) vẫn ở lại bảng Online cho tới khi kỹ sư bấm ACK!',
        targetZone: 'site',
        targetScreen: 'b5_alarms_online',
        checkDone: (p) => p.alarms.filter((a) => !a.acknowledged && a.alarmClass === 'ALARM').length === 0,
      },
      {
        id: 's6_2',
        title: 'Xác nhận toàn bộ 3 tòa nhà không còn thiết bị FAULTED',
        instruction:
          'Kiểm tra nhanh trạng thái tổng thể: không có thiết bị nào bị FAULTED chưa xử lý trên B5, B2 và B3.',
        targetZone: 'site',
        targetScreen: 'site_overview',
        checkDone: (p) => Object.values(p.equipment).every((u) => !u.faulted),
      },
    ],
  },
];
