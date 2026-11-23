import type { B5ScreenId, PlantState } from '../types/scada.ts';
import type { Zone3DId } from './plant3dLayout.ts';

export interface ChallengeCriterion {
  id: string;
  label: string;
  check: (plant: PlantState) => boolean;
}

export interface TrainingChallenge {
  id: string;
  code: string;
  building: 'B5' | 'B2' | 'B3';
  zone: Zone3DId;
  scadaScreen: B5ScreenId;
  title: string;
  durationSec: number; // Simulation seconds (240s = 4 min)
  scenarioDesc: string;
  expectedAction: string;
  focusTag: string;
  /** Deterministically injects the fault/disturbance into a freshly reset PlantState */
  injectFault: (plant: PlantState) => PlantState;
  /** Three quantitative SCADA tag criteria that must all be true to PASS */
  criteria: [ChallengeCriterion, ChallengeCriterion, ChallengeCriterion];
  /** Reference operator fix (used by automated 2-way Node verification tests) */
  applyReferenceFix: (plant: PlantState) => PlantState;
}

function hasAckedOrNoFaultAlarm(plant: PlantState, tag: string): boolean {
  const related = plant.alarms.filter((a) => a.tag === tag);
  if (related.length === 0) return false;
  return related.every((a) => a.acknowledged);
}

function ackTagAlarms(plant: PlantState, tag: string): PlantState {
  return {
    ...plant,
    alarms: plant.alarms.map((a) =>
      a.tag === tag
        ? {
            ...a,
            acknowledged: true,
            state: a.active ? 'CAME_IN_ACK' : 'WENT_OUT_ACK',
            ackTime: a.ackTime ?? '00:01:00',
          }
        : a
    ),
  };
}

/**
 * 8 Timed Operator Training Challenges (OTS) covering Building 5, Building 2, and Building 3.
 * Every challenge is verified 2-way in tests/simulation.test.ts:
 *   - No operator intervention -> MUST FAIL
 *   - Applying reference operator SOP -> MUST PASS
 */
