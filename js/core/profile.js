    const ProfileManager = {
      currentUser: null,
      data: {
    username: "Guest",
    primaryInstrument: "voice",
    activeInstruments: ["voice"],

    calibration: {
        anchorMidi: 60,
        lowestMidi: 37,
        peakMidi: 72,
        isCalibrated: false
    },

    scores: {},

    theory: {
        higherLowerUnlocked: true,
        higherLowerBest: [0,0,0,0,0]
    }
},

      init() {
        const lastUser = localStorage.getItem('babybusker_last_user');
        if (lastUser) {
          this.loadUser(lastUser);
          this.syncUI();
          Router.go('home');
        } else {
          Router.go('launch');
        }
      },

      handleLogin() {
        const input = document.getElementById('login-username-input');
        const username = input.value.trim() || 'busker_user';
        const isNew = !localStorage.getItem(`bb_profile_${username}`);
        this.loadUser(username);
        this.syncUI();
        this.save();
        if (isNew) Router.go('onboarding');
        else Router.go('home');
      },

      loadUser(username) {
        this.currentUser = username;
        localStorage.setItem('babybusker_last_user', username);
        const saved = localStorage.getItem(`bb_profile_${username}`);
        if (saved) {
          try { this.data = JSON.parse(saved); } catch(e) {}
        } else {
          this.data.username = username;
        }
      },

      save() {
        if (!this.currentUser) return;
        localStorage.setItem(`bb_profile_${this.currentUser}`, JSON.stringify(this.data));
        this.syncUI();
      },

      selectPrimaryInstrument(inst) {
        this.data.primaryInstrument = inst;
        if (!this.data.activeInstruments.includes(inst)) {
          this.data.activeInstruments.push(inst);
        }
        this.save();
        Router.go('home');
      },

      openActiveStudio() {
        const inst = this.data.primaryInstrument || 'voice';
        if (inst === 'voice') Router.go('voice-hub');
        else Router.go(`${inst}-hub`);
      },

      recordScore(exerciseKey, roundIdx, scorePct) {
        const key = `${exerciseKey}_${roundIdx}`;
        this.data.scores[key] = Math.round(scorePct);
        this.save();
      },

      getScore(exerciseKey, roundIdx) {
        const key = `${exerciseKey}_${roundIdx}`;
        return this.data.scores[key] || null;
      },
	recordTheoryScore(gameKey, roundIdx, scorePct) {

    const key = `${gameKey}_${roundIdx}`;

    this.data.scores[key] = Math.round(scorePct);

    this.save();
},

getTheoryScore(gameKey, roundIdx) {

    const key = `${gameKey}_${roundIdx}`;

    return this.data.scores[key] || null;
},
      syncUI() {
        document.getElementById('header-username').textContent = this.data.username || "Guest";
        
        const inst = this.data.primaryInstrument || 'voice';
        const titles = {
          voice: { icon: "🎙️", name: "Singing & Voice Studio", desc: "Discover range, clean attack, intervals and resonance." },
          guitar: { icon: "🎸", name: "Acoustic Guitar Studio", desc: "Standard E-A-D-G-B-E tuning, frets & chord shapes." },
          piano: { icon: "🎹", name: "Piano & Keys Studio", desc: "88 keys, finger numbers 1-5, and two-hand balance." },
          ukulele: { icon: "🪕", name: "Ukulele Studio", desc: "4 strings & island strumming rhythms." },
          drums: { icon: "🥁", name: "Drums & Rhythm Studio", desc: "Groove pocket, kick/snare and limb coordination." },
          trumpet: { icon: "🎺", name: "Trumpet & Brass Studio", desc: "3 valves, embouchure buzzing & harmonic series." }
        };

        const current = titles[inst] || titles.voice;
        document.getElementById('home-primary-title').textContent = `${current.icon} ${current.name}`;
        document.getElementById('home-primary-desc').textContent = current.desc;

        const grid = document.getElementById('home-other-instruments-grid');
        grid.innerHTML = '';
        Object.keys(titles).forEach(k => {
          if (k !== inst) {
            const card = document.createElement('div');
            card.className = 'hub-card';
            card.style.padding = '12px';
            card.innerHTML = `
              <div style="font-size: 20px; margin-bottom: 2px;">${titles[k].icon}</div>
              <div style="font-weight: 700; font-size: 13px;">${titles[k].name.split(" ")[0]}</div>
            `;
            card.onclick = () => {
              if (k === 'voice') Router.go('voice-hub');
              else Router.go(`${k}-hub`);
            };
            grid.appendChild(card);
          }
        });

        if (this.data.calibration && this.data.calibration.isCalibrated) {
          const c = this.data.calibration;
          const lowName = NOTE_NAMES[c.lowestMidi % 12] + (Math.floor(c.lowestMidi / 12) - 1);
          const highName = NOTE_NAMES[c.peakMidi % 12] + (Math.floor(c.peakMidi / 12) - 1);
          document.getElementById('profile-range-tag').textContent = `${lowName} – ${highName}`;
        }

        MeProfileUI.renderVaultScores();
      },

      logout() {
        localStorage.removeItem('babybusker_last_user');
        Router.go('launch');
      }
    };

    /* ------------------------------------------------------------
       3. ME PROFILE VAULT ACCORDION

          const calText = cal.isCalibrated ? `${NOTE_NAMES[cal.lowestMidi % 12]} to ${NOTE_NAMES[cal.peakMidi % 12]}` : 'Uncalibrated';
          c1.innerHTML = `
            <div class="score-row"><span>Mountain High (Range)</span><strong>${calText}</strong></div>
            <div class="score-row"><span>The Beacon (Round 1)</span><strong>${ProfileManager.getScore('beacon', 0) ? ProfileManager.getScore('beacon', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Beacon (Round 2)</span><strong>${ProfileManager.getScore('beacon', 1) ? ProfileManager.getScore('beacon', 1) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Hold (Round 1)</span><strong>${ProfileManager.getScore('hold', 0) ? ProfileManager.getScore('hold', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Hold (PR Duration)</span><strong>${localStorage.getItem('babybusker_hold_pr') || '0.0'}s</strong></div>
          `;
        }

        const c2 = document.getElementById('vault-content-2');
        if (c2) {
          c2.innerHTML = `
            <div class="score-row"><span>The Ribbon (Round 1 - Soft)</span><strong>${ProfileManager.getScore('ribbon', 0) ? ProfileManager.getScore('ribbon', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Ribbon (Round 2 - Loud)</span><strong>${ProfileManager.getScore('ribbon', 1) ? ProfileManager.getScore('ribbon', 1) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Ribbon (Round 3 - Swell)</span><strong>${ProfileManager.getScore('ribbon', 2) ? ProfileManager.getScore('ribbon', 2) + '%' : '—'}</strong></div>
          `;
        }

        const c3 = document.getElementById('vault-content-3');
        if (c3) {
          c3.innerHTML = `
            <div class="score-row"><span>The Steps (Round 1)</span><strong>${ProfileManager.getScore('steps', 0) ? ProfileManager.getScore('steps', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>The Steps (Round 2)</span><strong>${ProfileManager.getScore('steps', 1) ? ProfileManager.getScore('steps', 1) + '%' : '—'}</strong></div>
            <div class="score-row"><span>Resonance Chamber (Dyads)</span><strong>${ProfileManager.getScore('resonance', 0) ? ProfileManager.getScore('resonance', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>Resonance Chamber (Triads)</span><strong>${ProfileManager.getScore('resonance', 1) ? ProfileManager.getScore('resonance', 1) + '%' : '—'}</strong></div>
          `;
        }

        const c4 = document.getElementById('vault-content-4');
        if (c4) {
          c4.innerHTML = `
            <div class="score-row"><span>Echo Chamber (Motifs)</span><strong>${ProfileManager.getScore('echo', 0) ? ProfileManager.getScore('echo', 0) + '%' : '—'}</strong></div>
            <div class="score-row"><span>Echo Chamber (Phrases)</span><strong>${ProfileManager.getScore('echo', 3) ? ProfileManager.getScore('echo', 3) + '%' : '—'}</strong></div>
          `;
        }
      }
    };
/* ------------------------------------------------------------
       16. RANGE PROFILE RENDERER
       ------------------------------------------------------------ */
    const RangeProfile = {
      render() {
        const cal = ProfileManager.data.calibration;
        if (!cal || !cal.isCalibrated) return;

        const lowName = NOTE_NAMES[cal.lowestMidi % 12] + (Math.floor(cal.lowestMidi / 12) - 1);
        const highName = NOTE_NAMES[cal.peakMidi % 12] + (Math.floor(cal.peakMidi / 12) - 1);
        const anchorName = NOTE_NAMES[cal.anchorMidi % 12] + (Math.floor(cal.anchorMidi / 12) - 1);

        const semitones = cal.peakMidi - cal.lowestMidi;
        const octaves = (semitones / 12).toFixed(1);

        document.getElementById('sweetspot-total-notes').textContent = `${lowName} – ${highName}`;
        document.getElementById('sweetspot-octaves').textContent = `${octaves} Octaves`;
        document.getElementById('sweetspot-comfort-notes').textContent = `${anchorName} (Anchor)`;
        document.getElementById('sweetspot-summit-notes').textContent = `${highName} (Peak)`;
      }
    };

    window.addEventListener('DOMContentLoaded', () => {
      TheorySystem.setLevel(1);
      ProfileManager.init();
    });
const MeProfileUI = {
    toggleVault(secNum) {
        const sec = document.getElementById(`vault-sec-${secNum}`);
        if (sec) sec.classList.toggle('open');
    },

    renderVaultScores() {
        const sections = [
            'vault-content-1',
            'vault-content-2',
            'vault-content-3',
            'vault-content-4'
        ];

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.innerHTML.trim()) {
                el.innerHTML =
                    '<div class="score-row"><span>No scores yet</span><strong>—</strong></div>';
            }
        });
    }
};
