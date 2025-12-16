import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Pressable,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getRecentImages } from '../services/api';
import RetrySnackbar from '../ui/RetrySnackbar';

export type FlickrPhoto = {
  id: string;
  title?: string;
  url_s?: string;
};

type RecentImagesResponse = {
  photos?: FlickrPhoto[];
  page?: number;
  pages?: number;
  timestamp?: number;
  fromCache?: boolean;
};

type HomeScreenProps = {
  navigation: { navigate: (screen: string, params?: any) => void };
};

const { width } = Dimensions.get('window');
const GRID_PADDING = 14;
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const IMAGE_SIZE = Math.floor(
  (width - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedFlatList = Animated.createAnimatedComponent(Animated.FlatList);

type GalleryTileProps = {
  item: FlickrPhoto;
  index: number;
  onPress: () => void;
};

const GalleryTile = ({ item, index, onPress }: GalleryTileProps) => {
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => {
    const scale = pressed.value ? 0.97 : 1;
    return {
      transform: [{ scale: withSpring(scale, { damping: 16, stiffness: 220 }) }],
    };
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(Math.min(index * 24, 240))}
      exiting={FadeOut.duration(140)}
    >
      <AnimatedPressable
        style={[styles.tile, animatedStyle]}
        onPress={onPress}
        onPressIn={() => {
          pressed.value = 1;
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
      >
        <Image source={{ uri: item.url_s }} style={styles.image} resizeMode="cover" />
      </AnimatedPressable>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<FlickrPhoto[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const lastRequestRef = React.useRef<null | (() => void)>(null);

  const FAVORITES_KEY = '@FavoritePhotoIds';

  const showRetrySnackbar = useCallback((message: string, retry: () => void) => {
    lastRequestRef.current = retry;
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const fetchPage = useCallback(
    async (nextPage: number, mode: 'replace' | 'append', isRefreshing = false) => {
      if (!isRefreshing && mode === 'replace') setLoading(true);
      if (mode === 'append') setLoadingMore(true);
      setError(null);

      try {
        const data = (await getRecentImages(nextPage)) as RecentImagesResponse;
        const incoming = (data.photos || []).filter((x) => x?.url_s);
        const remotePages = typeof data.pages === 'number' ? data.pages : undefined;

        setImages((prev) => {
          if (mode === 'replace') return incoming;
          const seen = new Set(prev.map((p) => String(p.id)));
          const merged = [...prev];
          incoming.forEach((p) => {
            const id = String(p.id);
            if (!seen.has(id)) {
              seen.add(id);
              merged.push(p);
            }
          });
          return merged;
        });

        setLastUpdated(typeof data.timestamp === 'number' ? data.timestamp : null);
        setFromCache(Boolean(data.fromCache));
        setPage(nextPage);
        const hardLimit = 3;
        const maxAllowedPage = remotePages ? Math.min(hardLimit, remotePages) : hardLimit;
        setHasMore(nextPage < maxAllowedPage);
      } catch (err) {
        console.error('Failed to load images:', err);
        const msg = 'Network error. Please check your connection.';
        if (mode === 'replace') {
          setError('Failed to load images. Please check your connection.');
        }
        showRetrySnackbar(msg, () => {
          fetchPage(nextPage, mode, false);
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (isRefreshing) setRefreshing(false);
      }
    },
    [showRetrySnackbar],
  );

  const loadImages = useCallback(
    async (isRefreshing = false) => {
      setHasMore(true);
      await fetchPage(1, 'replace', isRefreshing);
    },
    [fetchPage],
  );

  useEffect(() => {
    loadImages();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        const ids: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(ids)) {
          const map: Record<string, true> = {};
          ids.forEach((id) => {
            map[String(id)] = true;
          });
          setFavorites(map);
        }
      } catch (_) {
      }
    })();
  }, []);

  const data = useMemo(() => images?.filter((x) => x?.url_s), [images]);

  const toggleFavorite = useCallback(
    async (photoId: FlickrPhoto['id']) => {
      const id = String(photoId);
      setFavorites((prev) => {
        const next: Record<string, true> = { ...prev };
        if (next[id]) {
          delete next[id];
        } else {
          next[id] = true;
        }
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(Object.keys(next))).catch(() => {});
        return next;
      });
    },
    [FAVORITES_KEY],
  );

  const renderItem = ({ item, index }: { item: FlickrPhoto; index: number }) => {
    const isFav = Boolean(favorites[String(item.id)]);
    return (
      <Animated.View>
        <GalleryTile
          item={item}
          index={index}
          onPress={() => navigation.navigate('ImageDetail', { image: item })}
        />
        <Pressable
          onLongPress={() => toggleFavorite(item.id)}
          delayLongPress={220}
          style={[styles.favHit, isFav ? styles.favHitActive : null]}
        >
          <Text style={styles.favIcon}>{isFav ? '♥' : '♡'}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadImages(true);
  }, []);

  const onPressReload = useCallback(() => {
    loadImages();
  }, []);

  const onEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (!hasMore) return;
    const nextPage = page + 1;
    fetchPage(nextPage, 'append', false);
  }, [fetchPage, hasMore, loading, loadingMore, page, refreshing]);

  const footer = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 10 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#EAF0FF" />
        <Text style={styles.footerLoaderText}>Loading more…</Text>
      </View>
    );
  }, [loadingMore]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.topBar}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Recent photos from Flickr</Text>
        </View>

        <View style={styles.skeletonGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.skeletonTile} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorCard}>
          <View style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Couldn’t load images</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onPressReload} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorCard}>
          <View style={styles.errorIcon} />
          <Text style={styles.errorTitle}>No photos found</Text>
          <Text style={styles.errorText}>Pull to refresh or try again.</Text>
          <Pressable onPress={onPressReload} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Reload</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Recent photos from Flickr</Text>
      </View>

      {fromCache ? (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerText}>
            Showing cached • Updated {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}
          </Text>
        </View>
      ) : null}

      <AnimatedFlatList
        data={data}
        renderItem={renderItem as any}
        keyExtractor={(item: unknown) => String((item as FlickrPhoto).id)}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        ListFooterComponent={footer}
        refreshControl={
          <RefreshControl tintColor="#EAF0FF" refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <RetrySnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        onRetry={() => {
          setSnackbarVisible(false);
          lastRequestRef.current?.();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070A12',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 10,
    paddingBottom: 10,
  },
  cacheBanner: {
    marginHorizontal: GRID_PADDING,
    marginTop: 2,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(234,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cacheBannerText: {
    color: 'rgba(234,240,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: '#EAF0FF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(234,240,255,0.70)',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 8,
    paddingBottom: 18,
  },
  columnWrapper: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  favHit: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(7,10,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favHitActive: {
    backgroundColor: 'rgba(124, 92, 255, 0.40)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  favIcon: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: -1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeletonGrid: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  skeletonTile: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 18,
    backgroundColor: 'rgba(234,240,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  errorCard: {
    width: '88%',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  errorIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 92, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  errorTitle: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 6,
    color: 'rgba(234,240,255,0.70)',
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  footerLoader: {
    paddingTop: 14,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLoaderText: {
    color: 'rgba(234,240,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default HomeScreen;
