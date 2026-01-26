module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@core': './src/core',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@store': './src/store',
          '@theme': './src/theme',
          '@utils': './src/utils',
        },
      },
    ],
  ],
};
