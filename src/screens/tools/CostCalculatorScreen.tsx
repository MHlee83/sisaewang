import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { COLORS } from '@/constants';
import { MOCK_PRICES } from '@/services/mockData';
import { getRetailPrice } from '@/utils/userTypeUtils';

function formatPrice(n: number) { return n.toLocaleString('ko-KR') + '원'; }

// 메뉴 프리셋
const MENU_PRESETS: { name: string; emoji: string; ingredients: { name: string; grams: number }[] }[] = [
  {
    name: '김치찌개',
    emoji: '🍲',
    ingredients: [
      { name: '배추', grams: 150 },
      { name: '대파', grams: 30 },
      { name: '마늘', grams: 10 },
    ],
  },
  {
    name: '된장찌개',
    emoji: '🥘',
    ingredients: [
      { name: '무', grams: 100 },
      { name: '감자', grams: 80 },
      { name: '대파', grams: 20 },
      { name: '마늘', grams: 10 },
    ],
  },
  {
    name: '잡채',
    emoji: '🍜',
    ingredients: [
      { name: '당근', grams: 50 },
      { name: '시금치', grams: 80 },
      { name: '양파', grams: 60 },
    ],
  },
  {
    name: '나물 비빔밥',
    emoji: '🍚',
    ingredients: [
      { name: '시금치', grams: 60 },
      { name: '당근', grams: 40 },
      { name: '무', grams: 50 },
    ],
  },
];

interface Ingredient {
  id: string;
  name: string;
  grams: number;
  itemCode?: string;
  price?: number; // 원/kg
}

