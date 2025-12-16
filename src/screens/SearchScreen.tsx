import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { searchPhotos } from '../services/api';
import RetrySnackbar from '../ui/RetrySnackbar';

export type FlickrPhoto = {
  id: string;
  title?: string;
  url_s?: string;
};

type SearchResponse = {
  photos?: FlickrPhoto[];
  page?: number;
  pages?: number;
  timestamp?: number;
};

type SearchScreenProps = {
  navigation: { navigate: (screen: string, params?: any) => void; goBack: () => void };
};

const AnimatedFlatList = Animated.createAnimatedComponent(Animated.FlatList);

const SearchScreen = ({ navigation }: SearchScreenProps) => {
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FlickrPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const lastRequestRef = useRef<null | (() => void)>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRetrySnackbar = useCallback((message: string, retry: () => void) => {
    lastRequestRef.current = retry;
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  const fetchPage = useCallback(
    async (q: string, nextPage: number, mode: 'replace' | 'append', isRefreshing = false) => {
      const trimmed = typeof q === 'string' ? q.trim() : '';
      if (!trimmed) {
        setResults([]);
        setHasMore(false);
        setPage(1);
        return;
      }

      if (!isRefreshing && mode === 'replace') setLoading(true);
      if (mode === 'append') setLoadingMore(true);

      try {
        const data = (await searchPhotos(trimmed, nextPage)) as SearchResponse;
        const incoming = (data.photos || []).filter((x) => x?.url_s);
        const remotePages = typeof data.pages === 'number' ? data.pages : undefined;

        setResults((prev) => {
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

        setPage(nextPage);
        const hardLimit = 3;
        const maxAllowedPage = remotePages ? Math.min(hardLimit, remotePages) : hardLimit;
        setHasMore(nextPage < maxAllowedPage);
      } catch (err) {
        console.error('Search failed:', err);
        const msg = 'Network error. Please check your connection.';
        showRetrySnackbar(msg, () => {
          fetchPage(trimmed, nextPage, mode, false);
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (isRefreshing) setRefreshing(false);
      }
    },
    [showRetrySnackbar],
  );

  const onSubmit = useCallback(() => {
    setHasMore(true);
    fetchPage(query, 1, 'replace', false);
  }, [fetchPage, query]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();

    if (trimmed.length === 0) {
      setResults([]);
      setHasMore(false);
      setPage(1);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (trimmed.length < 2) {
      setHasMore(false);
      setPage(1);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      setHasMore(true);
      fetchPage(trimmed, 1, 'replace', false);
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchPage, query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchPage(query, 1, 'replace', true);
  }, [fetchPage, query]);

  const onEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (!hasMore) return;
    fetchPage(query, page + 1, 'append', false);
  }, [fetchPage, hasMore, loading, loadingMore, page, query, refreshing]);

  const footer = useMemo(() => {
    if (!loadingMore) return <View style={{ height: 10 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#EAF0FF" />
        <Text style={styles.footerLoaderText}>Loading more…</Text>
      </View>
    );
  }, [loadingMore]);

  const data = useMemo(() => results.filter((x) => x?.url_s), [results]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>&lt;</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Search</Text>

        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search cat, dog, nature..."
          placeholderTextColor="rgba(234,240,255,0.40)"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable onPress={onSubmit} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {loading && data.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#EAF0FF" />
          <Text style={styles.helperText}>Searching…</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.helperTitle}>No results</Text>
          <Text style={styles.helperText}>Type a keyword and press Search.</Text>
        </View>
      ) : (
        <AnimatedFlatList
          data={data}
          keyExtractor={((item: FlickrPhoto) => String(item.id)) as any}
          renderItem={(({ item }: { item: FlickrPhoto }) => {
            return (
              <Pressable
                onPress={() => navigation.navigate('ImageDetail', { image: item })}
                style={styles.resultRow}
              >
                <View style={styles.thumb}>
                  {item.url_s ? (
                    <Image source={{ uri: item.url_s }} style={styles.thumbImage} resizeMode="cover" />
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.resultTitle}>
                  {item.title?.trim() ? item.title.trim() : 'Untitled'}
                </Text>
              </Pressable>
            );
          }) as any}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListFooterComponent={footer}
          refreshControl={
            <RefreshControl tintColor="#EAF0FF" refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

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
  header: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,240,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backIcon: {
    color: '#EAF0FF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: -1,
  },
  headerTitle: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerRightSpacer: {
    width: 40,
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    color: '#EAF0FF',
    fontWeight: '700',
  },
  searchButton: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  helperTitle: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '900',
  },
  helperText: {
    color: 'rgba(234,240,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  resultRow: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(234,240,255,0.10)',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  resultTitle: {
    flex: 1,
    color: '#EAF0FF',
    fontSize: 13,
    fontWeight: '800',
  },
  footerLoader: {
    width: '100%',
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

export default SearchScreen;
