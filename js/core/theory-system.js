    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const SOLFEGE = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Fi", "Sol", "Le", "La", "Te", "Ti"];

    function midiToFrequency(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
    function frequencyToMidi(frequency) { return 69 + 12 * Math.log2(frequency / 440); }

    const TheorySystem = {
      level: 1,
      setLevel(lvl) {
        this.level = lvl;
        document.querySelectorAll('#screen-theory-hub .hub-card').forEach((c, i) => {
          const tag = c.querySelector('.theory-active-tag');
          if (tag) {
            tag.textContent = (i + 1 === lvl) ? "Active" : "Select";
            tag.style.color = (i + 1 === lvl) ? "var(--success-green)" : "var(--text-muted)";
          }
        });
      },
      formatNote(midi, rootMidi = null) {
        const rounded = Math.round(midi);
        const noteIndex = ((rounded % 12) + 12) % 12;
        const octave = Math.floor(rounded / 12) - 1;
        if (this.level === 1) {
          const diff = rootMidi ? ((rounded - rootMidi) % 12 + 12) % 12 : noteIndex;
          return SOLFEGE[diff] || "Do";
        } else {
          return `${NOTE_NAMES[noteIndex]}${octave}`;
        }
      }
    };
console.log("Theory System Loaded");