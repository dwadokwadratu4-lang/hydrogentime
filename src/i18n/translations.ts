import { CataclysmConfig, EndingConfig, EndingKey, Language, SimConfig, WarningCode } from '../types/sim';

export interface Translations {
  appTitle: string;
  appTitleLine1: string;
  appTitleLine2: string;
  dayPrefix: string;
  pauseTitle: string;
  resumeTitle: string;
  restartTitle: string;
  configTitle: string;
  muteTitle: string;
  unmuteTitle: string;
  musicOnTitle: string;
  musicOffTitle: string;
  newRecordBadge: string;
  pausedOverlay: string;
  authorLabel: string;
  speedLabel: string;
  autoSlowdownTitle: string;

  // Controls
  controlsAria: string;
  electrolyzer: string;
  fuelCell: string;
  noH2: string;
  hvacHome: string;
  heat: string;
  off: string;
  cool: string;
  gridExport: string;
  gridExportActive: string;
  gridExportOff: string;
  earnedShort: string;

  // Canvas labels
  canvasMainBus: string;
  canvasProd: string;
  canvasLoad: string;
  canvasGridExport: string;
  canvasElectrolyzer: string;
  canvasTank: string;
  canvasFuelCell: string;
  canvasHeatRec: string;
  canvasTarget: string;
  canvasBrake: string;
  canvasFailure: string;
  canvasOff: string;

  // Welcome modal
  welcomeSubtitle: string;
  legendTopTitle: string;
  legendTopDesc: string;
  legendMidTitle: string;
  legendMidDesc: string;
  legendBotTitle: string;
  legendBotDesc: string;
  legendCfgTitle: string;
  legendCfgDesc: string;
  welcomeGoal: string;
  startButton: string;

  // End screen
  survivalLabel: string;
  realTimeLabel: string;
  revenueLabel: string;
  playAgain: string;
  formatDuration: (hours: number) => string;

  // JSON Config Modal
  jsonModalTitle: string;
  jsonModalSubtitle: string;
  jsonDefaultBtn: string;
  jsonDownloadBtn: string;
  jsonApplyBtn: string;
  jsonMissingSections: string;
  jsonSyntaxError: string;
  jsonDownloadError: string;

  // Warnings
  warnings: Record<WarningCode, string>;
  overpressureCountdown: (sec: number) => string;
  overvoltageCountdown: (sec: number) => string;
  blackoutCountdown: (sec: number) => string;
  thermalCountdown: (sec: number) => string;
}

const EN_CATACLYSMS: Record<string, { name: string; description: string }> = {
  volcanic_ash: {
    name: 'Volcanic Ash Cloud',
    description: 'Thick ash blocks the sky. PV drops by 95% and outdoor temperature falls sharply.',
  },
  forest_smoke: {
    name: 'Wildfire Smoke',
    description: 'Hot orange haze cuts PV by 70% and spikes outdoor air temperature.',
  },
  storm_squall: {
    name: 'Pre-Storm Squall',
    description: 'Gale gusts boost wind power to 150%, followed by an emergency turbine brake to 0%!',
  },
  dunkelflaute: {
    name: 'Dunkelflaute',
    description: 'Dense gray fog with zero wind and almost no sun. Survive on hydrogen storage!',
  },
};

const EN_ENDINGS: Record<EndingKey, EndingConfig> = {
  h2_explosion: {
    title: 'Hydrogen Tank Explosion!',
    subtitle: 'Pressure exceeded the 700 bar safety limit',
    comment:
      'Congratulations, you just built an eco-friendly rocket booster instead of a home energy buffer. The panicked sheep set a new county long-jump record.',
  },
  blackout: {
    title: 'Total Home Blackout!',
    subtitle: 'Bus power deficit with empty or disabled H₂ fuel cell',
    comment:
      'A romantic darkness fell over the house, the heat pump went silent, and worst of all: the Wi-Fi router died. Next time fire up the fuel cell before wind power runs out.',
  },
  overvoltage: {
    title: 'Main Bus Overvoltage!',
    subtitle: 'Massive renewable surplus without load or grid export',
    comment:
      'The inverters puffed out a dramatic cloud of smoke to the rhythm of switchboard sparks. When the wind goes wild and the tank is full, Grid Export is your best friend.',
  },
  thermal_cold: {
    title: 'Thermal Crisis — Deep Freeze!',
    subtitle: 'Indoor temperature dropped below 14°C',
    comment:
      'Picturesque icicles formed in the living room while the residents put on three sweaters each. Remember HVAC Heating and free waste heat from the electrolyzer & fuel cell!',
  },
  thermal_hot: {
    title: 'Thermal Crisis — Heatwave!',
    subtitle: 'Indoor temperature exceeded 30°C',
    comment:
      'The house turned into a complimentary Finnish sauna nobody bought a ticket for. During heatwaves and heavy waste heat, switch HVAC to Cooling.',
  },
};

