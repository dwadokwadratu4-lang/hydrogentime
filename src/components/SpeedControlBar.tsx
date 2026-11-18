import { Music, Pause, Play } from 'lucide-react';
import { Language } from '../types/sim';
import { I18N } from '../i18n/translations';
import { soundEngine } from '../engine/soundEngine';

interface SpeedControlBarProps {
  speed: number;
  paused: boolean;
  autoSlowdownActive: boolean;
  disabled: boolean;
  musicEnabled: boolean;
  muted: boolean;
  lang: Language;
  onChangeSpeed: (nextSpeed: number) => void;
  onTogglePause: () => void;
  onToggleMusic: () => void;
}

export function SpeedControlBar({
  speed,
  paused,
  autoSlowdownActive,
  disabled,
  musicEnabled,
  muted,
  lang,
  onChangeSpeed,
  onTogglePause,
  onToggleMusic,
}: SpeedControlBarProps) {
  const t = I18N[lang];

  return (
    <div className="shrink-0 bg-[#ECE3D2] border-t border-[#DED1BA] px-2.5 py-0.5 h-7 flex items-center gap-1.5 select-none">
      <div className="flex items-center gap-1 shrink-0">
        <span className="font-mono-tabular text-[10px] font-semibold text-[#334139] whitespace-nowrap">
          {t.speedLabel} {speed.toFixed(1)}x
        </span>
        {autoSlowdownActive && !paused && (
          <span
            title={t.autoSlowdownTitle}
            className="font-mono-tabular text-[9.5px] font-bold text-amber-700 whitespace-nowrap"
          >
            (-30%)
          </span>
        )}
      </div>

      <input
        type="range"
        min={0.1}
        max={2.0}
        step={0.1}
        value={speed}
        disabled={disabled}
        aria-label={t.speedLabel}
        onChange={(e) => {
          soundEngine.playSliderTick();
          onChangeSpeed(parseFloat(e.target.value));
        }}
        className="slim-range flex-1 min-w-0"
      />

      <button
        type="button"
        onClick={() => {
          soundEngine.playSwitchClick(1.1);
          onToggleMusic();
        }}
        aria-label={musicEnabled ? t.musicOnTitle : t.musicOffTitle}
        title={musicEnabled ? t.musicOnTitle : t.musicOffTitle}
        className={`h-5 min-w-[26px] px-1 rounded-md flex items-center justify-center border transition-all cursor-pointer active:scale-95 shrink-0 ${
          musicEnabled && !muted
            ? 'bg-[#E3EFE0] text-[#2F4A33] border-[#C1D5BC]'
            : 'bg-[#FBF8F1] text-[#8A8274] border-[#D8CBB4] hover:bg-[#EFE7D6]'
        }`}
      >
        <Music className="w-2.5 h-2.5" />
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          soundEngine.playSwitchClick(0.95);
          onTogglePause();
        }}
        aria-label={paused ? t.resumeTitle : t.pauseTitle}
        title={paused ? t.resumeTitle : t.pauseTitle}
        className={`h-5 min-w-[28px] px-1.5 rounded-md flex items-center justify-center border transition-all cursor-pointer active:scale-95 shrink-0 ${
          paused
            ? 'bg-[#4B6B4F] text-[#FBF8F1] border-[#3F5B42]'
            : 'bg-[#FBF8F1] text-[#334139] border-[#D8CBB4] hover:bg-[#EFE7D6]'
        }`}
      >
        {paused ? (
          <Play className="w-2.5 h-2.5 fill-current" />
        ) : (
          <Pause className="w-2.5 h-2.5" />
        )}
      </button>
    </div>
  );
}
