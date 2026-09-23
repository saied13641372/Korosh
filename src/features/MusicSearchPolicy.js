export const MusicSearchPolicy = {
  enabled: true,
  provider: 'Google via secure backend',
  intent: 'SEARCH_AND_PLAY_MUSIC',
  legalPlaybackOnly: true,
  apiSecretsClientSide: false,
  backendRequired: true,
};

export function buildMusicSearchIntent(query) {
  return {
    type: MusicSearchPolicy.intent,
    query: String(query || '').trim(),
    playback: 'legal-source-only',
  };
}
