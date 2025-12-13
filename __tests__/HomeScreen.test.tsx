import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import HomeScreen from '../src/screens/HomeScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../src/services/api', () => ({
  getRecentImages: jest.fn(async () => ({ photos: [], timestamp: Date.now(), fromCache: true })),
}));

describe('HomeScreen', () => {
  test('renders correctly (snapshot)', async () => {
    const navigation = { navigate: jest.fn() };

    let tree;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<HomeScreen navigation={navigation} />);
    });

    expect(tree!.toJSON()).toMatchSnapshot();
  });
});
