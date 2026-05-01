import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ScrollView, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/OnboardingNavigator';
import { COLORS, CATEGORIES } from '@/constants';
import { useFilterStore } from '@/store/filterStore';
import { MOCK_PRICES } from '@/services/mockData';

const MAX_SELECT = 3;

// MOCK_PRICES에서 품목 목록 자동 생성
const ALL_ITEMS = MOCK_PRICES.map((p) => ({
  itemCode:     p.itemCode,
  itemName:     p.itemName,
  categoryCode: p.category,
  photoUrl:     p.thumbnail,
}));

export default function FavoriteItemsScreen() {
  const [selected, setSelected]     = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { setFavoriteItems } = useFilterStore();

  const filteredItems = useMemo(() =>
    activeCategory === 'all'
      ? ALL_ITEMS
      : ALL_ITEMS.filter((i) => i.categoryCode === activeCategory),
    [activeCategory],
  );

  const toggle = (code: string) => {
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, code];
    });
  };

  const handleNext = () => {
    setFavoriteItems(selected);
    navigation.navigate('NotificationPermission');
  };

  const canProceed = selected.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>관심 품목을 선택하세요</Text>
        <Text style={styles.subtitle}>
          최대 {MAX_SELECT}개까지 선택 가능해요{'  '}
          <Text style={{ color: selected.length > 0 ? COLORS.primary : COLORS.textDisabled }}>
            ({selected.length}/{MAX_SELECT})
          </Text>
        </Text>
      </View>

      {/* 카테고리 필터 */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          <TouchableOpacity
            style={[styles.catBtn, activeCategory === 'all' && styles.catBtnActive]}
            onPress={() => setActiveCategory('all')}
          >
            <Text style={[styles.catText, activeCategory === 'all' && styles.catTextActive]}>전체</Text>
          </TouchableOpacity>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.catBtn, activeCategory === c.code && styles.catBtnActive]}
              onPress={() => setActiveCategory(c.code)}
            >
              <Text style={[styles.catText, activeCategory === c.code && styles.catTextActive]}>
                {c.emoji} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.itemCode}
        numColumns={3}
        key={activeCategory}          // 컬럼 수 변경 시 리렌더 강제
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.itemCode);
          const isDisabled = !isSelected && selected.length >= MAX_SELECT;
          return (
            <TouchableOpacity
              style={[
                styles.item,
                isSelected && styles.itemSelected,
                isDisabled && styles.itemDisabled,
              ]}
              onPress={() => toggle(item.itemCode)}
              activeOpacity={isDisabled ? 1 : 0.7}
            >
              <Image
                source={{ uri: item.photoUrl }}
                style={[styles.itemImg, isDisabled && { opacity: 0.4 }]}
              />
              <Text style={[
                styles.itemName,
                isSelected && styles.itemNameSelected,
                isDisabled && styles.itemNameDisabled,
              ]} numberOfLines={2}>
                {item.itemName}
              </Text>
              {isSelected && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>해당 카테고리 품목이 없습니다</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !canProceed && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.buttonText}>
            {selected.length === 0 ? '품목을 선택해주세요' : `${selected.length}개 선택 완료`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.surface },
  header:         { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 12 },
  title:          { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle:       { fontSize: 13, color: COLORS.textSecondary },
  categoryWrapper: {
    height: 52,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  catBtn: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catBtnActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText:        { fontSize: 13, fontWeight: '700', color: '#222222', lineHeight: 18 },
  catTextActive:  { color: '#FFFFFF' },
  grid:           { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 16 },
  item: {
    flex: 1,
    margin: 5,
    borderRadius: 12,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.divider,
    position: 'relative',
    overflow: 'hidden',
  },
  itemSelected:     { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  itemDisabled:     { borderColor: COLORS.divider, backgroundColor: COLORS.background, opacity: 0.4 },
  itemImg: {
    width: '100%',
    height: 72,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F0F0F0',
  },
  itemName:         { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  itemNameSelected: { color: COLORS.primary },
  itemNameDisabled: { color: COLORS.textDisabled },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 10, color: '#fff', fontWeight: '900' },
  empty:      { alignItems: 'center', paddingTop: 40 },
  emptyText:  { fontSize: 13, color: COLORS.textSecondary },
  footer:     { paddingHorizontal: 24, paddingVertical: 16 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: COLORS.textDisabled },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
