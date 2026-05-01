import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

interface SurgeItem {
  itemName: string;
  changeRate: number;
}

interface Props {
  items: SurgeItem[];
}

export default function SurgeAlertBanner({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🔥 급등락</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item, idx) => {
          const isSurge = item.changeRate > 0;
          return (
            <View key={idx} style={[styles.badge, isSurge ? styles.surgeBadge : styles.dropBadge]}>
              <Text style={[styles.badgeText, isSurge ? styles.surgeText : styles.dropText]}>
                {isSurge ? '▲' : '▼'} {item.itemName} {Math.abs(item.changeRate).toFixed(1)}%
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
    minWidth: 50,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  surgeBadge: {
    backgroundColor: '#FFEBEE',
  },
  dropBadge: {
    backgroundColor: '#E3F2FD',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  surgeText: {
    color: COLORS.surgeStrong,
  },
  dropText: {
    color: COLORS.dropStrong,
  },
});
