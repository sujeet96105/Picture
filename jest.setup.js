import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');

  // The mock for call immediately calls the callback which is incorrect
  // in the context of tests. This prevents warnings.
  Reanimated.default.call = () => {};

  return Reanimated;
});

jest.mock('react-native-reanimated/src/Animated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Animated = require('react-native-reanimated/mock');
  return Animated;
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
