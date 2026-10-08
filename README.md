# ChocoHertz

A compact, matte chocolate-and-caramel audio sandbox. Plain HTML, CSS, JavaScript, and Web Audio; no build step or backend.

## Offline installation and GitHub Pages

All app code, icons, and fonts are included. No account, CDN, package installation, or build is required.

1. Unzip ChocoHertz.zip. Put the **contents** of this folder at the root of your GitHub repository.
2. In repository Settings → Pages, deploy from your main branch and the root folder.
3. Open the published HTTPS site once while connected. Let it finish loading; all app assets are cached for offline use.
4. Use your browser’s Install app / Add to Home Screen option. A small download button also appears in supported browsers. The installed app opens in its own window and works offline after the initial cache completes.

For a local preview, run `node serve.cjs` from this folder and open http://127.0.0.1:4173/. Directly opening index.html works for the sound sandbox, but browser installation requires localhost or HTTPS. The in-app preview browser may not expose OS installation; use a browser with app installation support.

After changing source files, run `node prepare-offline.cjs` before uploading. This refreshes the offline cache version. Existing users see an update arrow when the new version is ready; selecting it stops playback and reloads the app. Relative paths support GitHub project repositories as well as root sites.

## Automatic saving and undo

Settings, harmonizer voices, key sounds, sequences, panel positions/sizes, open panels, and the last 50 undo/redo states save on this device. Recipes keep their own local library. Reopening restores the studio silently; playback and held notes never start automatically.

Use the round ↶ / ↷ buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, or Ctrl+Y. A drag or continuous input is grouped into one edit. Undo/redo restores the workspace silently. Keyboard shortcuts preserve normal text editing inside inputs. Recipe-library additions/deletions and playback transport are not part of workspace history.

Storage belongs to the browser and site address. Moving from localhost to GitHub Pages starts a separate workspace. Clearing site data removes local saves. Export named recipes from Recipe Book for portable backups. Private browsing or storage limits can prevent saving; the app displays a notice if writing fails.

Bundled fonts are DM Sans and DM Serif Display, licensed under SIL Open Font License; license files are in fonts/.

## Open it

Open `index.html` in a current browser. The app starts silently and restores your last workspace (Frequency and Master volume are open on a first visit). Use the small play button beside the dock to start continuous tones. Keep device volume comfortable.

## The workspace

The title stays on the left and the app-logo dock stays on the right. Hover a logo for its name. Each newly opened app appears in a random desktop position. Drag its header to arrange it, and drag its corner to resize. Movement and resizing snap to an invisible eight-pixel grid. Default panels are 304–320 pixels wide.

Arrow keys move a focused panel header or resize a focused corner. Escape closes and disables the focused app. On screens at or below 640 pixels, apps stack to keep controls usable. Contents reflow at narrow sizes and scroll vertically when necessary. Opening an already visible app brings it forward. Closing and reopening gives it a new random placement. Layouts and open panels are saved automatically between page loads.

## Dials

Every tone uses a large primary **Hz dial**, with a smaller **volume dial** beside it. This includes the main oscillator, all five optional harmonizer layers, and individual key sounds.

Drag around a dial in a circular motion: clockwise increases, counterclockwise decreases. A full 360-degree turn covers its range (logarithmic for Hz, linear for volume). The pointer wraps smoothly at the top and values stop at their limits. Hold Shift for finer changes. Arrow keys change its value; Home and End jump to the endpoints. Exact numbers are editable below each dial. Frequency spans 20–20,000 Hz. Master volume controls the entire output, in addition to individual voice levels.

## Apps and close behavior

| App | Behavior | When closed |
| --- | --- | --- |
| Frequency | Main oscillator with four wave shapes and its own volume | Its oscillator is stopped and disconnected |
| Master volume | Final output level, mute, and live waveform/meter | Every active voice stops and output is disabled until reopened |
| Harmonizer | Up to five additional tones with independent frequency, waveform, and volume | All harmonizer oscillators stop |
| Key sounds | Independent, polyphonic notes with individual Hz, waveform, volume, and assigned key | Key bindings disable; held notes and release tails stop |
| Spatial room | HRTF 3D position, height, distance falloff, and 360-degree orbit | Orbit stops; 3D processing is bypassed and disconnected |
| Pan LFO | Audio oscillator modulates stereo pan at 0.05–10 Hz | The modulation oscillator stops; panning is bypassed |
| ADSR envelope | Attack, decay, sustain, and release | ADSR is bypassed; short smoothing prevents abrupt clicks |

