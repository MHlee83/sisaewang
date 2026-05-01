import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@/constants';
import { MOCK_PRICES } from '@/services/mockData';
import { getRetailPrice } from '@/utils/userTypeUtils';
import { useSavingsStore } from '@/store/savingsStore';

function formatPrice(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

interface BasketItem {
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string;
  price: number;   // 현재 소매가
  prevPrice: number;
  category: string;
}

const QUICK_ITEMS = [
  '배추', '양파', '마늘', '대파', '감자', '고추', '무', '당근', '시금치', '오이',
];

export default function BasketCalculatorScreen() {
  const navigation = useNavigation();
  const { addRecord } = useSavingsStore();
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [search, setSearch] = useState('');

  const searchResults = search.trim()
    ? MOCK_PRICES.filter((p) => p.itemName.includes(search.trim())).slice(0, 6)
    : [];

  const addItem = (p: (typeof MOCK_PRICES)[0]) => {
    setSearch('');
    if (basket.find((b) => b.itemCode === p.itemCode)) return;
    setBasket((prev) => [
      ...prev,
      {
        itemCode: p.itemCode,
        itemName: p.itemName,
        qty: 1,
        unit: 'kg',
        price: getRetailPrice(p.avgPrice, p.category),
        prevPrice: getRetailPrice(p.prevPrice, p.category),
        category: p.category,
      },
    ]);
  };

  const updateQty = (itemCode: string, qty: number) => {
    if (qty <= 0) {
      setBasket((prev) => prev.filter((b) => b.itemCode !== itemCode));
      return;
    }
    setBasket((prev) =>
      prev.map((b) => (b.itemCode === itemCode ? { ...b, qty } : b)),
    );
  };

  const totalNow  = useMemo(() => basket.reduce((s, b) => s + b.price * b.qty, 0), [basket]);
  const totalPrev = useMemo(() => basket.reduce((s, b) => s + b.prevPrice * b.qty, 0), [basket]);
  const saved     = totalPrev - totalNow;

  const handleSaveRecord = () => {
    if (basket.length === 0) return;
    if (saved <= 0) {
      Alert.alert('절약 기록', '지난주보다 가격이 비싸 기록하지 않습니다.');
      return;
    }
    const summary = basket.map((b) => b.itemName).join(', ');
    addRecord(`장바구니 (${summary})`, saved);
    Alert.alert('✅ 절약 기록 완료', `${formatPrice(saved)} 절약이 기록됐습니다.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* 검색 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>품목 추가</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="품목명 검색 (배추, 양파...)"
            placeholderTextColor={COLORS.textDisabled}
            value={search}
            onChangeText={setSearch}
          />
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((p) => (
                <TouchableOpacity key={p.itemCode} style={styles.searchItem} onPress={() => addItem(p)}>
                  <Text style={styles.searchItemText}>{p.itemName}</Text>
                  <Text style={styles.searchItemPrice}>{formatPrice(getRetailPrice(p.avgPrice, p.category))}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* 빠른 추가 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={styles.quickRow}>
              {QUICK_ITEMS.map((name) => {
                const p = MOCK_PRICES.find((x) => x.itemName === name);
                if (!p) return null;
                const already = basket.find((b) => b.itemCode === p.itemCode);
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.quickChip, already && styles.quickChipActive]}
                    onPress={() => already ? updateQty(p.itemCode, 0) : addItem(p)}
                  >
                    <Text style={[styles.quickChipText, already && styles.quickChipTextActive]}>
                      {already ? '✓ ' : '+ '}{name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* 장바구니 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>내 장바구니</Text>
          {basket.length === 0 ? (
            <Text style={styles.emptyText}>위에서 품목을 추가하세요</Text>
          ) : (
            basket.map((item) => {
              const itemTotal = item.price * item.qty;
              const prevTotal = item.prevPrice * item.qty;
              const diff = prevTotal - itemTotal;
              return (
                <View key={item.itemCode} style={styles.basketRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.basketName}>{item.itemName}</Text>
                    <Text style={styles.basketUnit}>{formatPrice(item.price)} / kg</Text>
                    {diff !== 0 && (
                      <Text style={[styles.basketDiff, { color: diff > 0 ? COLORS.dropStrong : COLORS.surgeStrong }]}>
                        {diff > 0 ? `지난주보다 ${formatPrice(Math.abs(diff))} 저렴` : `지난주보다 ${formatPrice(Math.abs(diff))} 비쌈`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.itemCode, item.qty - 1)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.itemCode, item.qty + 1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.basketTotal}>{formatPrice(itemTotal)}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* 합계 */}
        {basket.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>이번 주 합계</Text>
              <Text style={styles.summaryAmount}>{formatPrice(totalNow)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>지난주 같은 장바구니</Text>
              <Text style={styles.summaryPrev}>{formatPrice(totalPrev)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryDivider]}>
              <Text style={styles.summaryLabel}>절약 / 추가 지출</Text>
              <Text style={[styles.summaryDiff, { color: saved >= 0 ? COLORS.dropStrong : COLORS.surgeStrong }]}>
                {saved >= 0 ? `−${formatPrice(saved)} 절약` : `+${formatPrice(Math.abs(saved))} 추가`}
              </Text>
            </View>

            {saved > 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecord}>
                <Text style={styles.saveBtnText}>💾 절약 기록에 저장</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  searchInput: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  searchResults: { marginTop: 6, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.divider },
  searchItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  searchItemText:  { fontSize: 14, color: COLORS.textPrimary },
  searchItemPrice: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 6 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1, borderColor: COLORS.divider,
    backgroundColor: COLORS.background,
  },
  quickChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickChipText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  quickChipTextActive: { color: '#fff' },
  emptyText: { fontSize: 13, color: COLORS.textDisabled, textAlign: 'center', paddingVertical: 20 },
  basketRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  basketName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  basketUnit:  { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },
  basketDiff:  { fontSize: 11, fontWeight: '600', marginTop: 2 },
  basketTotal: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, width: 70, textAlign: 'right' },
  qtyControl:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText:  { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700', lineHeight: 20 },
  qtyValue:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  summaryCard: { backgroundColor: COLORS.surface, margin: 14, borderRadius: 14, padding: 16 },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel:  { fontSize: 13, color: COLORS.textSecondary },
  summaryAmount: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  summaryPrev:   { fontSize: 13, color: COLORS.textDisabled, textDecorationLine: 'line-through' },
  summaryDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10, marginTop: 4 },
  summaryDiff: { fontSize: 16, fontWeight: '800' },
  saveBtn: {
    marginTop: 12, backgroundColor: COLORS.primary,
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
