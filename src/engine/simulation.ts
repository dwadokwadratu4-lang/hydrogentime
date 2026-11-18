import {
  ControlsState,
  EndingKey,
  Particle,
  SheepEntity,
  SimConfig,
  SimState,
  WarningCode,
} from '../types/sim';

const UPPER_MEADOW_Y = 0.265;
const LOWER_LAWN_Y = 0.962;

function createInitialSheep(): SheepEntity[] {
  return [
    // Upper meadow (4 sheep)
    { id: 1, x: 0.30, y: UPPER_MEADOW_Y, yOffset: 0, targetX: 0.38, targetY: UPPER_MEADOW_Y, zone: 'upper', dir: 1, state: 'graze', stateTimer: 2.2, phase: 0.2, scale: 0.92 },
    { id: 2, x: 0.42, y: UPPER_MEADOW_Y, yOffset: -3, targetX: 0.35, targetY: UPPER_MEADOW_Y, zone: 'upper', dir: -1, state: 'walk', stateTimer: 3.1, phase: 1.7, scale: 1.02 },
    { id: 3, x: 0.54, y: UPPER_MEADOW_Y, yOffset: 2, targetX: 0.62, targetY: UPPER_MEADOW_Y, zone: 'upper', dir: 1, state: 'graze', stateTimer: 1.8, phase: 3.1, scale: 0.86 },
    { id: 4, x: 0.65, y: UPPER_MEADOW_Y, yOffset: -2, targetX: 0.57, targetY: UPPER_MEADOW_Y, zone: 'upper', dir: -1, state: 'walk', stateTimer: 2.7, phase: 4.5, scale: 0.96 },
    // Bottom lawn in front of / beside house (3 sheep)
    { id: 5, x: 0.14, y: LOWER_LAWN_Y, yOffset: 0, targetX: 0.26, targetY: LOWER_LAWN_Y, zone: 'lower', dir: 1, state: 'walk', stateTimer: 2.5, phase: 0.9, scale: 0.92 },
    { id: 6, x: 0.52, y: LOWER_LAWN_Y, yOffset: -2, targetX: 0.44, targetY: LOWER_LAWN_Y, zone: 'lower', dir: -1, state: 'graze', stateTimer: 2.9, phase: 2.4, scale: 0.96 },
    { id: 7, x: 0.84, y: LOWER_LAWN_Y, yOffset: 1, targetX: 0.75, targetY: LOWER_LAWN_Y, zone: 'lower', dir: -1, state: 'graze', stateTimer: 1.9, phase: 3.9, scale: 0.88 },
  ];
}

export function createInitialState(config: SimConfig): SimState {
  const startPress = config.simulation.initialTankPressureBar;
  const startKwh =
    (startPress / config.hydrogenTank.maxPressureBar) *
    config.hydrogenTank.capacityKwh;

  return {
    paused: false,
    gameOver: false,
    endingKey: null,
    elapsedGameHours: 0,
    elapsedRealSeconds: 0,
    timeOfDayHours: config.simulation.startHour,
    dayNumber: 1,

    solarFactor: 0.4,
    windFactor: 0.55,
    windSeedPhase: Math.random() * 100,
    outdoorTempC: 16.0,
    turbineAngle: 0,
    turbineRpmNorm: 0.55,
    turbineBraked: false,

    pvKw: 0,
    windKw: 0,
    fuelCellKw: 0,
    electrolyzerKw: 0,
    houseBaseKw: config.devices.house.dayBaseLoadKw,
    hvacElecKw: 0,
    dumpLoadKw: 0,
    soldEnergyKwh: 0,
    totalProductionKw: 0,
    totalConsumptionKw: 0,
    netBusKw: 0,
    unabsorbedSurplusKw: 0,
    deficitKw: 0,
    wasteHeatKw: 0,

    tankEnergyKwh: startKwh,
    tankPressureBar: startPress,
    houseTempC: config.simulation.initialHouseTempC,
    houseHasPower: true,

    overvoltageTimerSec: 0,
    blackoutTimerSec: 0,
    overpressureTimerSec: 0,
    thermalTimerSec: 0,
    autoSlowdownActive: false,
    isWarning: false,
    warningCodes: [],
    isCritical: false,
    blastProgress: 0,

    activeCataclysm: null,
    nextCataclysmInHours: config.simulation.firstCataclysmDelayHours,
    lastCataclysmId: null,

    sheep: createInitialSheep(),
    particles: [],
    flowOffset: 0,
  };
}

