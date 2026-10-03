const TheoryHigherLower = {

    score: 0,
    challenge: 0,

    note1: 60,
    note2: 67,

    correctAnswer: "higher",

    init() {

        console.log(
            "Higher Lower Loaded"
        );

        const title =
            document.getElementById(
                "higher-lower-round-title"
            );

        if (title) {

            title.textContent =
                "Round 1: See & Hear";
        }

        if (
            typeof MusicKeyboard !==
            "undefined"
        ) {

            MusicKeyboard.render(
                "higher-lower-keyboard"
            );
        }
    },

    launchGame() {

        this.challenge = 0;
        this.score = 0;

        document
            .getElementById(
                "higher-lower-preflight"
            )
            .classList.add(
                "hidden"
            );

        this.nextQuestion();
    },

    nextQuestion() {

        this.note1 =
            60 +
            Math.floor(
                Math.random() * 12
            );

        const jumps = [
            -7,
            -5,
            -4,
             4,
             5,
             7
        ];

        const jump =
            jumps[
                Math.floor(
                    Math.random() *
                    jumps.length
                )
            ];

        this.note2 =
            this.note1 + jump;

        this.correctAnswer =
            this.note2 > this.note1
                ? "higher"
                : "lower";

        if (
            typeof MusicStaff !==
            "undefined"
        ) {

            MusicStaff.draw(
                "higherLowerStaffCanvas",
                [
                    this.note1,
                    this.note2
                ]
            );
        }

        if (
            typeof MusicKeyboard !==
            "undefined"
        ) {

            MusicKeyboard.highlight(
                this.note2
            );
        }

        document
            .getElementById(
                "higher-lower-progress-label"
            )
            .textContent =
            `Challenge ${this.challenge + 1} of 10`;

        document
            .getElementById(
                "higher-lower-feedback-text"
            )
            .textContent =
            "Listen carefully...";

        this.playNotes();
    },

    async playNotes() {

        document
            .getElementById(
                "higher-lower-status-readout"
            )
            .textContent =
            "Listening...";

        await VoiceEngine.playTone(
            midiToFrequency(
                this.note1
            ),
            0.8
        );

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    700
                )
        );

        await VoiceEngine.playTone(
            midiToFrequency(
                this.note2
            ),
            0.8
        );

        document
            .getElementById(
                "higher-lower-status-readout"
            )
            .textContent =
            "Higher or Lower?";
    },

    handleUserChoice(
        choice
    ) {

        const feedback =
            document.getElementById(
                "higher-lower-feedback-text"
            );

        if (
            choice ===
            this.correctAnswer
        ) {

            this.score++;

            feedback.textContent =
                `✅ Correct! The second note was ${this.correctAnswer}.`;

        } else {

            feedback.textContent =
                `❌ Wrong. The second note was ${this.correctAnswer}.`;
        }

        this.challenge++;

        setTimeout(() => {

            if (
                this.challenge >= 10
            ) {

                document
                    .getElementById(
                        "higher-lower-modal-title"
                    )
                    .textContent =
                    `${this.score}/10`;

                document
                    .getElementById(
                        "higher-lower-modal"
                    )
                    .classList.add(
                        "active"
                    );

            } else {

                this.nextQuestion();
            }

        }, 1200);
    },

    showPreflight() {

        document
            .getElementById(
                "higher-lower-preflight"
            )
            .classList.remove(
                "hidden"
            );
    },

    advanceRound() {

        document
            .getElementById(
                "higher-lower-modal"
            )
            .classList.remove(
                "active"
            );

        this.launchGame();
    }
};