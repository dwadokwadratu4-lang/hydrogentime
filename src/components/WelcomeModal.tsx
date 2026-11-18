import { SunMedium, Atom, Home, FileJson, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../types/sim';
import { I18N } from '../i18n/translations';

interface WelcomeModalProps {
  open: boolean;
  lang: Language;
  onStart: () => void;
}

export function WelcomeModal({ open, lang, onStart }: WelcomeModalProps) {
  if (!open) return null;
  const t = I18N[lang];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#232922]/55 backdrop-blur-xs p-3.5"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[392px] max-h-[92dvh] overflow-y-auto rounded-3xl bg-[#FBF8F1] border border-[#DDD0B8] shadow-2xl p-4 sm:p-5"
      >
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-[6px] bg-[#2F4A33] text-[#FBF8F1] font-display font-bold text-xs flex items-center justify-center tracking-tight shadow-xs">
            AW
          </div>
          <h2
            id="welcome-title"
            className="font-display text-lg font-bold text-[#2F4A33] text-balance"
          >
            {t.appTitle}
          </h2>
        </div>
        <p className="mt-1 text-xs text-center text-[#6E6659]">
          {t.welcomeSubtitle}
        </p>

        {/* Legenda elementów */}
        <div className="mt-3 space-y-2 text-left">
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#F3ECE0] p-2.5 border border-[#E4D8C2]">
            <div className="w-7 h-7 rounded-xl bg-[#E3EFE0] text-[#35633A] flex items-center justify-center shrink-0 mt-0.5">
              <SunMedium className="w-4 h-4" />
            </div>
            <div className="text-xs leading-snug text-[#3B3831]">
              <span className="font-bold text-[#2B2A27]">{t.legendTopTitle}</span>{' '}
              {t.legendTopDesc}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl bg-[#F3ECE0] p-2.5 border border-[#E4D8C2]">
            <div className="w-7 h-7 rounded-xl bg-[#E0F0F5] text-[#0369A1] flex items-center justify-center shrink-0 mt-0.5">
              <Atom className="w-4 h-4" />
            </div>
            <div className="text-xs leading-snug text-[#3B3831]">
              <span className="font-bold text-[#2B2A27]">{t.legendMidTitle}</span>{' '}
              {t.legendMidDesc}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl bg-[#F3ECE0] p-2.5 border border-[#E4D8C2]">
            <div className="w-7 h-7 rounded-xl bg-[#F8E7DF] text-[#B35940] flex items-center justify-center shrink-0 mt-0.5">
              <Home className="w-4 h-4" />
            </div>
            <div className="text-xs leading-snug text-[#3B3831]">
              <span className="font-bold text-[#2B2A27]">{t.legendBotTitle}</span>{' '}
              {t.legendBotDesc}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl bg-[#F3ECE0] p-2.5 border border-[#E4D8C2]">
            <div className="w-7 h-7 rounded-xl bg-[#EAE2D3] text-[#4A463E] flex items-center justify-center shrink-0 mt-0.5">
              <FileJson className="w-4 h-4" />
            </div>
            <div className="text-xs leading-snug text-[#3B3831]">
              <span className="font-bold text-[#2B2A27]">{t.legendCfgTitle}</span>{' '}
              {t.legendCfgDesc}
            </div>
          </div>
        </div>

        {/* Cel gry */}
        <p className="mt-2.5 rounded-2xl bg-[#EFE6D4] px-3 py-2 text-xs leading-relaxed text-[#45413A] italic border border-[#DFD2B9]">
          {t.welcomeGoal}
        </p>

        {/* Podpis autorski */}
        <div className="mt-2.5 text-center text-xs font-semibold text-[#4A5A49]">
          {t.authorLabel} Artur Wierzbicki
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-2.5 w-full min-h-[46px] rounded-2xl bg-[#4B6B4F] hover:bg-[#3E5A42] text-[#FBF8F1] font-semibold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4B6B4F]"
        >
          <Play className="w-4 h-4 fill-current" />
          {t.startButton}
        </button>
      </motion.div>
    </div>
  );
}