function computeSolarFactor(hour: number): number {
  if (hour <= 5.5 || hour >= 19.5) return 0;
  const normalized = (hour - 5.5) / 14.0;
  return Math.max(0, Math.pow(Math.sin(Math.PI * normalized), 1.15));
}

function computeBaseOutdoorTemp(hour: number, config: SimConfig): number {
  const { baseOutdoorNightMinC, baseOutdoorDayMaxC } = config.houseTemperature;
  const mean = (baseOutdoorNightMinC + baseOutdoorDayMaxC) / 2;
  const amp = (baseOutdoorDayMaxC - baseOutdoorNightMinC) / 2;
  const rad = ((hour - 10.5) / 24) * Math.PI * 2;
  return mean + amp * Math.sin(rad);
}

function computeBaseWindFactor(phase: number): number {
  const raw =
    0.54 +
    0.22 * Math.sin(phase * 0.45) +
    0.14 * Math.sin(phase * 1.13 + 1.4) +
    0.09 * Math.cos(phase * 2.1 + 0.6);
  return Math.max(0.12, Math.min(0.95, raw));
}

function pickNextCataclysm(state: SimState, config: SimConfig) {
  const list = config.cataclysms;
  if (!list || list.length === 0) return null;
  const candidates =
    list.length > 1
      ? list.filter((c) => c.id !== state.lastCataclysmId)
      : list;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    config: chosen,
    elapsedHours: 0,
    braked: false,
  };
}

function updateSheep(
  sheepList: SheepEntity[],
  dtRealSec: number,
  isWarning: boolean,
  isCritical: boolean
): SheepEntity[] {
  let roamingCount = sheepList.filter((s) => s.state === 'roam').length;

  return sheepList.map((s) => {
    const next = { ...s };

    if (isCritical) {
      if (next.state !== 'flee') {
        next.state = 'flee';
        next.dir = next.x < 0.5 ? -1 : 1;
      }
      next.phase += dtRealSec * 16;
      next.x += next.dir * dtRealSec * 0.58;
      return next;
    }

    if (isWarning) {
      next.state = 'alert';
      next.phase += dtRealSec * 5;
      return next;
    }

    // Recover from alert: if mid-roam, resume roaming; otherwise graze
    if (next.state === 'alert') {
      if (Math.abs(next.y - next.targetY) > 0.03) {
        next.state = 'roam';
      } else {
        next.state = 'graze';
        next.stateTimer = 1.5 + Math.random() * 2;
      }
    }

    if (next.state === 'roam') {
      next.phase += dtRealSec * 10.5;
      const dx = next.targetX - next.x;
      const dy = next.targetY - next.y;
      const dist = Math.hypot(dx, dy);
      const speed = 0.16;
      if (dist < 0.015) {
        next.x = next.targetX;
        next.y = next.targetY;
        next.state = 'graze';
        next.stateTimer = 2.4 + Math.random() * 2.5;
      } else {
        next.x += (dx / dist) * speed * dtRealSec;
        next.y += (dy / dist) * speed * dtRealSec;
        if (Math.abs(dx) > 0.005) {
          next.dir = dx >= 0 ? 1 : -1;
        }
      }
      return next;
    }

    next.stateTimer -= dtRealSec;
    const minX = next.zone === 'upper' ? 0.27 : 0.08;
    const maxX = next.zone === 'upper' ? 0.68 : 0.92;

    if (next.state === 'walk') {
      next.phase += dtRealSec * 6.5;
      const speed = 0.045;
      const step = next.dir * speed * dtRealSec;
      next.x += step;
      if (next.x < minX) {
        next.x = minX;
        next.dir = 1;
      } else if (next.x > maxX) {
        next.x = maxX;
        next.dir = -1;
      }
      if (Math.abs(next.x - next.targetX) < 0.015 || next.stateTimer <= 0) {
        next.state = 'graze';
        next.stateTimer = 2.0 + Math.random() * 3.0;
      }
    } else {
      // graze
      next.phase += dtRealSec * 3.2;
      if (next.stateTimer <= 0) {
        // Occasionally break the mold and roam across the hub/house to the other lawn!
        if (roamingCount < 2 && Math.random() < 0.22) {
          roamingCount += 1;
          next.state = 'roam';
          if (next.zone === 'upper') {
            next.zone = 'lower';
            next.targetY = LOWER_LAWN_Y;
            next.targetX = 0.12 + Math.random() * 0.76;
          } else {
            next.zone = 'upper';
            next.targetY = UPPER_MEADOW_Y;
            next.targetX = 0.29 + Math.random() * 0.37;
          }
          next.dir = next.targetX >= next.x ? 1 : -1;
        } else {
          next.state = 'walk';
          next.targetX = minX + Math.random() * (maxX - minX);
          next.dir = next.targetX >= next.x ? 1 : -1;
          next.stateTimer = 2.2 + Math.random() * 2.8;
        }
      }
    }

    return next;
  });
}

