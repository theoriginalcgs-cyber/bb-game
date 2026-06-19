/**
 * StormMusic — procedural boss music for Storm fight
 * Dark, ominous, dramatic — built entirely with Web Audio API.
 * Layers: deep drone, pulsing arpeggio, thunder percussion, haunting melody, lightning crackle.
 */
export class StormMusic {
    constructor() {
        this.ctx        = null;
        this.master     = null;
        this.running    = false;
        this._timers    = [];
        this._droneOscs = [];
        this._reverbBuf = null;
    }

    start() {
        if (this.running) return;
        try {
            this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }

        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        // Fade in over 1.5s
        this.master.gain.linearRampToValueAtTime(0.72, this.ctx.currentTime + 1.5);

        this.running    = true;
        this._reverbBuf = this._makeReverbBuffer(2.2);

        this._startDrone();
        this._startArpeggio();
        this._startPercussion();
        this._startMelody();
        this._startCrackle();
    }

    stop() {
        if (!this.running) return;
        this.running = false;

        this._timers.forEach(t => clearTimeout(t));
        this._timers = [];

        if (this.ctx && this.master) {
            // Fade out
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        }
        this._droneOscs.forEach(o => { try { o.stop(); } catch (_) {} });
        this._droneOscs = [];

        const ctx = this.ctx;
        this.ctx = null;
        this.master = null;
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1500);
    }

    // ── internals ────────────────────────────────────────────────────────────

    _after(ms, fn) {
        if (!this.running) return;
        const id = setTimeout(() => { if (this.running) fn(); }, ms);
        this._timers.push(id);
    }

    _rnd(a, b) { return a + Math.random() * (b - a); }

    // ── LAYER 1: Deep rumbling drone (D1 + D2, sawtooth, slow tremolo) ──────
    _startDrone() {
        if (!this.ctx) return;

        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 280;
        filt.Q.value = 0.8;

        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.22;

        // Slow tremolo LFO
        const lfo  = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.35;
        lfoG.gain.value = 0.07;
        lfo.connect(lfoG);
        lfoG.connect(droneGain.gain);

        // Two detuned oscillators for thickness
        [36.71, 73.5, 55.0].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = i === 2 ? -8 : 0;
            osc.connect(filt);
            osc.start();
            this._droneOscs.push(osc);
        });
        lfo.start();
        this._droneOscs.push(lfo);

        filt.connect(droneGain);
        droneGain.connect(this.master);
    }

    // ── LAYER 2: Pulsing minor arpeggio (D minor, 8th notes at ~84 BPM) ─────
    _startArpeggio() {
        // D minor: D3 F3 A3 C4 A3 F3 — dark and relentless
        const notes  = [146.83, 174.61, 220.00, 261.63, 220.00, 174.61];
        const eighth = 714; // ms — 84 BPM
        let step = 0;

        const tick = () => {
            if (!this.running) return;
            this._arpNote(notes[step % notes.length], eighth / 1000 * 0.82);
            step++;
            this._after(eighth, tick);
        };
        tick();
    }

    _arpNote(freq, dur) {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;
        const osc  = this.ctx.createOscillator();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = freq;
        filt.type = 'bandpass';
        filt.frequency.value = freq * 2.2;
        filt.Q.value = 4;

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.10, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + dur + 0.05);
    }

    // ── LAYER 3: Thunder/kick percussion ─────────────────────────────────────
    _startPercussion() {
        const beat = 714; // match arp tempo
        let b = 0;

        const tick = () => {
            if (!this.running) return;
            if (b % 4 === 0) this._kick(0.55);      // beat 1: heavy
            if (b % 4 === 2) this._kick(0.28);      // beat 3: lighter
            if (b % 16 === 0) this._thunder(0.45);  // thunder every 4 bars
            if (b % 32 === 8) this._thunder(0.25);  // off-beat thunder hit
            b++;
            this._after(beat, tick);
        };
        tick();
    }

    _kick(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.14);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    _thunder(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 2.8, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();

        filt.type = 'lowpass';
        filt.frequency.value = 160;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 2.8);
    }

    // ── LAYER 4: Haunting melody (sparse, sustained, D minor) ────────────────
    _startMelody() {
        // D4 → C4 → Bb3 → A3 → G3 → A3 → C4 → D4 (held)
        const phrases = [
            [293.66, 1500],
            [261.63, 1100],
            [233.08, 1300],
            [220.00, 1800],
            [196.00,  700],
            [220.00, 2200],
            [261.63, 1600],
            [293.66, 3200],
        ];
        let idx = 0;

        const tick = () => {
            if (!this.running) return;
            const [freq, ms] = phrases[idx % phrases.length];
            idx++;
            this._melodyNote(freq, ms / 1000);
            this._after(ms + 180, tick);
        };
        // Wait 2 full bars for drone + arpeggio to establish first
        this._after(2856, tick);
    }

    _melodyNote(freq, dur) {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;

        const playOsc = (f, type, detune, vol) => {
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            const rev = this._reverb(0.28);
            osc.type = type;
            osc.frequency.value = f;
            osc.detune.value = detune;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(vol, now + 0.18);
            g.gain.setValueAtTime(vol, now + dur - 0.35);
            g.gain.linearRampToValueAtTime(0, now + dur);
            osc.connect(g);
            g.connect(this.master);
            if (rev) { g.connect(rev); rev.connect(this.master); }
            osc.start(now);
            osc.stop(now + dur + 0.1);
        };

        playOsc(freq,       'sine',     0,   0.16);
        playOsc(freq,       'triangle', 3,   0.08); // slight detune layer
        playOsc(freq * 0.5, 'sine',     0,   0.06); // sub octave
    }

    // ── LAYER 5: Random lightning crackle ────────────────────────────────────
    _startCrackle() {
        const tick = () => {
            if (!this.running) return;
            this._crackle();
            this._after(this._rnd(900, 3800), tick);
        };
        this._after(800, tick);
    }

    _crackle() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = this._rnd(0.04, 0.13);
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.3, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();

        filt.type = 'highpass';
        filt.frequency.value = this._rnd(3500, 9000);
        g.gain.setValueAtTime(this._rnd(0.08, 0.18), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 0.35);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _makeReverbBuffer(seconds) {
        if (!this.ctx) return null;
        const sr  = this.ctx.sampleRate;
        const len = sr * seconds;
        const buf = this.ctx.createBuffer(2, len, sr);
        for (let c = 0; c < 2; c++) {
            const d = buf.getChannelData(c);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
            }
        }
        return buf;
    }

    _reverb(wetGain) {
        if (!this.ctx || !this._reverbBuf) return null;
        const conv = this.ctx.createConvolver();
        conv.buffer = this._reverbBuf;
        const g = this.ctx.createGain();
        g.gain.value = wetGain;
        conv.connect(g);
        return conv;
    }
}