export const TRAINING_CHALLENGES: TrainingChallenge[] = [
  {
    id: 'ch01_b5_chiller_trip',
    code: 'CH-01',
    building: 'B5',
    zone: 'b5_chiller',
    scadaScreen: 'b5_chiller',
    title: 'Trip Chiller chính CH-11 khi tải lạnh tăng cao',
    durationSec: 240,
    scenarioDesc:
      'Chiller B51F_CH11 bất ngờ báo lỗi FAULT và dừng khẩn cấp trong lúc tải lạnh toàn nhà máy tăng lên 88%, đồng thời bộ điều phối tự động FB_Demand B5CH đang bị tắt (Disable). Nhiệt độ nước lạnh B51F_CHSTS1 đang tăng vọt!',
    expectedAction:
      'Mở màn hình CHILLER Nhà 5 → bấm DEMAND B5CH để bật lại ENABLE (hoặc khởi động CH-13 theo đúng liên động) → vào ALARM xác nhận (ACK) cảnh báo của B51F_CH11.',
    focusTag: 'B51F_CH11',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.coolingLoadPct = 88;
      next.demands.B5CH.enable = false;
      next.demands.B5CH.startUpDelaySec = 3;
      next.equipment['B51F_CH11'].faulted = true;
      next.equipment['B51F_CH11'].status = 'FAULTED';
      next.equipment['B51F_CH11'].loadPct = 0;
      next.equipment['B51F_CH11'].cmdStart = false;
      next.equipment['B51F_CH13'].cmdStart = false;
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Chiller dự phòng B51F_CH13 đang RUNNING',
        check: (p) => p.equipment['B51F_CH13']?.status === 'RUNNING',
      },
      {
        id: 'c2',
        label: 'Nhiệt độ nước lạnh B51F_CHSTS1 <= 9.2 °C',
        check: (p) => (p.sensors['B51F_CHSTS1']?.pv ?? 99) <= 9.2,
      },
      {
        id: 'c3',
        label: 'Đã xác nhận (ACK) Alarm của B51F_CH11',
        check: (p) => hasAckedOrNoFaultAlarm(p, 'B51F_CH11'),
      },
    ],
    applyReferenceFix: (plant) => {
      const next = ackTagAlarms(structuredClone(plant), 'B51F_CH11');
      next.demands.B5CH.enable = true;
      return next;
    },
  },
  {
    id: 'ch02_b5_ct_heatwave',
    code: 'CH-02',
    building: 'B5',
    zone: 'b5_chiller',
    scadaScreen: 'b5_chiller',
    title: 'Nắng nóng 26.5°C WB + 3 Tháp CT bị khóa Manual dừng',
    durationSec: 240,
    scenarioDesc:
      'Nhiệt độ bầu ướt ngoài trời tăng lên 26.5 °C, đồng thời 3 tháp giải nhiệt CT-11, CT-12, CT-13 bị ca trước để chế độ MANUAL STOP và bộ B5CT đang tắt. Nhiệt nước giải nhiệt B51F_TT10505 vượt quá 33 °C gây nguy cơ trip áp cao Chiller!',
    expectedAction:
      'Mở màn hình CHILLER Nhà 5 → chuyển CT-11/12/13 về AUTO (hoặc chạy Manual 50Hz) và bật lại DEMAND B5CT để đưa >= 6 tháp CT vào hoạt động, kéo B51F_TT10505 <= 30.5 °C.',
    focusTag: 'B51F_TT10505',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.ambientWetBulbC = 26.5;
      next.sandbox.coolingLoadPct = 80;
      next.demands.B5CT.enable = false;
      next.demands.B5CT.startUpDelaySec = 2;
      for (const n of [11, 12, 13]) {
        const u = next.equipment[`B51F_CT${n}FN`];
        u.mode = 'MANUAL';
        u.cmdStart = false;
        u.status = 'STOPPED';
        u.frequencyHz = 0;
      }
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Có tối thiểu 5 tháp giải nhiệt CT đang RUNNING',
        check: (p) =>
          [11, 12, 13, 14, 15, 16, 17, 18, 19].filter((n) => p.equipment[`B51F_CT${n}FN`]?.status === 'RUNNING')
            .length >= 5,
      },
      {
        id: 'c2',
        label: 'Nhiệt nước giải nhiệt B51F_TT10505 <= 30.5 °C',
        check: (p) => (p.sensors['B51F_TT10505']?.pv ?? 99) <= 30.5,
      },
      {
        id: 'c3',
        label: 'Cảm biến B51F_TT10505 không còn cảnh báo HHA',
        check: (p) => p.sensors['B51F_TT10505']?.alarms.activeLevel !== 'HHA',
      },
    ],
    applyReferenceFix: (plant) => {
      const next: PlantState = structuredClone(plant);
      for (const n of [11, 12, 13]) {
        next.equipment[`B51F_CT${n}FN`].mode = 'AUTO';
      }
      next.demands.B5CT.enable = true;
      return next;
    },
  },
  {
    id: 'ch03_b5_pcw_pump_trip',
    code: 'CH-03',
    building: 'B5',
    zone: 'b5_utilities',
    scadaScreen: 'b5_pcw',
    title: 'Trip bơm PCW P-501A + Van bypass mở sai làm tụt áp PCW Nhà 5',
    durationSec: 240,
    scenarioDesc:
      'Bơm B51F_P501A bị FAULT, bộ B5PCW đang tắt Auto và cả 2 van bypass Manual XV10503/XV10504 đang bị mở 100% khiến chênh áp cuối tuyến B51F_DPT10501 tụt mạnh dưới 1.3 bar!',
    expectedAction:
      'Mở màn hình PCW Nhà 5 → đóng 2 van bypass XV10503 & XV10504 → bật lại Demand B5PCW (hoặc chạy Manual P-501C) → ACK Alarm của P-501A.',
    focusTag: 'B51F_P501A',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.pcwToolLoadPct = 90;
      next.demands.B5PCW.enable = false;
      next.demands.B5PCW.startUpDelaySec = 2;
      next.equipment['B51F_P501A'].faulted = true;
      next.equipment['B51F_P501A'].status = 'FAULTED';
      next.equipment['B51F_P501A'].frequencyHz = 0;
      next.equipment['B51F_P501C'].mode = 'MANUAL';
      next.equipment['B51F_P501C'].cmdStart = false;
      next.valves['B51F_XV10503'].cmdOpen = true;
      next.valves['B51F_XV10503'].targetPct = 100;
      next.valves['B51F_XV10503'].positionPct = 100;
      next.valves['B51F_XV10504'].cmdOpen = true;
      next.valves['B51F_XV10504'].targetPct = 100;
      next.valves['B51F_XV10504'].positionPct = 100;
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Bơm dự phòng B51F_P501C đang RUNNING',
        check: (p) => p.equipment['B51F_P501C']?.status === 'RUNNING',
      },
      {
        id: 'c2',
        label: 'Chênh áp B51F_DPT10501 hồi phục >= 1.65 bar',
        check: (p) => (p.sensors['B51F_DPT10501']?.pv ?? 0) >= 1.65,
      },
      {
        id: 'c3',
        label: 'Đã đóng XV10503/XV10504 & ACK Alarm P-501A',
        check: (p) =>
          Boolean(p.valves['B51F_XV10503']?.closeFB) &&
          Boolean(p.valves['B51F_XV10504']?.closeFB) &&
          hasAckedOrNoFaultAlarm(p, 'B51F_P501A'),
      },
    ],
    applyReferenceFix: (plant) => {
      const next = ackTagAlarms(structuredClone(plant), 'B51F_P501A');
      next.valves['B51F_XV10503'].cmdOpen = false;
      next.valves['B51F_XV10503'].targetPct = 0;
      next.valves['B51F_XV10504'].cmdOpen = false;
      next.valves['B51F_XV10504'].targetPct = 0;
      next.equipment['B51F_P501C'].mode = 'AUTO';
      next.demands.B5PCW.enable = true;
      return next;
    },
  },
  {
    id: 'ch04_b5_oflac_trip',
    code: 'CH-04',
    building: 'B5',
    zone: 'b5_utilities',
    scadaScreen: 'b5_oflac',
    title: 'Trip máy nén VSD AC-204 làm tụt áp khí nén liên tòa nhà',
    durationSec: 240,
    scenarioDesc:
      'Máy nén chính B51F_AC204 bị FAULT khi nhu cầu khí nén OFLAC toàn khu (B5/B2/B3) đang ở mức 90%, đồng thời 2 máy nén cố định dự phòng AC-201 & AC-202 bị để chế độ MANUAL STOP. Áp suất góp B51F_PIT20101 tụt dưới 6.0 bar!',
    expectedAction:
      'Mở màn hình OFL AC → chuyển AC-201 & AC-202 về AUTO (hoặc Start Manual cả 2 máy) để kéo áp suất PIT20101 >= 6.8 bar → ACK Alarm của AC-204.',
    focusTag: 'B51F_AC204',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.oflacAirDemandPct = 90;
      next.demands.B5OFLAC.startUpDelaySec = 2;
      next.equipment['B51F_AC204'].faulted = true;
      next.equipment['B51F_AC204'].status = 'FAULTED';
      next.equipment['B51F_AC204'].loadPct = 0;
      next.equipment['B51F_AC201'].mode = 'MANUAL';
      next.equipment['B51F_AC201'].cmdStart = false;
      next.equipment['B51F_AC202'].mode = 'MANUAL';
      next.equipment['B51F_AC202'].cmdStart = false;
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Máy nén dự phòng AC-201 hoặc AC-202 đang RUNNING',
        check: (p) =>
          p.equipment['B51F_AC201']?.status === 'RUNNING' || p.equipment['B51F_AC202']?.status === 'RUNNING',
      },
      {
        id: 'c2',
        label: 'Áp suất khí nén góp chính B51F_PIT20101 >= 6.7 bar',
        check: (p) => (p.sensors['B51F_PIT20101']?.pv ?? 0) >= 6.7,
      },
      {
        id: 'c3',
        label: 'Đã xác nhận (ACK) Alarm của B51F_AC204',
        check: (p) => hasAckedOrNoFaultAlarm(p, 'B51F_AC204'),
      },
    ],
    applyReferenceFix: (plant) => {
      const next = ackTagAlarms(structuredClone(plant), 'B51F_AC204');
      next.equipment['B51F_AC201'].mode = 'AUTO';
      next.equipment['B51F_AC202'].mode = 'AUTO';
      next.demands.B5OFLAC.enable = true;
      return next;
    },
  },
  {
    id: 'ch05_di_comm_loss',
    code: 'CH-05',
    building: 'B5',
    zone: 'b5_utilities',
    scadaScreen: 'b5_di',
    title: 'Đứt kết nối gói RO-DI & Van PCV10704 Nhà 2 bị kẹt Manual 0%',
    durationSec: 240,
    scenarioDesc:
      'Tín hiệu truyền thông gói nước siêu tinh khiết RO-DI bên thứ 3 bị mất (DISCONNECTED), đồng thời van điều áp B22F_PCV10704 cấp cho Nhà 2 bị chuyển sang MANUAL 0%, khiến áp suất DI toàn khu tụt về sát 0 bar!',
    expectedAction:
      'Mở màn hình DI & Sandbox → khôi phục kết nối RO-DI Package → mở Faceplate van B22F_PCV10704 chuyển về AUTO để ổn định áp suất B22F_PIT10704 & B31F_PIT10705 >= 2.4 bar.',
    focusTag: 'B22F_PCV10704',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.diPackageConnected = false;
      next.valves['B22F_PCV10704'].mode = 'MANUAL';
      next.valves['B22F_PCV10704'].targetPct = 0;
      next.valves['B22F_PCV10704'].positionPct = 0;
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Gói RO-DI đã khôi phục kết nối (CONNECTED)',
        check: (p) => p.sandbox.diPackageConnected,
      },
      {
        id: 'c2',
        label: 'Van B22F_PCV10704 ở chế độ AUTO (hoặc mở >= 35%)',
        check: (p) =>
          p.valves['B22F_PCV10704']?.mode === 'AUTO' || (p.valves['B22F_PCV10704']?.positionPct ?? 0) >= 35,
      },
      {
        id: 'c3',
        label: 'Áp suất nhánh DI Nhà 2 B22F_PIT10704 >= 2.4 bar',
        check: (p) => (p.sensors['B22F_PIT10704']?.pv ?? 0) >= 2.4,
      },
    ],
    applyReferenceFix: (plant) => {
      const next: PlantState = structuredClone(plant);
      next.sandbox.diPackageConnected = true;
      next.valves['B22F_PCV10704'].mode = 'AUTO';
      return next;
    },
  },
  {
    id: 'ch06_b2_tk601_high',
    code: 'CH-06',
    building: 'B2',
    zone: 'b2_plant',
    scadaScreen: 'b2_pcw',
    title: 'Nguy cơ tràn bồn PCW TK-601 Nhà 2 (Bơm P-602 bị khóa Manual Stop)',
    durationSec: 240,
    scenarioDesc:
      'Mực nước bồn đệm TK-601 (B21F_LT10601) tại Nhà 2 đang ở 89% và tiếp tục dâng cao trong khi bơm xả hồi B21F_P602 bị ai đó khóa ở chế độ MANUAL STOP!',
    expectedAction:
      'Mở màn hình PCW Nhà 2 → bấm vào bơm B21F_P602 chuyển sang AUTO (hoặc Start Manual) để bơm hạ mực bồn TK-601 xuống dưới 78% và xóa cảnh báo mức cao.',
    focusTag: 'B21F_P602',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sensors['B21F_LT10601'].pv = 89.0;
      next.sensors['B21F_LT10601'].lastGoodPv = 89.0;
      next.valves['B21F_XV10601'].mode = 'MANUAL';
      next.valves['B21F_XV10601'].cmdOpen = true;
      next.valves['B21F_XV10601'].targetPct = 100;
      next.valves['B21F_XV10601'].positionPct = 100;
      next.equipment['B21F_P602'].mode = 'MANUAL';
      next.equipment['B21F_P602'].cmdStart = false;
      next.equipment['B21F_P602'].status = 'STOPPED';
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Bơm B21F_P602 ở chế độ AUTO hoặc đang RUNNING',
        check: (p) =>
          p.equipment['B21F_P602']?.mode === 'AUTO' || p.equipment['B21F_P602']?.status === 'RUNNING',
      },
      {
        id: 'c2',
        label: 'Mực bồn TK-601 (B21F_LT10601) giảm xuống <= 78.0 %',
        check: (p) => (p.sensors['B21F_LT10601']?.pv ?? 100) <= 78.0,
      },
      {
        id: 'c3',
        label: 'B21F_LT10601 trở về trạng thái NORMAL (không còn HA/HHA)',
        check: (p) => p.sensors['B21F_LT10601']?.alarms.activeLevel === 'NORMAL',
      },
    ],
    applyReferenceFix: (plant) => {
      const next: PlantState = structuredClone(plant);
      next.valves['B21F_XV10601'].mode = 'AUTO';
      next.equipment['B21F_P602'].mode = 'AUTO';
      return next;
    },
  },
  {
    id: 'ch07_b3_air_chiller_trip',
    code: 'CH-07',
    building: 'B3',
    zone: 'b3_plant',
    scadaScreen: 'b3_chiller',
    title: 'Trip Chiller giải nhiệt gió CH-21 tại Nhà 3',
    durationSec: 240,
    scenarioDesc:
      'Chiller gió chính B31F_CH21 của Nhà 3 bị FAULT trong khi bộ điều phối B3CH đang bị tắt Disable. Nhiệt độ nước lạnh B31F_CHSTS1 cấp cho AHU & 8 FCU Nhà 3 tăng mạnh vượt 13 °C!',
    expectedAction:
      'Mở màn hình CHILLER Nhà 3 → bật lại DEMAND B3CH (hoặc mở van CH22CHV → chạy CH22CHWP → Start CH-22) để ổn định B31F_CHSTS1 <= 9.5 °C → ACK Alarm CH-21.',
    focusTag: 'B31F_CH21',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.sandbox.b3CoolingLoadPct = 75;
      next.demands.B3CH.enable = false;
      next.demands.B3CH.startUpDelaySec = 2;
      next.equipment['B31F_CH21'].faulted = true;
      next.equipment['B31F_CH21'].status = 'FAULTED';
      next.equipment['B31F_CH21'].loadPct = 0;
      next.equipment['B31F_CH22'].cmdStart = false;
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Chiller gió dự phòng B31F_CH22 đang RUNNING',
        check: (p) => p.equipment['B31F_CH22']?.status === 'RUNNING',
      },
      {
        id: 'c2',
        label: 'Nhiệt độ nước lạnh Nhà 3 B31F_CHSTS1 <= 9.5 °C',
        check: (p) => (p.sensors['B31F_CHSTS1']?.pv ?? 99) <= 9.5,
      },
      {
        id: 'c3',
        label: 'Đã xác nhận (ACK) Alarm của B31F_CH21',
        check: (p) => hasAckedOrNoFaultAlarm(p, 'B31F_CH21'),
      },
    ],
    applyReferenceFix: (plant) => {
      const next = ackTagAlarms(structuredClone(plant), 'B31F_CH21');
      next.demands.B3CH.enable = true;
      return next;
    },
  },
  {
    id: 'ch08_b3_heatfan_trip',
    code: 'CH-08',
    building: 'B3',
    zone: 'b3_plant',
    scadaScreen: 'b3_heat',
    title: 'Trip Heat Fan HP-01 & Bơm HPP-21 tại Nhà 3',
    durationSec: 240,
    scenarioDesc:
      'Cả Heat Fan chính B31F_HP01 và bơm tuần hoàn nóng B31F_HPP21 cùng báo FAULT trong khi B3HP đang tắt Disable và bơm dự phòng HPP-22 bị khóa Manual Stop. Nước nóng sưởi AHU Nhà 3 sụt nhanh dưới 36 °C!',
    expectedAction:
      'Mở màn hình HEAT Nhà 3 → chuyển HPP-22 sang AUTO (hoặc chạy Manual) → bật lại DEMAND B3HP đưa HP-02/HP-03 vào chạy ổn định → ACK Alarm của HP-01 & HPP-21.',
    focusTag: 'B31F_HP01',
    injectFault: (base) => {
      const next: PlantState = structuredClone(base);
      next.demands.B3HP.enable = false;
      next.demands.B3HP.startUpDelaySec = 2;
      next.equipment['B31F_HP01'].faulted = true;
      next.equipment['B31F_HP01'].status = 'FAULTED';
      next.equipment['B31F_HP02'].status = 'STOPPED';
      next.equipment['B31F_HP02'].cmdStart = false;
      next.equipment['B31F_HPP21'].faulted = true;
      next.equipment['B31F_HPP21'].status = 'FAULTED';
      next.equipment['B31F_HPP22'].mode = 'MANUAL';
      next.equipment['B31F_HPP22'].cmdStart = false;
      next.equipment['B31F_HPP22'].status = 'STOPPED';
      return next;
    },
    criteria: [
      {
        id: 'c1',
        label: 'Bơm dự phòng B31F_HPP22 đang RUNNING (áp HWPS1 >= 1.8 bar)',
        check: (p) =>
          p.equipment['B31F_HPP22']?.status === 'RUNNING' && (p.sensors['B31F_HWPS1']?.pv ?? 0) >= 1.8,
      },
      {
        id: 'c2',
        label: 'Nhiệt độ nước nóng Nhà 3 B31F_HPSTS1 >= 42.0 °C',
        check: (p) => (p.sensors['B31F_HPSTS1']?.pv ?? 0) >= 42.0,
      },
      {
        id: 'c3',
        label: 'Đã xác nhận (ACK) Alarm của HP-01 và HPP-21',
        check: (p) =>
          hasAckedOrNoFaultAlarm(p, 'B31F_HP01') && hasAckedOrNoFaultAlarm(p, 'B31F_HPP21'),
      },
    ],
    applyReferenceFix: (plant) => {
      let next = ackTagAlarms(structuredClone(plant), 'B31F_HP01');
      next = ackTagAlarms(next, 'B31F_HPP21');
      next.equipment['B31F_HPP22'].mode = 'AUTO';
      next.demands.B3HP.enable = true;
      return next;
    },
  },
];
