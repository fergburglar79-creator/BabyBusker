    const VoiceEngine = {
      audioCtx: null,
      analyser: null,
      micStream: null,
      buffer: null,
      isListening: false,
      isSimulating: false,
      simulatedPitch: 57,
      pitch: null,
      midi: null,
      volume: 0,
      confidence: 0,
      activeDroneOsc: null,
      activeDroneGain: null,
      pitchHistory: [],

      async ensureAudioContext() {
        if (!this.audioCtx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
          await this.audioCtx.resume();
        }
      },

      async init() {
        try {
          await this.ensureAudioContext();
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          this.micStream = stream;

          const source = this.audioCtx.createMediaStreamSource(stream);
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 2048;
          this.buffer = new Float32Array(this.analyser.fftSize);
          source.connect(this.analyser);

          this.isListening = true;
          document.getElementById('mic-banner').classList.add('hidden');
          const badge = document.getElementById('header-mic-badge');
          if (badge) {
            badge.textContent = '🎙️ Mic On';
            badge.style.borderColor = 'var(--success-green)';
            badge.style.color = 'var(--success-green)';
          }
          this.tick();
        } catch (err) {
          alert("Microphone permission needed. You can turn on Simulator mode in Me!");
        }
      },

      toggleSimulation() {
        this.isSimulating = !this.isSimulating;
        const tag = document.getElementById('sim-mode-tag');
        tag.textContent = this.isSimulating ? 'Active' : 'Off';
        tag.style.background = this.isSimulating ? 'var(--mountain-light)' : '#f3f4f6';
        tag.style.color = this.isSimulating ? 'var(--mountain-teal)' : 'var(--text-muted)';
        if (this.isSimulating) {
          document.getElementById('mic-banner').classList.add('hidden');
          this.ensureAudioContext();
          this.tick();
        }
      },

      tick() {
        requestAnimationFrame(() => this.tick());
        if (this.isSimulating) {
          this.simulatedPitch += (Math.random() - 0.5) * 0.15;
          this.pitch = midiToFrequency(this.simulatedPitch);
          this.midi = this.simulatedPitch;
          this.volume = 0.08;
          this.confidence = 0.95;
          this.trackPitchHistory(this.midi);
          return;
        }

        if (!this.analyser || !this.isListening) return;
        this.analyser.getFloatTimeDomainData(this.buffer);

        let sum = 0;
        for (let i = 0; i < this.buffer.length; i++) sum += this.buffer[i] * this.buffer[i];
        this.volume = Math.sqrt(sum / this.buffer.length);

        if (this.volume > 0.015) {
          const detectedFreq = this.autoCorrelate(this.buffer, this.audioCtx.sampleRate);
          if (detectedFreq > 55 && detectedFreq < 1200) {
            this.pitch = detectedFreq;
            this.midi = frequencyToMidi(detectedFreq);
            this.confidence = 0.9;
            this.trackPitchHistory(this.midi);
          } else {
            this.pitch = null;
            this.midi = null;
          }
        } else {
          this.pitch = null;
          this.midi = null;
          this.confidence = 0;
        }
      },

      trackPitchHistory(m) {
        if (!m) return;
        this.pitchHistory.push(m);
        if (this.pitchHistory.length > 30) this.pitchHistory.shift();
      },

      detectVibrato() {
        if (this.pitchHistory.length < 24) return { active: false, rate: 0, depth: 0 };
        let min = 999, max = -999;
        for (let p of this.pitchHistory) {
          if (p < min) min = p;
          if (p > max) max = p;
        }
        const depthCents = (max - min) * 100;
        let changes = 0;
        for (let i = 2; i < this.pitchHistory.length; i++) {
          const d1 = this.pitchHistory[i - 1] - this.pitchHistory[i - 2];
          const d2 = this.pitchHistory[i] - this.pitchHistory[i - 1];
          if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) changes++;
        }
        const rateHz = (changes / (this.pitchHistory.length / 60)) / 2;
        return { active: (depthCents >= 22 && depthCents <= 65 && rateHz >= 4.0 && rateHz <= 7.2), rate: rateHz, depth: depthCents };
      },

      autoCorrelate(buf, sampleRate) {
        const SIZE = buf.length;
        let c = new Float32Array(SIZE);
        for (let i = 0; i < SIZE; i++) {
          for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
        }
        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
          if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
        }
        return sampleRate / maxpos;
      },

      async playTone(frequency, duration = 1.2) {
        await this.ensureAudioContext();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.24, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.12, now + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
      },

      // Extended 4.5s Lush Acoustic Bloom
      async playEpicResonance(frequencies) {
        await this.ensureAudioContext();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const DURATION = 4.5;

        // Sub fundamental bass warmth
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(frequencies[0] / 2, now);
        subGain.gain.setValueAtTime(0.001, now);
        subGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION);
        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + DURATION);

        // Chords frequencies bloom
        frequencies.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.2 + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.08, now + 2.5);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + DURATION);
        });
      },

      // Soft Amen Cadence (Plagal IV -> I)
      async playAmenCadence() {
        await this.ensureAudioContext();
        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        const root = ProfileManager.data.calibration.anchorMidi || 60;

        const ivMidis = [root + 5, root + 9, root + 12];
        const iMidis = [root, root + 4, root + 7, root + 12];

        ivMidis.forEach(m => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFrequency(m), now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.8);
        });

        const resTime = now + 1.6;
        iMidis.forEach(m => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(midiToFrequency(m), resTime);
          gain.gain.setValueAtTime(0.001, resTime);
          gain.gain.linearRampToValueAtTime(0.06, resTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.0001, resTime + 2.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(resTime);
          osc.stop(resTime + 2.8);
        });
      },

      startDrone(frequency) {
        this.stopDrone();
        const ctx = this.audioCtx;
        if (!ctx) return;
        const now = ctx.currentTime;
        this.activeDroneOsc = ctx.createOscillator();
        this.activeDroneGain = ctx.createGain();
        this.activeDroneOsc.type = 'sine';
        this.activeDroneOsc.frequency.setValueAtTime(frequency, now);
        this.activeDroneGain.gain.setValueAtTime(0.001, now);
        this.activeDroneGain.gain.linearRampToValueAtTime(0.12, now + 0.3);
        this.activeDroneOsc.connect(this.activeDroneGain);
        this.activeDroneGain.connect(ctx.destination);
        this.activeDroneOsc.start(now);
      },

      stopDrone() {
        if (this.activeDroneOsc) {
          try {
            this.activeDroneGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.3);
            this.activeDroneOsc.stop(this.audioCtx.currentTime + 0.3);
          } catch(e) {}
          this.activeDroneOsc = null;
        }
      }
    };