Closed apps do not keep generating sound or updating their canvases. Settings remain available in memory when reopened. Audio processing suspends when no voices or release tails remain. Closing Master volume does not automatically restart tones when you reopen it: press Play or play a key sound.

## Seven more studio apps

| App | What it does | When closed |
| --- | --- | --- |
| Sequencer | 16 steps, rests or saved key sounds, 40–240 BPM, eighth/sixteenth steps, and gate length | Scheduled notes, release tails, and the scheduler stop |
| Recipe Book | Save up to 30 named rooms locally; import/export a JSON collection | The saved collection stays on your device; no audio runs |
| Echo Room | Delay time, feedback, delay mix, reverb mix, and room decay | Wet routing disconnects and all effect tails are cleared |
| Filter | Low-pass, high-pass, or band-pass; rotary cutoff and resonance | Filtering is bypassed |
| Noise Kitchen | Blend independent white, pink, and brown noise | Every noise source stops |
| Frequency Sweep | Logarithmic travel between two frequencies; loop, bounce, or one journey | Automatic movement stops at its current frequency |
| Spectrum | Log-frequency bars or line display of the final output | FFT drawing stops |

The dock scrolls sideways on narrower screens. Every logo keeps its accessible name and hover tooltip.

### Sequencer

Choose a key sound or rest for each of the sixteen steps. Its notes are independent of both the continuous tones and manual keyboard notes: Key sounds can remain closed. The scheduler looks ahead 120 milliseconds using the audio clock, and a playhead follows scheduled notes. A note's attack and decay shorten to fit very short gates; release follows the ADSR setting. Changes to tempo, steps, or gate apply to upcoming notes. Missing/deleted key assignments become rests.

### Recipes

A recipe contains main and harmonizer settings, all key sounds, effects, noise blend, sweep path, sequence pattern, and panel positions/sizes/open states. Save with a name in Recipe Book. Loading stops existing playback and restores the recipe **silently**. Press the relevant Play buttons when ready. Recipe Book stays open after loading so you can choose another room.

Export makes a local JSON file; import validates names, ranges, layouts, and key references. This does not send data to a server. Stored macro settings from previous versions remain compatible. Export recipes before clearing browser storage.

### Effects, noise, and sweeps

Filter affects the shared mix before spatial processing; Echo Room follows spatial/LFO panning. Echo Room combines a feedback delay with a generated stereo convolution impulse. The feedback cap is 70%; a compressor after the effects controls peaks. Closing Echo Room clears tails immediately; otherwise the audio context stays awake long enough for tails to decay, up to 20 seconds after the last voice.

Noise is generated locally and loops three-second buffers with separate gains. It can run without continuous tones. Sweep moves the main oscillator, so Frequency and Master volume must be open. A sweep can start the continuous tone transport; closing Sweep stops only its automation. Manual frequency edits take control back. Travel time is per journey/leg.

Spectrum measures the final post-master signal using a 2048-point FFT. Peak labels identify a frequency bin, not a precision tuner. At a 48 kHz sample rate, bin spacing is approximately 23.4 Hz. Spectrum and output scopes show silence when the audio context is suspended.

Closing Master volume stops the sequencer, noise, sweeps, continuous tones, and key notes. Leaving the browser tab also stops playback and automation.

## Key sounds are independent instruments

Hold an assigned letter or number to play its note; release to fade it out. Multiple keys can sound together, with or without the main oscillator and harmonizer. Each note has its own oscillator and envelope, and **never changes the main frequency or restarts the main envelope**.

Click a letter pad for a short audition. Macros are ignored while editing a text/number field, using a select, or holding Ctrl/Alt/Meta. Key sounds release when the window loses focus, so keys cannot get stuck. The panel must be open and Master volume must be open to play keys.

Assign up to 20 unique keys. Their frequencies, wave shapes, levels, and key assignments persist locally. Older frequency-only macro settings migrate automatically. Other audio settings reset on reload. If ADSR is closed, notes use short fades and full sustain; when open, each new key note gets the current ADSR settings.

