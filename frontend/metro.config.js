const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  tslib: require.resolve('tslib/tslib.js'),
  'tslib/modules': require.resolve('tslib/tslib.js'),
};

module.exports = config;
