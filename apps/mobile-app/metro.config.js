const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Zustand's ESM web entry contains import.meta.env. Metro emits the web
// bundle as a classic script, so prefer the React Native/CommonJS condition.
config.resolver.unstable_conditionNames = ["react-native", "require"];

module.exports = config;