The transport play/stop button controls continuous tones. Key notes remain separately playable; Master mute or closing Master volume silences everything.

## Audio and visual details

Continuous tones run through a shared envelope; key notes each have their own envelope. Both routes feed a common mix, optional spatial processing, optional stereo LFO, then master volume. Mix normalization reserves headroom for at least six voices and accounts for additional held key notes and release tails. Device volume and hardware still determine listening loudness.

Main, harmonizer, and key scopes show live samples while active and idealized previews while idle. Scopes display an eight-millisecond window; small waveform buttons are slowed illustrations. The master waveform and RMS meter measure final output. The LFO dot uses actual modulation samples. Frequencies are limited below the audio device's Nyquist frequency when needed.

Spatial audio depends on headphones, browser HRTF implementation, and listener. This is not a calibrated hearing test. Fonts are bundled locally and work offline. No microphone permission or account is required.

## Host on GitHub Pages

1. Create a repository such as `chocohertz`.
2. Upload **all files in this folder** to the repository root, preserving `tests/`. The additional studio scripts are required.
3. In **Settings → Pages**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.
5. Open the published URL GitHub displays, usually `https://YOUR-USERNAME.github.io/chocohertz/`.

Assets use relative paths. No API keys, dependencies, or build command are needed.

## Development and checks

- `index.html`: minimal shell and panel template
- `style.css`: app logos, matte theme, responsive panels and dials
- `logo.svg`, `favicon.svg`: matching vector cacao-C / sound-wave brand marks
- `audio.js`: audio routing, independent notes, envelopes, and lifecycle
- `dial.js`: rotary pointer math with smooth 360-degree wrapping
- `app.js`: panel management, knobs, key bindings, and visualizations
- `extras-config.js`: new app definitions, logos, and default settings
- `studio-audio.js`: filter/echo routing, noise, and scheduled sequencer notes
- `studio.js`: new app controls, recipe storage, sequencing, sweeps, and spectrum
- `recipe-data.js`: validated, silent recipe restoration
- `tests/*.test.cjs`: dependency-free regression tests

Run `node tests/audio.test.cjs`, `node tests/dial.test.cjs`, `node tests/studio.test.cjs`, and `node tests/recipes.test.cjs`. Mock audio-node tests cover independent polyphony, unchanged base frequency/envelope, per-panel shutdown, release-tail cleanup, effect bypass, master shutdown, envelope timing, and idle suspension. Browser checks cover dial changes, independent key audition, compact panel layouts, and narrow-screen reflow. Hardware acoustic quality is not verified.

Additional checks cover effect routing/bypass, delay feedback disconnection, finite colored-noise buffers, independent audio-clock sequencing, master shutdown, recipe validation, silent restore, and 360-degree dial wrapping. Browser checks verified the seven new apps at 260-pixel widths and a 320-pixel phone viewport, with no horizontal panel overflow.


## Five musical tools

| App | Controls | Close behavior |
| --- | --- | --- |
| Arpeggiator | Root Hz, secondary volume, five chord shapes, four waveforms, tempo, 1–3 octaves, up/down/bounce/random eighth-note patterns | Stops its clock and scheduled notes |
| Chord palette | Root Hz, secondary volume, major/minor/seventh/sus2/sus4, waveform, and note duration | Stops the chord |
| Metronome | 40–240 BPM, 1–12 beats per bar, accented first beat, click volume | Stops its clock and scheduled clicks |
| Scale lock | Twelve tonics, major/minor/pentatonic/chromatic scales | Bypasses pitch snapping |
| A/B compare | Capture and load two complete sound setups | Retains both slots without any background activity |

The three instruments play independently alongside the existing studio and share Master volume, mute, and the effects chain. Their activity canvases follow scheduled notes. Closing Master volume, hiding the page, loading a recipe, or undoing stops them. Playback never resumes automatically on reload. Arpeggiator and metronome tempo changes affect upcoming notes within the scheduling lookahead (120 ms).

Scale Lock changes the audible pitch without rewriting your original Hz settings. Continuous tones retune immediately; key, sequencer, arpeggio, and chord notes snap when created. Click pitch and noise are unaffected. A/B loading is silent and preserves the current panel layout and open panels; press the desired instrument's play button to audition. A/B slots, new app settings, and panel positions are included in local saving, recipes, and undo/redo.
