import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants';
import type { ItemPriceCardProps } from '@/types';

function getChangeStyle(rate: number) {
  if (rate >= 5)   return { color: COLORS.surgeStrong, icon: '▲' };
  if (rate >= 1)   return { color: COLORS.surgeWeak,   icon: '▲' };
  if (rate > -1)   return { color: COLORS.neutral,     icon: ''  };
  if (rate > -5)   return { color: COLORS.dropWeak,    icon: '▼' };
  return           { color: COLORS.dropStrong,          icon: '▼' };
}

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

interface Props extends ItemPriceCardProps {
  onPress?: () => void;
}

export default function ItemPriceCard({
  itemName,
  gradeName,
  marketName,
  avgPrice,
  changeRate,
  vsAverageRate,
  updatedAt,
  onPress,
}: Props) {
  const changeStyle = getChangeStyle(changeRate);
  const vsStyle = getChangeStyle(vsAverageRate);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.itemName}>{itemName}</Text>
        <Text style={styles.gradeName}>{gradeName}</Text>
        <Text style={styles.marketName}>{marketName}</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.price}>{formatPrice(avgPrice)}</Text>

        <View style={styles.rateRow}>
          {changeStyle.icon !== '' && (
            <Text style={[styles.rateIcon, { color: changeStyle.color }]}>
              {changeStyle.icon}
            </Text>
          )}
          <Text style={[styles.rate, { color: changeStyle.color }]}>
            {Math.abs(changeRate).toFixed(1)}%
          </Text>
        </View>

        {vsAverageRate !== 0 && (
          <Text style={[styles.vsAverage, { color: vsStyle.color }]}>
            평년대비 {vsAverageRate > 0 ? '+' : ''}{vsAverageRate.toFixed(1)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  gradeName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  marketName: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rateIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  rate: {
    fontSize: 13,
    fontWeight: '600',
  },
  vsAverage: {
    fontSize: 10,
    marginTop: 2,
  },
});
