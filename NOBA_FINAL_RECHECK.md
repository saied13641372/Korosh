# Nava 1.7.1 — full recheck

- Security/PIN prompts are disabled for this audit build, including migration of older saved settings; the visible security card is replaced by an explicit disabled notice.
- Phone music and USB music remain separate data sources; each page uses its own playlist and source-aware global player state.
- Phone artwork rotates continuously while playback is active; the three visual effects are distinct: rotation, orbit, wave.
- Three default phone artwork presets are selectable; gallery artwork and custom nav images use contain to avoid crop/zoom.
- Backgrounds use contain to preserve the full image.
- Decorative background layers do not intercept touch input; major pressable controls have hit slop and the bottom navigation is raised above content.
- Wi-Fi status control now performs an actual connection check instead of a no-op.
- Equalizer uses three vertical touch/drag columns labeled بیس، مید، تریبل.
- Splash signature rises from the bottom during the five-second splash.
- Web output is configured as a single-page export for EAS Hosting.
- RGB structural behavior was not rewritten in this pass; only shared no-zoom/touch-safety presentation changes apply.
