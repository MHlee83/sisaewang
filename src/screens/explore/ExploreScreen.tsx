import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useQuery } from '@tanstack/react-query';
import { getItems } from '@/services/itemService';
import { COLORS, CATEGORIES } from '@/constants';

export default function ExploreScreen() {
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data, isLoading } = useQuery({
    queryKey: ['items', keyword, selectedCategory],
    queryFn: () => getItems({
      keyword: keyword || undefined,
      categoryCode: selectedCategory || undefined,
      limit: 100,
    }),
    staleTime: 10 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="품목 검색 (예: 배추, 사과...)"
          placeholderTextColor={COLORS.textDisabled}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 카테고리 그리드 */}
      {keyword === '' && (
        <View style={styles.categoryGrid}>
          {[{ code: '', name: '전체', emoji: '🌿' }, ...CATEGORIES].map((cat) => (
            <TouchableOpacity
              key={cat.code}
              style={[
                styles.categoryItem,
                selectedCategory === cat.code && styles.categoryItemSelected,
              ]}
              onPress={() => setSelectedCategory(cat.code)}
            >
              <Text style={styles.categoryEmoji}>{(cat as any).emoji}</Text>
              <Text style={[
                styles.categoryName,
                selectedCategory === cat.code && styles.categoryNameSelected,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.itemCode}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() =>
              navigation.navigate('ItemDetail', {
                itemCode: item.itemCode,
                itemName: item.itemName,
              })
            }
          >
            <View>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <Text style={styles.itemMeta}>
                {item.categoryName}
                {item.kindName ? ` · ${item.kindName}` : ''}
                {item.unitQty ? ` · ${item.unitQty}${item.unitName}` : ''}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>
              {keyword ? `"${keyword}" 검색 결과가 없습니다` : '품목이 없습니다'}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  clearBtn: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: 4 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 4,
  },
  categoryItemSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryEmoji: { fontSize: 16 },
  categoryName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  categoryNameSelected: { color: '#fff' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 3,
    borderRadius: 10,
    padding: 14,
  },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary },
  arrow: { fontSize: 20, color: COLORS.textDisabled },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
});
