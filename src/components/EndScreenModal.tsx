import { RotateCcw, Flame, ZapOff, Sparkles, ThermometerSnowflake, ThermometerSun, TrendingUp, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { EndingKey, Language, SimConfig } from '../types/sim';
import { formatRevenue, getLocalizedEnding, I18N } from '../i18n/translations';

interface EndScreenModalProps {
  endingKey: EndingKey;
  config: SimConfig;
  lang: Language;
  elapsedGameHours: number;
  elapsedRealSeconds: number;
  soldEnergyKwh: number;
  isNewRecord?: boolean;
  onRestart: () => void;
}

export function EndScreenModal({
  endingKey,
  config,
  lang,
  elapsedGameHours,
  elapsedRealSeconds,
  soldEnergyKwh,
  isNewRecord = false,
  onRestart,
}: EndScreenModalProps) {
  const t = I18N[lang];
  const info = getLocalizedEnding(endingKey, config, lang);
  const totalRevenue = formatRevenue(soldEnergyKwh, config, lang);

  const renderIcon = () => {
    switch (endingKey) {
      case 'h2_explosion':
        return <Flame className="w-8 h-8 text-orange-600" />;
      case 'blackout':
        return <ZapOff className="w-8 h-8 text-slate-700" />;
      case 'overvoltage':
        return <Sparkles className="w-8 h-8 text-amber-600" />;
      case 'thermal_cold':
        return <ThermometerSnowflake className="w-8 h-8 text-sky-600" />;
      case 'thermal_hot':
        return <ThermometerSun className="w-8 h-8 text-red-600" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ending-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#232922]/65 backdrop-blur-xs p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-[385px] rounded-3xl bg-[#FBF8F1] border border-[#DDD0B8] shadow-2xl p-5 text-center ${
          endingKey === 'h2_explosion' ? 'animate-blast-shake' : ''
        }`}
      >
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#EFE6D4] flex items-center justify-center">
          {renderIcon()}
        </div>

        <h2
          id="ending-title"
          className="font-display text-xl font-bold text-[#2B2A27] leading-tight text-balance"
        >
          {info.title}
        </h2>
        <p className="mt-1 text-xs font-medium text-[#7B6F5B]">
          {info.subtitle}
        </p>

        {/* Score & Financial Summary Box */}
        <div className="mt-3.5 rounded-2xl bg-[#F1E9D8] border border-[#DFD2B9] py-2.5 px-4">
          <div className="text-[11px] font-medium text-[#6C6456]">
            {t.survivalLabel}
          </div>
          <div className="mt-0.5 font-mono-tabular text-2xl font-bold text-[#2F4A33]">
            {t.formatDuration(elapsedGameHours)}
          </div>
          {isNewRecord && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              <Trophy className="w-3 h-3 text-amber-600" />
              {t.newRecordBadge}
            </div>
          )}
          <div className="mt-0.5 font-mono-tabular text-[11px] text-[#7D7465]">
            {t.realTimeLabel} {Math.floor(elapsedRealSeconds)} s
          </div>

          <div className="mt-2 pt-2 border-t border-[#DFD2B9] flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 text-[#5E574B] font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {t.revenueLabel}
            </span>
            <span className="font-mono-tabular font-bold text-emerald-700 whitespace-nowrap">
              {totalRevenue}
            </span>
          </div>
        </div>

        {/* Permanent Author Signature directly below score for screenshots */}
        <div className="mt-2.5 text-xs font-semibold text-[#4A5A49]">
          {t.authorLabel} Artur Wierzbicki
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-[#45413A] bg-[#F5EFE2] rounded-2xl p-3.5 text-left border border-[#E6DAC4]">
          {info.comment}
        </p>

        <button
          type="button"
          onClick={onRestart}
          className="mt-4 w-full min-h-[48px] rounded-2xl bg-[#4B6B4F] hover:bg-[#3F5B42] text-[#FBF8F1] font-semibold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B6B4F]"
        >
          <RotateCcw className="w-4 h-4" />
          {t.playAgain}
        </button>
      </motion.div>
    </div>
  );
}
