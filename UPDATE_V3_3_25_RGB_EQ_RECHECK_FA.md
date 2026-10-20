# Korosh Nova V3.3.25 — RGB / Equalizer recheck

- RGB header no longer renders the generic page-title plaque/lamp under the main logo.
- RGB initial tab and color target now restore from saved state.
- RGB settings brightness/speed send the existing light commands immediately.
- Lotus page retains all 143 effect assets/IDs supplied in `Lotus_Effect_GIFs_ONLY_V1.zip`.
- The supplied Lotus ZIP contains effect GIF previews only; it does not contain the controller APK/GATT protocol, so no BLE neon characteristic was invented.
- Equalizer/DJ native Android module remains the current custom implementation: dual MediaPlayer decks, per-deck EQ/rate/gain/bass, cue/loop, crossfader, master, song library, touch monitor and mix save/load.
- Real Android build/device validation is still required before calling the release crash-free.
