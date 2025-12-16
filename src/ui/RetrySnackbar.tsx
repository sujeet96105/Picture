import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type RetrySnackbarProps = {
  visible: boolean;
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
};

const RetrySnackbar = ({ visible, message, onRetry, onDismiss }: RetrySnackbarProps) => {
  const translateY = useRef(new Animated.Value(90)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 90,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [translateY, visible]);

  const containerStyle = useMemo(() => {
    return [styles.container, { transform: [{ translateY }] }];
  }, [translateY]);

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={containerStyle}>
      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.message}>
          {message}
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>RETRY</Text>
          </Pressable>
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
  },
  content: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0E1426',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  message: {
    flex: 1,
    color: 'rgba(234,240,255,0.82)',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  retryButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#7C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  dismissButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(234,240,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: 'rgba(234,240,255,0.80)',
    fontWeight: '900',
  },
});

export default RetrySnackbar;
