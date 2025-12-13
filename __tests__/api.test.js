import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getRecentImages } from '../src/services/api';

jest.mock('axios');

describe('getRecentImages (cache)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns cached data when within TTL and sets fromCache=true', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const cached = {
      photos: [{ id: '1', title: 't', url_s: 'u' }],
      timestamp: now - 60 * 1000,
      fromCache: false,
    };

    await AsyncStorage.setItem('@FlickrImages:p1:pp20', JSON.stringify(cached));

    const res = await getRecentImages(1, 20);

    expect(axios.get).not.toHaveBeenCalled();
    expect(res.photos).toHaveLength(1);
    expect(res.fromCache).toBe(true);
  });

  test('fetches from network, caches, and returns fromCache=false', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    axios.get.mockResolvedValue({
      data: {
        photos: {
          photo: [{ id: '2', title: 'x', url_s: 'y' }],
        },
      },
    });

    const res = await getRecentImages(1, 20);

    expect(axios.get).toHaveBeenCalled();
    expect(res.fromCache).toBe(false);

    const stored = await AsyncStorage.getItem('@FlickrImages:p1:pp20');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.timestamp).toBe(now);
    expect(parsed.photos).toHaveLength(1);
  });

  test('returns cached data when network fails', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const cached = {
      photos: [{ id: '3', title: 't3', url_s: 'u3' }],
      timestamp: now - 10 * 60 * 1000,
      fromCache: false,
    };

    await AsyncStorage.setItem('@FlickrImages:p1:pp20', JSON.stringify(cached));

    axios.get.mockRejectedValue(new Error('Network down'));

    const res = await getRecentImages(1, 20);

    expect(res.photos).toHaveLength(1);
    expect(res.fromCache).toBe(true);
  });
});
