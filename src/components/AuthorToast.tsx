import { AnimatePresence, motion } from 'motion/react';
import { Language } from '../types/sim';
import { I18N } from '../i18n/translations';

interface AuthorToastProps {
  visible: boolean;
  lang: Language;
}

export function AuthorToast({ visible, lang }: AuthorToastProps) {
  const t = I18N[lang];
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute top-12 left-0 right-0 z-30"
        >
          <div className="w-full py-1.5 px-3 bg-[#2E382E]/92 backdrop-blur-md text-[#FBF8F1] border-b border-[#A6BD95]/30 shadow-md text-center text-xs font-medium tracking-wide whitespace-nowrap">
            {t.authorLabel}{' '}
            <span className="font-semibold text-[#E8D5A7]">Artur Wierzbicki</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
