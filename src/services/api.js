import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FLICKR_API_KEY = '6f102c62f41998d151e5a1b48713cf13';
const FLICKR_API_URL = 'https://api.flickr.com/services/rest/';
const CACHE_KEY_PREFIX = '@FlickrImages';

export const getRecentImages = async (page = 1, perPage = 20) => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}:p${page}:pp${perPage}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    const now = Date.now();
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      if (parsed?.timestamp && (now - parseInt(String(parsed.timestamp), 10)) < 5 * 60 * 1000) {
        return { ...parsed, fromCache: true };
      }
    }

    // Fetch fresh data from API
    const response = await axios.get(FLICKR_API_URL, {
      params: {
        method: 'flickr.photos.getRecent',
        api_key: FLICKR_API_KEY,
        format: 'json',
        nojsoncallback: 1,
        extras: 'url_s',
        per_page: perPage,
        page: page,
      },
    });

    if (response.data && response.data.photos) {
      const dataToCache = {
        photos: response.data.photos.photo,
        timestamp: now,
        fromCache: false,
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      
      return dataToCache;
    }
    
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return { ...parsed, fromCache: true };
    }
    
    throw new Error('Failed to fetch images');
  } catch (error) {
    console.error('Error fetching images:', error);
    
    const cacheKey = `${CACHE_KEY_PREFIX}:p${page}:pp${perPage}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return { ...parsed, fromCache: true };
    }
    
    throw error;
  }
};
