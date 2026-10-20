const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withKoroshAudioService(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] || (manifest.manifest['uses-permission'] = []);
    const addPermission = name => {
      if (!permissions.some(p => p.$?.['android:name'] === name)) permissions.push({ $: { 'android:name': name } });
    };
    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');

    const app = manifest.manifest.application?.[0];
    if (!app) return config;
    app.service = app.service || [];
    const name = 'expo.modules.djaudio.KoroshMusicPlaybackService';
    const existing = app.service.find(s => s.$?.['android:name'] === name);
    const attrs = {
      'android:name': name,
      'android:exported': 'false',
      'android:foregroundServiceType': 'mediaPlayback'
    };
    if (existing) existing.$ = { ...existing.$, ...attrs };
    else app.service.push({ $: attrs });
    return config;
  });
};
