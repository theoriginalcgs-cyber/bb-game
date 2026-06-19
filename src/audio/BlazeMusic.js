/**
 * BlazeMusic — procedural boss music for Blaze fight
 * Fiery electric guitar tones, synthesizer fire, aggressive riff-driven energy.
 * Built entirely with Web Audio API.
 */
export class BlazeMusic {
    constructor() {
        this.ctx        = null;
        this.master     = null;
        this.running    = false;
        this._timers    = [];
        this._drones    = [];
    }

    start() {
        if (this.running) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }

        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.master.gain.linearRampToValueAtTime(0.75, this.ctx.currentTime + 1.4);

        this.running = true;

        this._startDrums();
        this._startGuitarRiff();
        this._startSynthLead();
        this._startBassDrive();
        this._startFlameCrackle();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        this._timers.forEach(t => clearTimeout(t));
        this._timers = [];

        if (this.ctx && this.master) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.32);
        }
        this._drones.forEach(o => { try { o.stop(); } catch (_) {} });
        this._drones = [];

        const ctx = this.ctx;
        this.ctx = null;
        this.master = null;
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1200);
    }

    _after(ms, fn) {
        if (!this.running) return;
        const id = setTimeout(() => { if (this.running) fn(); }, ms);
        this._timers.push(id);
    }

    _rnd(a, b) { return a + Math.random() * (b - a); }

    // ── LAYER 1: Rock drum pattern (fast + aggressive) ───────────────────────
    _startDrums() {
        const BPM  = 168;
        const sixteenth = (60 / BPM) * 1000 / 4;   // ~89ms
        let step = 0;

        // K=kick S=snare H=hihat O=open-hat
        //  K H . H S H K H K H S H . H S H
        const pat = ['K','H','.','H','S','H','K','H','K','H','S','H','.','H','S','H'];

        const tick = () => {
            if (!this.running) return;
            const p = pat[step % pat.length];
            if (p === 'K') this._kick(step % 16 === 0 ? 0.7 : 0.5);
            if (p === 'S') this._snare(0.5);
            if (p === 'H') this._hihat(0.18);
            if (p === 'O') this._hihat(0.26);
            step++;
            this._after(sixteenth, tick);
        };
        tick();
    }

    _kick(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.32);
    }

    _snare(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.2, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = 2400;
        filt.Q.value = 0.7;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 0.22);

        const osc = this.ctx.createOscillator();
        const og  = this.ctx.createGain();
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);
        og.gain.setValueAtTime(vol * 0.7, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(og);
        og.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.12);
    }

    _hihat(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.05, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'highpass';
        filt.frequency.value = 8000;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 0.06);
    }

    // ── LAYER 2: Distorted "electric guitar" riff ────────────────────────────
    _startGuitarRiff() {
        // A minor pentatonic riff: A2 C3 D3 E3 G3 — aggressive feel
        const riff = [
            [110.0, 200], [110.0, 150], [130.8, 200],
            [146.8, 300], [164.8, 150], [146.8, 150],
            [130.8, 200], [110.0, 400],
            [110.0, 150], [123.5, 150], [130.8, 300],
            [164.8, 200], [130.8, 150], [110.0, 700],
        ];
        let idx = 0;

        const tick = () => {
            if (!this.running) return;
            const [freq, ms] = riff[idx % riff.length];
            idx++;
            this._guitarNote(freq, ms / 1000);
            this._after(ms + 18, tick);
        };
        this._after(100, tick);
    }

    _guitarNote(freq, dur) {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;

        // Distortion chain
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(420);
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'peaking';
        filt.frequency.value = 2200;
        filt.gain.value = 8;

        [freq, freq * 1.498, freq * 2.0].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type = i === 2 ? 'triangle' : 'sawtooth';
            osc.frequency.value = f;
            osc.detune.value = i * 5 - 4;

            const vol = i === 0 ? 0.16 : i === 1 ? 0.10 : 0.05;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(vol, now + 0.018);
            g.gain.setValueAtTime(vol * 0.85, now + dur * 0.6);
            g.gain.linearRampToValueAtTime(0, now + dur);

            osc.connect(dist);
            dist.connect(filt);
            filt.connect(g);
            g.connect(this.master);
            osc.start(now);
            osc.stop(now + dur + 0.04);
        });
    }

    // ── LAYER 3: Fiery synth lead (higher register) ─────────────────────────
    _startSynthLead() {
        // Synth line weaves above the guitar — A4 E5 style
        const lead = [
            [440.0, 600], [494.0, 400],
            [523.3, 800], [440.0, 400],
            [392.0, 600], [440.0, 200], [392.0, 1000],
            [440.0, 400], [523.3, 400], [587.3, 800],
            [523.3, 400], [440.0, 1600],
        ];
        let idx = 0;

        const tick = () => {
            if (!this.running) return;
            const [freq, ms] = lead[idx % lead.length];
            idx++;
            this._synthNote(freq, ms / 1000);
            this._after(ms + 12, tick);
        };
        this._after(2400, tick);  // offset to avoid clashing with guitar start
    }

    _synthNote(freq, dur) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Bright square wave with vibrato
        const osc  = this.ctx.createOscillator();
        const lfo  = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        const g    = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.value = freq;
        lfo.frequency.value = 5.8;
        lfoG.gain.value = 4;
        filt.type = 'lowpass';
        filt.frequency.value = 3200;
        filt.Q.value = 1.4;

        // Pitch bend up on attack
        osc.frequency.setValueAtTime(freq * 0.96, now);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.06);

        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.12, now + 0.04);
        g.gain.setValueAtTime(0.10, now + dur - 0.08);
        g.gain.linearRampToValueAtTime(0, now + dur);

        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        osc.connect(filt);
        filt.connect(g);
        g.connect(this.master);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + dur + 0.05);
        lfo.stop(now + dur + 0.05);
    }

    // ── LAYER 4: Bass drive (low-end synth bass line) ───────────────────────
    _startBassDrive() {
        if (!this.ctx) return;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 220;
        filt.Q.value = 1.0;

        const g   = this.ctx.createGain();
        g.gain.value = 0.24;
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(200);

        [55.0, 110.0].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = i === 0 ? -3 : 5;
            osc.connect(filt);
            osc.start();
            this._drones.push(osc);
        });

        filt.connect(dist);
        dist.connect(g);
        g.connect(this.master);
    }

    // ── LAYER 5: Fire crackle / pyro hiss ──────────────────────────────────
    _startFlameCrackle() {
        const tick = () => {
            if (!this.running) return;
            this._flame();
            this._after(this._rnd(600, 2200), tick);
        };
        this._after(400, tick);
    }

    _flame() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = this._rnd(0.08, 0.28);
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.4, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = this._rnd(800, 4000);
        filt.Q.value = 2;
        g.gain.setValueAtTime(this._rnd(0.06, 0.15), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + dur + 0.06);
    }

    // ── Helper: waveshaper distortion curve ─────────────────────────────────
    _makeCurve(amount) {
        const n     = 256;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }
}
