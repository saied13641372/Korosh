# Noba 1.7.0 — final point-by-point audit

## UI / interaction
- Seven bottom navigation destinations remain present; control room is not protected by default and does not hide the navigation.
- All major controls use pressable/touchable components; slider-like controls use a pan responder.
- RGB and galaxy color selectors are separate designs, touch-drag enabled, animated, and persist the selected color into light settings.
- RGB and galaxy selectors are intentionally visually different: RGB uses a rotating segmented color ring; galaxy uses orbital rings and stars.
- The selected color is also available through quick color chips.

## Music
- آوای نوا requests audio-library permission and automatically imports phone audio on first entry when permission is granted.
- Manual phone-library refresh remains available.
- The music player is global and is not owned by the music page component, so leaving the page does not release the player.
- Background playback is enabled in expo-audio config.
- iOS audio background mode is configured.
- Lock-screen controls are activated for the player and audio interruption mode is `doNotMix`.
- A dedicated full-stop control was added; ordinary playback button is now pause/resume.
- Google search remains available in آوای نوا and opens Google with the entered song/artist query.

## USB
- The USB page can request Android Storage Access Framework directory access.
- The selected directory is persisted.
- The app scans the selected USB directory recursively (up to depth 3 / 500 tracks) for common audio formats.
- USB audio files are displayed as an interactive playlist and can be sent to the global music player.
- USB music is kept in a separate playlist from phone music.
- True automatic physical USB detection is not claimed; Android SAF requires the user to grant the folder access.

## Software/backend wiring
- Security endpoints remain wired to the configured backend URL when `EXPO_PUBLIC_AI_BACKEND_URL` is provided.
- If no backend URL exists, the app uses the existing local PIN fallback rather than pretending a remote security core is connected.
- AI backend remains optional and is not faked without a real endpoint/API credential.
- Hardware-only Bluetooth/ESP32, Wi-Fi device endpoints, direct camera-to-USB hardware recording, and speaker-side audio output remain intentionally unforced until the physical hardware path exists.

## Build / static verification
- App.js: `node --check` OK.
- server.mjs: `node --check` OK.
- index.js: `node --check` OK.
- app.json / package.json / eas.json: JSON OK.
- Local App.js asset `require()` references: all resolve.
- App.js stylesheet references: all resolve.
- Backend smoke test: `/api/health` OK; security PIN verify OK; empty music search correctly rejected.
- Final ZIP integrity: `unzip -t` OK.

## Release
- App version: 1.7.0
- Android versionCode: 18
- Archive: Noba.zip
