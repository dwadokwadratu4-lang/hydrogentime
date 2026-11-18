import { ControlsState, Language, SheepEntity, SimConfig, SimState } from '../types/sim';
import { formatRevenue, I18N } from '../i18n/translations';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const safeW = Math.max(0, w);
  const safeH = Math.max(0, h);
  ctx.beginPath();
  if (safeW === 0 || safeH === 0) {
    return;
  }
  const radius = Math.max(0, Math.min(r, safeW / 2, safeH / 2));
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + safeW, y, x + safeW, y + safeH, radius);
  ctx.arcTo(x + safeW, y + safeH, x, y + safeH, radius);
  ctx.arcTo(x, y + safeH, x, y, radius);
  ctx.arcTo(x, y, x + safeW, y, radius);
  ctx.closePath();
}

function getSkyPalette(hour: number): { top: string; bottom: string; nightAmount: number } {
  // Night: 21..4.5, Dawn: 4.5..7.5, Day: 7.5..17.5, Dusk: 17.5..21
  if (hour >= 4.5 && hour < 7.5) {
    const t = (hour - 4.5) / 3.0;
    if (t < 0.5) {
      const k = t * 2;
      return {
        top: lerpColor('#212D45', '#8C6E85', k),
        bottom: lerpColor('#354866', '#EBB896', k),
        nightAmount: 1 - k * 0.7,
      };
    } else {
      const k = (t - 0.5) * 2;
      return {
        top: lerpColor('#8C6E85', '#7BAEC9', k),
        bottom: lerpColor('#EBB896', '#D7E9F0', k),
        nightAmount: Math.max(0, 0.3 - k * 0.3),
      };
    }
  }
  if (hour >= 7.5 && hour < 17.5) {
    return { top: '#7BAEC9', bottom: '#D7E9F0', nightAmount: 0 };
  }
  if (hour >= 17.5 && hour < 21.0) {
    const t = (hour - 17.5) / 3.5;
    if (t < 0.5) {
      const k = t * 2;
      return {
        top: lerpColor('#7BAEC9', '#705D7E', k),
        bottom: lerpColor('#D7E9F0', '#E29972', k),
        nightAmount: k * 0.3,
      };
    } else {
      const k = (t - 0.5) * 2;
      return {
        top: lerpColor('#705D7E', '#212D45', k),
        bottom: lerpColor('#E29972', '#354866', k),
        nightAmount: 0.3 + k * 0.7,
      };
    }
  }
  return { top: '#212D45', bottom: '#354866', nightAmount: 1 };
}