export default function CostCalculatorScreen() {
  const [menuName, setMenuName]       = useState('');
  const [servings, setServings]       = useState('1');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [costRate, setCostRate]       = useState(30); // 목표 원가율 %

  const loadPreset = (preset: typeof MENU_PRESETS[0]) => {
    setMenuName(preset.name);
    const items: Ingredient[] = preset.ingredients.map((ing, i) => {
      const found = MOCK_PRICES.find((p) => p.itemName === ing.name);
      return {
        id: i.toString(),
        name: ing.name,
        grams: ing.grams,
        itemCode: found?.itemCode,
        price: found ? getRetailPrice(found.avgPrice, found.category) : undefined,
      };
    });
    setIngredients(items);
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', grams: 100 },
    ]);
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        if (field === 'name') {
          const found = MOCK_PRICES.find((p) => p.itemName === value);
          return {
            ...ing,
            name: value,
            itemCode: found?.itemCode,
            price: found ? getRetailPrice(found.avgPrice, found.category) : undefined,
          };
        }
        return { ...ing, [field]: value };
      }),
    );
  };

  const removeIngredient = (id: string) =>
    setIngredients((prev) => prev.filter((i) => i.id !== id));

  const servingsNum = parseInt(servings) || 1;

  const totalCostPer1 = useMemo(() =>
    ingredients.reduce((sum, ing) => {
      if (!ing.price) return sum;
      return sum + (ing.price / 1000) * ing.grams; // 원/g × g
    }, 0),
    [ingredients],
  );

  const totalCostPerServing = totalCostPer1 / servingsNum;
  const recommendedPrice    = totalCostPerServing / (costRate / 100);
  const marginAmount        = recommendedPrice - totalCostPerServing;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* 메뉴 프리셋 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메뉴 빠른 선택</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.presetRow}>
              {MENU_PRESETS.map((p) => (
                <TouchableOpacity key={p.name} style={styles.presetChip} onPress={() => loadPreset(p)}>
                  <Text style={styles.presetEmoji}>{p.emoji}</Text>
                  <Text style={styles.presetName}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 메뉴 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메뉴 정보</Text>
          <TextInput
            style={styles.input}
            placeholder="메뉴명 입력"
            placeholderTextColor={COLORS.textDisabled}
            value={menuName}
            onChangeText={setMenuName}
          />
          <View style={styles.rowBetween}>
            <Text style={styles.label}>인분 수</Text>
            <View style={styles.servingsControl}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(String(Math.max(1, servingsNum - 1)))}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.servingsValue}>{servingsNum}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(String(servingsNum + 1))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>목표 원가율</Text>
            <View style={styles.rateRow}>
              {[25, 30, 35, 40].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rateChip, costRate === r && styles.rateChipActive]}
                  onPress={() => setCostRate(r)}
                >
                  <Text style={[styles.rateChipText, costRate === r && styles.rateChipTextActive]}>{r}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 재료 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>재료 구성</Text>
          {ingredients.map((ing) => {
            const costForIng = ing.price ? (ing.price / 1000) * ing.grams : 0;
            return (
              <View key={ing.id} style={styles.ingRow}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.ingName}
                    placeholder="재료명"
                    placeholderTextColor={COLORS.textDisabled}
                    value={ing.name}
                    onChangeText={(v) => updateIngredient(ing.id, 'name', v)}
                  />
                  {ing.price ? (
                    <Text style={styles.ingPrice}>{formatPrice(ing.price)}/kg → {formatPrice(Math.round(costForIng))}</Text>
                  ) : (
                    <Text style={styles.ingPriceNone}>시세 데이터 없음</Text>
                  )}
                </View>
                <View style={styles.ingGrams}>
                  <TextInput
                    style={styles.ingGramsInput}
                    keyboardType="numeric"
                    value={String(ing.grams)}
                    onChangeText={(v) => updateIngredient(ing.id, 'grams', parseInt(v) || 0)}
                  />
                  <Text style={styles.ingGramsUnit}>g</Text>
                </View>
                <TouchableOpacity onPress={() => removeIngredient(ing.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addIngBtn} onPress={addIngredient}>
            <Text style={styles.addIngBtnText}>+ 재료 추가</Text>
          </TouchableOpacity>
        </View>

        {/* 결과 */}
        {ingredients.length > 0 && totalCostPer1 > 0 && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {menuName || '메뉴'} 원가 분석
            </Text>
            <View style={styles.resultGrid}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>총 재료비</Text>
                <Text style={styles.resultValue}>{formatPrice(Math.round(totalCostPer1))}</Text>
                <Text style={styles.resultSub}>{servingsNum}인분 기준</Text>
              </View>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>1인분 원가</Text>
                <Text style={[styles.resultValue, { color: COLORS.primary }]}>
                  {formatPrice(Math.round(totalCostPerServing))}
                </Text>
                <Text style={styles.resultSub}>식재료만</Text>
              </View>
            </View>
            <View style={styles.priceBanner}>
              <Text style={styles.priceBannerLabel}>원가율 {costRate}% 기준 권장 판매가</Text>
              <Text style={styles.priceBannerValue}>{formatPrice(Math.round(recommendedPrice))}</Text>
              <Text style={styles.priceBannerSub}>
                마진 {formatPrice(Math.round(marginAmount))} ({100 - costRate}%)
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section:   { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.background, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.divider,
  },
  presetEmoji: { fontSize: 22, marginBottom: 4 },
  presetName:  { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.divider, marginBottom: 12,
  },
  rowBetween:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  label:       { fontSize: 13, color: COLORS.textSecondary },
  servingsControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText:    { fontSize: 18, color: COLORS.textPrimary, lineHeight: 22 },
  servingsValue:  { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, minWidth: 24, textAlign: 'center' },
  rateRow:     { flexDirection: 'row', gap: 6 },
  rateChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider },
  rateChipActive:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rateChipText:      { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  rateChipTextActive:{ color: '#fff' },
  ingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  ingName:      { fontSize: 14, color: COLORS.textPrimary, paddingVertical: 2 },
  ingPrice:     { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  ingPriceNone: { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },
  ingGrams:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ingGramsInput:{
    width: 52, backgroundColor: COLORS.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, fontSize: 14,
    fontWeight: '700', color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.divider, textAlign: 'center',
  },
  ingGramsUnit: { fontSize: 12, color: COLORS.textSecondary },
  removeBtn:    { fontSize: 14, color: COLORS.textDisabled, paddingHorizontal: 4 },
  addIngBtn: {
    marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.primary, borderStyle: 'dashed', alignItems: 'center',
  },
  addIngBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  resultCard:  { backgroundColor: COLORS.surface, margin: 14, borderRadius: 14, padding: 16 },
  resultTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  resultGrid:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  resultBox:   { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: 12, alignItems: 'center' },
  resultLabel: { fontSize: 11, color: COLORS.textDisabled, marginBottom: 6 },
  resultValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  resultSub:   { fontSize: 10, color: COLORS.textDisabled, marginTop: 4 },
  priceBanner: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, alignItems: 'center' },
  priceBannerLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  priceBannerValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  priceBannerSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
});
