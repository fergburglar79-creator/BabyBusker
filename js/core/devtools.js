const DevTools = {
    passActiveExercise() {
        const screen = Router.activeScreen;

        VoiceEngine.ensureAudioContext();

        if (screen === 'exercise-beacon') {
            ProfileManager.recordScore('beacon', ExerciseBeacon.currentRoundIdx, 100);
            ExerciseBeacon.showRoundComplete(100);

        } else if (screen === 'exercise-hold') {
            ProfileManager.recordScore('hold', ExerciseHold.currentRoundIdx, 100);
            ExerciseHold.showRoundComplete(100);

        } else if (screen === 'exercise-ribbon') {
            ProfileManager.recordScore('ribbon', ExerciseRibbon.currentRoundIdx, 100);
            ExerciseRibbon.showRoundComplete(100);

        } else if (screen === 'exercise-steps') {
            ProfileManager.recordScore('steps', ExerciseSteps.currentRoundIdx, 100);
            ExerciseSteps.showRoundComplete(100);

       } else if (screen === 'theory-higher-lower') {
          ProfileManager.recordScore('higher_lower', TheoryHigherLower.currentRoundIdx, 100);
          TheoryHigherLower.showRoundComplete(100);
        } else if (screen === 'theory-do-re-mi') {
          ProfileManager.recordScore('doremi', TheoryDoReMi.currentRoundIdx, 100);
          document.getElementById('doremi-modal').classList.add('active');
        } else if (screen === 'theory-steps-skips') {
          ProfileManager.recordScore('stepskip', TheoryStepsSkips.currentRoundIdx, 100);
          document.getElementById('stepskip-modal').classList.add('active');
        } else if (screen === 'resonance-chamber') {
            ProfileManager.recordScore('resonance', ResonanceChamber.currentRoundIdx, 100);
            ResonanceChamber.showRoundComplete(100);

        } else if (screen === 'echo-chamber') {
            ProfileManager.recordScore('echo', EchoMemoryGame.currentRoundIdx, 100);
            EchoMemoryGame.showRoundComplete(100);

        } else if (screen === 'mountain-range-finder') {

            ProfileManager.data.calibration = {
                anchorMidi: 60,
                lowestMidi: 37,
                peakMidi: 72,
                isCalibrated: true
            };

            ProfileManager.save();

            alert("⚡ Range calibrated: C#2 – C5 (Anchor C4)!");

            Router.go('range-profile');

        } else {

            ['beacon', 'hold', 'ribbon', 'steps', 'resonance', 'echo']
                .forEach(exercise => {
                    for (let i = 0; i < 4; i++) {
                        ProfileManager.recordScore(exercise, i, 92 + (i * 2));
                    }
                });

            alert("⚡ 100% test scores injected across all rounds!");

            if (
                window.MeProfileUI &&
                typeof MeProfileUI.renderVaultScores === 'function'
            ) {
                MeProfileUI.renderVaultScores();
            }
        }
    }
};