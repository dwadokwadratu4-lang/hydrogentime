// 100% Procedural Web Audio API Sound & Ambient Music Engine (zero external audio files)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private musicEnabled = true;
  private isAlarmActive = false;
  private isPausedOrOver = true;

  private alarmIntervalId: number | null = null;
  private musicIntervalId: number | null = null;
  private chordStep = 0;
  private lastSliderTickMs = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.14 : 0;
      this.musicGain.connect(this.masterGain);

      this.noiseBuffer = this.createWarmNoiseBuffer(this.ctx, 2.0);
    }
    return this.ctx;
  }

  private createWarmNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Slightly pink-tilted noise for warmer explosions & clicks
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 1.4;
    }
    return buffer;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // Play tiny silent buffer for strict iOS Safari audio unlock
    try {
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore if context is still initializing
    }

    this.ensureMusicLoop();
    this.updateMusicVolume();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    const ctx = this.ctx;
    if (ctx && this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(ctx.currentTime);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    }
    if (muted) {
      this.stopAlarmLoop();
    } else if (this.isAlarmActive && !this.isPausedOrOver) {
      this.startAlarmLoop();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    const ctx = this.ctx;
    if (ctx && this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(ctx.currentTime);
    }
    this.updateMusicVolume();
  }

  public setSimulationAudioState(isWarning: boolean, isPausedOrOver: boolean): void {
    const alarmChanged =
      this.isAlarmActive !== isWarning || this.isPausedOrOver !== isPausedOrOver;
    this.isAlarmActive = isWarning;
    this.isPausedOrOver = isPausedOrOver;

    if (alarmChanged) {
      this.updateMusicVolume();
      if (isWarning && !isPausedOrOver && !this.muted) {
        this.startAlarmLoop();
      } else {
        this.stopAlarmLoop();
      }
    }
  }

  private updateMusicVolume(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    let target = 0;
    if (this.musicEnabled && !this.muted) {
      if (this.isAlarmActive && !this.isPausedOrOver) {
        // Automatically duck ambient music during active alarm
        target = 0.025;
      } else if (this.isPausedOrOver) {
        target = 0.07;
      } else {
        target = 0.16;
      }
    }
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(target, now, target === 0 ? 0.08 : 0.35);
  }

  private ensureMusicLoop(): void {
    if (this.musicIntervalId !== null) return;
    this.scheduleAmbientChord();
    this.musicIntervalId = window.setInterval(() => {
      this.scheduleAmbientChord();
    }, 2600);
  }

  private scheduleAmbientChord(): void {
    if (!this.ctx || !this.musicGain || this.muted || !this.musicEnabled) return;
    if (this.ctx.state !== 'running') return;

    // Gentle acoustic-eco chord progression: Cmaj9 -> Am9 -> Fmaj7 -> G6
    const chords: number[][] = [
      [261.63, 329.63, 392.0, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 493.88], // Am9
      [174.61, 261.63, 329.63, 440.0], // Fmaj7
      [196.0, 293.66, 329.63, 493.88], // G6
    ];
    const chord = chords[this.chordStep % chords.length];
    this.chordStep = (this.chordStep + 1) % chords.length;

    const now = this.ctx.currentTime;
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.musicGain) return;
      const start = now + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, start);

      const peak = idx === 3 ? 0.07 : 0.11;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 2.75);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(start);
      osc.stop(start + 2.8);
    });
  }

  private startAlarmLoop(): void {
    if (this.alarmIntervalId !== null) return;
    this.playAlarmDoubleBeep();
    this.alarmIntervalId = window.setInterval(() => {
      this.playAlarmDoubleBeep();
    }, 1500);
  }

  private stopAlarmLoop(): void {
    if (this.alarmIntervalId !== null) {
      window.clearInterval(this.alarmIntervalId);
      this.alarmIntervalId = null;
    }
  }

  private playAlarmDoubleBeep(): void {
    if (this.muted || !this.isAlarmActive || this.isPausedOrOver) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const notes = [784, 659.25]; // G5 -> E5 soft dispatch pulse
    notes.forEach((freq, i) => {
      if (!this.sfxGain) return;
      const start = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  // Interactive sheep tap: funny vibrato sawtooth "beee" or gentle shepherd bell
  public playSheepReaction(sheepScale = 1): 'baa' | 'bell' {
    this.unlock();
    const choice: 'baa' | 'bell' = Math.random() < 0.66 ? 'baa' : 'bell';
    if (choice === 'baa') {
      this.playSheepBaa(1 / Math.max(0.8, Math.min(1.15, sheepScale)), 0);
    } else {
      this.playShepherdBell();
    }
    return choice;
  }

  public playSheepBaa(pitchFactor = 1, delaySec = 0, volumeScale = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});

    const now = ctx.currentTime + delaySec;
    const dur = 0.36 + Math.random() * 0.1;
    const baseFreq = (205 + Math.random() * 45) * pitchFactor;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 1.08, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, now + dur);

    // Classic sheep bleat vibrato (15-18 Hz wobble)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(16 + Math.random() * 3, now);
    lfoGain.gain.setValueAtTime(16, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Vocal tract bandpass/lowpass formant
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.linearRampToValueAtTime(680, now + dur);
    filter.Q.setValueAtTime(2.2, now);

    const env = ctx.createGain();
    const peak = 0.17 * volumeScale;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.03);
    env.gain.setValueAtTime(peak * 0.85, now + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + dur + 0.02);
    osc.stop(now + dur + 0.02);
  }

  public playShepherdBell(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const strikes = [0, 0.11];
    const basePitch = 1046.5 * (0.95 + Math.random() * 0.12); // ~C6

    strikes.forEach((offset, idx) => {
      if (!this.sfxGain) return;
      const t = now + offset;
      const partials = [
        { mult: 1.0, gain: idx === 0 ? 0.11 : 0.075, decay: 0.45 },
        { mult: 2.38, gain: idx === 0 ? 0.04 : 0.025, decay: 0.22 },
      ];
      partials.forEach((p) => {
        if (!this.sfxGain) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(basePitch * p.mult, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(p.gain, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.decay);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + p.decay + 0.02);
      });
    });
  }

  // Crisp mechanical switch click for control deck buttons
  public playSwitchClick(pitchMod = 1): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;

    // Short resonant mechanical thump
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240 * pitchMod, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.026);
    oscGain.gain.setValueAtTime(0.11, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.035);

    // Tactile click transient from noise buffer
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200 * pitchMod, now);
      bp.Q.setValueAtTime(2.5, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.08, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      noise.connect(bp);
      bp.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now, Math.random() * 0.5, 0.02);
    }
  }

  // Rate-limited soft mechanical notch for speed slider
  public playSliderTick(): void {
    const nowMs = performance.now();
    if (nowMs - this.lastSliderTickMs < 48) return;
    this.lastSliderTickMs = nowMs;
    this.playSwitchClick(1.35);
  }

  // Short gentle electric arc snap inside Electrolyzer
  public playElectrolyzerSpark(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    if (ctx.state !== 'running') return;

    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(3600, now);
      bp.Q.setValueAtTime(3.0, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.11, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      noise.connect(bp);
      bp.connect(g);
      g.connect(this.sfxGain);
      noise.start(now, Math.random() * 0.7, 0.065);
    }

    // Subtle high zap chirp
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.038);
    oGain.gain.setValueAtTime(0.045, now);
    oGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.048);
  }

  // H2 Tank explosion + chorus of fleeing sheep
  public playExplosion(): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;

    // 1. Deep filtered noise blast
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1100, now);
      lp.frequency.exponentialRampToValueAtTime(48, now + 1.55);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.001, now);
      nGain.gain.linearRampToValueAtTime(0.55, now + 0.025);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

      noise.connect(lp);
      lp.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now, 0, 1.75);
    }

    // 2. Sub-bass shockwave punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(125, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 0.85);
    subGain.gain.setValueAtTime(0.42, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.95);

    // 3. Panicked fleeing sheep chorus
    this.playSheepBaa(1.18, 0.16, 0.85);
    this.playSheepBaa(0.95, 0.28, 0.8);
    this.playSheepBaa(1.28, 0.41, 0.75);
    this.playSheepBaa(1.04, 0.56, 0.7);
  }

  // Bus overvoltage electrical spark crackle
  public playOvervoltage(): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;
    const sparkTimes = [0, 0.07, 0.13, 0.22, 0.31, 0.42];
    sparkTimes.forEach((dt, idx) => {
      if (!this.sfxGain || !this.noiseBuffer) return;
      const t = now + dt;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2600 + idx * 450, t);
      hp.Q.setValueAtTime(3.2, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

      src.connect(hp);
      hp.connect(g);
      g.connect(this.sfxGain);
      src.start(t, Math.random() * 0.8, 0.07);
    });

    // Brief electrical 120Hz arc buzz
    const buzz = ctx.createOscillator();
    const bGain = ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(140, now);
    buzz.frequency.linearRampToValueAtTime(95, now + 0.5);
    bGain.gain.setValueAtTime(0.11, now);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    buzz.connect(bGain);
    bGain.connect(this.sfxGain);
    buzz.start(now);
    buzz.stop(now + 0.58);
  }

  // Blackout power-down falling pitch sweep
  public playBlackout(): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;
    this.playSwitchClick(0.65);

    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.95);

    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, now);
    lp.frequency.exponentialRampToValueAtTime(120, now + 0.95);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.05);
  }

  // Thermal crisis audio cue (frosty chime or heat drop)
  public playThermalCrisis(isCold: boolean): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;
    const freqs = isCold ? [987.77, 783.99, 523.25] : [440, 349.23, 261.63];
    freqs.forEach((f, idx) => {
      if (!this.sfxGain) return;
      const t = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = isCold ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  // Optimistic victory / record / profit chord fanfare
  public playFanfare(): void {
    this.unlock();
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const now = ctx.currentTime;
    // Uplifting major9 arpeggiated fanfare: C5 -> E5 -> G5 -> C6
    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.45, gain: 0.13 },
      { freq: 659.25, delay: 0.09, dur: 0.45, gain: 0.13 },
      { freq: 783.99, delay: 0.18, dur: 0.55, gain: 0.14 },
      { freq: 1046.5, delay: 0.27, dur: 0.85, gain: 0.16 },
      { freq: 587.33, delay: 0.27, dur: 0.85, gain: 0.07 }, // warm D5 color
    ];

    notes.forEach((n) => {
      if (!this.sfxGain) return;
      const t = now + n.delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, t);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(n.gain, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + n.dur + 0.03);
    });
  }
}

export const soundEngine = new SoundEngine();
