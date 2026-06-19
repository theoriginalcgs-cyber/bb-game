/**
 * PhantomMusic — procedural boss music for Phantom fight
 * Eerie, haunting, dissonant — sustained tritone drones, ghostly whispers,
 * irregular heartbeat, sparse high-register melody, and spectral stings.
 * Built entirely with Web Audio API.
 */
export class PhantomMusic {
    constructor() {
        this.ctx     = null;
        this.master  = null;
        this.running = false;
        this._timers = [];
        this._drones = [];
    }

    start() {
        if (this.running) return;
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return; }

        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.master.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 2.2);

        this.running = true;

        this._startDrone();
        this._startHeartbeat();
        this._startWhispers();
        this._startMelody();
        this._startStings();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        this._timers.forEach(t => clearTimeout(t));
        this._timers = [];

        if (this.ctx && this.master) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.45);
        }
        this._drones.forEach(o => { try { o.stop(); } catch (_) {} });
        this._drones = [];

        const ctx = this.ctx;
        this.ctx  = null;
        this.master = null;
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1500);
    }

    _after(ms, fn) {
        if (!this.running) return;
        const id = setTimeout(() => { if (this.running) fn(); }, ms);
        this._timers.push(id);
    }

    _rnd(a, b) { return a + Math.random() * (b - a); }

    // ── LAYER 1: Dissonant tritone drone — B2 + F3 (diabolus in musica) ─────
    _startDrone() {
        if (!this.ctx) return;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 480;
        filt.Q.value = 0.7;

        const g = this.ctx.createGain();
        g.gain.value = 0.17;

        // Slow LFO for pitch drift — makes the dissonance breathe
        const lfo  = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoG.gain.value = 1.4;
        lfo.connect(lfoG);
        lfo.start();
        this._drones.push(lfo);

        // Tritone pair: B2 (123.47 Hz) + F3 (174.61 Hz) — maximum dissonance
        // Plus a low root A2 (110 Hz) for grounding the horror
        [123.47, 174.61, 110.0, 92.5].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = i >= 2 ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            osc.detune.value = i === 1 ? 3 : (i === 0 ? -3 : 0);
            lfoG.connect(osc.frequency);
            osc.connect(filt);
            osc.start();
            this._drones.push(osc);
        });

        filt.connect(g);
        g.connect(this.master);
    }

    // ── LAYER 2: Irregular heartbeat — slow, skips beats ────────────────────
    _startHeartbeat() {
        const tick = () => {
            if (!this.running) return;
            this._pulse(0.50);
            this._after(220, () => this._pulse(0.32));
            // Irregular interval — sometimes it skips, sometimes rapid
            const next = Math.random() < 0.2
                ? this._rnd(300, 550)     // rare: double-time panic
                : this._rnd(1300, 2400);  // normal: slow irregular thud
            this._after(next, tick);
        };
        this._after(1200, tick);
    }

    _pulse(vol) {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;
        const osc  = this.ctx.createOscillator();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'lowpass';
        filt.frequency.value = 85;
        osc.frequency.setValueAtTime(62, now);
        osc.frequency.exponentialRampToValueAtTime(26, now + 0.28);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.46);
    }

    // ── LAYER 3: Ghostly whisper noise bursts ────────────────────────────────
    _startWhispers() {
        const tick = () => {
            if (!this.running) return;
            this._whisper();
            this._after(this._rnd(700, 3000), tick);
        };
        this._after(600, tick);
    }

    _whisper() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = this._rnd(0.25, 1.1);
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, Math.ceil(sr * 1.5), sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();

        filt.type = 'bandpass';
        filt.frequency.value = this._rnd(1800, 6500);
        filt.Q.value = 9;

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(this._rnd(0.04, 0.08), now + dur * 0.25);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + dur + 0.12);
    }

    // ── LAYER 4: Sparse haunting melody — E minor descending, very slow ──────
    _startMelody() {
        // E minor scale descending: E5 D5 B4 A4 G4 E4 — long sustained notes
        const notes = [
            [659.25, 2400],  // E5 — starts high, ethereal
            [587.33, 1900],  // D5
            [493.88, 2800],  // B4 — dramatic hold
            [440.00, 2100],  // A4
            [392.00, 1600],  // G4
            [440.00, 3200],  // A4 — linger
            [329.63, 4200],  // E4 — low, unresolved cadence
        ];
        let idx = 0;

        const tick = () => {
            if (!this.running) return;
            const [freq, ms] = notes[idx % notes.length];
            idx++;
            this._melodyNote(freq, ms / 1000);
            this._after(ms + 380, tick);
        };
        this._after(3500, tick);  // delayed intro for atmosphere buildup
    }

    _melodyNote(freq, dur) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Ethereal pure sine with subtle vibrato and octave reinforcement
        const osc    = this.ctx.createOscillator();
        const vibLfo = this.ctx.createOscillator();
        const vibG   = this.ctx.createGain();
        const filt   = this.ctx.createBiquadFilter();
        const g      = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;
        filt.type = 'peaking';
        filt.frequency.value = freq;
        filt.gain.value = 3;

        vibLfo.frequency.value = 4.2;
        vibG.gain.value = 2.2;
        vibLfo.connect(vibG);
        vibG.connect(osc.frequency);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.10, now + 0.35);
        g.gain.setValueAtTime(0.08, now + dur - 0.5);
        g.gain.linearRampToValueAtTime(0, now + dur);

        osc.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        osc.start(now);
        vibLfo.start(now);
        osc.stop(now + dur + 0.12);
        vibLfo.stop(now + dur + 0.12);

        // Subtle octave shadow below — thickens the haunting feel
        const osc2 = this.ctx.createOscillator();
        const g2   = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 0.5;
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.045, now + 0.5);
        g2.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.75);
        osc2.connect(g2);
        g2.connect(this.master);
        osc2.start(now);
        osc2.stop(now + dur);
    }

    // ── LAYER 5: Spectral stings — brief high-pitched intrusions ─────────────
    _startStings() {
        const tick = () => {
            if (!this.running) return;
            if (Math.random() < 0.60) this._sting();
            this._after(this._rnd(2200, 6800), tick);
        };
        this._after(1800, tick);
    }

    _sting() {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;
        const freq = this._rnd(1400, 4200);
        const dur  = this._rnd(0.04, 0.22);

        const osc  = this.ctx.createOscillator();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + dur);
        filt.type = 'highpass';
        filt.frequency.value = 1100;

        g.gain.setValueAtTime(this._rnd(0.04, 0.09), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + dur + 0.06);
    }
}