export const I18N: Record<Language, Translations> = {
  pl: {
    appTitle: 'czas WODORU',
    appTitleLine1: 'czas',
    appTitleLine2: 'WODORU',
    dayPrefix: 'D',
    pauseTitle: 'Pauza',
    resumeTitle: 'Wznów',
    restartTitle: 'Restartuj',
    configTitle: 'Edytuj config.json',
    muteTitle: 'Wycisz muzykę tła',
    unmuteTitle: 'Włącz muzykę tła',
    musicOnTitle: 'Muzyka tła: WŁ',
    musicOffTitle: 'Muzyka tła: WYŁ',
    newRecordBadge: 'Nowy rekord przetrwania!',
    pausedOverlay: 'Symulacja wstrzymana',
    authorLabel: 'Projekt i realizacja:',
    speedLabel: 'Tempo:',
    autoSlowdownTitle: 'Automatyczne spowolnienie alarmowe o 30%',

    controlsAria: 'Panel sterowania instalacją',
    electrolyzer: 'Elektrolizer',
    fuelCell: 'Ogniwo H₂',
    noH2: 'Brak H₂',
    hvacHome: 'HVAC domu',
    heat: 'Grzej',
    off: 'WYŁ',
    cool: 'Chłódź',
    gridExport: 'Zrzut mocy',
    gridExportActive: 'Zrzut mocy: AKTYWNY',
    gridExportOff: 'Zrzut mocy: WYŁĄCZONY',
    earnedShort: 'Zysk',

    canvasMainBus: 'ROZDZIELNIA',
    canvasProd: 'Prod',
    canvasLoad: 'Pobór',
    canvasGridExport: 'ZRZUT MOCY',
    canvasElectrolyzer: 'ELEKTROLIZER',
    canvasTank: 'ZBIORNIK H₂',
    canvasFuelCell: 'OGNIWO H₂',
    canvasHeatRec: 'Odzysk',
    canvasTarget: 'cel',
    canvasBrake: 'HAMULEC',
    canvasFailure: 'AWARIA!',
    canvasOff: 'WYŁ',

    welcomeSubtitle: 'Krótka instrukcja obsługi instalacji',
    legendTopTitle: 'Góra (Wiatrak i Panele PV):',
    legendTopDesc: 'Twoje źródła darmowej, zielonej energii.',
    legendMidTitle: 'Środek (Elektrolizer, Zbiornik H₂, Ogniwo):',
    legendMidDesc:
      'Magazyn energii – zamieniasz nadmiar prądu w wodór, a gdy brakuje słońca i wiatru, odzyskujesz z niego prąd.',
    legendBotTitle: 'Dół (Dom i Zrzut Mocy):',
    legendBotDesc:
      'Odbiorcy – zarządzasz ogrzewaniem/chłodzeniem (HVAC) oraz sprzedażą/zrzutem nadmiaru mocy do sieci.',
    legendCfgTitle: 'Ikona konfiguracji w prawym górnym rogu:',
    legendCfgDesc:
      'tu możesz samodzielnie podejrzeć i zmienić parametry techniczne urządzeń (moce, pojemności, progi alarmowe).',
    welcomeGoal:
      '„Twoje zadanie: pilnuj, aby w domu było zawsze ciepło i działało Wi-Fi... ups, to znaczy, żeby zawsze był prąd i nie wybuchł zbiornik!”',
    startButton: 'ROZPOCZNIJ SYMULACJĘ',

    survivalLabel: 'Czas przetrwania instalacji',
    realTimeLabel: 'Czas rzeczywisty:',
    revenueLabel: 'Zarobek ze sprzedaży nadwyżek:',
    playAgain: 'Zagraj ponownie',
    formatDuration: (hours: number) => {
      const totalMinutes = Math.round(hours * 60);
      const days = Math.floor(totalMinutes / (24 * 60));
      const remHours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const mins = totalMinutes % 60;
      if (days > 0) return `${days} d ${remHours} godz. ${mins} min`;
      return `${remHours} godz. ${mins} min`;
    },

    jsonModalTitle: 'Konfiguracja symulatora (config.json)',
    jsonModalSubtitle: 'Edytuj moce urządzeń, limity ciśnienia, ceny energii i kataklizmy na żywo',
    jsonDefaultBtn: 'Domyślne',
    jsonDownloadBtn: 'Pobierz',
    jsonApplyBtn: 'Zastosuj na żywo',
    jsonMissingSections:
      'Brak wymaganych sekcji JSON (simulation, devices, hydrogenTank, houseTemperature, busLimits, cataclysms, endings).',
    jsonSyntaxError: 'Błąd składni JSON:',
    jsonDownloadError: 'Popraw błędy składni JSON przed pobraniem pliku.',

    warnings: {
      overpressure: 'Nadciśnienie H₂ (700 bar)!',
      high_pressure: 'Wysokie ciśnienie H₂',
      low_h2: 'Niski zapas H₂',
      thermal_cold_crit: 'Krytyczny mróz w domu!',
      thermal_hot_crit: 'Krytyczny upał w domu!',
      house_cooling: 'Dom się wychładza',
      house_heating: 'Dom się przegrzewa',
      overvoltage: 'Przeciążenie nadmiarem mocy!',
      blackout: 'Deficyt mocy na szynie!',
    },
    overpressureCountdown: (sec) =>
      `Nadciśnienie H₂! Wybuch za ${sec.toFixed(1)}s — wyłącz elektrolizer!`,
    overvoltageCountdown: (sec) =>
      `Przepięcie za ${sec.toFixed(1)}s — włącz zrzut mocy lub odbiór!`,
    blackoutCountdown: (sec) =>
      `Blackout za ${sec.toFixed(1)}s — włącz ogniwo H₂!`,
    thermalCountdown: (sec) =>
      `Kryzys termiczny za ${sec.toFixed(1)}s — ustaw HVAC!`,
  },

  en: {
    appTitle: 'HYDROGEN time',
    appTitleLine1: 'HYDROGEN',
    appTitleLine2: 'time',
    dayPrefix: 'D',
    pauseTitle: 'Pause',
    resumeTitle: 'Resume',
    restartTitle: 'Restart',
    configTitle: 'Edit config.json',
    muteTitle: 'Mute background music',
    unmuteTitle: 'Unmute background music',
    musicOnTitle: 'Ambient music: ON',
    musicOffTitle: 'Ambient music: OFF',
    newRecordBadge: 'New survival record!',
    pausedOverlay: 'Simulation paused',
    authorLabel: 'Design & implementation:',
    speedLabel: 'Speed:',
    autoSlowdownTitle: 'Automatic 30% alarm slowdown active',

    controlsAria: 'System control panel',
    electrolyzer: 'Electrolyzer',
    fuelCell: 'Fuel Cell H₂',
    noH2: 'No H₂',
    hvacHome: 'Home HVAC',
    heat: 'Heat',
    off: 'OFF',
    cool: 'Cool',
    gridExport: 'Grid Export',
    gridExportActive: 'Grid Export: ACTIVE',
    gridExportOff: 'Grid Export: OFF',
    earnedShort: 'Profit',

    canvasMainBus: 'MAIN BUS',
    canvasProd: 'Gen',
    canvasLoad: 'Load',
    canvasGridExport: 'GRID EXPORT',
    canvasElectrolyzer: 'ELECTROLYZER',
    canvasTank: 'H₂ TANK',
    canvasFuelCell: 'FUEL CELL',
    canvasHeatRec: 'Heat',
    canvasTarget: 'set',
    canvasBrake: 'BRAKE',
    canvasFailure: 'FAILURE!',
    canvasOff: 'OFF',

    welcomeSubtitle: 'Quick system operation guide',
    legendTopTitle: 'Top (Wind Turbine & Solar PV):',
    legendTopDesc: 'Your sources of free, green renewable electricity.',
    legendMidTitle: 'Middle (Electrolyzer, H₂ Tank, Fuel Cell):',
    legendMidDesc:
      'Energy storage – turn surplus power into hydrogen, and recover electricity when wind and sun drop.',
    legendBotTitle: 'Bottom (Home & Grid Export):',
    legendBotDesc:
      'Consumers – manage home heating/cooling (HVAC) and sell/dump surplus power safely to the grid.',
    legendCfgTitle: 'Config icon in the top-right corner:',
    legendCfgDesc:
      'inspect and customize technical device parameters (power ratings, capacities, alarm thresholds) live.',
    welcomeGoal:
      '"Your mission: keep the house cozy and the Wi-Fi running... oops, keep the lights on and stop the tank from exploding!"',
    startButton: 'START SIMULATION',

    survivalLabel: 'System survival time',
    realTimeLabel: 'Real time:',
    revenueLabel: 'Surplus grid export revenue:',
    playAgain: 'Play again',
    formatDuration: (hours: number) => {
      const totalMinutes = Math.round(hours * 60);
      const days = Math.floor(totalMinutes / (24 * 60));
      const remHours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const mins = totalMinutes % 60;
      if (days > 0) return `${days}d ${remHours}h ${mins}m`;
      return `${remHours}h ${mins}m`;
    },

    jsonModalTitle: 'Simulator Config (config.json)',
    jsonModalSubtitle: 'Edit device ratings, pressure limits, energy prices, and cataclysms live',
    jsonDefaultBtn: 'Defaults',
    jsonDownloadBtn: 'Download',
    jsonApplyBtn: 'Apply live',
    jsonMissingSections:
      'Missing required JSON sections (simulation, devices, hydrogenTank, houseTemperature, busLimits, cataclysms, endings).',
    jsonSyntaxError: 'JSON syntax error:',
    jsonDownloadError: 'Fix JSON syntax errors before downloading.',

    warnings: {
      overpressure: 'H₂ Overpressure (700 bar)!',
      high_pressure: 'High H₂ pressure',
      low_h2: 'Low H₂ reserve',
      thermal_cold_crit: 'Critical indoor freeze!',
      thermal_hot_crit: 'Critical indoor heat!',
      house_cooling: 'House cooling down',
      house_heating: 'House overheating',
      overvoltage: 'Bus overvoltage risk!',
      blackout: 'Bus power deficit!',
    },
    overpressureCountdown: (sec) =>
      `H₂ overpressure! Explosion in ${sec.toFixed(1)}s — stop electrolyzer!`,
    overvoltageCountdown: (sec) =>
      `Overvoltage in ${sec.toFixed(1)}s — enable Grid Export or load!`,
    blackoutCountdown: (sec) =>
      `Blackout in ${sec.toFixed(1)}s — turn on Fuel Cell!`,
    thermalCountdown: (sec) =>
      `Thermal crisis in ${sec.toFixed(1)}s — adjust HVAC!`,
  },
};

export function getLocalizedCataclysm(
  cat: CataclysmConfig,
  lang: Language
): { name: string; description: string } {
  if (lang === 'en' && EN_CATACLYSMS[cat.id]) {
    return EN_CATACLYSMS[cat.id];
  }
  return { name: cat.name, description: cat.description };
}

export function getLocalizedEnding(
  key: EndingKey,
  config: SimConfig,
  lang: Language
): EndingConfig {
  if (lang === 'en' && EN_ENDINGS[key]) {
    return EN_ENDINGS[key];
  }
  return config.endings[key];
}

export function formatRevenue(
  soldEnergyKwh: number,
  config: SimConfig,
  lang: Language
): string {
  const plnRate = config.economics?.sellPricePlnPerKwh ?? 0.8;
  const usdRate = config.economics?.sellPriceUsdPerKwh ?? 0.2;
  if (lang === 'en') {
    const usd = soldEnergyKwh * usdRate;
    return `+${usd.toFixed(2)} USD`;
  }
  const pln = soldEnergyKwh * plnRate;
  return `+${pln.toFixed(2)} PLN`;
}