function drawFlowDots(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  flowOffset: number,
  powerKw: number,
  color: string,
  pipeColor: string,
  lineWidth = 3.5
) {
  // Draw base cable/pipe
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pipeColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  points.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  if (powerKw <= 0.08) {
    ctx.restore();
    return;
  }

  // Calculate segment lengths
  const segLens: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    totalLen += len;
  }
  if (totalLen < 1) {
    ctx.restore();
    return;
  }

  const speed = 18 + Math.min(powerKw, 20) * 3.2;
  const spacing = powerKw > 8 ? 16 : 22;
  const offset = (flowOffset * speed) % spacing;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;

  for (let d = offset; d < totalLen; d += spacing) {
    let rem = d;
    for (let i = 0; i < segLens.length; i++) {
      if (rem <= segLens[i]) {
        const t = rem / Math.max(segLens[i], 0.001);
        const x = lerp(points[i][0], points[i + 1][0], t);
        const y = lerp(points[i][1], points[i + 1][1], t);
        ctx.beginPath();
        ctx.arc(x, y, 2.7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      rem -= segLens[i];
    }
  }
  ctx.restore();
}

function drawSheep(
  ctx: CanvasRenderingContext2D,
  sheep: SheepEntity,
  baseX: number,
  baseY: number
) {
  ctx.save();
  const tapProgress = sheep.happyTimer > 0 ? Math.max(0, Math.min(1, sheep.happyTimer / 1.15)) : 0;
  const tapHop = tapProgress > 0.45 ? Math.sin(((tapProgress - 0.45) / 0.55) * Math.PI) * 11 : 0;
  const spookHop = sheep.spookTimer > 0 ? Math.abs(Math.sin(sheep.phase)) * 6.5 : 0;
  const hop =
    tapHop +
    spookHop +
    (sheep.state === 'flee'
      ? Math.abs(Math.sin(sheep.phase)) * 9
      : sheep.state === 'roam'
      ? Math.abs(Math.sin(sheep.phase)) * 4.2
      : sheep.state === 'walk' && sheep.spookTimer <= 0
      ? Math.abs(Math.sin(sheep.phase)) * 2.2
      : 0);
  const sx = baseX;
  const sy = baseY + sheep.yOffset - hop;
  const sc = sheep.scale;

  ctx.translate(sx, sy);

  // Soft ground shadow
  ctx.fillStyle = 'rgba(65, 82, 52, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 8 * sc + hop * 0.5, 11 * sc, 3.2 * sc, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(sheep.dir * sc, sc);

  // Legs
  const legSwing =
    sheep.state === 'flee'
      ? Math.sin(sheep.phase) * 4.5
      : sheep.spookTimer > 0
      ? Math.sin(sheep.phase) * 4.2
      : sheep.state === 'roam'
      ? Math.sin(sheep.phase) * 3.2
      : sheep.state === 'walk'
      ? Math.sin(sheep.phase) * 2
      : 0;
  ctx.strokeStyle = '#4B3E35';
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  const legXs = [-6, -2.5, 2.5, 6];
  legXs.forEach((lx, idx) => {
    const swing = idx % 2 === 0 ? legSwing : -legSwing;
    ctx.beginPath();
    ctx.moveTo(lx, 2);
    ctx.lineTo(lx + swing, 8);
    ctx.stroke();
  });

  // Fluffy wool puffs (soft warm cream)
  ctx.fillStyle = '#E8DFCC';
  ctx.beginPath();
  ctx.arc(0, -1.5, 8.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FBF7EE';
  const puffs: [number, number, number][] = [
    [-5.5, -2.5, 5.2],
    [0, -5.2, 5.6],
    [5.2, -2.5, 5.0],
    [-2.5, 0.5, 4.8],
    [3.0, 0.5, 4.8],
  ];
  puffs.forEach(([px, py, pr]) => {
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  });

  // Head
  const grazeAngle =
    sheep.state === 'graze' && sheep.happyTimer <= 0
      ? 0.55 + Math.sin(sheep.phase * 2.2) * 0.15
      : 0;
  const headX = sheep.state === 'graze' && sheep.happyTimer <= 0 ? 9.5 : 8.5;
  const headY = sheep.state === 'graze' && sheep.happyTimer <= 0 ? 1.5 : -3.5;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(grazeAngle);
  ctx.fillStyle = '#4B3E35';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5, 3.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Cute ear
  ctx.beginPath();
  ctx.ellipse(-2.5, -2.5, 2.4, 1.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Little bright eye
  ctx.fillStyle = '#FBF7EE';
  ctx.beginPath();
  ctx.arc(1.6, -1.0, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // undo dir flip

  // Exclamation alert bubble above sheep (system warning OR startled by electrolyzer spark)
  if (sheep.state === 'alert' || sheep.spookTimer > 1.2) {
    const bob = Math.sin(sheep.phase * 2) * 1.5;
    ctx.fillStyle = '#FFF9EC';
    ctx.strokeStyle = sheep.spookTimer > 0 ? '#0284C7' : '#D97724';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -18 * sc + bob, 7.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sheep.spookTimer > 0 ? '#0369A1' : '#C2410C';
    ctx.font = 'bold 10.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, -17.5 * sc + bob);
  }

  // Cheerful heart or music note when tapped!
  if (sheep.happyTimer > 0) {
    const floatProgress = 1 - tapProgress;
    const fy = -18 * sc - floatProgress * 14;
    const alpha = Math.min(1, tapProgress * 2.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (sheep.happyIcon === 'heart') {
      // Drawn crisp vector heart
      ctx.translate(0, fy);
      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(0, 2.8);
      ctx.bezierCurveTo(-4.5, -0.5, -5.2, -5.2, -2.2, -5.5);
      ctx.bezierCurveTo(-0.5, -5.7, 0, -4.0, 0, -3.5);
      ctx.bezierCurveTo(0, -4.0, 0.5, -5.7, 2.2, -5.5);
      ctx.bezierCurveTo(5.2, -5.2, 4.5, -0.5, 0, 2.8);
      ctx.fill();
    } else {
      // Drawn music note badge
      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', 0, fy);
    }
    ctx.restore();
  }

  ctx.restore();
}

export function renderDiorama(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: SimState,
  controls: ControlsState,
  config: SimConfig,
  lang: Language = 'pl'
) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 40 || height < 40) {
    return;
  }
  const t = I18N[lang];
  ctx.clearRect(0, 0, width, height);

  // Subtle screen shake offset during H2 explosion
  ctx.save();
  if (state.endingKey === 'h2_explosion' && state.blastProgress < 0.75) {
    const mag = (1 - state.blastProgress / 0.75) * 6;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }

  const skyH = height * 0.305;
  const hubTop = height * 0.315;
  const hubH = Math.max(122, height * 0.33);
  const houseTop = hubTop + hubH + 14;
  const bottomLawnH = Math.max(22, height * 0.06);
  const houseAvailH = Math.max(82, height - houseTop - bottomLawnH + 4);

  // =========================================================================
  // 1. SKY & CELESTIAL CYCLE
  // =========================================================================
  const sky = getSkyPalette(state.timeOfDayHours);
  let topCol = sky.top;
  let botCol = sky.bottom;
  if (state.activeCataclysm) {
    topCol = lerpColor(topCol, state.activeCataclysm.config.skyTint, 0.78);
    botCol = lerpColor(botCol, state.activeCataclysm.config.skyTint, 0.58);
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0, topCol);
  skyGrad.addColorStop(1, botCol);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, skyH + 10);

  // Stars at night (when not obscured by thick cataclysm)
  if (sky.nightAmount > 0.25 && !state.activeCataclysm) {
    ctx.save();
    for (let i = 0; i < 22; i++) {
      const sx = ((i * 73 + 19) % 100) * 0.01 * width;
      const sy = ((i * 41 + 11) % 62) * 0.01 * (skyH * 0.75);
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(state.flowOffset * 1.5 + i));
      ctx.fillStyle = `rgba(255, 250, 232, ${sky.nightAmount * twinkle * 0.85})`;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0 ? 1.5 : 1.0), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Sun / Moon arc
  const h = state.timeOfDayHours;
  if (h >= 5.5 && h <= 19.5) {
    const sunT = (h - 5.5) / 14.0;
    const sunX = width * (0.1 + sunT * 0.8);
    const sunY = skyH * (0.64 - Math.sin(sunT * Math.PI) * 0.48);
    const sunAlpha = state.activeCataclysm ? 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = sunAlpha;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 32);
    sunGlow.addColorStop(0, 'rgba(255, 234, 158, 0.95)');
    sunGlow.addColorStop(1, 'rgba(255, 224, 130, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FBE08A';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    // Moon arc (19.5 -> 5.5 = 10h)
    const moonH = h > 19.5 ? h - 19.5 : h + 4.5;
    const moonT = moonH / 10.0;
    const moonX = width * (0.14 + moonT * 0.72);
    const moonY = skyH * (0.58 - Math.sin(moonT * Math.PI) * 0.42);
    ctx.save();
    ctx.fillStyle = '#F3EED9';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = topCol;
    ctx.beginPath();
    ctx.arc(moonX + 4.2, moonY - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Soft diorama clouds
  const cloudDrift = (state.flowOffset * 6) % (width + 120);
  const drawCloud = (cx: number, cy: number, sc: number, tint: string) => {
    ctx.save();
    ctx.translate(((cx + cloudDrift) % (width + 120)) - 60, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.arc(12, -3, 14, 0, Math.PI * 2);
    ctx.arc(26, 0, 11, 0, Math.PI * 2);
    ctx.arc(12, 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const cloudTint = state.activeCataclysm
    ? 'rgba(210, 208, 214, 0.42)'
    : sky.nightAmount > 0.5
    ? 'rgba(180, 195, 215, 0.25)'
    : 'rgba(255, 251, 242, 0.78)';
  drawCloud(40, skyH * 0.22, 0.9, cloudTint);
  drawCloud(width * 0.58, skyH * 0.16, 1.05, cloudTint);

  // Rolling sage & olive meadow hills
  ctx.fillStyle = '#A3B993';
  ctx.beginPath();
  ctx.moveTo(0, skyH * 0.72);
  ctx.quadraticCurveTo(width * 0.3, skyH * 0.58, width * 0.62, skyH * 0.7);
  ctx.quadraticCurveTo(width * 0.85, skyH * 0.78, width, skyH * 0.66);
  ctx.lineTo(width, skyH + 16);
  ctx.lineTo(0, skyH + 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#89A477';
  ctx.beginPath();
  ctx.moveTo(0, skyH * 0.8);
  ctx.quadraticCurveTo(width * 0.28, skyH * 0.74, width * 0.56, skyH * 0.8);
  ctx.quadraticCurveTo(width * 0.82, skyH * 0.86, width, skyH * 0.77);
  ctx.lineTo(width, skyH + 22);
  ctx.lineTo(0, skyH + 22);
  ctx.closePath();
  ctx.fill();

  // Warm meadow grass base strip
  ctx.fillStyle = '#7C9669';
  ctx.fillRect(0, skyH * 0.94, width, height * 0.04);

  // Cataclysm weather particles (ash, smoke, rain, fog)
  if (state.activeCataclysm) {
    if (state.activeCataclysm.config.particleType === 'fog') {
      ctx.fillStyle = 'rgba(205, 212, 214, 0.36)';
      ctx.fillRect(0, skyH * 0.35, width, skyH * 0.68);
    }
    state.particles.forEach((p) => {
      if (p.kind === 'ash' || p.kind === 'smoke' || p.kind === 'rain') {
        const px = p.x * width;
        const py = p.y * skyH;
        const fade = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = p.alpha * fade;
        if (p.kind === 'rain') {
          ctx.strokeStyle = '#BFD6E8';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - 3, py + p.size);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.kind === 'ash' ? '#D6CEDE' : '#E89C68';
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });
  }

  // =========================================================================
  // 2. WIND TURBINE (Left) & PV PANELS (Right)
  // =========================================================================
  const turbineBaseX = width * 0.16;
  const turbineBaseY = skyH * 0.84;
  const hubX = turbineBaseX;
  const hubY = skyH * 0.33;

  // Wooden foundation pad
  ctx.fillStyle = '#D5B895';
  roundRectPath(ctx, turbineBaseX - 16, turbineBaseY - 4, 32, 9, 4);
  ctx.fill();

  // Tapered cream mast
  ctx.fillStyle = '#F7F3E9';
  ctx.beginPath();
  ctx.moveTo(turbineBaseX - 5.5, turbineBaseY - 3);
  ctx.lineTo(hubX - 2.5, hubY);
  ctx.lineTo(hubX + 2.5, hubY);
  ctx.lineTo(turbineBaseX + 5.5, turbineBaseY - 3);
  ctx.closePath();
  ctx.fill();

  // Mast subtle shadow
  ctx.fillStyle = 'rgba(180, 170, 152, 0.35)';
  ctx.beginPath();
  ctx.moveTo(turbineBaseX + 1, turbineBaseY - 3);
  ctx.lineTo(hubX + 0.5, hubY);
  ctx.lineTo(hubX + 2.5, hubY);
  ctx.lineTo(turbineBaseX + 5.5, turbineBaseY - 3);
  ctx.closePath();
  ctx.fill();

  // Rotating 3 blades
  ctx.save();
  ctx.translate(hubX, hubY);
  ctx.rotate(state.turbineAngle);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 3);
    ctx.fillStyle = '#FBF8F1';
    ctx.beginPath();
    ctx.moveTo(-2.5, 0);
    ctx.quadraticCurveTo(-4, -22, 0, -40);
    ctx.quadraticCurveTo(3.5, -20, 2.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Nacelle hub
  ctx.fillStyle = state.turbineBraked ? '#DC2626' : '#E5D3B3';
  ctx.beginPath();
  ctx.arc(hubX, hubY, 5.2, 0, Math.PI * 2);
  ctx.fill();

  // Wind tag cleanly positioned on the green hillside above Rozdzielnia
  const windTagW = 58;
  const windTagX = turbineBaseX + 14;
  const windTagY = turbineBaseY - 21;
  ctx.fillStyle = 'rgba(251, 248, 241, 0.92)';
  roundRectPath(ctx, windTagX, windTagY, windTagW, 16, 6);
  ctx.fill();
  ctx.fillStyle = state.turbineBraked ? '#B91C1C' : '#354837';
  ctx.font = '600 9.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    state.turbineBraked ? t.canvasBrake : `${state.windKw.toFixed(1)} kW`,
    windTagX + windTagW / 2,
    windTagY + 8
  );

  // PV Solar Array (Right)
  const pvX = width * 0.79;
  const pvY = skyH * 0.72;
  ctx.strokeStyle = '#B8956A';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pvX - 18, pvY - 10);
  ctx.lineTo(pvX - 18, pvY + 4);
  ctx.moveTo(pvX + 18, pvY - 10);
  ctx.lineTo(pvX + 18, pvY + 4);
  ctx.stroke();

  ctx.save();
  ctx.translate(pvX, pvY - 14);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#D8BE9A';
  roundRectPath(ctx, -31, -14, 62, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#2B4C6B';
  roundRectPath(ctx, -28, -11, 56, 20, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(186, 218, 245, 0.45)';
  ctx.lineWidth = 1;
  for (let gx = -14; gx <= 14; gx += 14) {
    ctx.beginPath();
    ctx.moveTo(gx, -11);
    ctx.lineTo(gx, 9);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-28, -1);
  ctx.lineTo(28, -1);
  ctx.stroke();
  if (state.solarFactor > 0.08) {
    ctx.fillStyle = `rgba(255, 245, 190, ${state.solarFactor * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(-26, -10);
    ctx.lineTo(-4, -10);
    ctx.lineTo(-16, 8);
    ctx.lineTo(-26, 8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // PV tag cleanly above Hub
  ctx.fillStyle = 'rgba(251, 248, 241, 0.92)';
  roundRectPath(ctx, pvX - 30, pvY + 7, 60, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#354837';
  ctx.font = '600 9.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.pvKw.toFixed(1)} kW`, pvX, pvY + 15);

  // =========================================================================
  // 3. LOWER ZONE: CROSS-SECTION HOUSE, HVAC & BOTTOM LAWN (drawn BEFORE Hub tiles so Hub tiles stay cleanly on top!)
  // =========================================================================
  const houseCenterX = width * 0.5;
  const houseW = Math.min(width - 40, 310);
  const hx = houseCenterX - houseW / 2;
  const roofH = Math.min(24, Math.max(17, houseAvailH * 0.22));
  const roofPeakY = houseTop;
  const wallTopY = roofPeakY + roofH;
  const wallH = Math.max(58, height - bottomLawnH - wallTopY + 2);

  // Warm grass backdrop at bottom of canvas
  ctx.fillStyle = '#89A477';
  ctx.fillRect(0, height - bottomLawnH, width, bottomLawnH);
  ctx.fillStyle = '#7C9669';
  ctx.fillRect(0, height - bottomLawnH, width, 4);

  // House body walls (warm wood frame + cutaway interior)
  const isCold = state.houseTempC < config.houseTemperature.warningMinC;
  const isHot = state.houseTempC > config.houseTemperature.warningMaxC;
  let interiorColor = state.houseHasPower ? '#FBF5E6' : '#3C4352';
  if (state.houseHasPower && isCold) interiorColor = '#E7F3FA';
  if (state.houseHasPower && isHot) interiorColor = '#FDEAE3';

  // Exterior birch shell
  ctx.fillStyle = '#D9BE9B';
  roundRectPath(ctx, hx, wallTopY, houseW, wallH, 8);
  ctx.fill();

  // Interior cutaway room
  ctx.fillStyle = interiorColor;
  roundRectPath(ctx, hx + 7, wallTopY + 5, houseW - 14, wallH - 10, 5);
  ctx.fill();

  // Room divider wall
  ctx.fillStyle = '#DFC9AA';
  ctx.fillRect(hx + houseW * 0.56, wallTopY + 5, 4, wallH - 10);

  // Terracotta Gable Roof
  ctx.fillStyle = '#C96D53';
  ctx.beginPath();
  ctx.moveTo(hx - 14, wallTopY + 3);
  ctx.lineTo(houseCenterX, roofPeakY);
  ctx.lineTo(hx + houseW + 14, wallTopY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#DF876D';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hx - 12, wallTopY + 2);
  ctx.lineTo(houseCenterX, roofPeakY + 1);
  ctx.lineTo(hx + houseW + 12, wallTopY + 2);
  ctx.stroke();

  // Cozy Living Room Window (Left room)
  const winX = hx + 20;
  const winY = wallTopY + 12;
  const winW = 44;
  const winH = Math.min(32, Math.max(22, wallH * 0.42));
  ctx.fillStyle = !state.houseHasPower
    ? '#262C38'
    : isCold
    ? '#BAE6FD'
    : isHot
    ? '#FCA5A5'
    : '#FDE68A';
  roundRectPath(ctx, winX, winY, winW, winH, 4);
  ctx.fill();
  ctx.strokeStyle = '#B8966E';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2);
  ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();

  // Cozy sofa silhouette
  ctx.fillStyle = state.houseHasPower ? '#9C6B53' : '#2E3440';
  roundRectPath(ctx, hx + 80, wallTopY + wallH - 21, 44, 13, 5);
  ctx.fill();

  // Lamp glow if powered
  if (state.houseHasPower) {
    const lampGrad = ctx.createRadialGradient(
      hx + 140,
      wallTopY + 22,
      2,
      hx + 140,
      wallTopY + 22,
      22
    );
    lampGrad.addColorStop(0, 'rgba(253, 224, 71, 0.7)');
    lampGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = lampGrad;
    ctx.beginPath();
    ctx.arc(hx + 140, wallTopY + 22, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = state.houseHasPower ? '#F59E0B' : '#475569';
  ctx.beginPath();
  ctx.arc(hx + 140, wallTopY + 20, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Right Room: Hydronic Heat Exchanger (Waste Heat) + HVAC Indoor Unit
  const rightRoomX = hx + houseW * 0.59;
  const rightRoomW = houseW * 0.37;

  // Radiator fed by waste heat
  ctx.fillStyle = state.wasteHeatKw > 0.2 ? '#FB7185' : '#94A3B8';
  roundRectPath(ctx, rightRoomX + rightRoomW - 28, wallTopY + wallH - 24, 20, 16, 3);
  ctx.fill();

  // Indoor HVAC Split / Heat Pump Vent
  const hvacActive = state.houseHasPower && controls.hvac !== 'off';
  ctx.fillStyle = '#E2E8F0';
  roundRectPath(ctx, rightRoomX + 6, wallTopY + 5, 44, 12, 4);
  ctx.fill();
  ctx.fillStyle =
    !hvacActive
      ? '#94A3B8'
      : controls.hvac === 'heat'
      ? '#EA580C'
      : '#0284C7';
  ctx.fillRect(rightRoomX + 9, wallTopY + 13, 38, 2.5);

  // Airflow waves inside house when HVAC is running
  if (hvacActive) {
    ctx.save();
    ctx.strokeStyle =
      controls.hvac === 'heat'
        ? 'rgba(234, 88, 12, 0.65)'
        : 'rgba(2, 132, 199, 0.65)';
    ctx.lineWidth = 1.6;
    const waveShift = (state.flowOffset * 18) % 10;
    for (let wIdx = 0; wIdx < 3; wIdx++) {
      const wx = rightRoomX + 15 + wIdx * 11;
      const wy = wallTopY + 18 + waveShift;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 3.5, wy + 4, wx, wy + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Outdoor Heat Pump Fan box mounted on right exterior wall
  const pumpX = hx + houseW + 2;
  const pumpY = wallTopY + wallH - 30;
  ctx.fillStyle = '#E5DEC9';
  roundRectPath(ctx, pumpX, pumpY, 20, 24, 4);
  ctx.fill();
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(pumpX + 10, pumpY + 12, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(pumpX + 10, pumpY + 12);
  ctx.rotate(hvacActive ? state.flowOffset * 10 : 0.4);
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-4.5, 0);
  ctx.lineTo(4.5, 0);
  ctx.moveTo(0, -4.5);
  ctx.lineTo(0, 4.5);
  ctx.stroke();
  ctx.restore();

  // Prominent House Temperature Box positioned higher on the wall with ample height
  const tempColor = isCold
    ? '#0369A1'
    : isHot
    ? '#DC2626'
    : '#15803D';
  const tempBoxX = rightRoomX + 5;
  const tempBoxY = wallTopY + 18;
  const tempBoxW = Math.max(54, rightRoomW - 36);
  const tempBoxH = 34;
  ctx.fillStyle = 'rgba(255, 252, 245, 0.95)';
  roundRectPath(ctx, tempBoxX, tempBoxY, tempBoxW, tempBoxH, 8);
  ctx.fill();
  ctx.strokeStyle = tempColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = tempColor;
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${state.houseTempC.toFixed(1)}°C`,
    tempBoxX + tempBoxW / 2,
    tempBoxY + 11.5
  );
  ctx.fillStyle = '#64748B';
  ctx.font = '600 8.5px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${t.canvasTarget} ${config.houseTemperature.targetC}°C`,
    tempBoxX + tempBoxW / 2,
    tempBoxY + 25.5
  );

  // =========================================================================
  // 4. MIDDLE ENERGY HUB (Diorama Board - drawn ABOVE house roof!)
  // =========================================================================
  const padX = 12;
  const hubW = width - padX * 2;
  ctx.fillStyle = '#E3D5BE';
  roundRectPath(ctx, padX, hubTop + 3, hubW, hubH, 16);
  ctx.fill();
  ctx.fillStyle = '#F8F3E8';
  roundRectPath(ctx, padX, hubTop, hubW, hubH, 16);
  ctx.fill();
  ctx.strokeStyle = '#DECBAE';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Coordinates of modules strictly inside hub
  const row1Y = hubTop + 7;
  const row1H = Math.max(48, Math.min(58, hubH * 0.37));
  const busX = padX + 10;
  const busW = hubW * 0.56;
  const dumpX = busX + busW + 8;
  const dumpW = hubW - busW - 28;

  const row2Y = row1Y + row1H + 9;
  const row2H = Math.max(52, hubH - row1H - 24);
  const modGap = 8;
  const modW = (hubW - 20 - modGap * 2) / 3;
  const elX = padX + 10;
  const tankX = elX + modW + modGap;
  const fcX = tankX + modW + modGap;

  // Power Wire Anchor points
  const busCenterX = busX + busW * 0.5;
  const busBottomY = row1Y + row1H;
  const busTopY = row1Y;

  // Wind -> Bus
  drawFlowDots(
    ctx,
    [
      [turbineBaseX, turbineBaseY + 5],
      [turbineBaseX, hubTop + 4],
      [busX + 26, hubTop + 4],
      [busX + 26, busTopY + 4],
    ],
    state.flowOffset,
    state.windKw,
    '#38BDF8',
    '#CBD5E1',
    3
  );

  // PV -> Bus
  drawFlowDots(
    ctx,
    [
      [pvX, pvY + 23],
      [pvX, hubTop + 4],
      [busX + busW - 26, hubTop + 4],
      [busX + busW - 26, busTopY + 4],
    ],
    state.flowOffset,
    state.pvKw,
    '#FBBF24',
    '#CBD5E1',
    3
  );

  // Bus -> Dump Load
  drawFlowDots(
    ctx,
    [
      [busX + busW, row1Y + row1H * 0.5],
      [dumpX, row1Y + row1H * 0.5],
    ],
    state.flowOffset,
    state.dumpLoadKw,
    '#F97316',
    '#D6CFC2',
    3.5
  );

  // Bus -> Electrolyzer
  drawFlowDots(
    ctx,
    [
      [elX + modW * 0.35, busBottomY],
      [elX + modW * 0.35, row2Y],
    ],
    state.flowOffset,
    state.electrolyzerKw,
    '#10B981',
    '#D6CFC2',
    3.5
  );

  // Fuel Cell -> Bus
  drawFlowDots(
    ctx,
    [
      [fcX + modW * 0.5, row2Y],
      [fcX + modW * 0.5, busBottomY + 4],
      [busX + busW * 0.78, busBottomY + 4],
      [busX + busW * 0.78, busBottomY],
    ],
    state.flowOffset,
    state.fuelCellKw,
    '#F59E0B',
    '#D6CFC2',
    3.5
  );

  // H2 Gas Pipes: Electrolyzer -> Tank, Tank -> Fuel Cell
  drawFlowDots(
    ctx,
    [
      [elX + modW, row2Y + row2H * 0.5],
      [tankX, row2Y + row2H * 0.5],
    ],
    state.flowOffset,
    state.electrolyzerKw * 0.8,
    '#06B6D4',
    '#CBD5E1',
    4
  );
  drawFlowDots(
    ctx,
    [
      [tankX + modW, row2Y + row2H * 0.5],
      [fcX, row2Y + row2H * 0.5],
    ],
    state.flowOffset,
    state.fuelCellKw * 1.2,
    '#06B6D4',
    '#CBD5E1',
    4
  );

  // Main Bus -> House Electrical Wire
  const houseElectricalInX = width * 0.28;
  drawFlowDots(
    ctx,
    [
      [busCenterX - 30, busBottomY],
      [busCenterX - 30, hubTop + hubH + 3],
      [houseElectricalInX, hubTop + hubH + 3],
      [houseElectricalInX, wallTopY],
    ],
    state.flowOffset,
    state.houseHasPower ? state.houseBaseKw + state.hvacElecKw : 0,
    '#FBBF24',
    '#CBD5E1',
    3.5
  );

  // WASTE HEAT RECOVERY PIPE (Copper/Terracotta pipe from Electrolyzer & Fuel Cell -> House)
  const heatPipeY = hubTop + hubH + 6;
  const houseHeatInX = width * 0.68;
  drawFlowDots(
    ctx,
    [
      [elX + modW * 0.65, row2Y + row2H],
      [elX + modW * 0.65, heatPipeY],
      [houseHeatInX, heatPipeY],
      [houseHeatInX, wallTopY + 12],
    ],
    state.flowOffset,
    state.electrolyzerKw > 0.2 ? state.wasteHeatKw : 0,
    '#FB7185',
    '#D9A08B',
    4.2
  );
  drawFlowDots(
    ctx,
    [
      [fcX + modW * 0.5, row2Y + row2H],
      [fcX + modW * 0.5, heatPipeY],
      [houseHeatInX, heatPipeY],
      [houseHeatInX, wallTopY + 12],
    ],
    state.flowOffset,
    state.fuelCellKw > 0.2 ? state.wasteHeatKw : 0,
    '#FB7185',
    '#D9A08B',
    4.2
  );

  // --- MODULE 1: ROZDZIELNIA (Main Bus) ---
  const busDanger = state.overvoltageTimerSec > 0.4 || state.blackoutTimerSec > 0.4;
  ctx.fillStyle = busDanger ? '#FEF2F2' : '#EFE7D6';
  roundRectPath(ctx, busX, row1Y, busW, row1H, 10);
  ctx.fill();
  ctx.strokeStyle = busDanger ? '#EF4444' : '#D5C3A5';
  ctx.lineWidth = busDanger ? 2 : 1.2;
  ctx.stroke();

  ctx.fillStyle = '#5C5449';
  ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(t.canvasMainBus, busX + 8, row1Y + 4);

  const netVal = state.netBusKw;
  const netStr = `${netVal >= 0 ? '+' : ''}${netVal.toFixed(1)} kW`;
  ctx.fillStyle =
    state.overvoltageTimerSec > 0.4 || state.blackoutTimerSec > 0.4
      ? '#DC2626'
      : Math.abs(netVal) <= 2.5
      ? '#15803D'
      : '#B45309';
  ctx.font = '700 10.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(netStr, busX + busW - 8, row1Y + 4);

  // Balance meter bar (middle)
  const barX = busX + 8;
  const barY = row1Y + 16.5;
  const barW = busW - 16;
  ctx.fillStyle = '#DFD5C3';
  roundRectPath(ctx, barX, barY, barW, 4.5, 2.2);
  ctx.fill();
  const maxRef = 20;
  const norm = Math.max(-1, Math.min(1, netVal / maxRef));
  const midX = barX + barW / 2;
  ctx.fillStyle =
    state.overvoltageTimerSec > 0.4
      ? '#DC2626'
      : state.blackoutTimerSec > 0.4
      ? '#EA580C'
      : '#0D9488';
  const fillW = Math.abs(norm) * (barW / 2);
  roundRectPath(ctx, norm >= 0 ? midX : midX - fillW, barY, Math.max(3, fillW), 4.5, 2.2);
  ctx.fill();
  ctx.fillStyle = '#5C5449';
  ctx.fillRect(midX - 0.8, barY - 1.5, 1.6, 7.5);

  // Prod vs Load row raised clearly above bottom border of Rozdzielnia
  ctx.fillStyle = '#334155';
  ctx.font = '600 9px "JetBrains Mono", monospace';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(`${t.canvasProd} ${state.totalProductionKw.toFixed(1)}`, busX + 8, row1Y + row1H - 7.5);
  ctx.textAlign = 'right';
  ctx.fillText(`${t.canvasLoad} ${state.totalConsumptionKw.toFixed(1)}`, busX + busW - 8, row1Y + row1H - 7.5);
  ctx.textBaseline = 'top';

  if (state.overvoltageTimerSec > 0.4) {
    state.particles.forEach((p) => {
      if (p.kind === 'spark') {
        const sx = busX + p.x * busW;
        const sy = row1Y + p.y * row1H;
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // --- MODULE 2: ZRZUT MOCY / GRID EXPORT (+ Rotating Beacon, Pulsing Green LED & Live Profit) ---
  const dumpActive = controls.dumpLoad;
  ctx.fillStyle = dumpActive && state.dumpLoadKw > 0.2 ? '#FFF3EA' : '#EFE7D6';
  roundRectPath(ctx, dumpX, row1Y, dumpW, row1H, 10);
  ctx.fill();
  ctx.strokeStyle = dumpActive ? '#EA580C' : '#D5C3A5';
  ctx.lineWidth = dumpActive ? 1.8 : 1.2;
  ctx.stroke();

  ctx.fillStyle = '#5C5449';
  ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.canvasGridExport, dumpX + dumpW / 2, row1Y + 4);

  const midRowY = row1Y + row1H * 0.51;

  // Left: Rotating Signal Beacon ("kogut sygnalizacyjny")
  const beaconX = dumpX + 15;
  const beaconY = midRowY;
  ctx.save();
  ctx.translate(beaconX, beaconY);
  if (dumpActive) {
    // Rotating light beam cones
    ctx.save();
    ctx.rotate(state.flowOffset * 5.2);
    const beamGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
    beamGrad.addColorStop(0, 'rgba(251, 146, 60, 0.72)');
    beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 12, -0.45, 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 12, Math.PI - 0.45, Math.PI + 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Glowing amber dome
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(-1.1, -1.1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Dark inactive dome
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.beginPath();
    ctx.arc(0, 0, 2.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Right: Pulsing Green Status LED
  const ledX = dumpX + dumpW - 15;
  const ledY = midRowY;
  ctx.save();
  ctx.translate(ledX, ledY);
  if (dumpActive) {
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(state.flowOffset * 4.5));
    const ledGlow = ctx.createRadialGradient(0, 0, 1, 0, 0, 9.5);
    ledGlow.addColorStop(0, `rgba(34, 197, 94, ${0.75 * pulse})`);
    ledGlow.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = ledGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgb(${Math.round(22 + 12 * pulse)}, ${Math.round(163 + 45 * pulse)}, 74)`;
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DCFCE7';
    ctx.beginPath();
    ctx.arc(-1, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Compact power readout in middle
  ctx.fillStyle = state.dumpLoadKw > 0.3 ? '#C2410C' : '#64748B';
  ctx.font = '600 9.5px "JetBrains Mono", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    dumpActive ? `${state.dumpLoadKw.toFixed(1)} kW` : t.canvasOff,
    dumpX + dumpW / 2,
    midRowY
  );

  // Growing live income counter at bottom of tile
  const revText = formatRevenue(state.soldEnergyKwh, config, lang);
  ctx.fillStyle = '#047857';
  ctx.font = '700 9px "JetBrains Mono", monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText(revText, dumpX + dumpW / 2, row1Y + row1H - 4.5);
  ctx.textBaseline = 'top';

  // --- MODULE 3: ELEKTROLIZER ---
  const elActive = state.electrolyzerKw > 0.1;
  ctx.fillStyle = elActive ? '#ECFDF5' : '#EFE7D6';
  roundRectPath(ctx, elX, row2Y, modW, row2H, 10);
  ctx.fill();
  ctx.strokeStyle = elActive ? '#10B981' : '#D5C3A5';
  ctx.lineWidth = elActive ? 1.8 : 1.2;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.canvasElectrolyzer, elX + modW / 2, row2Y + 4);

  const glassX = elX + 12;
  const glassY = row2Y + 17;
  const glassW = Math.max(14, modW - 24);
  const glassH = Math.max(14, row2H - 34);
  ctx.fillStyle = '#CBEBF0';
  roundRectPath(ctx, glassX, glassY, glassW, glassH, 6);
  ctx.fill();

  // Brief bright blue chamber flash during electric arc
  if (state.electrolyzerArcTimer > 0) {
    const arcAlpha = Math.min(1, state.electrolyzerArcTimer / 0.28);
    ctx.fillStyle = `rgba(125, 211, 252, ${arcAlpha * 0.52})`;
    roundRectPath(ctx, glassX, glassY, glassW, glassH, 6);
    ctx.fill();
  }

  ctx.fillStyle = '#64748B';
  ctx.fillRect(glassX + 6, glassY + 4, 3, Math.max(4, glassH - 8));
  ctx.fillRect(glassX + glassW - 9, glassY + 4, 3, Math.max(4, glassH - 8));

  state.particles.forEach((p) => {
    if (p.kind === 'bubble') {
      const bx = glassX + 6 + p.x * (glassW - 12);
      const by = glassY + 4 + p.y * (glassH - 8);
      if (by >= glassY + 2 && by <= glassY + glassH - 2) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * (1 - p.life / p.maxLife)})`;
        ctx.beginPath();
        ctx.arc(bx, by, p.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  // Zigzag light-blue electric arc jumping between left & right electrodes
  if (state.electrolyzerArcTimer > 0 && glassW > 20) {
    const arcAlpha = Math.min(1, state.electrolyzerArcTimer / 0.28);
    const startX = glassX + 8.5;
    const endX = glassX + glassW - 8.5;
    const midY = glassY + glassH * 0.5;
    const segments = 5;
    const pts: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const px = lerp(startX, endX, frac);
      let py = midY;
      if (i > 0 && i < segments) {
        const pseudo = Math.sin(state.electrolyzerArcSeed * 12.9898 + i * 78.233);
        py += pseudo * Math.min(7, glassH * 0.34);
      }
      pts.push([px, py]);
    }

    ctx.save();
    ctx.globalAlpha = arcAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Outer sky-blue glow
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3.2;
    ctx.shadowColor = '#7DD3FC';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Inner bright core
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#F0F9FF';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = elActive ? '#047857' : '#64748B';
  ctx.font = '600 9.5px "JetBrains Mono", monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${state.electrolyzerKw.toFixed(1)} kW`, elX + modW / 2, row2Y + row2H - 4);
  ctx.textBaseline = 'top';

  // --- MODULE 4: ZBIORNIK H2 (0-700 bar) ---
  const pressRatio = Math.min(1, state.tankPressureBar / config.hydrogenTank.maxPressureBar);
  const tankWarn =
    state.tankPressureBar >= config.hydrogenTank.warningHighBar ||
    state.tankPressureBar <= config.hydrogenTank.warningLowBar;
  const tankCrit = state.tankPressureBar >= config.hydrogenTank.maxPressureBar * 0.94;

  ctx.fillStyle = tankCrit ? '#FEF2F2' : '#EFE7D6';
  roundRectPath(ctx, tankX, row2Y, modW, row2H, 10);
  ctx.fill();
  ctx.strokeStyle = tankCrit ? '#DC2626' : tankWarn ? '#D97706' : '#D5C3A5';
  ctx.lineWidth = tankWarn || tankCrit ? 1.8 : 1.2;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.canvasTank, tankX + modW / 2, row2Y + 4);

  if (state.endingKey === 'h2_explosion') {
    ctx.fillStyle = '#DC2626';
    ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(t.canvasFailure, tankX + modW / 2, row2Y + row2H * 0.5);
  } else {
    const cylX = tankX + 10;
    const cylY = row2Y + 17;
    const cylW = Math.max(16, modW - 20);
    const cylH = Math.max(14, row2H - 35);
    ctx.fillStyle = '#DFD7C8';
    roundRectPath(ctx, cylX, cylY, cylW, cylH, 10);
    ctx.fill();

    ctx.save();
    roundRectPath(ctx, cylX + 2, cylY + 2, cylW - 4, cylH - 4, 8);
    ctx.clip();
    const fillH = (cylH - 4) * pressRatio;
    const gasColor =
      state.tankPressureBar >= config.hydrogenTank.warningHighBar
        ? '#EF4444'
        : state.tankPressureBar >= 450
        ? '#F59E0B'
        : '#0EA5E9';
    ctx.fillStyle = gasColor;
    ctx.fillRect(cylX + 2, cylY + cylH - 2 - fillH, cylW - 4, fillH);
    ctx.restore();

    ctx.fillStyle = pressRatio > 0.55 ? '#FFFFFF' : '#334155';
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(pressRatio * 100)}%`,
      tankX + modW / 2,
      cylY + cylH / 2
    );

    ctx.fillStyle = tankCrit ? '#B91C1C' : '#1E293B';
    ctx.font = '700 9.5px "JetBrains Mono", monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `${Math.round(state.tankPressureBar)} / ${config.hydrogenTank.maxPressureBar} bar`,
      tankX + modW / 2,
      row2Y + row2H - 4
    );
    ctx.textBaseline = 'top';
  }

  // --- MODULE 5: OGNIWO PALIWOWE ---
  const fcActive = state.fuelCellKw > 0.1;
  ctx.fillStyle = fcActive ? '#FFFBEB' : '#EFE7D6';
  roundRectPath(ctx, fcX, row2Y, modW, row2H, 10);
  ctx.fill();
  ctx.strokeStyle = fcActive ? '#F59E0B' : '#D5C3A5';
  ctx.lineWidth = fcActive ? 1.8 : 1.2;
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.canvasFuelCell, fcX + modW / 2, row2Y + 4);

  const stackX = fcX + 14;
  const stackY = row2Y + 18;
  const stackW = Math.max(14, modW - 28);
  const stackH = Math.max(14, row2H - 36);
  for (let p = 0; p < 4; p++) {
    const py = stackY + (stackH * p) / 4;
    ctx.fillStyle = fcActive ? (p % 2 === 0 ? '#F59E0B' : '#FDE68A') : '#C7BBA6';
    roundRectPath(ctx, stackX, py, stackW, Math.max(3, stackH / 4 - 2.5), 2.5);
    ctx.fill();
  }

  ctx.fillStyle = fcActive ? '#B45309' : '#64748B';
  ctx.font = '600 9.5px "JetBrains Mono", monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${state.fuelCellKw.toFixed(1)} kW`, fcX + modW / 2, row2Y + row2H - 4);
  ctx.textBaseline = 'top';

  // Waste Heat label badge on the copper pipe
  if (state.wasteHeatKw > 0.1) {
    ctx.fillStyle = '#FFF1F2';
    roundRectPath(ctx, width * 0.42, heatPipeY - 7, 94, 14, 6);
    ctx.fill();
    ctx.fillStyle = '#BE123C';
    ctx.font = '600 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${t.canvasHeatRec} +${state.wasteHeatKw.toFixed(1)} kW`, width * 0.42 + 47, heatPipeY);
    ctx.textBaseline = 'top';
  }

  // =========================================================================
  // 5. ALL FLUFFY SHEEP (HIGHEST LAYER - above tiles, roof, and lawns!)
  // =========================================================================
  state.sheep.forEach((s) => {
    const sx = s.x * width;
    const sy = s.y * height;
    drawSheep(ctx, s, sx, sy);
  });

  // =========================================================================
  // 6. H2 EXPLOSION RADIAL BLAST OVERLAY
  // =========================================================================
  if (state.endingKey === 'h2_explosion') {
    const cx = tankX + modW / 2;
    const cy = row2Y + row2H / 2;
    const p = state.blastProgress;
    if (p < 0.95) {
      const r = 14 + p * 180;
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      grad.addColorStop(0, `rgba(255, 250, 210, ${1 - p})`);
      grad.addColorStop(0.45, `rgba(249, 115, 22, ${(1 - p) * 0.85})`);
      grad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    state.particles.forEach((pt) => {
      if (pt.kind === 'blast') {
        const bx = cx + (pt.x - 0.5) * 260;
        const by = cy + (pt.y - 0.5) * 260;
        const fade = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.fillStyle = `rgba(245, 110, 40, ${fade * 0.8})`;
        ctx.beginPath();
        ctx.arc(bx, by, pt.size * fade, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  ctx.restore();
}
