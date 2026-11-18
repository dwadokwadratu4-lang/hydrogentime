import { Flame, Snowflake, Zap, Droplets, TrendingUp } from 'lucide-react';
import {
  ControlsState,
  ElectrolyzerMode,
  FuelCellMode,
  HvacMode,
  Language,
  SimConfig,
} from '../types/sim';
import { formatRevenue, I18N } from '../i18n/translations';

interface ControlDeckProps {
  controls: ControlsState;
  config: SimConfig;
  lang: Language;
  soldEnergyKwh: number;
  disabled: boolean;
  tankEmpty: boolean;
  onChangeElectrolyzer: (mode: ElectrolyzerMode) => void;
  onChangeFuelCell: (mode: FuelCellMode) => void;
  onChangeHvac: (mode: HvacMode) => void;
  onToggleDumpLoad: () => void;
}

export function ControlDeck({
  controls,
  config,
  lang,
  soldEnergyKwh,
  disabled,
  tankEmpty,
  onChangeElectrolyzer,
  onChangeFuelCell,
  onChangeHvac,
  onToggleDumpLoad,
}: ControlDeckProps) {
  const t = I18N[lang];
  const elMax = config.devices.electrolyzer.maxPowerKw;
  const fcMax = config.devices.fuelCell.maxPowerKw;
  const levels: { value: 0 | 0.5 | 1; label: string }[] = [
    { value: 0, label: 'STOP' },
    { value: 0.5, label: '50%' },
    { value: 1, label: '100%' },
  ];

  const revenueText = formatRevenue(soldEnergyKwh, config, lang);

  return (
    <section
      aria-label={t.controlsAria}
      className="shrink-0 bg-[#F3ECE0] border-t border-[#DED1BA] px-2.5 pt-2 pb-2.5 select-none"
    >
      <div className="grid grid-cols-2 gap-2">
        {/* 1. Elektrolizer */}
        <div className="bg-[#FBF8F1] rounded-2xl p-1.5 border border-[#E2D6C1] shadow-xs">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#334139] whitespace-nowrap">
              <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {t.electrolyzer}
            </span>
            <span className="font-mono-tabular text-[10px] text-[#646057]">
              {(elMax * controls.electrolyzer).toFixed(0)} kW
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {levels.map((lvl) => {
              const active = controls.electrolyzer === lvl.value;
              return (
                <button
                  key={lvl.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeElectrolyzer(lvl.value)}
                  className={`min-h-[44px] rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                    active
                      ? lvl.value === 0
                        ? 'bg-[#3D473D] text-[#FBF8F1] shadow-xs'
                        : 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Ogniwo paliwowe */}
        <div className="bg-[#FBF8F1] rounded-2xl p-1.5 border border-[#E2D6C1] shadow-xs">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#334139] whitespace-nowrap">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {t.fuelCell}
            </span>
            <span className="font-mono-tabular text-[10px] text-[#646057]">
              {tankEmpty && controls.fuelCell > 0
                ? t.noH2
                : `${(fcMax * controls.fuelCell).toFixed(0)} kW`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {levels.map((lvl) => {
              const active = controls.fuelCell === lvl.value;
              return (
                <button
                  key={lvl.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeFuelCell(lvl.value)}
                  className={`min-h-[44px] rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-amber-700 ${
                    active
                      ? lvl.value === 0
                        ? 'bg-[#3D473D] text-[#FBF8F1] shadow-xs'
                        : 'bg-amber-600 text-white shadow-xs'
                      : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. HVAC w domu */}
        <div className="bg-[#FBF8F1] rounded-2xl p-1.5 border border-[#E2D6C1] shadow-xs">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-semibold text-[#334139] whitespace-nowrap">
              {t.hvacHome}
            </span>
            <span className="font-mono-tabular text-[10px] text-[#646057]">
              {controls.hvac === 'off' ? '0 kW' : `${config.devices.hvac.powerKw} kW`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeHvac('heat')}
              className={`min-h-[44px] rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-orange-700 ${
                controls.hvac === 'heat'
                  ? 'bg-[#C96D53] text-white shadow-xs'
                  : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mb-0.5" />
              {t.heat}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeHvac('off')}
              className={`min-h-[44px] rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-slate-700 ${
                controls.hvac === 'off'
                  ? 'bg-[#3D473D] text-[#FBF8F1] shadow-xs'
                  : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
              }`}
            >
              {t.off}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeHvac('cool')}
              className={`min-h-[44px] rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center transition-all whitespace-nowrap cursor-pointer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-sky-700 ${
                controls.hvac === 'cool'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 mb-0.5" />
              {t.cool}
            </button>
          </div>
        </div>

        {/* 4. Zrzut nadmiaru mocy (Grid Export + Live Profit) */}
        <div className="bg-[#FBF8F1] rounded-2xl p-1.5 border border-[#E2D6C1] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between px-1 mb-1 gap-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#334139] whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {t.gridExport}
            </span>
            <span className="font-mono-tabular text-[10px] font-bold text-emerald-700 whitespace-nowrap">
              {revenueText}
            </span>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleDumpLoad}
            className={`min-h-[44px] w-full rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-orange-700 ${
              controls.dumpLoad
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-[#EFE8D8] text-[#4E4A42] hover:bg-[#E6DEC9]'
            }`}
          >
            {controls.dumpLoad ? t.gridExportActive : t.gridExportOff}
          </button>
        </div>
      </div>
    </section>
  );
}
