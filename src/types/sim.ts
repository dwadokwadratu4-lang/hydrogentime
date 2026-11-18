export type Language = 'pl' | 'en';

export type ElectrolyzerMode = 0 | 0.5 | 1;
export type FuelCellMode = 0 | 0.5 | 1;
export type HvacMode = 'off' | 'heat' | 'cool';

export type EndingKey =
  | 'h2_explosion'
  | 'blackout'
  | 'overvoltage'
  | 'thermal_cold'
  | 'thermal_hot';

export type CataclysmParticleType = 'ash' | 'smoke' | 'rain' | 'fog';

export interface CataclysmConfig {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  pvMultiplier: number;
  windMultiplier: number;
  squallBrakeAfterHours: number | null;
  outdoorTempOffsetC: number;
  skyTint: string;
  particleType: CataclysmParticleType;
}

export interface EndingConfig {
  title: string;
  subtitle: string;
  comment: string;
}

export interface SimConfig {
  simulation: {
    hoursPerRealMinute: number;
    defaultSpeedMultiplier?: number;
    startHour: number;
    initialTankPressureBar: number;
    initialHouseTempC: number;
    cataclysmMinIntervalHours: number;
    cataclysmMaxIntervalHours: number;
    firstCataclysmDelayHours: number;
  };
  economics?: {
    sellPricePlnPerKwh: number;
    sellPriceUsdPerKwh: number;
  };
  devices: {
    windTurbine: {
      maxPowerKw: number;
      squallBoostMultiplier: number;
    };
    pv: {
      maxPowerKw: number;
    };
    electrolyzer: {
      maxPowerKw: number;
      efficiency: number;
      wasteHeatFactor: number;
    };
    fuelCell: {
      maxPowerKw: number;
      efficiency: number;
      wasteHeatFactor: number;
    };
    hvac: {
      powerKw: number;
      copHeating: number;
      copCooling: number;
    };
    dumpLoad: {
      maxPowerKw: number;
      fanStandbyKw: number;
    };
    house: {
      dayBaseLoadKw: number;
      nightBaseLoadKw: number;
    };
  };
  hydrogenTank: {
    capacityKwh: number;
    maxPressureBar: number;
    warningHighBar: number;
    warningLowBar: number;
    overpressureGraceSeconds?: number;
  };
  houseTemperature: {
    targetC: number;
    safeMinC: number;
    safeMaxC: number;
    warningMinC: number;
    warningMaxC: number;
    thermalGraceSeconds?: number;
    baseOutdoorDayMaxC: number;
    baseOutdoorNightMinC: number;
    thermalLossPerDegKw: number;
    thermalMassKwhPerDeg: number;
  };
  busLimits: {
    overvoltageThresholdKw: number;
    blackoutThresholdKw: number;
    graceSeconds: number;
  };
  cataclysms: CataclysmConfig[];
  endings: Record<EndingKey, EndingConfig>;
}

export interface ControlsState {
  electrolyzer: ElectrolyzerMode;
  fuelCell: FuelCellMode;
  hvac: HvacMode;
  dumpLoad: boolean;
}

export interface SheepEntity {
  id: number;
  x: number; // normalized 0..1 across canvas width
  y: number; // normalized 0..1 across canvas height
  yOffset: number;
  targetX: number;
  targetY: number;
  zone: 'upper' | 'lower';
  dir: -1 | 1;
  state: 'walk' | 'graze' | 'roam' | 'alert' | 'flee';
  stateTimer: number;
  phase: number;
  scale: number;
  happyTimer: number;
  happyIcon: 'heart' | 'note';
  spookTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'bubble' | 'ash' | 'smoke' | 'rain' | 'spark' | 'blast' | 'heat' | 'cold';
}

export interface ActiveCataclysm {
  config: CataclysmConfig;
  elapsedHours: number;
  braked: boolean;
}

export type WarningCode =
  | 'overpressure'
  | 'high_pressure'
  | 'low_h2'
  | 'thermal_cold_crit'
  | 'thermal_hot_crit'
  | 'house_cooling'
  | 'house_heating'
  | 'overvoltage'
  | 'blackout';

export interface SimState {
  paused: boolean;
  gameOver: boolean;
  endingKey: EndingKey | null;
  elapsedGameHours: number;
  elapsedRealSeconds: number;
  timeOfDayHours: number; // 0..24
  dayNumber: number;

  // Environmental
  solarFactor: number; // 0..1
  windFactor: number; // 0..1.5
  windSeedPhase: number;
  outdoorTempC: number;
  turbineAngle: number;
  turbineRpmNorm: number;
  turbineBraked: boolean;

  // Powers (kW) & Economics
  pvKw: number;
  windKw: number;
  fuelCellKw: number;
  electrolyzerKw: number;
  houseBaseKw: number;
  hvacElecKw: number;
  dumpLoadKw: number;
  soldEnergyKwh: number;
  totalProductionKw: number;
  totalConsumptionKw: number;
  netBusKw: number;
  unabsorbedSurplusKw: number;
  deficitKw: number;
  wasteHeatKw: number;

  // Storage & Home
  tankEnergyKwh: number;
  tankPressureBar: number;
  houseTempC: number;
  houseHasPower: boolean;

  // Warnings & Buffers
  overvoltageTimerSec: number;
  blackoutTimerSec: number;
  overpressureTimerSec: number;
  thermalTimerSec: number;
  autoSlowdownActive: boolean;
  isWarning: boolean;
  warningCodes: WarningCode[];
  isCritical: boolean;
  blastProgress: number; // 0..1 animation after explosion

  // Cataclysms
  activeCataclysm: ActiveCataclysm | null;
  nextCataclysmInHours: number;
  lastCataclysmId: string | null;

  // Visual entities & electrolyzer arcs
  sheep: SheepEntity[];
  particles: Particle[];
  flowOffset: number;
  electrolyzerArcTimer: number;
  electrolyzerArcCooldown: number;
  electrolyzerArcSeed: number;
  electrolyzerArcCount: number;
  sheepSpookCount: number;
}
