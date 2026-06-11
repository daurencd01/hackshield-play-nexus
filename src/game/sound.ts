// Tiny procedural SFX engine (Web Audio API) — no external audio files.
// Must be init()'d from a user gesture (e.g. the "start mission" button).

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private alarmTimer: number | null = null;
  private muted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopAlarm();
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number) {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  pickup() { this.tone(660, 0.07, 'square', 0.2); setTimeout(() => this.tone(990, 0.1, 'square', 0.2), 60); }
  hack() { this.tone(420, 0.06, 'sawtooth', 0.18); setTimeout(() => this.tone(840, 0.12, 'sawtooth', 0.2), 55); }
  deny() { this.tone(220, 0.2, 'sawtooth', 0.28, 90); }
  detect() { this.tone(880, 0.08, 'square', 0.25); setTimeout(() => this.tone(660, 0.12, 'square', 0.22), 80); }
  success() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'triangle', 0.28), i * 110)); }
  fail() { this.tone(330, 0.5, 'sawtooth', 0.3, 90); setTimeout(() => this.tone(160, 0.6, 'sawtooth', 0.3, 70), 120); }

  startAlarm() {
    if (this.alarmTimer || this.muted) return;
    this.init();
    const beep = () => this.tone(740, 0.28, 'sawtooth', 0.2, 520);
    beep();
    this.alarmTimer = window.setInterval(beep, 620);
  }
  stopAlarm() {
    if (this.alarmTimer) { clearInterval(this.alarmTimer); this.alarmTimer = null; }
  }
}

export const sfx = new Sfx();
