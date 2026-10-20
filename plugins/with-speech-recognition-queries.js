const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withSpeechRecognitionQueries(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    if (!manifest.queries) manifest.queries = [];
    const queries = manifest.queries;
    const actionName = 'android.speech.RecognitionService';
    const exists = queries.some((query) =>
      Array.isArray(query.intent) && query.intent.some((intent) =>
        Array.isArray(intent.action) && intent.action.some((action) => action.$ && action.$.name === actionName)
      )
    );
    if (!exists) {
      queries.push({
        intent: [{
          action: [{ $: { name: actionName } }],
        }],
      });
    }
    return mod;
  });
};
