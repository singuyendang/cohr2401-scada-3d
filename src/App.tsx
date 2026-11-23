import { lazy, Suspense } from 'react';
import { Crosshair, ExternalLink, X } from 'lucide-react';
import { usePlantLoop } from './hooks/usePlantLoop.ts';
import { useB5Store } from './store/b5Store.ts';
import { useAuthStore } from './store/authStore.ts';
import { LoginDialog } from './components/auth/LoginDialog.tsx';
import { ScadaTopBar } from './components/layout/ScadaTopBar.tsx';
import { ScadaNavSidebar } from './components/layout/ScadaNavSidebar.tsx';
import { SandboxDrawer } from './components/layout/SandboxDrawer.tsx';
import { FaceplateManager } from './components/faceplates/FaceplateManager.tsx';
import { LocateHighlightOverlay } from './components/scada/LocateHighlightOverlay.tsx';
import { TrainingHudBanner } from './components/training/TrainingHudBanner.tsx';
import { SiteOverviewScreen } from './screens/SiteOverviewScreen.tsx';

const Plant3DTrainingScreen = lazy(() => import('./screens/Plant3DTrainingScreen.tsx'));
import { B5OverviewScreen } from './screens/B5OverviewScreen.tsx';
import {
  B5Overview1FScreen,
  B5OverviewM1FScreen,
  B5Overview2FScreen,
  B5OverviewM2FScreen,
} from './screens/B5FloorOverviewScreens.tsx';
import { B5ChillerScreen } from './screens/B5ChillerScreen.tsx';
import { B5HeatRecoveryScreen } from './screens/B5HeatRecoveryScreen.tsx';
import { B5CwAhuScreen } from './screens/B5CwAhuScreen.tsx';
import { B5AirAhuScreen } from './screens/B5AirAhuScreen.tsx';
import { B5PcwScreen } from './screens/B5PcwScreen.tsx';
import { B5DiScreen } from './screens/B5DiScreen.tsx';
import { B5OflacScreen } from './screens/B5OflacScreen.tsx';
import { B5OfracScreen } from './screens/B5OfracScreen.tsx';
import { B5PvScreen } from './screens/B5PvScreen.tsx';
import { B5ExhaustScreen } from './screens/B5ExhaustScreen.tsx';
import { B5PmsScreen } from './screens/B5PmsScreen.tsx';
import { B5TrendsScreen } from './screens/B5TrendsScreen.tsx';
import { B5AlarmsScreen } from './screens/B5AlarmsScreen.tsx';
import { B2OverviewScreen } from './screens/B2OverviewScreen.tsx';
import {
  B2Overview1FScreen,
  B2Overview2FScreen,
  B2Overview3FScreen,
  B2OverviewM3FScreen,
} from './screens/B2FloorOverviewScreens.tsx';
import { B2PcwScreen } from './screens/B2PcwScreen.tsx';
import { B2CwAhuScreen } from './screens/B2CwAhuScreen.tsx';
import { B2AirAhuScreen } from './screens/B2AirAhuScreen.tsx';
import { B2AirFcuScreen } from './screens/B2AirFcuScreen.tsx';
import { B2ExhaustScreen } from './screens/B2ExhaustScreen.tsx';
import { B2PmsScreen } from './screens/B2PmsScreen.tsx';
import { B3OverviewScreen } from './screens/B3OverviewScreen.tsx';
import { B3Overview1FScreen, B3OverviewM1FScreen } from './screens/B3FloorOverviewScreens.tsx';
import { B3ChillerScreen } from './screens/B3ChillerScreen.tsx';
import { B3HeatFanScreen } from './screens/B3HeatFanScreen.tsx';
import { B3CwAhuScreen } from './screens/B3CwAhuScreen.tsx';
import { B3AirAhuScreen } from './screens/B3AirAhuScreen.tsx';
import { B3ExhaustScreen } from './screens/B3ExhaustScreen.tsx';
import { B3PmsScreen } from './screens/B3PmsScreen.tsx';

