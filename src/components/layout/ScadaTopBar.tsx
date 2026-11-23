import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Box,
  Clock,
  LogIn,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from 'lucide-react';
import { useB5Store } from '../../store/b5Store.ts';
import { useAuthStore } from '../../store/authStore.ts';

function formatRealClock(d: Date): { date: string; time: string } {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${mi}:${ss}` };
}

export const ScadaTopBar: React.FC = () => {
  const simTimeSec = useB5Store((s) => s.plant.simTimeSec);
  const sandbox = useB5Store((s) => s.plant.sandbox);
  const alarms = useB5Store((s) => s.plant.alarms);
  const activeBuilding = useB5Store((s) => s.activeBuilding);
  const activeScreen = useB5Store((s) => s.activeScreen);
  const sandboxOpen = useB5Store((s) => s.sandboxOpen);
  const setSandboxOpen = useB5Store((s) => s.setSandboxOpen);
  const updateSandbox = useB5Store((s) => s.updateSandbox);
  const resetPlant = useB5Store((s) => s.resetPlant);
  const setActiveBuilding = useB5Store((s) => s.setActiveBuilding);
  const setActiveScreen = useB5Store((s) => s.setActiveScreen);

  const user = useAuthStore((s) => s.user);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);
  const logout = useAuthStore((s) => s.logout);

  // Live Real-Time Clock (PLC Clock / Host PC System Clock fallback, updates every 1s across all screens)
  const [realNow, setRealNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setRealNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const { date: realDate, time: realTime } = formatRealClock(realNow);

  const onlineAlarms = alarms.filter((a) => a.active || !a.acknowledged);
  const activeAlarms = alarms.filter((a) => a.active);
  const unackCount = alarms.filter((a) => !a.acknowledged).length;
  const latestAlarm = onlineAlarms[0];

  const hrs = Math.floor(simTimeSec / 3600);
  const mins = Math.floor((simTimeSec % 3600) / 60);
  const secs = Math.floor(simTimeSec % 60);
  const simClock = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <header className="min-h-14 bg-[#0d1829] border-b border-[#223552] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
      {/* Left WinCC Building Tabs + Real Coherent / Fuji CAC Logos */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-white/95 rounded px-2 py-1 border border-slate-400">
          <img src="/scada/coherent.png" alt="Coherent" className="h-5 object-contain" />
          <span className="h-4 w-px bg-slate-300" />
          <img src="/scada/fecac.png" alt="Fuji CAC" className="h-4 object-contain" />
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono">
          <button
            onClick={() => setActiveScreen('site_overview')}
            className={`px-2.5 py-1 rounded border cursor-pointer transition ${
              activeScreen === 'site_overview'
                ? 'bg-cyan-400 border-white text-slate-950 font-black shadow-[0_0_14px_rgba(34,211,238,0.85)] ring-2 ring-cyan-200/80'
                : 'bg-[#1a2c47] border-slate-500 text-slate-200 font-bold hover:bg-[#2a4269] hover:text-white'
            }`}
          >
            OVERVIEW
          </button>
          {(
            [
              ['B2', 'BUILDING 2'],
              ['B3', 'BUILDING 3'],
              ['B5', 'BUILDING 5'],
            ] as const
          ).map(([id, label]) => {
            const isSelected =
              activeScreen !== 'site_overview' && activeScreen !== 'plant_3d_training' && activeBuilding === id;
            return (
              <button
                key={id}
                onClick={() => setActiveBuilding(id)}
                className={`px-2.5 py-1 rounded border cursor-pointer transition ${
                  isSelected
                    ? 'bg-emerald-400 border-white text-slate-950 font-black shadow-[0_0_14px_rgba(52,211,153,0.85)] ring-2 ring-emerald-200/80'
                    : 'bg-[#122038] border-[#2c4469] text-slate-300 font-semibold hover:text-white hover:border-cyan-400'
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setActiveScreen('plant_3d_training')}
            className={`px-2.5 py-1 rounded border cursor-pointer transition inline-flex items-center gap-1 ${
              activeScreen === 'plant_3d_training'
                ? 'bg-fuchsia-400 border-white text-slate-950 font-black shadow-[0_0_14px_rgba(232,121,249,0.85)] ring-2 ring-fuchsia-200/80'
                : 'bg-[#211b47] border-fuchsia-400/70 text-fuchsia-200 font-bold hover:bg-[#31266b] hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D &amp; SOP
          </button>
        </div>
      </div>

      {/* Center Live Alarm Ticker (WinCC COHR2401 colors: #ff0000 Came In, #00ce00 Went Out Unack, #249cff Active ACK) */}
      <button
        onClick={() => setActiveScreen('b5_alarms_online')}
        style={
          latestAlarm
            ? latestAlarm.state === 'CAME_IN'
              ? { backgroundColor: '#ff0000', color: '#ffffff', borderColor: '#7f1d1d' }
              : latestAlarm.state === 'WENT_OUT'
              ? { backgroundColor: '#00ce00', color: '#ffffff', borderColor: '#14532d' }
              : { backgroundColor: '#249cff', color: '#ffffff', borderColor: '#1e3a8a' }
            : undefined
        }
        className={`flex-1 min-w-[200px] max-w-md h-8 px-2.5 rounded border flex items-center justify-between text-xs font-mono font-bold transition cursor-pointer ${
          latestAlarm ? '' : 'bg-[#0a1322] border-[#1f314d] text-emerald-400'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${latestAlarm ? 'text-white' : 'text-emerald-400'}`} />
          <span className="truncate">
            {latestAlarm
              ? `#${latestAlarm.number} [${latestAlarm.severity}] ${latestAlarm.tag}: ${latestAlarm.message}`
              : activeScreen === 'site_overview'
              ? 'COHR2401 SITE (B5 / B2 / B3) — PLANT NORMAL'
              : `COHR2401 ${activeBuilding} — PLANT NORMAL`}
          </span>
        </span>
        <span className="ml-2 shrink-0 px-1.5 py-0.5 rounded bg-black/30 text-[10px]">
          {activeAlarms.length} ACT / {unackCount} UNACK
        </span>
      </button>

      {/* Right: Real-Time PLC/System Clock + Sim Controls + Auth (User / LOGIN / LOGOUT) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Prominent Always-Visible Real-Time Clock (PLC / Host System Clock) */}
        <div
          title="Real-Time Clock (PLC / PC System Time)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#07111e] border border-cyan-500/60 font-mono text-cyan-200 shadow-inner"
        >
          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-[11px] leading-none">
            <span className="text-slate-300 font-semibold">{realDate}</span>
            <span className="text-cyan-300 font-black tracking-wider">{realTime}</span>
          </div>
        </div>

        {/* Compact Sim Clock & Time Scale */}
        <div
          title="Simulation Runtime Clock"
          className="hidden 2xl:block text-[10.5px] font-mono text-slate-400 bg-[#08101c] border border-[#223552] rounded px-2 py-1"
        >
          SIM {simClock}
        </div>

        <div className="flex items-center rounded border border-[#223552] bg-[#08101c] overflow-hidden text-[11px] font-mono">
          {([1, 5, 10] as const).map((scale) => (
            <button
              key={scale}
              onClick={() => updateSandbox({ timeScale: scale })}
              className={`px-1.5 py-1 cursor-pointer transition ${
                sandbox.timeScale === scale ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {scale}x
            </button>
          ))}
        </div>

        <button
          onClick={() => updateSandbox({ paused: !sandbox.paused })}
          title={sandbox.paused ? 'Resume Simulation' : 'Pause Simulation'}
          className="p-1.5 rounded border border-[#223552] bg-[#112038] hover:bg-[#1a3052] text-slate-200 cursor-pointer"
        >
          {sandbox.paused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
        </button>

        <button
          onClick={resetPlant}
          title="Reset Building 5 to Nominal State"
          className="p-1.5 rounded border border-[#223552] bg-[#112038] hover:bg-[#1a3052] text-slate-300 hover:text-white cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setSandboxOpen(!sandboxOpen)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold border transition cursor-pointer ${
            sandboxOpen
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-[#13243f] border-[#29436b] text-cyan-200 hover:bg-[#1b3358]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Sandbox
        </button>

        <span className="h-5 w-px bg-slate-700 mx-0.5" />

        {/* WinCC User Administration Controls (Current User + LOGIN + LOGOUT) */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <div
            title={`Logged in as ${user?.displayName ?? 'Guest'} (${user?.role ?? 'None'})`}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#102036] border border-[#2c4a75] text-slate-100"
          >
            {user?.role === 'Administrator' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span className="font-bold">{user?.displayName ?? 'Guest'}</span>
            <span className="text-[9.5px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
              {user?.role === 'Administrator' ? 'ADMIN' : 'USER'}
            </span>
          </div>

          <button
            onClick={openLoginModal}
            title="Switch User / Re-Login"
            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white font-bold cursor-pointer"
          >
            <LogIn className="w-3 h-3" />
            LOGIN
          </button>

          <button
            onClick={logout}
            title="Logout & Lock SCADA Session"
            className="flex items-center gap-1 px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 border border-rose-500 text-white font-bold cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            LOGOUT
          </button>
        </div>
      </div>
    </header>
  );
};
