/**
 * Calm background piano for the gallery.
 *
 * If a file exists at /audio/ambient.mp3 it is looped. Otherwise an original,
 * gently generated piano piece is played with the Web Audio API, so there are
 * no licensing concerns and nothing extra to download.
 *
 * Browsers only allow sound after a click, so start() is called from the
 * ENTER GALLERY button.
 */

const FILE_URL = "/audio/ambient.mp3";
const VOLUME = 0.32;
const PREF_KEY = "csg-music-off";

type Listener = (playing: boolean) => void;

// Chord progression (MIDI note numbers), 4 beats each: Cmaj7 · Am7 · Fmaj7 · G6sus
const PROGRESSION: { bass: number; tones: number[] }[] = [
  { bass: 48, tones: [60, 64, 67, 71] },
  { bass: 45, tones: [57, 60, 64, 67] },
  { bass: 41, tones: [57, 60, 64, 65] },
  { bass: 43, tones: [55, 59, 62, 64] },
];
const MELODY_SCALE = [72, 74, 76, 79, 81, 84]; // C major pentatonic, upper register
const BEAT = 60 / 62; // seconds per beat (≈62 bpm)

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private audioEl: HTMLAudioElement | null = null;
  private useFile: boolean | null = null;
  private listeners = new Set<Listener>();
  playing = false;

  /** Whether the visitor previously turned music off. */
  get prefersOff(): boolean {
    try {
      return localStorage.getItem(PREF_KEY) === "1";
    } catch {
      return false;
    }
  }

  private savePref(off: boolean) {
    try {
      localStorage.setItem(PREF_KEY, off ? "1" : "0");
    } catch {}
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.playing));
  }

  /** Call from a click handler. Respects the visitor's saved preference unless forced. */
  async start(force = false) {
    if (this.playing) return;
    if (!force && this.prefersOff) return;
    this.playing = true;
    this.emit();
    if (force) this.savePref(false);

    if (this.useFile === null) {
      // Create the audio context inside the click, before any await, so the browser allows it.
      this.ensureContext();
      this.useFile = await fetch(FILE_URL, { method: "HEAD" })
        .then((r) => r.ok && (r.headers.get("content-type") ?? "").startsWith("audio"))
        .catch(() => false);
    }
    if (!this.playing) return;

    if (this.useFile) {
      if (!this.audioEl) {
        this.audioEl = new Audio(FILE_URL);
        this.audioEl.loop = true;
        this.audioEl.volume = 0;
      }
      try {
        await this.audioEl.play();
        this.fadeElement(VOLUME + 0.2);
      } catch {
        this.playing = false;
        this.emit();
      }
      return;
    }

    const ctx = this.ensureContext();
    await ctx.resume();
    const now = ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(this.master!.gain.value, now);
    this.master!.gain.linearRampToValueAtTime(VOLUME, now + 2.5);
    this.nextBeatTime = now + 0.15;
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stop(remember = false) {
    if (remember) this.savePref(true);
    if (!this.playing) return;
    this.playing = false;
    this.emit();
    if (this.useFile && this.audioEl) {
      this.fadeElement(0, () => this.audioEl?.pause());
      return;
    }
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.8);
      const ctx = this.ctx;
      setTimeout(() => {
        if (!this.playing) void ctx.suspend();
      }, 900);
    }
  }

  toggle() {
    if (this.playing) this.stop(true);
    else void this.start(true);
  }

  private fadeElement(target: number, done?: () => void) {
    const el = this.audioEl!;
    const startVol = el.volume;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 1500);
      el.volume = startVol + (target - startVol) * k;
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    requestAnimationFrame(step);
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Soft hall reverb from a generated impulse response
    const reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 3.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    this.ctx = ctx;
    this.master = master;
    this.reverb = reverb;
    return ctx;
  }

  /** One soft piano-like note: a few sine partials with a quick attack and long decay. */
  private note(midi: number, time: number, velocity: number, length = 3.2) {
    const ctx = this.ctx!;
    const freq = midiToHz(midi);
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(4200, freq * 7), time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 2), time + length);
    filter.connect(out);
    out.connect(this.master!);
    out.connect(this.reverb!);

    const peak = 0.16 * velocity;
    out.gain.setValueAtTime(0.0001, time);
    out.gain.exponentialRampToValueAtTime(peak, time + 0.012);
    out.gain.exponentialRampToValueAtTime(peak * 0.35, time + 0.45);
    out.gain.exponentialRampToValueAtTime(0.0001, time + length);

    const partials: [number, number][] = [
      [1, 1],
      [2, 0.32],
      [3, 0.1],
      [4, 0.04],
    ];
    for (const [mult, amp] of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * mult * (1 + (Math.random() - 0.5) * 0.0016);
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(filter);
      osc.start(time);
      osc.stop(time + length + 0.1);
    }
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    while (this.nextBeatTime < ctx.currentTime + 1.2) {
      const t = this.nextBeatTime;
      const bar = Math.floor(this.beatIndex / 4);
      const beat = this.beatIndex % 4;
      const chord = PROGRESSION[bar % PROGRESSION.length];
      const human = () => (Math.random() - 0.5) * 0.03;

      if (beat === 0) {
        this.note(chord.bass, t + human(), 0.75, 4.5);
        this.note(chord.bass + 12, t + 0.02 + human(), 0.35, 4);
      }
      if (beat === 2 && Math.random() < 0.6) this.note(chord.bass + 7, t + human(), 0.35, 3);

      // gentle broken-chord on the off-beats
      const tones = chord.tones;
      this.note(tones[(beat * 2) % tones.length], t + BEAT * 0.5 + human(), 0.38 + Math.random() * 0.1, 3);
      if (Math.random() < 0.45) this.note(tones[(beat * 2 + 1) % tones.length], t + BEAT * 0.75 + human(), 0.28, 2.6);

      // a sparse melody that drifts above
      if ((beat === 0 || beat === 2) && Math.random() < 0.55) {
        const options = MELODY_SCALE.filter((m) => tones.some((c) => (m - c) % 12 === 0) || Math.random() < 0.3);
        const m = options[Math.floor(Math.random() * options.length)] ?? 76;
        this.note(m, t + human(), 0.42, 3.8);
      }

      this.nextBeatTime += BEAT;
      this.beatIndex++;
    }
  }
}

export const ambientMusic = new AmbientMusic();
