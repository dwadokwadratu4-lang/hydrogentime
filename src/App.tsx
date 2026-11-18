import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileJson,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_CONFIG } from './defaultConfig';
import { renderDiorama } from './engine/canvasRenderer';
import { createInitialState, stepSimulation } from './engine/simulation';
import { ControlsState, Language, SimConfig, SimState } from './types/sim';
import { getLocalizedCataclysm, I18N } from './i18n/translations';
import { AuthorToast } from './components/AuthorToast';
import { ControlDeck } from './components/ControlDeck';
import { EndScreenModal } from './components/EndScreenModal';
import { JsonConfigModal } from './components/JsonConfigModal';
import { SpeedControlBar } from './components/SpeedControlBar';
import { WelcomeModal } from './components/WelcomeModal';

function formatClock(hourFloat: number): string {
  const totalMins = Math.floor(hourFloat * 60) % (24 * 60);
  const hh = Math.floor(totalMins / 60);
  const mm = totalMins % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export default function App() {
  const [lang, setLang] = useState<Language>('pl');
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(
    DEFAULT_CONFIG.simulation.defaultSpeedMultiplier ?? 0.6
  );
  const [controls, setControls] = useState<ControlsState>({
    electrolyzer: 0.5,
    fuelCell: 0,
    hvac: 'off',
    dumpLoad: false,
  });

  const [uiSnapshot, setUiSnapshot] = useState<SimState>(() => ({
    ...createInitialState(DEFAULT_CONFIG),
    paused: true,
  }));
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [showAuthorToast, setShowAuthorToast] = useState(false);

  const langRef = useRef<Language>(lang);
  const configRef = useRef<SimConfig>(config);
  const controlsRef = useRef<ControlsState>(controls);
  const speedRef = useRef<number>(speedMultiplier);
  const stateRef = useRef<SimState>(uiSnapshot);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const pausedByModalRef = useRef(false);

  useEffect(() => {
    langRef.current = lang;
    document.title = lang === 'en' ? 'HYDROGEN time — 2D Simulator' : 'czas WODORU — Symulator 2D';
  }, [lang]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  const triggerAuthorToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setShowAuthorToast(true);
    toastTimerRef.current = window.setTimeout(() => {
      setShowAuthorToast(false);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  // Load external /config.json on mount (starts paused behind WelcomeModal)
  useEffect(() => {
    let active = true;
    fetch('/config.json')
      .then((res) => {
        if (!res.ok) throw new Error('config fetch failed');
        return res.json();
      })
      .then((loaded: SimConfig) => {
        if (!active) return;
        setConfig(loaded);
        configRef.current = loaded;
        const initSpeed = loaded.simulation.defaultSpeedMultiplier ?? 0.6;
        setSpeedMultiplier(initSpeed);
        speedRef.current = initSpeed;
        const fresh: SimState = {
          ...createInitialState(loaded),
          paused: true,
        };
        stateRef.current = fresh;
        setUiSnapshot(fresh);
      })
      .catch(() => {
        // Fallback already active via DEFAULT_CONFIG
      });

    return () => {
      active = false;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Responsive Canvas DPI sizing
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Main 60fps simulation & render loop
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let uiAcc = 0;
    let prevGameOver = stateRef.current.gameOver;

    const tick = (now: number) => {
      const dtSec = Math.max(0.001, (now - lastTime) / 1000);
      lastTime = now;

      const nextState = stepSimulation(
        stateRef.current,
        controlsRef.current,
        configRef.current,
        dtSec,
        speedRef.current
      );
      stateRef.current = nextState;

      // Render 2D Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const logicalW = canvas.width / dpr;
          const logicalH = canvas.height / dpr;
          ctx.save();
          ctx.scale(dpr, dpr);
          renderDiorama(
            ctx,
            logicalW,
            logicalH,
            nextState,
            controlsRef.current,
            configRef.current,
            langRef.current
          );
          ctx.restore();
        }
      }

      // Sync React HUD at ~10Hz (or immediately on gameOver change)
      uiAcc += dtSec;
      if (uiAcc >= 0.1 || nextState.gameOver !== prevGameOver) {
        uiAcc = 0;
        prevGameOver = nextState.gameOver;
        setUiSnapshot(nextState);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleStartFromWelcome = useCallback(() => {
    setWelcomeOpen(false);
    stateRef.current = { ...stateRef.current, paused: false };
    setUiSnapshot(stateRef.current);
    triggerAuthorToast();
  }, [triggerAuthorToast]);

  const handleRestart = useCallback(() => {
    const fresh: SimState = {
      ...createInitialState(configRef.current),
      paused: true,
    };
    stateRef.current = fresh;
    setUiSnapshot(fresh);
    setControls({
      electrolyzer: 0.5,
      fuelCell: 0,
      hvac: 'off',
      dumpLoad: false,
    });
    setWelcomeOpen(true);
  }, []);

  const handleTogglePause = () => {
    if (welcomeOpen || uiSnapshot.gameOver) return;
    const nextPaused = !stateRef.current.paused;
    stateRef.current = { ...stateRef.current, paused: nextPaused };
    setUiSnapshot(stateRef.current);
  };

  const handleOpenJsonModal = () => {
    if (!stateRef.current.paused && !stateRef.current.gameOver) {
      pausedByModalRef.current = true;
      stateRef.current = { ...stateRef.current, paused: true };
      setUiSnapshot(stateRef.current);
    } else {
      pausedByModalRef.current = false;
    }
    setJsonModalOpen(true);
  };

  const handleCloseJsonModal = () => {
    setJsonModalOpen(false);
    if (pausedByModalRef.current && !stateRef.current.gameOver && !welcomeOpen) {
      pausedByModalRef.current = false;
      stateRef.current = { ...stateRef.current, paused: false };
      setUiSnapshot(stateRef.current);
    }
  };

  const handleApplyConfig = (nextConfig: SimConfig) => {
    setConfig(nextConfig);
    configRef.current = nextConfig;
  };

  const t = I18N[lang];
  const tankEmpty = uiSnapshot.tankEnergyKwh <= 0.05;
  const activeAlert = uiSnapshot.activeCataclysm;
  const localizedCataclysm = activeAlert
    ? getLocalizedCataclysm(activeAlert.config, lang)
    : null;
  const overpressureGrace =
    config.hydrogenTank.overpressureGraceSeconds ?? config.busLimits.graceSeconds;
  const thermalGrace =
    config.houseTemperature.thermalGraceSeconds ?? config.busLimits.graceSeconds;

  const urgentWarning =
    uiSnapshot.overpressureTimerSec > 0.1
      ? t.overpressureCountdown(overpressureGrace - uiSnapshot.overpressureTimerSec)
      : uiSnapshot.overvoltageTimerSec > 0.3
      ? t.overvoltageCountdown(config.busLimits.graceSeconds - uiSnapshot.overvoltageTimerSec)
      : uiSnapshot.blackoutTimerSec > 0.3
      ? t.blackoutCountdown(config.busLimits.graceSeconds - uiSnapshot.blackoutTimerSec)
      : uiSnapshot.thermalTimerSec > 0.1
      ? t.thermalCountdown(thermalGrace - uiSnapshot.thermalTimerSec)
      : uiSnapshot.warningCodes.length > 0 && !activeAlert
      ? t.warnings[uiSnapshot.warningCodes[0]]
      : null;

  return (
    <div className="h-dvh w-full bg-[#E3DAC8] flex items-center justify-center sm:p-3 overflow-hidden">
      {/* Mobile-First Centered Vertical Eco-Diorama Shell (360-430px) */}
      <main className="relative w-full max-w-[430px] h-full sm:h-[min(880px,96dvh)] bg-[#F7F1E3] sm:rounded-[30px] sm:border sm:border-[#D4C5AA] sm:shadow-2xl flex flex-col overflow-hidden">
        {/* Compact Top Bar with AW Monogram, Title, Telemetry, PL|EN Switcher & Controls */}
        <header className="relative z-40 shrink-0 h-12 px-2.5 bg-[#F3ECE0] border-b border-[#DED1BA] flex items-center justify-between gap-1.5 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* AW Monogram Logo */}
            <div
              aria-hidden="true"
              className="w-[26px] h-[26px] rounded-[6px] bg-[#2F4A33] text-[#FBF8F1] font-display font-bold text-[11px] flex items-center justify-center tracking-tight shrink-0 shadow-xs"
            >
              AW
            </div>
            <span className="font-display text-[13px] font-bold text-[#2F4A33] whitespace-nowrap truncate">
              {t.appTitle}
            </span>
            <span aria-hidden="true" className="text-[#9E9381] text-[11px]">·</span>
            <span className="font-mono-tabular text-[11px] font-semibold text-[#3B3831] whitespace-nowrap">
              {formatClock(uiSnapshot.timeOfDayHours)}
            </span>
            <span className="hidden min-[380px]:inline font-mono-tabular text-[10px] text-[#5F594E] whitespace-nowrap">
              {t.dayPrefix}{uiSnapshot.dayNumber} · {uiSnapshot.outdoorTempC.toFixed(0)}°C
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* PL | EN Language Switcher */}
            <div
              role="group"
              aria-label="Language"
              className="flex items-center bg-[#E4D9C4] p-0.5 rounded-lg mr-0.5"
            >
              <button
                type="button"
                onClick={() => setLang('pl')}
                className={`px-1.5 py-1 rounded-md text-[10px] font-bold leading-none transition-colors cursor-pointer ${
                  lang === 'pl'
                    ? 'bg-[#2F4A33] text-[#FBF8F1] shadow-xs'
                    : 'text-[#4E4A42] hover:text-[#2B2A27]'
                }`}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-1.5 py-1 rounded-md text-[10px] font-bold leading-none transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#2F4A33] text-[#FBF8F1] shadow-xs'
                    : 'text-[#4E4A42] hover:text-[#2B2A27]'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={handleTogglePause}
              aria-label={uiSnapshot.paused ? t.resumeTitle : t.pauseTitle}
              title={uiSnapshot.paused ? t.resumeTitle : t.pauseTitle}
              className="min-h-[44px] min-w-[32px] rounded-xl flex items-center justify-center text-[#3D473D] hover:bg-[#E7DEC9] active:scale-95 transition-transform cursor-pointer"
            >
              {uiSnapshot.paused ? (
                <Play className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              aria-label={t.restartTitle}
              title={t.restartTitle}
              className="min-h-[44px] min-w-[32px] rounded-xl flex items-center justify-center text-[#3D473D] hover:bg-[#E7DEC9] active:scale-95 transition-transform cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleOpenJsonModal}
              aria-label={t.configTitle}
              title={t.configTitle}
              className="min-h-[44px] min-w-[32px] rounded-xl flex items-center justify-center text-[#3D473D] hover:bg-[#E7DEC9] active:scale-95 transition-transform cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Full-width author toast directly below top navigation bar */}
        <AuthorToast visible={showAuthorToast} lang={lang} />

        {/* Interactive 2D Canvas Stage */}
        <div
          ref={stageRef}
          className="relative flex-1 min-h-0 w-full bg-[#CBE0EA]"
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full"
            aria-label={t.appTitle}
          />

          {/* Cataclysm / Urgent Warning Floating Banner */}
          {(localizedCataclysm || urgentWarning) && !uiSnapshot.gameOver && (
            <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 z-20 flex flex-col gap-1.5">
              {localizedCataclysm && (
                <div className="rounded-2xl bg-[#2F2536]/88 backdrop-blur-sm text-[#FBF8F1] px-3 py-2 border border-amber-300/40 shadow-md">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{localizedCataclysm.name}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#EAE3D5]">
                    {localizedCataclysm.description}
                  </p>
                </div>
              )}

              {urgentWarning && (
                <div className="rounded-xl bg-[#991B1B]/92 backdrop-blur-sm text-white px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                  <span>{urgentWarning}</span>
                </div>
              )}
            </div>
          )}

          {/* Pause Overlay Indicator */}
          {uiSnapshot.paused && !uiSnapshot.gameOver && !jsonModalOpen && !welcomeOpen && (
            <div className="pointer-events-none absolute inset-0 bg-[#232922]/20 flex items-center justify-center">
              <div className="px-4 py-2 rounded-2xl bg-[#FBF8F1]/95 text-[#2F4A33] font-display font-bold text-sm shadow-lg border border-[#D4C5AA]">
                {t.pausedOverlay}
              </div>
            </div>
          )}
        </div>

        {/* Time Speed Control Slider Bar between Canvas and Control Deck */}
        <SpeedControlBar
          speed={speedMultiplier}
          paused={uiSnapshot.paused}
          autoSlowdownActive={uiSnapshot.autoSlowdownActive}
          disabled={uiSnapshot.gameOver || welcomeOpen}
          lang={lang}
          onChangeSpeed={setSpeedMultiplier}
          onTogglePause={handleTogglePause}
        />

        {/* Bottom Thumb Control Deck */}
        <ControlDeck
          controls={controls}
          config={config}
          lang={lang}
          soldEnergyKwh={uiSnapshot.soldEnergyKwh}
          disabled={uiSnapshot.gameOver}
          tankEmpty={tankEmpty}
          onChangeElectrolyzer={(electrolyzer) =>
            setControls((c) => ({ ...c, electrolyzer }))
          }
          onChangeFuelCell={(fuelCell) =>
            setControls((c) => ({ ...c, fuelCell }))
          }
          onChangeHvac={(hvac) => setControls((c) => ({ ...c, hvac }))}
          onToggleDumpLoad={() =>
            setControls((c) => ({ ...c, dumpLoad: !c.dumpLoad }))
          }
        />
      </main>

      {/* Welcome & Instructions Overlay */}
      <WelcomeModal open={welcomeOpen} lang={lang} onStart={handleStartFromWelcome} />

      {/* Game Over / Ending Screen */}
      {uiSnapshot.gameOver && uiSnapshot.endingKey && (
        <EndScreenModal
          endingKey={uiSnapshot.endingKey}
          config={config}
          lang={lang}
          elapsedGameHours={uiSnapshot.elapsedGameHours}
          elapsedRealSeconds={uiSnapshot.elapsedRealSeconds}
          soldEnergyKwh={uiSnapshot.soldEnergyKwh}
          onRestart={handleRestart}
        />
      )}

      {/* Live JSON Config Editor Modal */}
      <JsonConfigModal
        open={jsonModalOpen}
        config={config}
        defaultConfig={DEFAULT_CONFIG}
        lang={lang}
        onClose={handleCloseJsonModal}
        onApply={handleApplyConfig}
      />
    </div>
  );
}
