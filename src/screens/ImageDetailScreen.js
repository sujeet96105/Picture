import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ImageDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const image = route?.params?.image;

  const headerHeight = insets.top + 52;

  const rawTitle = image?.title;
  const title = typeof rawTitle === 'string' && rawTitle.trim().length > 0 ? rawTitle.trim() : 'Untitled';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(180)}
        style={[styles.header, { height: headerHeight, paddingTop: insets.top }]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>&lt;</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          Photo
        </Text>
        <View style={styles.headerRightSpacer} />
      </Animated.View>

      <View style={[styles.content, { paddingTop: headerHeight + 10 }]}>
        <View style={styles.card}>
          {image?.url_s ? (
            <Image source={{ uri: image.url_s }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.missingImage]}>
              <Text style={styles.missingText}>Image unavailable</Text>
            </View>
          )}

          <View style={styles.meta}>
            <Text numberOfLines={2} style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>Tap and hold to save from the system viewer</Text>
          </View>
        </View>
      </View>
    </View>
  );
 };

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070A12',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(7,10,18,0.72)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  backIcon: {
    color: '#EAF0FF',
    fontSize: 20,
    fontWeight: '900',
    marginRight: 6,
    marginTop: -1,
  },
  backText: {
    color: '#EAF0FF',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#EAF0FF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRightSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroImage: {
    width,
    height: Math.min(width * 1.15, 520),
  },
  missingImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  missingText: {
    color: '#8AA0C6',
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    color: '#EAF0FF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    color: 'rgba(234,240,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ImageDetailScreen;