function updateParticles(
  particles: Particle[],
  dtRealSec: number,
  state: SimState
): Particle[] {
  const updated: Particle[] = [];

  for (const p of particles) {
    const next = { ...p };
    next.life += dtRealSec;
    if (next.life >= next.maxLife) continue;
    next.x += next.vx * dtRealSec;
    next.y += next.vy * dtRealSec;
    if (next.kind === 'blast') {
      next.vx *= 0.95;
      next.vy *= 0.95;
    }
    updated.push(next);
  }

  if (!state.gameOver && state.electrolyzerKw > 0.5) {
    const spawnChance = state.electrolyzerKw > 8 ? 0.55 : 0.28;
    if (Math.random() < spawnChance && updated.length < 180) {
      updated.push({
        x: Math.random(),
        y: 1.0,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(0.45 + Math.random() * 0.45),
        size: 2 + Math.random() * 3.2,
        alpha: 0.75,
        life: 0,
        maxLife: 1.35,
        kind: 'bubble',
      });
    }
  }

  if (state.activeCataclysm && !state.gameOver && updated.length < 180) {
    const pType = state.activeCataclysm.config.particleType;
    if (pType === 'ash' || pType === 'smoke' || pType === 'rain') {
      const count = pType === 'rain' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        if (Math.random() < 0.7) {
          updated.push({
            x: Math.random(),
            y: -0.02,
            vx: pType === 'rain' ? -0.28 : (Math.random() - 0.5) * 0.06,
            vy: pType === 'rain' ? 1.15 : 0.14 + Math.random() * 0.1,
            size: pType === 'rain' ? 10 : 2.5 + Math.random() * 3.5,
            alpha: pType === 'rain' ? 0.48 : 0.65,
            life: 0,
            maxLife: pType === 'rain' ? 0.9 : 3.2,
            kind: pType,
          });
        }
      }
    }
  }

  if (state.overvoltageTimerSec > 0.4 && updated.length < 200) {
    if (Math.random() < 0.55) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.25 + Math.random() * 0.45;
      updated.push({
        x: 0.5,
        y: 0.5,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 2 + Math.random() * 2.5,
        alpha: 1,
        life: 0,
        maxLife: 0.42,
        kind: 'spark',
      });
    }
  }

  return updated;
}

