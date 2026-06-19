const N = {
    A2:110, C3:130.81, D3:146.83, Eb3:155.56, F3:174.61, G3:196, Ab3:207.65,
    A3:220, Bb3:233.08, B3:246.94, C4:261.63, D4:293.66, Eb4:311.13, E4:329.63,
    F4:349.23, Fs4:370, G4:392, Ab4:415.3, A4:440, Bb4:466.16, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880,
};

// Each track: bpm, wave type, melody array (0 = rest), bass array (optional, synced every 4 steps)
const TRACKS = {
    viper: {
        bpm: 92, wave: 'sawtooth', vol: 0.16,
        melody: [N.D3,0,N.A3,N.C4, N.G3,0,N.F3,N.D3, N.A3,N.Bb3,N.A3,0, N.G3,N.F3,0,N.D3],
        bass:   [N.D3,0,N.D3,0,    N.A2,0,N.A2,0,    N.D3,0,N.D3,0,    N.G3,0,N.G3,0],
    },
    blaze: {
        bpm: 158, wave: 'square', vol: 0.14,
        melody: [N.E4,N.G4,N.B4,N.A4, N.G4,N.E4,N.D4,0, N.E4,N.G4,N.A4,N.B4, N.E5,0,N.B4,N.A4],
        bass:   [N.E3,0,N.E3,0,        N.A2,0,N.A2,0,    N.E3,0,N.E3,0,        N.A2,0,N.C3,0],
    },
    phantom: {
        bpm: 68, wave: 'sine', vol: 0.15,
        melody: [N.A3,0,N.Eb4,0, N.D4,0,N.G3,0, N.Ab3,N.Bb3,0,0, N.E4,0,N.C4,0],
        bass:   [N.A2,0,0,0,     N.D3,0,0,0,     N.A2,0,0,0,      N.Eb3,0,0,0],
    },
    titan: {
        bpm: 56, wave: 'sawtooth', vol: 0.18,
        melody: [N.D3,0,0,N.A2, N.G3,0,N.C3,0, N.D3,0,0,N.F3, N.G3,0,N.A3,0],
        bass:   [N.D3,0,0,0,     N.D3,0,0,0,    N.G3,0,0,0,     N.G3,0,0,0],
    },
    storm: {
        bpm: 198, wave: 'square', vol: 0.13,
        melody: [N.E5,N.G5,N.A5,N.G5, N.E5,N.D5,N.E5,N.A4, N.B4,N.E5,N.G5,N.A5, N.E5,N.G5,N.A5,N.E5],
        bass:   [N.E3,0,N.E3,0,        N.A2,0,N.A2,0,        N.E3,0,N.E3,0,        N.B2,0,N.B2,0],
    },
    killjoy: {
        bpm: 148, wave: 'square', vol: 0.13,
        melody: [N.D4,0,N.F4,N.G4, N.A4,0,N.G4,0, N.F4,N.D4,0,N.A3, N.C4,0,N.D4,0],
        bass:   [N.D3,0,N.D3,0,    N.A2,0,N.A2,0, N.F3,0,N.F3,0,    N.G3,0,N.G3,0],
    },
    chamber: {
        bpm: 76, wave: 'sawtooth', vol: 0.15,
        melody: [N.A3,0,0,N.E4, N.D4,0,N.C4,0, N.B3,0,0,N.G3, N.A3,0,0,0],
        bass:   [N.A2,0,0,0,    N.D3,0,0,0,    N.E3,0,0,0,    N.A2,0,0,0],
    },
    kayo: {
        bpm: 120, wave: 'square', vol: 0.14,
        melody: [N.C4,N.C4,0,N.G3, N.Bb3,0,N.C4,0, N.D4,0,N.C4,N.Bb3, N.G3,0,0,N.C4],
        bass:   [N.C3,0,N.C3,0,    N.G3,0,N.G3,0,  N.F3,0,N.F3,0,     N.C3,0,N.G3,0],
    },
};

export default class BossMusic {
    constructor() {
        this.ctx       = null;
        this.masterGain = null;
        this.timeout   = null;
        this.step      = 0;
        this.type      = null;
    }

    play(bossType) {
        this.stop();
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.2);
        this.masterGain.connect(this.ctx.destination);

        this.step = 0;
        this.type = bossType;
        this._tick();
    }

    stop() {
        clearTimeout(this.timeout);
        if (this.ctx) {
            try {
                this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
                this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
                setTimeout(() => { if (this.ctx) { this.ctx.close(); this.ctx = null; } }, 450);
            } catch (e) { this.ctx = null; }
        }
        this.timeout = null;
    }

    _tick() {
        if (!this.ctx || !this.type) return;
        const track   = TRACKS[this.type] || TRACKS.viper;
        const beatMs  = (60000 / track.bpm);
        const len     = track.melody.length;
        const i       = this.step % len;

        const melFreq  = track.melody[i];
        const bassFreq = track.bass ? track.bass[i] : 0;

        if (melFreq)  this._note(melFreq,  beatMs * 0.85, track.wave, track.vol);
        if (bassFreq) this._note(bassFreq, beatMs * 0.9,  'triangle', track.vol * 0.7);

        this.step++;
        this.timeout = setTimeout(() => this._tick(), beatMs);
    }

    _note(freq, durationMs, wave, vol) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.connect(env);
        env.connect(this.masterGain);
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        env.gain.setValueAtTime(vol, this.ctx.currentTime);
        env.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + durationMs / 1000 + 0.05);
    }
}
