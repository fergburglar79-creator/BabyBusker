const MusicStaff = {

    draw(
        canvasId,
        notes = [],
        compact = true
    ) {

        const canvas =
            document.getElementById(
                canvasId
            );

        if (!canvas) return;

        const ctx =
            canvas.getContext(
                "2d"
            );

        const w =
            canvas.width =
            canvas.offsetWidth;

        const h =
            canvas.height =
            canvas.offsetHeight;

        ctx.clearRect(
            0,
            0,
            w,
            h
        );

        const config = compact

            ? {

                top: 15,

                lineGap: 8,

                noteSize: 5,

                noteSpacing: 55,

                pitchScale: 2.5
            }

            : {

                top: 40,

                lineGap: 20,

                noteSize: 10,

                noteSpacing: 80,

                pitchScale: 5
            };

        /* staff lines */

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            const y =
                config.top +
                (i * config.lineGap);

            ctx.beginPath();

            ctx.moveTo(
                15,
                y
            );

            ctx.lineTo(
                w - 15,
                y
            );

            ctx.strokeStyle =
                "#666";

            ctx.lineWidth = 1;

            ctx.stroke();
        }

        /* notes */

        notes.forEach(
            (
                midi,
                index
            ) => {

                const offset =
                    midi - 60;

                const noteY =
                    config.top +
                    (4 * config.lineGap) -
                    (offset * config.pitchScale);

                const noteX =
                    70 +
                    (index * config.noteSpacing);

                ctx.beginPath();

                ctx.arc(
                    noteX,
                    noteY,
                    config.noteSize,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle =
                    "#7e22ce";

                ctx.fill();
            }
        );
    }

};
const MusicKeyboard = {

    render(containerId) {

        const container =
            document.getElementById(
                containerId
            );

        if (!container) return;

        container.innerHTML = `

            <div class="piano-keyboard-container">

                <div class="piano-white-key"
                     id="key-60"
                     data-midi="60"></div>

                <div class="piano-white-key"
                     id="key-62"
                     data-midi="62"></div>

                <div class="piano-white-key"
                     id="key-64"
                     data-midi="64"></div>

                <div class="piano-white-key"
                     id="key-65"
                     data-midi="65"></div>

                <div class="piano-white-key"
                     id="key-67"
                     data-midi="67"></div>

                <div class="piano-white-key"
                     id="key-69"
                     data-midi="69"></div>

                <div class="piano-white-key"
                     id="key-71"
                     data-midi="71"></div>

                <div class="piano-white-key"
                     id="key-72"
                     data-midi="72"></div>

                <div class="piano-black-key"
                     id="key-61"
                     data-midi="61"
                     style="left:8.5%;"></div>

                <div class="piano-black-key"
                     id="key-63"
                     data-midi="63"
                     style="left:21%;"></div>

                <div class="piano-black-key"
                     id="key-66"
                     data-midi="66"
                     style="left:46%;"></div>

                <div class="piano-black-key"
                     id="key-68"
                     data-midi="68"
                     style="left:58.5%;"></div>

                <div class="piano-black-key"
                     id="key-70"
                     data-midi="70"
                     style="left:71%;"></div>

            </div>
        `;
    },

    highlight(midi) {

        document
            .querySelectorAll(
                ".piano-white-key,.piano-black-key"
            )
            .forEach(key =>
                key.classList.remove(
                    "active-note"
                )
            );

        const key =
            document.getElementById(
                `key-${midi}`
            );

        if (key) {
            key.classList.add(
                "active-note"
            );
        }
    },

    clear() {

        document
            .querySelectorAll(
                ".active-note"
            )
            .forEach(key =>
                key.classList.remove(
                    "active-note"
                )
            );
    }
};