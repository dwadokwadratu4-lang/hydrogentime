import { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Download } from 'lucide-react';
import { Language, SimConfig } from '../types/sim';
import { I18N } from '../i18n/translations';

interface JsonConfigModalProps {
  open: boolean;
  config: SimConfig;
  defaultConfig: SimConfig;
  lang: Language;
  onClose: () => void;
  onApply: (nextConfig: SimConfig) => void;
}

export function JsonConfigModal({
  open,
  config,
  defaultConfig,
  lang,
  onClose,
  onApply,
}: JsonConfigModalProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const t = I18N[lang];

  useEffect(() => {
    if (open) {
      setText(JSON.stringify(config, null, 2));
      setError(null);
    }
  }, [open, config]);

  if (!open) return null;

  const handleApply = () => {
    try {
      const parsed = JSON.parse(text) as SimConfig;
      if (
        !parsed.simulation ||
        !parsed.devices ||
        !parsed.hydrogenTank ||
        !parsed.houseTemperature ||
        !parsed.busLimits ||
        !Array.isArray(parsed.cataclysms) ||
        !parsed.endings
      ) {
        setError(t.jsonMissingSections);
        return;
      }
      setError(null);
      onApply(parsed);
      onClose();
    } catch (e) {
      setError(`${t.jsonSyntaxError} ${(e as Error).message}`);
    }
  };

  const handleResetDefault = () => {
    setText(JSON.stringify(defaultConfig, null, 2));
    setError(null);
  };

  const handleDownload = () => {
    try {
      const parsed = JSON.parse(text);
      const blob = new Blob([JSON.stringify(parsed, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t.jsonDownloadError);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#232922]/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-[430px] h-[86vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl bg-[#FBF8F1] border border-[#DDD0B8] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6DAC4] bg-[#F3ECE0]">
          <div>
            <h2
              id="json-modal-title"
              className="font-display text-base font-bold text-[#2B2A27]"
            >
              {t.jsonModalTitle}
            </h2>
            <p className="text-[11px] text-[#6E6659]">
              {t.jsonModalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#555046] hover:bg-[#E7DEC9] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 p-3 flex flex-col min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="config.json"
            className="flex-1 w-full rounded-2xl bg-[#272D27] text-[#E7EFE4] font-mono-tabular text-[11px] leading-relaxed p-3 border border-[#3E4A3E] focus:outline-2 focus:outline-[#6E9372] resize-none"
          />
          {error && (
            <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 pb-4 pt-2 border-t border-[#E6DAC4] bg-[#F3ECE0] flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="min-h-[44px] px-3 rounded-xl bg-[#E7DEC9] hover:bg-[#DDD1B8] text-[#3E3A32] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.jsonDefaultBtn}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="min-h-[44px] px-3 rounded-xl bg-[#E7DEC9] hover:bg-[#DDD1B8] text-[#3E3A32] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {t.jsonDownloadBtn}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#4B6B4F] hover:bg-[#3E5A42] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            {t.jsonApplyBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
