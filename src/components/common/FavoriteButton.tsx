import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  isFavorite: boolean;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZE_MAP = { sm: 18, md: 22, lg: 28 };
const HIT_MAP  = { sm: 10, md: 8,  lg: 6  };

export default function FavoriteButton({ isFavorite, onPress, size = 'md', style }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevFav = useRef(isFavorite);

  useEffect(() => {
    if (prevFav.current !== isFavorite) {
      prevFav.current = isFavorite;
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.45, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, tension: 120, friction: 8 }),
      ]).start();
    }
  }, [isFavorite]);

  const fontSize = SIZE_MAP[size];
  const hitSlop  = HIT_MAP[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      activeOpacity={0.7}
      style={style}
    >
      <Animated.Text style={[styles.star, { fontSize, transform: [{ scale: scaleAnim }] }]}>
        {isFavorite ? '⭐' : '☆'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  star: { lineHeight: 32 },
});