export function stepSimulation(
  prev: SimState,
  controls: ControlsState,
  config: SimConfig,
  dtRealSecRaw: number,
  speedMultiplier = 0.6
): SimState {
  const dtRealSec = Math.min(dtRealSecRaw, 0.1);

  if (prev.gameOver) {
    const nextBlast = Math.min(1, prev.blastProgress + dtRealSec * 1.4);
    const sheep = updateSheep(prev.sheep, dtRealSec, true, true);
    const particles = updateParticles(prev.particles, dtRealSec, prev);
    return {
      ...prev,
      blastProgress: nextBlast,
      sheep,
      particles,
    };
  }

  if (prev.paused) {
    return prev;
  }

  // Automatic 30% slowdown (0.7x) whenever any warning state is active
  const autoSlowdownActive = prev.isWarning;
  const effectiveSpeed = speedMultiplier * (autoSlowdownActive ? 0.7 : 1.0);
  const dtScaledReal = dtRealSec * effectiveSpeed;

  const hoursPerRealSec = config.simulation.hoursPerRealMinute / 60;
  const dtGameHours = dtScaledReal * hoursPerRealSec;

  const elapsedGameHours = prev.elapsedGameHours + dtGameHours;
  const elapsedRealSeconds = prev.elapsedRealSeconds + dtRealSec;
  const totalHour = prev.timeOfDayHours + dtGameHours;
  const timeOfDayHours = totalHour % 24;
  const dayNumber = prev.dayNumber + (totalHour >= 24 ? 1 : 0);

  // Cataclysm scheduling & progression
  let activeCataclysm = prev.activeCataclysm
    ? { ...prev.activeCataclysm }
    : null;
  let nextCataclysmInHours = prev.nextCataclysmInHours;
  let lastCataclysmId = prev.lastCataclysmId;

  if (activeCataclysm) {
    activeCataclysm.elapsedHours += dtGameHours;
    if (
      activeCataclysm.config.squallBrakeAfterHours !== null &&
      activeCataclysm.elapsedHours >= activeCataclysm.config.squallBrakeAfterHours
    ) {
      activeCataclysm.braked = true;
    }
    if (activeCataclysm.elapsedHours >= activeCataclysm.config.durationHours) {
      lastCataclysmId = activeCataclysm.config.id;
      activeCataclysm = null;
      const minInt = config.simulation.cataclysmMinIntervalHours;
      const maxInt = config.simulation.cataclysmMaxIntervalHours;
      nextCataclysmInHours = minInt + Math.random() * Math.max(1, maxInt - minInt);
    }
  } else {
    nextCataclysmInHours -= dtGameHours;
    if (nextCataclysmInHours <= 0) {
      activeCataclysm = pickNextCataclysm(prev, config);
    }
  }

  // Environmental factors
  const baseSolar = computeSolarFactor(timeOfDayHours);
  const windSeedPhase = prev.windSeedPhase + dtGameHours * 0.85;
  const baseWind = computeBaseWindFactor(windSeedPhase);
  const baseOutdoor = computeBaseOutdoorTemp(timeOfDayHours, config);

  let solarFactor = baseSolar;
  let windFactor = baseWind;
  let outdoorTempC = baseOutdoor;
  let turbineBraked = false;

  if (activeCataclysm) {
    solarFactor *= activeCataclysm.config.pvMultiplier;
    outdoorTempC += activeCataclysm.config.outdoorTempOffsetC;
    if (activeCataclysm.braked) {
      windFactor = 0;
      turbineBraked = true;
    } else {
      windFactor *= activeCataclysm.config.windMultiplier;
    }
  }

  const pvKw = config.devices.pv.maxPowerKw * solarFactor;
  const windKw = config.devices.windTurbine.maxPowerKw * windFactor;

  // Fuel cell output (limited by remaining H2)
  const desiredFuelCellKw = config.devices.fuelCell.maxPowerKw * controls.fuelCell;
  let fuelCellKw = desiredFuelCellKw;
  if (prev.tankEnergyKwh <= 0.02) {
    fuelCellKw = 0;
  } else {
    const maxPossibleKw =
      (prev.tankEnergyKwh * config.devices.fuelCell.efficiency) /
      Math.max(dtGameHours, 1e-6);
    if (fuelCellKw > maxPossibleKw) {
      fuelCellKw = maxPossibleKw;
    }
  }

  // Loads
  const electrolyzerKw =
    config.devices.electrolyzer.maxPowerKw * controls.electrolyzer;
  const isNight = timeOfDayHours < 7 || timeOfDayHours >= 23;
  const houseBaseKw = isNight
    ? config.devices.house.nightBaseLoadKw
    : config.devices.house.dayBaseLoadKw;
  const hvacElecKw =
    controls.hvac !== 'off' ? config.devices.hvac.powerKw : 0;
  const dumpFanKw = controls.dumpLoad
    ? config.devices.dumpLoad.fanStandbyKw
    : 0;

  const grossProductionKw = pvKw + windKw + fuelCellKw;
  const fixedConsumptionKw =
    houseBaseKw + hvacElecKw + electrolyzerKw + dumpFanKw;
  const rawBalanceKw = grossProductionKw - fixedConsumptionKw;

  let dumpLoadKw = 0;
  if (controls.dumpLoad && rawBalanceKw > 0) {
    dumpLoadKw = Math.min(rawBalanceKw, config.devices.dumpLoad.maxPowerKw);
  }

  const totalConsumptionKw = fixedConsumptionKw + dumpLoadKw;
  const soldEnergyKwh = prev.soldEnergyKwh + dumpLoadKw * dtGameHours;
  const netBusKw = grossProductionKw - totalConsumptionKw;
  const unabsorbedSurplusKw = Math.max(0, netBusKw);
  const deficitKw = Math.max(0, -netBusKw);

  // Tank H2 storage update
  const h2InKwh =
    electrolyzerKw * config.devices.electrolyzer.efficiency * dtGameHours;
  const h2OutKwh =
    (fuelCellKw / config.devices.fuelCell.efficiency) * dtGameHours;
  const rawTankEnergyKwh = Math.max(0, prev.tankEnergyKwh + h2InKwh - h2OutKwh);
  const rawTankPressureBar =
    (rawTankEnergyKwh / config.hydrogenTank.capacityKwh) *
    config.hydrogenTank.maxPressureBar;

  // Overpressure 7s grace countdown when hitting >= maxPressureBar
  const overpressureGrace =
    config.hydrogenTank.overpressureGraceSeconds ?? config.busLimits.graceSeconds;
  let overpressureTimerSec = prev.overpressureTimerSec;
  let tankEnergyKwh = rawTankEnergyKwh;
  let tankPressureBar = rawTankPressureBar;

  if (rawTankPressureBar >= config.hydrogenTank.maxPressureBar) {
    // Clamp visually at maxPressureBar while countdown runs if still pushing H2
    tankEnergyKwh = config.hydrogenTank.capacityKwh;
    tankPressureBar = config.hydrogenTank.maxPressureBar;
    if (h2InKwh > h2OutKwh) {
      overpressureTimerSec += dtRealSec;
    } else {
      overpressureTimerSec = Math.max(0, overpressureTimerSec - dtRealSec * 1.8);
    }
  } else {
    overpressureTimerSec = Math.max(0, overpressureTimerSec - dtRealSec * 1.8);
  }

  // Waste heat recovery & House thermal update
  const electrolyzerWasteKw =
    electrolyzerKw * config.devices.electrolyzer.wasteHeatFactor;
  const fuelCellWasteKw =
    (fuelCellKw / config.devices.fuelCell.efficiency) *
    config.devices.fuelCell.wasteHeatFactor;
  const wasteHeatKw = electrolyzerWasteKw + fuelCellWasteKw;

  const houseHasPower =
    deficitKw <= Math.abs(config.busLimits.blackoutThresholdKw);

  let hvacThermalKw = 0;
  if (houseHasPower) {
    if (controls.hvac === 'heat') {
      hvacThermalKw = config.devices.hvac.powerKw * config.devices.hvac.copHeating;
    } else if (controls.hvac === 'cool') {
      hvacThermalKw = -config.devices.hvac.powerKw * config.devices.hvac.copCooling;
    }
  }

  const envelopeFlowKw =
    (outdoorTempC - prev.houseTempC) *
    config.houseTemperature.thermalLossPerDegKw;
  const internalGainsKw = 0.55;
  const netThermalKw =
    envelopeFlowKw + hvacThermalKw + wasteHeatKw + internalGainsKw;
  const houseTempC =
    prev.houseTempC +
    (netThermalKw * dtGameHours) / config.houseTemperature.thermalMassKwhPerDeg;

  // Thermal 7s grace countdown when crossing safeMinC or safeMaxC
  const thermalGrace =
    config.houseTemperature.thermalGraceSeconds ?? config.busLimits.graceSeconds;
  let thermalTimerSec = prev.thermalTimerSec;
  if (
    houseTempC < config.houseTemperature.safeMinC ||
    houseTempC > config.houseTemperature.safeMaxC
  ) {
    thermalTimerSec += dtRealSec;
  } else {
    thermalTimerSec = Math.max(0, thermalTimerSec - dtRealSec * 1.6);
  }

  // Bus danger grace timers (7s)
  let overvoltageTimerSec = prev.overvoltageTimerSec;
  if (unabsorbedSurplusKw > config.busLimits.overvoltageThresholdKw) {
    overvoltageTimerSec += dtRealSec;
  } else {
    overvoltageTimerSec = Math.max(0, overvoltageTimerSec - dtRealSec * 1.6);
  }

  let blackoutTimerSec = prev.blackoutTimerSec;
  if (deficitKw > Math.abs(config.busLimits.blackoutThresholdKw)) {
    blackoutTimerSec += dtRealSec;
  } else {
    blackoutTimerSec = Math.max(0, blackoutTimerSec - dtRealSec * 1.6);
  }

  // Evaluate Critical Failures (all with 7s grace windows)
  let endingKey: EndingKey | null = null;
  if (overpressureTimerSec >= overpressureGrace) {
    endingKey = 'h2_explosion';
  } else if (blackoutTimerSec >= config.busLimits.graceSeconds) {
    endingKey = 'blackout';
  } else if (overvoltageTimerSec >= config.busLimits.graceSeconds) {
    endingKey = 'overvoltage';
  } else if (thermalTimerSec >= thermalGrace) {
    endingKey =
      houseTempC < config.houseTemperature.safeMinC
        ? 'thermal_cold'
        : 'thermal_hot';
  }

  const gameOver = endingKey !== null;
  const isCritical = gameOver;

  // Evaluate Warnings (triggers sheep alert '!' + 30% auto-slowdown)
  const warningCodes: WarningCode[] = [];
  if (overpressureTimerSec > 0.05) {
    warningCodes.push('overpressure');
  } else if (tankPressureBar >= config.hydrogenTank.warningHighBar) {
    warningCodes.push('high_pressure');
  }
  if (
    tankPressureBar <= config.hydrogenTank.warningLowBar &&
    pvKw + windKw < houseBaseKw
  ) {
    warningCodes.push('low_h2');
  }
  if (thermalTimerSec > 0.05) {
    warningCodes.push(
      houseTempC < config.houseTemperature.safeMinC
        ? 'thermal_cold_crit'
        : 'thermal_hot_crit'
    );
  } else if (houseTempC <= config.houseTemperature.warningMinC) {
    warningCodes.push('house_cooling');
  } else if (houseTempC >= config.houseTemperature.warningMaxC) {
    warningCodes.push('house_heating');
  }
  if (overvoltageTimerSec > 0.3) {
    warningCodes.push('overvoltage');
  }
  if (blackoutTimerSec > 0.3) {
    warningCodes.push('blackout');
  }

  const isWarning = warningCodes.length > 0 || activeCataclysm !== null;

  // Turbine blade rotation
  const targetRpm = turbineBraked ? 0 : windFactor;
  const turbineRpmNorm =
    prev.turbineRpmNorm +
    (targetRpm - prev.turbineRpmNorm) * Math.min(1, dtScaledReal * 4);
  const turbineAngle =
    prev.turbineAngle + dtScaledReal * (0.4 + turbineRpmNorm * 6.2);
  const flowOffset = (prev.flowOffset + dtScaledReal * 1.8) % 1000;

  let extraParticles: Particle[] = [];
  if (endingKey === 'h2_explosion') {
    for (let i = 0; i < 42; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.25 + Math.random() * 1.1;
      extraParticles.push({
        x: 0.5,
        y: 0.5,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 6 + Math.random() * 14,
        alpha: 1,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.7,
        kind: 'blast',
      });
    }
  }

  const nextState: SimState = {
    ...prev,
    gameOver,
    endingKey,
    elapsedGameHours,
    elapsedRealSeconds,
    timeOfDayHours,
    dayNumber,
    solarFactor,
    windFactor,
    windSeedPhase,
    outdoorTempC,
    turbineAngle,
    turbineRpmNorm,
    turbineBraked,
    pvKw,
    windKw,
    fuelCellKw,
    electrolyzerKw,
    houseBaseKw,
    hvacElecKw,
    dumpLoadKw,
    soldEnergyKwh,
    totalProductionKw: grossProductionKw,
    totalConsumptionKw,
    netBusKw,
    unabsorbedSurplusKw,
    deficitKw,
    wasteHeatKw,
    tankEnergyKwh,
    tankPressureBar,
    houseTempC,
    houseHasPower: endingKey === 'blackout' ? false : houseHasPower,
    overvoltageTimerSec,
    blackoutTimerSec,
    overpressureTimerSec,
    thermalTimerSec,
    autoSlowdownActive,
    isWarning,
    warningCodes,
    isCritical,
    blastProgress: gameOver ? 0.05 : 0,
    activeCataclysm,
    nextCataclysmInHours,
    lastCataclysmId,
    sheep: [],
    particles: [],
    flowOffset,
  };

  nextState.sheep = updateSheep(prev.sheep, dtScaledReal, isWarning, isCritical);
  nextState.particles = updateParticles(
    [...prev.particles, ...extraParticles],
    dtScaledReal,
    nextState
  );

  return nextState;
}
