/**
 * TitanMusic — procedural boss music for Titan fight
 * Rocky, heavy, high-energy — war drums, distorted low rumble, crushing bass hits.
 * Built entirely with Web Audio API.
 */
export class TitanMusic {
    constructor() {
        this.ctx         = null;
        this.master      = null;
        this.running     = false;
        this._timers     = [];
        this._droneOscs  = [];
    }

    start() {
        if (this.running) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }

        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
        this.master.gain.linearRampToValueAtTime(0.78, this.ctx.currentTime + 1.8);

        this.running = true;

        this._startDrumLoop();
        this._startBassRumble();
        this._startHeavyMelody();
        this._startRockSlam();
        this._startGrindNoise();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        this._timers.forEach(t => clearTimeout(t));
        this._timers = [];

        if (this.ctx && this.master) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.35);
        }
        this._droneOscs.forEach(o => { try { o.stop(); } catch (_) {} });
        this._droneOscs = [];

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

    // ── LAYER 1: War drum loop — heavy kick + snare ─────────────────────────
    _startDrumLoop() {
        const BPM   = 148;
        const beat  = (60 / BPM) * 1000;  // ~405ms per beat
        let   step  = 0;

        // Pattern (16 steps): K=kick, S=snare, H=hihat
        //  K . . H K . S . K . . H K . S H
        const pattern = [
            'K', '.', '.', 'H',
            'K', '.', 'S', '.',
            'K', '.', '.', 'H',
            'K', '.', 'S', 'H',
        ];

        const tick = () => {
            if (!this.running) return;
            const p = pattern[step % pattern.length];
            if (p === 'K') this._kick(0.65 + (step === 0 ? 0.15 : 0));
            if (p === 'S') this._snare(0.42);
            if (p === 'H') this._hihat(0.22);
            step++;
            this._after(beat / 4, tick);
        };
        tick();
    }

    _kick(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(180);
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(dist);
        dist.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.38);
    }

    _snare(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.25, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = 1800;
        filt.Q.value = 0.8;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 0.28);

        // Body thud
        const osc = this.ctx.createOscillator();
        const og  = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        og.gain.setValueAtTime(vol * 0.6, now);
        og.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(og);
        og.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    _hihat(vol) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.06, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'highpass';
        filt.frequency.value = 7000;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + 0.07);
    }

    // ── LAYER 2: Deep bass rumble (continuous) ───────────────────────────────
    _startBassRumble() {
        if (!this.ctx) return;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 160;
        filt.Q.value = 1.2;

        const g = this.ctx.createGain();
        g.gain.value = 0.28;

        // Distortion for crunch
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(280);

        // Heavy low oscillators (A0, A1 octave)
        [27.5, 55.0, 41.2].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = i === 2 ? 'triangle' : 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = i === 2 ? 6 : (i === 0 ? -4 : 2);
            osc.connect(filt);
            osc.start();
            this._droneOscs.push(osc);
        });

        // Tremolo LFO (slow earth-shake feel)
        const lfo  = this.ctx.createOscillator();
        const lfoG = this.ctx.createGain();
        lfo.frequency.value = 0.5;
        lfoG.gain.value = 0.06;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        lfo.start();
        this._droneOscs.push(lfo);

        filt.connect(dist);
        dist.connect(g);
        g.connect(this.master);
    }

    // ── LAYER 3: Heavy 5th-interval melody (dark E minor power chords) ──────
    _startHeavyMelody() {
        // E minor: E2 G2 B2 A2 — heavy low riffs at half-note tempo
        const riff = [
            [82.41, 700],
            [82.41, 350],
            [98.0,  350],
            [110.0, 700],
            [98.0,  350],
            [87.3,  350],
            [82.41, 1400],
        ];
        let idx = 0;

        const tick = () => {
            if (!this.running) return;
            const [freq, ms] = riff[idx % riff.length];
            idx++;
            this._riffNote(freq, ms / 1000);
            this._after(ms + 40, tick);
        };
        this._after(800, tick);
    }

    _riffNote(freq, dur) {
        if (!this.ctx) return;
        const now  = this.ctx.currentTime;
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(350);

        [freq, freq * 1.498].forEach((f, i) => {   // root + perfect 5th
            const osc = this.ctx.createOscillator();
            const g   = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            osc.detune.value = i === 0 ? -8 : 4;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(i === 0 ? 0.14 : 0.09, now + 0.025);
            g.gain.setValueAtTime(i === 0 ? 0.12 : 0.07, now + dur - 0.06);
            g.gain.linearRampToValueAtTime(0, now + dur);
            osc.connect(dist);
            dist.connect(g);
            g.connect(this.master);
            osc.start(now);
            osc.stop(now + dur + 0.05);
        });
    }

    // ── LAYER 4: Periodic impact slam (every 2 bars) ─────────────────────────
    _startRockSlam() {
        const BPM    = 148;
        const twoBar = (60 / BPM) * 8 * 1000;  // 8 beats at 148 BPM ≈ 3240ms

        const tick = () => {
            if (!this.running) return;
            this._slam();
            this._after(twoBar, tick);
        };
        this._after(twoBar * 0.5, tick);  // offset to not clash with drum start
    }

    _slam() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub-bass explosion
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        const dist = this.ctx.createWaveShaper();
        dist.curve = this._makeCurve(400);
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.55);
        g.gain.setValueAtTime(0.72, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.connect(dist);
        dist.connect(g);
        g.connect(this.master);
        osc.start(now);
        osc.stop(now + 0.75);

        // Rock scrape noise
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.6, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 0.9);
        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const ng   = this.ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = 320;
        filt.Q.value = 0.6;
        ng.gain.setValueAtTime(0.35, now);
        ng.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        src.buffer = buf;
        src.connect(filt);
        filt.connect(ng);
        ng.connect(this.master);
        src.start(now);
        src.stop(now + 0.65);
    }

    // ── LAYER 5: Low grinding/scraping noise texture ─────────────────────────
    _startGrindNoise() {
        const tick = () => {
            if (!this.running) return;
            this._grind();
            this._after(this._rnd(1200, 3400), tick);
        };
        this._after(600, tick);
    }

    _grind() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = this._rnd(0.15, 0.45);
        const sr  = this.ctx.sampleRate;
        const buf = this.ctx.createBuffer(1, sr * 0.6, sr);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        const src  = this.ctx.createBufferSource();
        const filt = this.ctx.createBiquadFilter();
        const g    = this.ctx.createGain();
        filt.type = 'bandpass';
        filt.frequency.value = this._rnd(180, 600);
        filt.Q.value = 4;
        g.gain.setValueAtTime(this._rnd(0.06, 0.14), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.buffer = buf;
        src.connect(filt);
        filt.connect(g);
        g.connect(this.master);
        src.start(now);
        src.stop(now + dur + 0.08);
    }

    // ── Helper: waveshaper distortion curve ─────────────────────────────────
    _makeCurve(amount) {
        const n    = 256;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }
}
