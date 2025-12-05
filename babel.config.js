module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      ['@babel/plugin-transform-runtime', { regenerator: true, helpers: true }],
      'babel-plugin-transform-typescript-metadata',
      ['react-native-reanimated/plugin', {}],
      ['react-native-worklets/plugin', {}, 'react-native-worklets-plugin'],
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env",
        "allowUndefined": true
      }]
    ],
  };
}