/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// webpack.config.js
const createExpoWebpackConfig = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfig(env, argv);

  // Add WASM support
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'javascript/auto',
    loader: 'file-loader',
    options: {
      name: 'static/js/[name].[contenthash:8].[ext]',
    },
  });

  // Add fallback for crypto module
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
  };

  return config;
};