// Europa Clipper mug explainer: music and small sound effects.
// Plays the track named in audio/tracks.json ({theme, title, themeLoop:[start,end]}), looped sample-accurately between the loop points.
// There is no generative fallback: if the JSON or the mp3 is missing or will not decode, the site stays silent and the button says "No music".
// Nothing is decoded until the first tap or key press, and only if sound is on.

const store = {
  get(k, d) { try { const v = localStorage.getItem('cm-' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cm-' + k, v); } catch (e) { /* storage blocked: fine */ } },
};

export class Sound {
  constructor() {
    this.on = store.get('sound', 'on') === 'on';
    this.started = false;
    this.ctx = null;
    this.available = null;          // null = not known yet, true / false after tracks.json was read
    this.title = '';
    this.listeners = new Set();
    this.list = fetch('audio/tracks.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => {
      this.meta = j && j.theme ? j : null;
      this.available = !!this.meta; this.title = this.meta ? this.meta.title || '' : '';
      this.listeners.forEach((f) => f(this.on));
    });
    const kick = () => { if (this.on) this.start(); };
    addEventListener('pointerdown', kick, { once: true, capture: true });
    addEventListener('keydown', kick, { once: true, capture: true });
    document.addEventListener('visibilitychange', () => this.duck(document.hidden));
  }
  onChange(fn) { this.listeners.add(fn); fn(this.on); }
  toggle() { if (this.available === false) return; this.set(!this.on); }
  set(on) {
    this.on = on; store.set('sound', on ? 'on' : 'off');
    if (on) this.start();
    this.fade(on ? 1 : 0);
    this.listeners.forEach((f) => f(on));
  }
  async start() {
    if (this.started) { this.fade(this.on ? 1 : 0); return; }
    this.started = true;
    await this.list;
    if (!this.meta) return;                               // no track: stay silent
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { this.fail(); return; }
    try {
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.55; this.sfxBus.connect(this.master);
      const res = await fetch('audio/' + this.meta.theme);
      if (!res.ok) throw new Error('no file');
      // decoded and looped sample-accurately: <audio loop> leaves a gap at MP3 padding
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const src = (this.src = ctx.createBufferSource()); src.buffer = buf; src.loop = true;
      const lp = this.meta.themeLoop;
      if (lp && lp.length === 2 && lp[1] > lp[0] && lp[1] <= buf.duration + 0.01) { src.loopStart = lp[0]; src.loopEnd = Math.min(lp[1], buf.duration); }
      const g = ctx.createGain(); g.gain.value = 0.9;
      src.connect(g); g.connect(this.master); src.start();
      this.fade(this.on ? 1 : 0, 2.5);
    } catch (e) { this.fail(); }
  }
  fail() { this.meta = null; this.available = false; if (this.ctx) { try { this.ctx.close(); } catch (e) { /* fine */ } this.ctx = null; } this.listeners.forEach((f) => f(this.on)); }
  fade(to, sec = 0.6) {
    if (!this.ctx) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    if (to > 0 && this.ctx.state === 'suspended') this.ctx.resume();
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to * 0.4, t + sec);
  }
  duck(hidden) { if (!this.ctx) return; if (hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume(); }

  /* small effects: they only exist while music is on and loaded */
  sfx(kind) {
    if (!this.on || !this.ctx || !this.sfxBus) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const tone = (f, dur, v, type = 'sine', at = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(v, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g); g.connect(this.sfxBus); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    if (kind === 'press') tone(523.25, 0.12, 0.12, 'triangle');
    else if (kind === 'flip') { tone(659.25, 0.08, 0.08, 'square'); tone(493.88, 0.1, 0.06, 'square', 0.05); }
    else if (kind === 'step') tone(783.99, 0.18, 0.05, 'sine');
  }
}
