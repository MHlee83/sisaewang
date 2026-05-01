import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';

interface Category {
  code: string;
  name: string;
  emoji: string;
}

interface Props {
  categories: Category[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

export default function CategoryTabs({ categories, selectedCode, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.wrapper}
      contentContainerStyle={styles.container}
    >
      {/* 전체 탭 */}
      <TouchableOpacity
        style={[styles.tab, selectedCode === '' && styles.tabSelected]}
        onPress={() => onSelect('')}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>🌿</Text>
        <Text style={[styles.tabText, selectedCode === '' && styles.tabTextSelected]}>전체</Text>
      </TouchableOpacity>

      {categories.map((cat) => {
        const isSelected = cat.code === selectedCode;
        return (
          <TouchableOpacity
            key={cat.code}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onSelect(cat.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{cat.emoji}</Text>
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    minWidth: 56,
  },
  tabSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  emoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
});