function AuthenticatedShell() {
  usePlantLoop();
  const activeScreen = useB5Store((s) => s.activeScreen);
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const clearLocatedTarget = useB5Store((s) => s.clearLocatedTarget);
  const openFaceplate = useB5Store((s) => s.openFaceplate);
  const loginModalOpen = useAuthStore((s) => s.loginModalOpen);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'site_overview':
        return <SiteOverviewScreen />;
      case 'plant_3d_training':
        return (
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center font-mono text-sm text-cyan-300">
                Loading 3D Digital Twin &amp; SOP Training Studio...
              </div>
            }
          >
            <Plant3DTrainingScreen />
          </Suspense>
        );
      case 'b5_overview':
        return <B5OverviewScreen />;
      case 'b5_overview_1f':
        return <B5Overview1FScreen />;
      case 'b5_overview_m1f':
        return <B5OverviewM1FScreen />;
      case 'b5_overview_2f':
        return <B5Overview2FScreen />;
      case 'b5_overview_m2f':
        return <B5OverviewM2FScreen />;
      case 'b5_chiller':
        return <B5ChillerScreen />;
      case 'b5_heat_recovery':
        return <B5HeatRecoveryScreen />;
      case 'b5_cw_ahu':
        return <B5CwAhuScreen />;
      case 'b5_air_ahu':
        return <B5AirAhuScreen />;
      case 'b5_pcw':
        return <B5PcwScreen />;
      case 'b5_di':
        return <B5DiScreen />;
      case 'b5_oflac':
        return <B5OflacScreen />;
      case 'b5_ofrac':
        return <B5OfracScreen />;
      case 'b5_pv':
        return <B5PvScreen />;
      case 'b5_exh':
        return <B5ExhaustScreen />;
      case 'b5_pms':
        return <B5PmsScreen />;
      case 'b5_trend_online':
        return <B5TrendsScreen key="online" mode="online" />;
      case 'b5_trend_history':
        return <B5TrendsScreen key="history" mode="history" />;
      case 'b5_alarms_online':
        return <B5AlarmsScreen mode="online" />;
      case 'b5_alarms_history':
        return <B5AlarmsScreen mode="history" />;
      case 'b2_overview':
        return <B2OverviewScreen />;
      case 'b2_overview_1f':
        return <B2Overview1FScreen />;
      case 'b2_overview_2f':
        return <B2Overview2FScreen />;
      case 'b2_overview_3f':
        return <B2Overview3FScreen />;
      case 'b2_overview_m3f':
        return <B2OverviewM3FScreen />;
      case 'b2_cw_ahu':
        return <B2CwAhuScreen />;
      case 'b2_air_ahu':
        return <B2AirAhuScreen />;
      case 'b2_air_fcu':
        return <B2AirFcuScreen />;
      case 'b2_pcw':
        return <B2PcwScreen />;
      case 'b2_di':
        return <B5DiScreen />;
      case 'b2_pv':
        return <B5PvScreen />;
      case 'b2_exh':
        return <B2ExhaustScreen />;
      case 'b2_pms':
        return <B2PmsScreen />;
      case 'b3_overview':
        return <B3OverviewScreen />;
      case 'b3_overview_1f':
        return <B3Overview1FScreen />;
      case 'b3_overview_m1f':
        return <B3OverviewM1FScreen />;
      case 'b3_chiller':
        return <B3ChillerScreen />;
      case 'b3_heat':
        return <B3HeatFanScreen />;
      case 'b3_cw_ahu':
        return <B3CwAhuScreen />;
      case 'b3_air_ahu':
        return <B3AirAhuScreen />;
      case 'b3_di':
        return <B5DiScreen />;
      case 'b3_exh':
        return <B3ExhaustScreen />;
      case 'b3_pms':
        return <B3PmsScreen />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0b1320] text-slate-100 overflow-hidden">
      <ScadaTopBar />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <ScadaNavSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0b1320]">
          <TrainingHudBanner />
          {locatedTarget && locatedTarget.screen === activeScreen && (
            <div className="mx-3 mt-2.5 px-3 py-1.5 rounded-md bg-cyan-950/90 border border-cyan-400 text-cyan-100 font-mono text-xs flex flex-wrap items-center justify-between gap-2 shadow">
              <span className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>
                  Located from Overview: <strong className="text-white">{locatedTarget.tag}</strong> ({locatedTarget.label})
                </span>
              </span>
              <div className="flex items-center gap-2">
                {locatedTarget.faceplateType && (
                  <button
                    onClick={() => {
                      openFaceplate(
                        locatedTarget.faceplateType!,
                        locatedTarget.tag,
                        locatedTarget.faceplateTitle ?? `${locatedTarget.faceplateType} · ${locatedTarget.tag}`
                      );
                    }}
                    className="px-2.5 py-0.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Faceplate
                  </button>
                )}
                <button
                  onClick={clearLocatedTarget}
                  className="p-0.5 rounded hover:bg-cyan-800 text-cyan-200 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {renderScreen()}
        </main>
        <SandboxDrawer />
      </div>
      <FaceplateManager />
      <LocateHighlightOverlay />
      {loginModalOpen && <LoginDialog asModal />}
    </div>
  );
}

export function App() {
  const user = useAuthStore((s) => s.user);
  if (!user) {
    return <LoginDialog />;
  }
  return <AuthenticatedShell />;
}

export default App;
