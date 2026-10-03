    const Router = {
      activeScreen: 'launch',
      go(screenId) {
        VoiceEngine.ensureAudioContext();
        VoiceEngine.stopDrone();

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`screen-${screenId}`);
        if (target) {
          target.classList.add('active');
          this.activeScreen = screenId;
        }

        const isHubOrGame = screenId !== 'launch' && screenId !== 'onboarding';
        document.getElementById('app-header').style.display = isHubOrGame ? 'flex' : 'none';
        document.getElementById('global-nav').style.display = isHubOrGame ? 'flex' : 'none';

        document.querySelectorAll('.nav-tab').forEach(tab => {
          tab.classList.remove('active');
          const txt = tab.innerText.toLowerCase();
          if ((screenId.includes('home') || screenId.includes('theory') || screenId.includes('voice') || screenId.includes('guitar') || screenId.includes('piano') || screenId.includes('ukulele') || screenId.includes('drums') || screenId.includes('trumpet') || screenId.includes('mountain') || screenId.includes('steps') || screenId.includes('beacon') || screenId.includes('hold') || screenId.includes('ribbon') || screenId.includes('resonance') || screenId.includes('echo')) && txt.includes('home')) {
            tab.classList.add('active');
          }
          if (screenId === 'me' && txt.includes('me')) tab.classList.add('active');
        });

        // Initialize screens properly
        if (screenId === 'mountain-range-finder') MountainRangeFinder.init();
        if (screenId === 'exercise-steps') ExerciseSteps.init();
        if (screenId === 'exercise-beacon') ExerciseBeacon.init();
        if (screenId === 'exercise-hold') ExerciseHold.init();
        if (screenId === 'exercise-ribbon') ExerciseRibbon.init();
        if (screenId === 'echo-chamber') EchoMemoryGame.init();
        if (screenId === 'resonance-chamber') ResonanceChamber.init();
        if (screenId === 'range-profile') RangeProfile.render();
        if (screenId === 'voice-trainer-hub') VoiceTrainer.init();
        if (screenId === 'free-sing') FreeSing.start();
if (screenId === 'theory-hub')
    TheoryHub.init();

if (screenId === 'theory-higher-lower')
    TheoryHigherLower.init();

if (screenId === 'theory-do-re-mi')
    TheoryDoReMi.init();

if (screenId === 'theory-steps-skips')
    TheoryStepsSkips.init();
      }
    };
