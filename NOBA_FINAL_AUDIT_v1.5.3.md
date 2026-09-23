# NOBA 1.5.3 — final engineering pass

- Visual controls were reworked from Bluetooth through AI so page controls use distinct palettes, shapes, depth/3D transforms, glow layers, and touch animations instead of one repeated control skin.
- Bluetooth page keeps the large connection core and adds a separate whole-speaker power control that is intentionally smaller than the Bluetooth core and uses its own orbit animation and power artwork.
- Speaker power state is persisted; turning power off pauses in-app music and stops speech, and a best-effort `/api/power` command is sent directly to the configured ESP32 Wi-Fi endpoint when available.
- AI send, voice, personality, output-route, music-playlist, RGB/galaxy tab, color, and effect controls were converted to dedicated cosmic controls.
- Previously referenced splash styles that were missing from the stylesheet were added.
- Local asset references were revalidated; no missing `require()` targets were found.
- ZIP integrity, JSON parsing, JavaScript/JSX transpile diagnostics, local asset integrity, and server syntax were rechecked after the modifications.
- Expo audio configuration continues to use `doNotMix`, consistent with Expo's documented audio-session behavior for lock-screen playback.
- Release version is 1.5.3 / Android versionCode 10.
