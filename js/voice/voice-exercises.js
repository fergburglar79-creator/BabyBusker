 /* ------------------------------------------------------------
       7. THE BEACON (ATTACK ONSET + DELAY + SCORE %)
       ------------------------------------------------------------ */
    const ExerciseBeacon = {
      rounds: [
        { name: "Round 1", desc: "Strike your anchor note cleanly without scooping from below.", blind: false },
        { name: "Round 2", desc: "Target random notes across your Green Zone from cold silence.", blind: false },
        { name: "Round 3", desc: "Pure audiation! The note name is hidden until struck.", blind: true }
      ],
      currentRoundIdx: 0,
      streakCount: 0,
      targetMidi: 60,
      gameState: 'IDLE',
      attackBuffer: [],
      attackStartTime: 0,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('beacon-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('beacon', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('beacon-preflight').classList.remove('hidden');
        this.gameState = 'IDLE';
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('beacon-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('beacon-preflight').classList.add('hidden');
        this.streakCount = 0;
        document.getElementById('beacon-round-modal').classList.remove('active');
        this.setupTarget();
        this.loop();
      },

      setupTarget() {
        const anchor = ProfileManager.data.calibration.anchorMidi || 60;
        const round = this.rounds[this.currentRoundIdx];

        if (this.currentRoundIdx === 0) this.targetMidi = anchor;
        else if (this.currentRoundIdx === 1) {
          const offsets = [0, 2, 4, 7, 9];
          this.targetMidi = anchor + offsets[Math.floor(Math.random() * offsets.length)];
        } else {
          const offsets = [-2, 0, 2, 4, 5, 7];
          this.targetMidi = anchor + offsets[Math.floor(Math.random() * offsets.length)];
        }

        document.getElementById('beacon-round-label').textContent = round.name;
        const noteFormatted = round.blind ? "???" : TheorySystem.formatNote(this.targetMidi);
        document.getElementById('beacon-note-name').textContent = noteFormatted;
        document.getElementById('beacon-state-sub').textContent = "Listen...";

        this.updatePips();
        this.playToneAndAudiate();
      },

      async playToneAndAudiate() {
        this.gameState = 'PLAYING_TONE';
        document.getElementById('beacon-attack-rating').textContent = "Listen carefully...";
        VoiceEngine.playTone(midiToFrequency(this.targetMidi), 1.2);

        await new Promise(r => setTimeout(r, 1300));
        this.gameState = 'AUDIATION_SILENCE';
        document.getElementById('beacon-state-sub').textContent = "Audiate...";
        document.getElementById('beacon-attack-rating').textContent = "Silence: Hear it in your mind...";

        await new Promise(r => setTimeout(r, 1400));
        this.gameState = 'AWAITING_STRIKE';
        document.getElementById('beacon-state-sub').textContent = "STRIKE!";
        document.getElementById('beacon-attack-rating').textContent = "Sing now! Strike dead-center!";
      },

      playTone() {
        VoiceEngine.playTone(midiToFrequency(this.targetMidi), 1.2);
      },

      updatePips() {
        for (let i = 0; i < 3; i++) {
          const pip = document.getElementById(`pip-${i}`);
          if (i < this.streakCount) pip.classList.add('filled');
          else pip.classList.remove('filled');
        }
        document.getElementById('beacon-progress-label').textContent = `Streak: ${this.streakCount} of 3`;
      },

      loop() {
        if (Router.activeScreen !== 'exercise-beacon') return;
        requestAnimationFrame(() => this.loop());

        if (this.gameState === 'AWAITING_STRIKE') {
          if (VoiceEngine.volume > 0.035 && VoiceEngine.confidence > 0.6) {
            this.gameState = 'EVALUATING';
            this.attackBuffer = [VoiceEngine.midi];
            this.attackStartTime = performance.now();
          }
        } else if (this.gameState === 'EVALUATING') {
          if (VoiceEngine.midi) this.attackBuffer.push(VoiceEngine.midi);
          if (performance.now() - this.attackStartTime >= 200) {
            this.evaluateOnset();
          }
        }
      },

      evaluateOnset() {
        const initialOnset = this.attackBuffer[0] || VoiceEngine.midi;
        const settledPitch = this.attackBuffer[this.attackBuffer.length - 1] || VoiceEngine.midi;
        const target = this.targetMidi;
        const halo = document.getElementById('beacon-halo');
        const feedback = document.getElementById('beacon-attack-feedback');

        const initialDiffCents = (initialOnset - target) * 100;
        const slopeCents = (settledPitch - initialOnset) * 100;

        if (Math.abs(initialDiffCents) <= 30) {
          halo.classList.add('singing-in-tune');
          feedback.style.color = "var(--success-green)";
          feedback.textContent = "🎯 BULLSEYE! Relax breath...";
          this.streakCount++;
          this.updatePips();
          VoiceEngine.playTone(midiToFrequency(target), 0.4);

          const score = Math.max(75, Math.min(98, 100 - Math.abs(initialDiffCents)));
          ProfileManager.recordScore('beacon', this.currentRoundIdx, score);

          // 1.3s pause buffer before moving to next target
          setTimeout(() => {
            if (this.streakCount >= 3) {
              this.showRoundComplete(score);
            } else {
              this.setupTarget();
            }
          }, 1300);
        } else if (slopeCents > 45 && initialDiffCents < -35) {
          halo.classList.remove('singing-in-tune');
          feedback.style.color = "var(--danger-rose)";
          feedback.textContent = "⚠️ Scooped! You slid up from below.";
          this.streakCount = Math.max(0, this.streakCount - 1);
          this.updatePips();
          setTimeout(() => this.playToneAndAudiate(), 1400);
        } else {
          halo.classList.remove('singing-in-tune');
          feedback.style.color = "var(--text-muted)";
          feedback.textContent = "Off target. Pre-hear the chime and strike!";
          setTimeout(() => this.playToneAndAudiate(), 1400);
        }

        this.gameState = 'IDLE';
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('beacon-round-modal');
        const title = document.getElementById('beacon-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceRound() {
        document.getElementById('beacon-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      },

      nextTarget() {
        this.setupTarget();
      }
    };

    /* ------------------------------------------------------------
       8. EXERCISE: THE HOLD (SUSTAIN + DELAY + SCORE %)
       ------------------------------------------------------------ */
    const ExerciseHold = {
      rounds: [
        { name: "Round 1", targetSec: 3.0, desc: "Sustain your comfortable anchor pitch for 3 seconds." },
        { name: "Round 2", targetSec: 5.0, desc: "Extended breath support: maintain steady air pressure for 5s." },
        { name: "Round 3", targetSec: 7.0, desc: "Master pitch stamina without wavering or sagging for 7s." },
        { name: "Round 4", targetSec: 99.0, desc: "Test your maximum breath capacity. Set your all-time PR!" }
      ],
      currentRoundIdx: 0,
      targetMidi: 60,
      holdSeconds: 0,
      personalRecord: 0,
      isPaused: false,
      canvas: null,
      ctx: null,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('hold-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('hold', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('hold-preflight').classList.remove('hidden');
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('hold-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('hold-preflight').classList.add('hidden');
        this.targetMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.holdSeconds = 0;
        this.isPaused = false;
        this.canvas = document.getElementById('holdSilkCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        const savedPR = localStorage.getItem('babybusker_hold_pr');
        if (savedPR) this.personalRecord = parseFloat(savedPR);
        this.updatePRBadge();

        document.getElementById('hold-round-modal').classList.remove('active');
        this.setupRound();
        this.loop();
      },

      updatePRBadge() {
        document.getElementById('hold-record-badge').textContent = `PR: ${this.personalRecord.toFixed(1)}s`;
      },

      setupRound() {
        const round = this.rounds[this.currentRoundIdx];
        document.getElementById('hold-round-name').textContent = round.name;
        document.getElementById('hold-target-label').textContent = 
          this.currentRoundIdx === 3 ? "Endless Max Breath Record" : `Target: ${round.targetSec.toFixed(1)} seconds`;
      },

      playTone() {
        VoiceEngine.playTone(midiToFrequency(this.targetMidi), 2.2);
      },

      loop() {
        if (Router.activeScreen !== 'exercise-hold' || this.isPaused) return;
        requestAnimationFrame(() => this.loop());

        const w = this.canvas.width = this.canvas.parentElement.clientWidth;
        const h = this.canvas.height = this.canvas.parentElement.clientHeight;
        this.ctx.clearRect(0, 0, w, h);

        const targetSec = this.rounds[this.currentRoundIdx].targetSec;
        const timerDisp = document.getElementById('hold-timer-display');
        const readout = document.getElementById('hold-live-readout');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.55) {
          const centsDiff = Math.abs((VoiceEngine.midi - this.targetMidi) * 100);

          if (centsDiff <= 45) {
            this.holdSeconds += 1 / 60;
            timerDisp.textContent = `${this.holdSeconds.toFixed(1)}s`;
            readout.textContent = `Steady hold! In pitch (${TheorySystem.formatNote(this.targetMidi)})`;

            this.ctx.strokeStyle = "var(--mountain-accent)";
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            const y = h / 2;
            const progressWidth = (this.holdSeconds / (targetSec === 99.0 ? 15 : targetSec)) * w;
            this.ctx.moveTo(0, y);
            for (let x = 0; x <= Math.min(w, progressWidth); x += 10) {
              const waver = Math.sin(x * 0.05 + Date.now() * 0.005) * (centsDiff * 0.1);
              this.ctx.lineTo(x, y + waver);
            }
            this.ctx.stroke();

            if (this.holdSeconds > this.personalRecord) {
              this.personalRecord = this.holdSeconds;
              localStorage.setItem('babybusker_hold_pr', this.personalRecord.toString());
              this.updatePRBadge();
            }

            if (this.currentRoundIdx !== 3 && this.holdSeconds >= targetSec) {
              this.isPaused = true;
              const score = Math.max(78, Math.min(99, Math.round(100 - centsDiff * 0.4)));
              ProfileManager.recordScore('hold', this.currentRoundIdx, score);
              // 1.3s buffer before modal
              setTimeout(() => this.showRoundComplete(score), 1300);
            }
          } else {
            this.holdSeconds = Math.max(0, this.holdSeconds - 2 / 60);
            readout.textContent = "Pitch wavering — steady breath";
          }
        } else {
          this.holdSeconds = Math.max(0, this.holdSeconds - 2 / 60);
          timerDisp.textContent = `${this.holdSeconds.toFixed(1)}s`;
          readout.textContent = "Sing to weave the thread";
        }
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('hold-round-modal');
        const title = document.getElementById('hold-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceStep() {
        document.getElementById('hold-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      }
    };

    /* ------------------------------------------------------------
       9. THE RIBBON (GHOST SHAPE + DELAY + SCORE %)
       ------------------------------------------------------------ */
    const ExerciseRibbon = {
      rounds: [
        { name: "Round 1", sub: "Pianissimo • 3.5s", desc: "Hold a gentle, thin sound inside the narrow ribbon without dropping flat.", type: "quiet_sustain", duration: 3.5, vibrato: false, volMin: 0.015, volMax: 0.055 },
        { name: "Round 2", sub: "Forte • 3.5s", desc: "Hold a resonant, powerful tone filling the wide ribbon without going sharp.", type: "loud_sustain", duration: 3.5, vibrato: false, volMin: 0.09, volMax: 0.35 },
        { name: "Round 3", sub: "Messa di Voce • Soft → Loud → Soft", desc: "Swell your breath to fill the diamond contour smoothly on one pitch.", type: "swell", duration: 4.5, vibrato: false },
        { name: "Round 4", sub: "Vibrato on Quiet Tone • 4s", desc: "Relax your vocal cords so gentle vibrato ripples inside the wavy ribbon.", type: "soft_vibrato", duration: 4.0, vibrato: true },
        { name: "Round 5", sub: "Sustained Wave • 5s", desc: "Maintain relaxed, natural vibrato across the entire undulating contour.", type: "long_vibrato", duration: 5.0, vibrato: true },
        { name: "Round 6", sub: "Dynamics + Peak Vibrato Blossom", desc: "Swell from soft straight tone into blooming vibrato, then taper.", type: "master_swell", duration: 5.5, vibrato: true }
      ],
      currentRoundIdx: 0,
      targetMidi: 60,
      fillProgress: 0,
      isPaused: false,
      canvas: null,
      ctx: null,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('ribbon-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('ribbon', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('ribbon-preflight').classList.remove('hidden');
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('ribbon-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('ribbon-preflight').classList.add('hidden');
        this.targetMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.fillProgress = 0;
        this.isPaused = false;
        this.canvas = document.getElementById('ribbonCanvas');
        this.ctx = this.canvas.getContext('2d');
        document.getElementById('ribbon-round-modal').classList.remove('active');
        this.setupRoundUI();
        this.loop();
      },

      setupRoundUI() {
        const round = this.rounds[this.currentRoundIdx];
        document.getElementById('ribbon-round-title').textContent = round.name;
        document.getElementById('ribbon-target-meta').textContent = round.sub;
        document.getElementById('ribbon-coach-text').textContent = round.desc;
        this.fillProgress = 0;
      },

      playTone() {
        VoiceEngine.playTone(midiToFrequency(this.targetMidi), 2.2);
      },

      loop() {
        if (Router.activeScreen !== 'exercise-ribbon' || this.isPaused) return;
        requestAnimationFrame(() => this.loop());

        const w = this.canvas.width = this.canvas.parentElement.clientWidth;
        const h = this.canvas.height = this.canvas.parentElement.clientHeight;
        this.ctx.clearRect(0, 0, w, h);

        const round = this.rounds[this.currentRoundIdx];
        const midY = h / 2;
        const now = Date.now() * 0.005;

        this.ctx.strokeStyle = "rgba(192, 38, 211, 0.35)";
        this.ctx.fillStyle = "rgba(253, 244, 255, 0.4)";
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const t = x / w;
          let halfHeight = 12;
          if (round.type === 'loud_sustain') halfHeight = 35;
          else if (round.type === 'swell' || round.type === 'master_swell') halfHeight = 12 + Math.sin(t * Math.PI) * 28;
          else if (round.type === 'long_vibrato') halfHeight = 22;

          let waveOffset = round.vibrato ? Math.sin(x * 0.08 + now) * 6 : 0;
          const yTop = midY - halfHeight + waveOffset;
          if (x === 0) this.ctx.moveTo(x, yTop);
          else this.ctx.lineTo(x, yTop);
        }

        for (let x = w; x >= 0; x -= 10) {
          const t = x / w;
          let halfHeight = 12;
          if (round.type === 'loud_sustain') halfHeight = 35;
          else if (round.type === 'swell' || round.type === 'master_swell') halfHeight = 12 + Math.sin(t * Math.PI) * 28;
          else if (round.type === 'long_vibrato') halfHeight = 22;

          let waveOffset = round.vibrato ? Math.sin(x * 0.08 + now) * 6 : 0;
          const yBottom = midY + halfHeight + waveOffset;
          this.ctx.lineTo(x, yBottom);
        }
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fill();

        const feedbackLbl = document.getElementById('ribbon-feedback-label');
        const readout = document.getElementById('ribbon-readout');
        const statusSub = document.getElementById('ribbon-status-sub');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const centsDiff = Math.abs((VoiceEngine.midi - this.targetMidi) * 100);
          const vol = VoiceEngine.volume;
          const vib = VoiceEngine.detectVibrato();

          let inBounds = (centsDiff <= 45);
          if (round.type === 'quiet_sustain') {
            inBounds = inBounds && (vol >= round.volMin && vol <= round.volMax);
            feedbackLbl.textContent = vol > round.volMax ? "Too loud! Soften to whisper" : "Good! Thin & steady";
          } else if (round.type === 'loud_sustain') {
            inBounds = inBounds && (vol >= round.volMin);
            feedbackLbl.textContent = vol < round.volMin ? "Swell louder to fill the beam!" : "Resonant power locked!";
          } else if (round.vibrato) {
            inBounds = inBounds && vib.active;
            feedbackLbl.textContent = vib.active ? "〰️ Relaxed vibrato blooming!" : "Relax vocal cords to ripple";
          }

          if (inBounds) {
            this.fillProgress += (1 / 60) / round.duration;
            readout.textContent = `Tracing contour: ${(this.fillProgress * 100).toFixed(0)}%`;

            this.ctx.fillStyle = "rgba(192, 38, 211, 0.45)";
            this.ctx.beginPath();
            const fillWidth = Math.min(w, this.fillProgress * w);
            this.ctx.rect(0, midY - 25, fillWidth, 50);
            this.ctx.fill();

            if (this.fillProgress >= 1.0) {
              this.isPaused = true;
              const score = Math.max(80, Math.min(98, Math.round(98 - centsDiff * 0.2)));
              ProfileManager.recordScore('ribbon', this.currentRoundIdx, score);
              setTimeout(() => this.showRoundComplete(score), 1300);
            }
          } else {
            this.fillProgress = Math.max(0, this.fillProgress - 0.8 / 60);
          }
        } else {
          this.fillProgress = Math.max(0, this.fillProgress - 1.2 / 60);
          feedbackLbl.textContent = "Sing into the container";
          readout.textContent = "Waiting for breath...";
        }

        statusSub.textContent = `Fill Progress: ${(this.fillProgress * 100).toFixed(0)}%`;
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('ribbon-round-modal');
        const title = document.getElementById('ribbon-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceRound() {
        document.getElementById('ribbon-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      },

      skipRound() {
        this.advanceRound();
      }
    };

    /* ------------------------------------------------------------
       10. ECHO CHAMBER (PHRASE MEMORY + DELAYS + SCORE %)
       ------------------------------------------------------------ */
    const EchoMemoryGame = {
      rounds: [
        { name: "Round 1", desc: "Short interval calls: hear the 2 notes, audiate, and echo back cleanly.", items: [ { label: "Do — Sol", semitones: [0, 7] }, { label: "Do — Mi", semitones: [0, 4] } ] },
        { name: "Round 2", desc: "Triad contours & turns: remember the 3-note melodic shape and return it.", items: [ { label: "Do — Mi — Sol", semitones: [0, 4, 7] }, { label: "Sol — Fa — Mi", semitones: [7, 5, 4] } ] },
        { name: "Round 3", desc: "Rhythm + pitch: reproduce the exact notes in rhythm from memory.", items: [ { label: "Do — Do — Re — Do", semitones: [0, 0, 2, 0] }, { label: "Mi — Re — Do — Re", semitones: [4, 2, 0, 2] } ] },
        { name: "Round 4", desc: "Whole phrases! Audiate a flowing 5-note melodic sentence, then sing it back.", items: [ { label: "Do — Mi — Sol — La — Sol", semitones: [0, 4, 7, 9, 7] } ] }
      ],
      currentRoundIdx: 0,
      currentPhraseIdx: 0,
      noteSequenceIdx: 0,
      rootMidi: 60,
      isListeningToPrompt: false,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('echo-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('echo', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('echo-preflight').classList.remove('hidden');
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('echo-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('echo-preflight').classList.add('hidden');
        this.rootMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.currentPhraseIdx = 0;
        this.noteSequenceIdx = 0;
        document.getElementById('echo-round-modal').classList.remove('active');
        this.setupPhraseUI();
        this.playPhrase();
        this.loop();
      },

      setupPhraseUI() {
        const round = this.rounds[this.currentRoundIdx];
        const item = round.items[this.currentPhraseIdx];

        document.getElementById('echo-phrase-title').textContent = `${round.name} • Phrase ${this.currentPhraseIdx + 1} of ${round.items.length}`;
        const phraseNotes = item.semitones.map(st => TheorySystem.formatNote(this.rootMidi + st, this.rootMidi));
        document.getElementById('echo-motif-display').textContent = phraseNotes.join(" — ");
        document.getElementById('echo-progress-counter').textContent = `Phrase ${this.currentPhraseIdx + 1} of ${round.items.length}`;
        document.getElementById('echo-readout').textContent = "Listen to the motif...";
      },

      async playPhrase() {
        if (this.isListeningToPrompt) return;
        this.isListeningToPrompt = true;
        const item = this.rounds[this.currentRoundIdx].items[this.currentPhraseIdx];
        document.getElementById('echo-status-readout').textContent = "🎧 Listening to prompt...";

        for (let i = 0; i < item.semitones.length; i++) {
          const freq = midiToFrequency(this.rootMidi + item.semitones[i]);
          VoiceEngine.playTone(freq, 0.7);
          await new Promise(r => setTimeout(r, 750));
        }

        document.getElementById('echo-status-readout').textContent = "Audiate: hold the whole phrase in memory...";
        await new Promise(r => setTimeout(r, 1000));

        this.noteSequenceIdx = 0;
        this.isListeningToPrompt = false;
        document.getElementById('echo-status-readout').textContent = "🎤 Now sing the response!";
      },

      loop() {
        if (Router.activeScreen !== 'echo-chamber') return;
        requestAnimationFrame(() => this.loop());

        if (this.isListeningToPrompt) return;

        const item = this.rounds[this.currentRoundIdx].items[this.currentPhraseIdx];
        const activeTargetMidi = this.rootMidi + item.semitones[this.noteSequenceIdx];
        const readout = document.getElementById('echo-readout');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const diff = Math.abs((VoiceEngine.midi - activeTargetMidi) * 100);
          if (diff <= 50) {
            readout.textContent = `Echoing: Note ${this.noteSequenceIdx + 1} of ${item.semitones.length} matched!`;
            this.noteSequenceIdx++;
            VoiceEngine.playTone(midiToFrequency(activeTargetMidi), 0.2);

            if (this.noteSequenceIdx >= item.semitones.length) {
              this.advancePhrase();
            }
          }
        }
      },

      advancePhrase() {
        const round = this.rounds[this.currentRoundIdx];
        document.getElementById('echo-readout').textContent = "✨ Whole phrase echoed cleanly!";

        setTimeout(() => {
          if (this.currentPhraseIdx < round.items.length - 1) {
            this.currentPhraseIdx++;
            this.setupPhraseUI();
            this.playPhrase();
          } else {
            const score = 88 + Math.floor(Math.random() * 8);
            ProfileManager.recordScore('echo', this.currentRoundIdx, score);
            this.showRoundComplete(score);
          }
        }, 1300);
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('echo-round-modal');
        const title = document.getElementById('echo-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceRound() {
        document.getElementById('echo-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      }
    };

    /* ------------------------------------------------------------
       11. RESONANCE CHAMBER (HARMONY, EPIC DRONE & SCORE %)
       ------------------------------------------------------------ */
    const ResonanceChamber = {
      rounds: [
        { name: "Round 1", title: "2-Voice Resonance", desc: "Lock root drone, then find harmony.", modalDesc: "2-part harmony dyads locked.", chords: [ { name: "Root & Fifth", notes: [0, 7], labels: ["Root", "5th"] }, { name: "Root & Third", notes: [0, 4], labels: ["Root", "Maj 3rd"] } ] },
        { name: "Round 2", title: "Major Triads", desc: "Acoustic foundation of bright harmony.", modalDesc: "Major 3-part chords built.", chords: [ { name: "Tonic Major (I)", notes: [0, 4, 7], labels: ["Root", "3rd", "5th"] }, { name: "Dominant (V)", notes: [7, 11, 14], labels: ["Root", "3rd", "5th"] } ] },
        { name: "Round 3", title: "Minor Triads", desc: "Emotional darkening of minor third.", modalDesc: "Introspective minor triads built.", chords: [ { name: "Tonic Minor (i)", notes: [0, 3, 7], labels: ["Root", "b3rd", "5th"] } ] },
        { name: "Round 4", title: "Dominant 7ths", desc: "Blues tension pulling for resolution.", modalDesc: "Dominant 7th tension locked.", chords: [ { name: "Dominant 7th (V7)", notes: [0, 4, 7, 10], labels: ["Root", "3rd", "5th", "b7th"] } ] },
        { name: "Round 5", title: "Major 7ths", desc: "Lush dreamy open acoustic texture.", modalDesc: "Lush major 7th harmony unlocked.", chords: [ { name: "Major 7th (Imaj7)", notes: [0, 4, 7, 11], labels: ["Root", "3rd", "5th", "7th"] } ] },
        { name: "Round 6", title: "Amen Cadences", desc: "Tension releasing into peace.", modalDesc: "Amen resolution cadence mastered.", chords: [ { name: "Plagal IV Major", notes: [5, 9, 12], labels: ["IV Root", "3rd", "5th"] }, { name: "I Resolution", notes: [0, 4, 7], labels: ["I Root", "3rd", "5th"] } ] }
      ],
      currentRoundIdx: 0,
      currentChordIdx: 0,
      noteStepIdx: 0,
      holdCounter: 0,
      rootMidi: 60,
      isTransitioning: false,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('resonance-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('resonance', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('resonance-preflight').classList.remove('hidden');
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('resonance-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('resonance-preflight').classList.add('hidden');
        this.rootMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.currentChordIdx = 0;
        this.noteStepIdx = 0;
        this.holdCounter = 0;
        this.isTransitioning = false;
        document.getElementById('resonance-round-modal').classList.remove('active');
        this.renderChordHolders();
        this.loop();
      },

      renderChordHolders() {
        const round = this.rounds[this.currentRoundIdx];
        const chord = round.chords[this.currentChordIdx];

        document.getElementById('resonance-round-title').textContent = `${round.name}: ${round.title}`;
        document.getElementById('resonance-chord-name').textContent = chord.name;
        document.getElementById('resonance-progress-counter').textContent = `Chord ${this.currentChordIdx + 1} of ${round.chords.length}`;

        const container = document.getElementById('resonance-holders-container');
        container.innerHTML = '';

        chord.notes.forEach((semitoneOffset, idx) => {
          const targetMidi = this.rootMidi + semitoneOffset;
          const formatted = TheorySystem.formatNote(targetMidi, this.rootMidi);

          const holder = document.createElement('div');
          holder.className = 'circular-holder';
          holder.id = `chord-holder-${idx}`;

          if (idx < this.noteStepIdx) holder.classList.add('droning-locked');
          else if (idx === this.noteStepIdx) holder.classList.add('active-target');

          holder.innerHTML = `
            <span class="holder-degree-tag">${chord.labels[idx]}</span>
            <span class="holder-note-text">${formatted}</span>
          `;
          container.appendChild(holder);
        });

        const targetMidi = this.rootMidi + chord.notes[this.noteStepIdx];
        const noteName = TheorySystem.formatNote(targetMidi, this.rootMidi);
        if (this.noteStepIdx === 0) {
          document.getElementById('resonance-sub-prompt').textContent = `Step 1: Sing Root (${noteName}) to start drone`;
          document.getElementById('resonance-coach-text').textContent = "Lock the root note first. The chamber will begin droning it as your guide.";
        } else {
          document.getElementById('resonance-sub-prompt').textContent = `Step ${this.noteStepIdx + 1}: Sing ${chord.labels[this.noteStepIdx]} (${noteName}) against drone`;
          document.getElementById('resonance-coach-text').textContent = "Listen to the root drone! Feel the acoustic beating smooth out.";
        }
      },

      playFullChordGuide() {
        const chord = this.rounds[this.currentRoundIdx].chords[this.currentChordIdx];
        chord.notes.forEach((st, idx) => {
          setTimeout(() => VoiceEngine.playTone(midiToFrequency(this.rootMidi + st), 2.0), idx * 160);
        });
      },

      loop() {
        if (Router.activeScreen !== 'resonance-chamber' || this.isTransitioning) return;
        requestAnimationFrame(() => this.loop());

        const chord = this.rounds[this.currentRoundIdx].chords[this.currentChordIdx];
        const activeTargetMidi = this.rootMidi + chord.notes[this.noteStepIdx];
        const readout = document.getElementById('resonance-readout');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const diff = Math.abs((VoiceEngine.midi - activeTargetMidi) * 100);
          if (diff <= 55) {
            this.holdCounter += 1 / 60;
            readout.textContent = `Vibrating in tune: ${(this.holdCounter).toFixed(1)}s / 0.6s`;

            if (this.holdCounter >= 0.6) {
              this.holdCounter = 0;
              this.advanceChordStep();
            }
          } else {
            this.holdCounter = Math.max(0, this.holdCounter - 1.2 / 60);
          }
        } else {
          this.holdCounter = Math.max(0, this.holdCounter - 1.5 / 60);
        }
      },

      advanceChordStep() {
        const chord = this.rounds[this.currentRoundIdx].chords[this.currentChordIdx];

        if (this.noteStepIdx === 0) {
          VoiceEngine.startDrone(midiToFrequency(this.rootMidi + chord.notes[0]));
        }

        this.isTransitioning = true;
        document.getElementById('resonance-readout').textContent = "Locked! Relax and take breath...";

        // 1.3s buffer before next note
        setTimeout(() => {
          if (this.noteStepIdx < chord.notes.length - 1) {
            this.noteStepIdx++;
            this.isTransitioning = false;
            this.renderChordHolders();
            this.loop();
          } else {
            this.celebrateChordCompletion();
          }
        }, 1300);
      },

      celebrateChordCompletion() {
        VoiceEngine.stopDrone();
        const chord = this.rounds[this.currentRoundIdx].chords[this.currentChordIdx];
        const freqs = chord.notes.map(st => midiToFrequency(this.rootMidi + st));
        
        // EPIC 4.5s LUSH ACOUSTIC BLOOM
        VoiceEngine.playEpicResonance(freqs);

        chord.notes.forEach((_, idx) => {
          const el = document.getElementById(`chord-holder-${idx}`);
          if (el) el.className = "circular-holder twinkle-complete";
        });

        document.getElementById('resonance-readout').textContent = "✨ Pure Harmony Locked!";
        setTimeout(() => this.advanceChord(), 3200);
      },

      advanceChord() {
        this.holdCounter = 0;
        this.noteStepIdx = 0;
        this.isTransitioning = false;
        const round = this.rounds[this.currentRoundIdx];

        if (this.currentChordIdx < round.chords.length - 1) {
          this.currentChordIdx++;
          this.renderChordHolders();
          this.loop();
        } else {
          const score = 86 + Math.floor(Math.random() * 10);
          ProfileManager.recordScore('resonance', this.currentRoundIdx, score);
          this.showRoundComplete(score);
        }
      },

      skipChord() {
        VoiceEngine.stopDrone();
        this.holdCounter = 0;
        this.noteStepIdx = 0;
        this.advanceChord();
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('resonance-round-modal');
        const title = document.getElementById('resonance-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceRound() {
        document.getElementById('resonance-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      }
    };

    /* ------------------------------------------------------------
       12. EXERCISE STEPS (PREFLIGHT + BUFFER + SCORE %)
       ------------------------------------------------------------ */
    const ExerciseSteps = {
      rounds: [
        { name: "Round 1", desc: "Step cleanly from Tonic to each note in the scale up to the octave.", items: [ { label: "2nd", semitones: [0, 2], names: ["Do", "Re"] }, { label: "3rd", semitones: [0, 4], names: ["Do", "Mi"] }, { label: "4th", semitones: [0, 5], names: ["Do", "Fa"] }, { label: "5th", semitones: [0, 7], names: ["Do", "Sol"] }, { label: "6th", semitones: [0, 9], names: ["Do", "La"] }, { label: "7th", semitones: [0, 11], names: ["Do", "Ti"] }, { label: "Octave", semitones: [0, 12], names: ["Do", "Do'"] } ] },
        { name: "Round 2", desc: "Venture out and return: Tonic → Degree → Tonic in 3-note phrases.", items: [ { label: "1 → 3rd → 1", semitones: [0, 4, 0], names: ["Do", "Mi", "Do"] }, { label: "1 → 5th → 1", semitones: [0, 7, 0], names: ["Do", "Sol", "Do"] }, { label: "1 → 4th → 1", semitones: [0, 5, 0], names: ["Do", "Fa", "Do"] }, { label: "1 → 2nd → 1", semitones: [0, 2, 0], names: ["Do", "Re", "Do"] }, { label: "1 → Octave → 1", semitones: [0, 12, 0], names: ["Do", "Do'", "Do"] } ] },
        { name: "Round 3", desc: "Explore notes below the root and extended 9ths beyond the octave.", items: [ { label: "1 → Low 7th Below", semitones: [0, -1], names: ["Do", "Ti,"] }, { label: "1 → Low 5th Below", semitones: [0, -5], names: ["Do", "Sol,"] }, { label: "1 → 9th (Above Octave)", semitones: [0, 14], names: ["Do", "Re'"] }, { label: "1 → Low 7th → 1", semitones: [0, -1, 0], names: ["Do", "Ti,", "Do"] } ] }
      ],
      currentRoundIdx: 0,
      currentPhraseIdx: 0,
      noteSequenceIdx: 0,
      mode: 'beginner',
      holdCounter: 0,
      rootMidi: 60,
      isTransitioning: false,

      init() {
        this.renderRoundPills();
        this.showPreflight();
      },

      renderRoundPills() {
        const container = document.getElementById('steps-round-pills');
        container.innerHTML = '';
        this.rounds.forEach((r, idx) => {
          const score = ProfileManager.getScore('steps', idx);
          const label = score ? `${r.name} • ${score}%` : r.name;
          const pill = document.createElement('div');
          pill.className = `round-picker-pill ${idx === this.currentRoundIdx ? 'active' : ''}`;
          pill.textContent = label;
          pill.onclick = () => this.selectRound(idx);
          container.appendChild(pill);
        });
      },

      showPreflight() {
        this.renderRoundPills();
        document.getElementById('steps-preflight').classList.remove('hidden');
      },

      selectRound(idx) {
        this.currentRoundIdx = idx;
        this.renderRoundPills();
        document.getElementById('steps-round-preview-desc').textContent = this.rounds[idx].desc;
      },

      launchGame() {
        document.getElementById('steps-preflight').classList.add('hidden');
        this.rootMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.currentPhraseIdx = 0;
        this.noteSequenceIdx = 0;
        this.holdCounter = 0;
        this.isTransitioning = false;
        document.getElementById('steps-round-modal').classList.remove('active');
        this.renderPhraseUI();
        this.playCurrentGuideTone();
        this.loop();
      },

      toggleMode() {
        this.mode = (this.mode === 'beginner') ? 'intermediate' : 'beginner';
        document.getElementById('steps-mode-toggle').textContent = this.mode === 'beginner' ? 'Mode: Beginner' : 'Mode: Novice';
        this.renderPhraseUI();
      },

      renderPhraseUI() {
        const round = this.rounds[this.currentRoundIdx];
        const phrase = round.items[this.currentPhraseIdx];

        document.getElementById('steps-round-label').textContent = round.name;
        document.getElementById('steps-progress-counter').textContent = `Phrase ${this.currentPhraseIdx + 1} of ${round.items.length}`;

        const container = document.getElementById('steps-nodes-container');
        container.innerHTML = '';

        phrase.semitones.forEach((st, idx) => {
          if (idx > 0) {
            const arrow = document.createElement('div');
            arrow.style.fontSize = '18px';
            arrow.style.fontWeight = '800';
            arrow.style.color = 'var(--text-muted)';
            arrow.textContent = '→';
            container.appendChild(arrow);
          }

          const targetMidi = this.rootMidi + st;
          const formatted = TheorySystem.formatNote(targetMidi, this.rootMidi);

          const disc = document.createElement('div');
          disc.className = 'beacon-center-disc';

          if (idx < this.noteSequenceIdx) disc.classList.add('completed');
          else if (idx === this.noteSequenceIdx) disc.classList.add('active-target');

          disc.innerHTML = `
            <span style="font-size: 9px; font-weight: 700; color: var(--text-muted);">${phrase.names[idx] || 'Note'}</span>
            <span style="font-size: 17px; font-weight: 800;">${formatted}</span>
          `;
          container.appendChild(disc);
        });

        const currentTargetMidi = this.rootMidi + phrase.semitones[this.noteSequenceIdx];
        document.getElementById('steps-sub-prompt').textContent = `Step ${this.noteSequenceIdx + 1}: Sing ${TheorySystem.formatNote(currentTargetMidi, this.rootMidi)}`;
      },

      async playCurrentGuideTone() {
        const phrase = this.rounds[this.currentRoundIdx].items[this.currentPhraseIdx];
        const NOTE_DURATION = 1.2;
        const GAP = 0.18;

        if (this.mode === 'beginner') {
          for (let i = 0; i < phrase.semitones.length; i++) {
            const freq = midiToFrequency(this.rootMidi + phrase.semitones[i]);
            VoiceEngine.playTone(freq, NOTE_DURATION);
            await new Promise(r => setTimeout(r, (NOTE_DURATION + GAP) * 1000));
          }
        } else {
          VoiceEngine.playTone(midiToFrequency(this.rootMidi), NOTE_DURATION);
        }
      },

      loop() {
        if (Router.activeScreen !== 'exercise-steps' || this.isTransitioning) return;
        requestAnimationFrame(() => this.loop());

        const round = this.rounds[this.currentRoundIdx];
        const phrase = round.items[this.currentPhraseIdx];
        const activeTargetMidi = this.rootMidi + phrase.semitones[this.noteSequenceIdx];
        const readout = document.getElementById('steps-readout');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const diff = Math.abs((VoiceEngine.midi - activeTargetMidi) * 100);
          if (diff <= 55) {
            this.holdCounter += 1 / 60;
            readout.textContent = `Pitch locked: ${(this.holdCounter).toFixed(1)}s / 0.6s`;

            if (this.holdCounter >= 0.6) {
              this.holdCounter = 0;
              this.advanceSequenceStep();
            }
          } else {
            this.holdCounter = Math.max(0, this.holdCounter - 1.2 / 60);
          }
        } else {
          this.holdCounter = Math.max(0, this.holdCounter - 1.5 / 60);
        }
      },

      advanceSequenceStep() {
        const round = this.rounds[this.currentRoundIdx];
        const phrase = round.items[this.currentPhraseIdx];
        this.isTransitioning = true;
        document.getElementById('steps-readout').textContent = "Locked! Relax and take breath...";

        // 1.3s pause buffer before next note
        setTimeout(() => {
          if (this.noteSequenceIdx < phrase.semitones.length - 1) {
            this.noteSequenceIdx++;
            this.isTransitioning = false;
            this.renderPhraseUI();
            this.loop();
          } else {
            this.advancePhrase();
          }
        }, 1300);
      },

      advancePhrase() {
        this.holdCounter = 0;
        this.noteSequenceIdx = 0;
        const round = this.rounds[this.currentRoundIdx];

        if (this.currentPhraseIdx < round.items.length - 1) {
          this.currentPhraseIdx++;
          this.isTransitioning = false;
          this.renderPhraseUI();
          this.playCurrentGuideTone();
          this.loop();
        } else {
          const score = 84 + Math.floor(Math.random() * 12);
          ProfileManager.recordScore('steps', this.currentRoundIdx, score);
          this.showRoundComplete(score);
        }
      },

      skipPhrase() {
        this.advancePhrase();
      },

      showRoundComplete(score) {
        VoiceEngine.playAmenCadence();
        const modal = document.getElementById('steps-round-modal');
        const title = document.getElementById('steps-modal-title');
        title.textContent = `${this.rounds[this.currentRoundIdx].name} • ${score}%`;
        modal.classList.add('active');
      },

      advanceRound() {
        document.getElementById('steps-round-modal').classList.remove('active');
        if (this.currentRoundIdx < this.rounds.length - 1) {
          this.selectRound(this.currentRoundIdx + 1);
          this.launchGame();
        } else {
          Router.go('voice-hub');
        }
      }
    };

    /* ------------------------------------------------------------
       13. RANGE & AGILITY TRAINER (FIXED BLANK SCREEN BUG)
       ------------------------------------------------------------ */
    const VoiceTrainer = {
      focus: 'precision',
      targetMidi: 60,

      init() {
        this.selectFocus(this.focus || 'precision');
        this.loop();
      },

      selectFocus(f) {
        this.focus = f;
        document.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`btn-focus-${f}`);
        if (btn) btn.classList.add('active');

        const cal = ProfileManager.data.calibration;
        const lowest = cal.lowestMidi || 48;
        const peak = cal.peakMidi || 67;
        const anchor = cal.anchorMidi || 60;

        const prompts = {
          precision: { icon: "🎯", text: "Lock onto the target with studio precision (within ±15 cents).", target: anchor },
          highest: { icon: "⛰️", text: "Gentle stretch: sing 1 semitone above your current summit ceiling.", target: peak + 1 },
          lowest: { icon: "🌊", text: "Gentle depth: sing 1 semitone below your current valley floor.", target: lowest - 1 },
          sustain: { icon: "⏱️", text: "Hold this note with rock-steady breath support for a full 5 seconds.", target: anchor },
          agility: { icon: "🦅", text: "Sprint between these two notes cleanly and quickly.", target: anchor + 4 },
          vibrato: { icon: "〰️", text: "Sustain this comfortable note and allow natural vocal relaxation.", target: anchor },
          loud: { icon: "📢", text: "Sing this note with steady diaphragm support and forward projection.", target: anchor + 2 },
          soft: { icon: "🤫", text: "Sing softly (pianissimo) without letting pitch wobble or drop.", target: anchor }
        };

        const cfg = prompts[f] || prompts.precision;
        this.targetMidi = cfg.target;
        document.getElementById('trainer-coach-icon').textContent = cfg.icon;
        document.getElementById('trainer-coach-prompt').textContent = cfg.text;
        document.getElementById('trainer-target-display').textContent = TheorySystem.formatNote(this.targetMidi);
      },

      loop() {
        if (Router.activeScreen !== 'voice-trainer-hub') return;
        requestAnimationFrame(() => this.loop());

        const readout = document.getElementById('trainer-metric-readout');
        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const centsDiff = Math.round((VoiceEngine.midi - this.targetMidi) * 100);
          const liveName = TheorySystem.formatNote(VoiceEngine.midi);
          const vib = VoiceEngine.detectVibrato();

          if (this.focus === 'vibrato') {
            readout.textContent = vib.active ? `〰️ Vibrato: ${vib.rate.toFixed(1)}Hz (±${Math.round(vib.depth)}c)` : `Sing steady tone (${liveName})`;
          } else if (this.focus === 'loud' || this.focus === 'soft') {
            readout.textContent = `Volume: ${(VoiceEngine.volume * 100).toFixed(0)}% • ${liveName}`;
          } else {
            const sign = centsDiff > 0 ? `+${centsDiff}` : `${centsDiff}`;
            readout.textContent = `Pitch: ${liveName} (${sign} cents)`;
          }
        } else {
          readout.textContent = "Live Pitch: --";
        }
      },

      playReference() {
        VoiceEngine.playTone(midiToFrequency(this.targetMidi), 2.2);
      }
    };

    /* ------------------------------------------------------------
       14. MOUNTAIN HIGH, VALLEY LOW
       ------------------------------------------------------------ */
    const MountainRangeFinder = {
      canvas: null,
      ctx: null,
      phase: 'anchor',
      anchorMidi: 60,
      currentTargetMidi: 60,
      peakMidi: 72,
      lowestMidi: 37,
      currentStepCounter: 0,
      holdTime: 0,
      isRunning: false,

      init() {
        document.getElementById('mountain-preflight').classList.remove('hidden');
      },

      launchGame() {
        document.getElementById('mountain-preflight').classList.add('hidden');
        this.canvas = document.getElementById('mountainTrailCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.reset();
        if (!this.isRunning) {
          this.isRunning = true;
          this.loop();
        }
      },

      reset() {
        this.phase = 'anchor';
        this.anchorMidi = ProfileManager.data.calibration.anchorMidi || 60;
        this.currentTargetMidi = this.anchorMidi;
        this.peakMidi = this.anchorMidi;
        this.lowestMidi = this.anchorMidi;
        this.currentStepCounter = 0;
        this.holdTime = 0;

        document.getElementById('mountain-phase-name').textContent = "Step 1: Anchor Note";
        document.getElementById('mountain-coach-text').textContent = "Hum or sing any comfortable note to set your starting anchor.";
        document.getElementById('mountain-target-note').textContent = "--";
        document.getElementById('mountain-target-step').textContent = "Anchor";
        
        const btn = document.getElementById('mountain-boundary-btn');
        btn.className = "boundary-limit-btn anchor-mode";
        btn.textContent = "🎯 Lock Anchor Note";
        this.updateProgressHalo(0);
      },

      handleBoundaryClick() {
        if (this.phase === 'anchor') this.advancePhase();
        else this.triggerLimit();
      },

      advancePhase() {
        if (this.phase === 'anchor') {
          if (VoiceEngine.midi) {
            this.anchorMidi = Math.round(VoiceEngine.midi);
            this.peakMidi = this.anchorMidi;
            this.lowestMidi = this.anchorMidi;
            this.phase = 'high';
            this.currentStepCounter = 1;
            this.currentTargetMidi = this.anchorMidi + 2;
            this.holdTime = 0;

            const rootFormatted = TheorySystem.formatNote(this.anchorMidi, this.anchorMidi);
            document.getElementById('mountain-phase-name').textContent = `Phase 2: Climbing High (Root: ${rootFormatted})`;
            document.getElementById('mountain-coach-text').textContent = "Anchor set! Sing higher for next step. Keep going until peak!";
            
            const btn = document.getElementById('mountain-boundary-btn');
            btn.className = "boundary-limit-btn";
            btn.textContent = "⛰️ I've Hit My Peak";

            this.updateTargetDisplay();
            this.playCurrentTargetTone();
          } else {
            alert("Hum or sing any steady note first so we can gauge your voice!");
          }
        }
      },

      triggerLimit() {
        if (this.phase === 'high') {
          this.peakMidi = Math.max(this.peakMidi, this.currentTargetMidi - 2);
          this.phase = 'low';
          this.currentStepCounter = 1;
          this.currentTargetMidi = this.anchorMidi - 2;
          this.holdTime = 0;
          this.updateProgressHalo(0);

          document.getElementById('mountain-phase-name').textContent = "Phase 3: Valley Low (Deep Notes)";
          document.getElementById('mountain-coach-text').textContent = "Summit recorded! Now relax and sing lower.";
          
          const btn = document.getElementById('mountain-boundary-btn');
          btn.textContent = "🌊 I've Hit My Lowest";

          this.updateTargetDisplay();
          this.playCurrentTargetTone();
        } else if (this.phase === 'low') {
          this.lowestMidi = Math.min(this.lowestMidi, this.currentTargetMidi + 2);
          this.complete();
        }
      },

      updateTargetDisplay() {
        if (!this.currentTargetMidi) return;
        const formatted = TheorySystem.formatNote(this.currentTargetMidi, this.anchorMidi);
        document.getElementById('mountain-target-note').textContent = formatted;
        document.getElementById('mountain-target-step').textContent = this.phase === 'high' ? `Ridge +${this.currentStepCounter}` : `Valley -${this.currentStepCounter}`;
      },

      playCurrentTargetTone() {
        const midi = this.currentTargetMidi || this.anchorMidi;
        if (midi) VoiceEngine.playTone(midiToFrequency(midi), 2.2);
      },

      updateProgressHalo(fraction) {
        const circle = document.getElementById('mountain-progress-circle');
        const offset = 290 - (Math.min(1, Math.max(0, fraction)) * 290);
        circle.style.strokeDashoffset = offset;
      },

      loop() {
        if (Router.activeScreen !== 'mountain-range-finder') {
          this.isRunning = false;
          return;
        }
        requestAnimationFrame(() => this.loop());

        const w = this.canvas.width = this.canvas.parentElement.clientWidth;
        const h = this.canvas.height = this.canvas.parentElement.clientHeight;
        this.ctx.clearRect(0, 0, w, h);

        this.ctx.fillStyle = '#f8fafc';
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(w * 0.35, h * 0.35);
        this.ctx.lineTo(w * 0.65, h * 0.55);
        this.ctx.lineTo(w, h * 0.2);
        this.ctx.lineTo(w, h);
        this.ctx.closePath();
        this.ctx.fill();

        const halo = document.getElementById('mountain-halo-ring');
        const readout = document.getElementById('mountain-status-readout');

        if (VoiceEngine.midi && VoiceEngine.confidence > 0.5) {
          const liveFormatted = TheorySystem.formatNote(VoiceEngine.midi, this.anchorMidi);

          if (this.phase === 'anchor') {
            document.getElementById('mountain-target-note').textContent = liveFormatted;
            halo.classList.add('singing-in-tune');
            this.holdTime += 1 / 60;
            this.updateProgressHalo(this.holdTime / 0.8);
            if (this.holdTime >= 0.8) this.advancePhase();
          } else if (this.currentTargetMidi) {
            const centsDiff = Math.abs((VoiceEngine.midi - this.currentTargetMidi) * 100);
            if (centsDiff <= 75) {
              halo.classList.add('singing-in-tune');
              readout.textContent = `Singing ${liveFormatted} • In Pitch!`;
              this.holdTime += 1 / 60;
              if (this.holdTime >= 0.8) this.advanceStep();
            } else {
              halo.classList.remove('singing-in-tune');
              readout.textContent = `Singing ${liveFormatted}`;
              this.holdTime = Math.max(0, this.holdTime - 1.2 / 60);
            }
            this.updateProgressHalo(this.holdTime / 0.8);
          }
        } else {
          halo.classList.remove('singing-in-tune');
          readout.textContent = "Sing comfortably...";
          this.holdTime = Math.max(0, this.holdTime - 1.5 / 60);
          this.updateProgressHalo(this.holdTime / 0.8);
        }
      },

      advanceStep() {
        this.holdTime = 0;
        this.updateProgressHalo(0);

        if (this.phase === 'high') {
          this.peakMidi = this.currentTargetMidi;
          this.currentStepCounter++;
          const stepJump = (this.currentStepCounter % 3 === 0) ? 1 : 2;
          this.currentTargetMidi += stepJump;
          this.updateTargetDisplay();
          this.playCurrentTargetTone();
        } else if (this.phase === 'low') {
          this.lowestMidi = this.currentTargetMidi;
          this.currentStepCounter++;
          const stepJump = (this.currentStepCounter % 3 === 0) ? 1 : 2;
          this.currentTargetMidi -= stepJump;
          this.updateTargetDisplay();
          this.playCurrentTargetTone();
        }
      },

      complete() {
        const lowName = NOTE_NAMES[this.lowestMidi % 12] + (Math.floor(this.lowestMidi / 12) - 1);
        const highName = NOTE_NAMES[this.peakMidi % 12] + (Math.floor(this.peakMidi / 12) - 1);
        const semitones = this.peakMidi - this.lowestMidi;
        const octaves = (semitones / 12).toFixed(1);

        ProfileManager.data.calibration = {
          anchorMidi: this.anchorMidi,
          lowestMidi: this.lowestMidi,
          peakMidi: this.peakMidi,
          isCalibrated: true
        };
        ProfileManager.save();

        document.getElementById('profile-range-tag').textContent = `${lowName} – ${highName}`;
        Router.go('range-profile');
      }
    };

    /* ------------------------------------------------------------
       15. FREE SING (SANDBOX)
       ------------------------------------------------------------ */
    const FreeSing = {
      canvas: null,
      ctx: null,
      active: false,
      smoothedRadius: 40,

      start() {
        this.canvas = document.getElementById('freeSingCanvas');
        this.ctx = this.canvas.getContext('2d');
        if (!this.active) {
          this.active = true;
          this.loop();
        }
      },

      loop() {
        if (Router.activeScreen !== 'free-sing') {
          this.active = false;
          return;
        }
        requestAnimationFrame(() => this.loop());

        const w = this.canvas.width = this.canvas.parentElement.clientWidth;
        const h = this.canvas.height = this.canvas.parentElement.clientHeight;
        this.ctx.clearRect(0, 0, w, h);

        const noteBadge = document.getElementById('freesing-note');
        const freqBadge = document.getElementById('freesing-freq');

        if (VoiceEngine.midi && VoiceEngine.volume > 0.02) {
          noteBadge.textContent = TheorySystem.formatNote(VoiceEngine.midi);
          freqBadge.textContent = `${Math.round(VoiceEngine.pitch)} Hz`;

          const targetRadius = 30 + VoiceEngine.volume * 280;
          this.smoothedRadius += (targetRadius - this.smoothedRadius) * 0.15;

          const normPitch = Math.max(0, Math.min(1, (VoiceEngine.midi - 48) / 36));
          const y = h - (normPitch * (h - 120) + 60);
          const x = w / 2;

          const grad = this.ctx.createRadialGradient(x, y, 4, x, y, this.smoothedRadius);
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0)');

          this.ctx.beginPath();
          this.ctx.arc(x, y, this.smoothedRadius, 0, Math.PI * 2);
          this.ctx.fillStyle = grad;
          this.ctx.fill();
        } else {
          noteBadge.textContent = "—";
          freqBadge.textContent = "Sing freely to explore";
        }
      }
    };
