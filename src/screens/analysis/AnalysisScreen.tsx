import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants';
import {
  MOCK_PRICES,
  MOCK_PRICE_HISTORY,
  MOCK_SEASONAL,
  MOCK_MARKET_PRICES,
  MOCK_INSIGHTS,
  MOCK_SEASONAL_INSIGHTS,
} from '@/services/mockData';
import { fetchAuctionPrices, type AuctionItem } from '@/services/apiService';
import { useFilterStore } from '@/store/filterStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';

// ──────────────────────────────────────────────
// 상수
// ──────────────────────────────────────────────
const ALL_ITEMS = MOCK_PRICES.map((p) => ({ code: p.itemCode, name: p.itemName }));
const RANGE_OPTIONS = ['1주', '1개월', '3개월', '1년'];

function getRangeData(history: number[], range: number): number[] {
  const last = history[history.length - 1];
  const first = history[0];
  switch (range) {
    case 0: // 1주: 7일 데이터
      return history.slice(-7);
    case 1: // 1개월: 30일 (기존 7일 + 앞에 23일 보간)
      return [
        first * 0.72, first * 0.75, first * 0.78, first * 0.80,
        first * 0.82, first * 0.85, first * 0.87, first * 0.88,
        first * 0.90, first * 0.91, first * 0.92, first * 0.93,
        first * 0.94, first * 0.95, first * 0.96, first * 0.97,
        first * 0.98, first * 0.99, first * 1.00,
        ...history.slice(-4),
        last,
      ].slice(-14);
    case 2: // 3개월: 12주
      return [
        first * 0.60, first * 0.65, first * 0.70, first * 0.74,
        first * 0.78, first * 0.83, first * 0.88, first * 0.92,
        first * 0.95, history[2], history[4], last,
      ];
    case 3: // 1년: 12개월
      return [
        first * 0.50, first * 0.55, first * 0.62, first * 0.68,
        first * 0.74, first * 0.80, first * 0.87, first * 0.92,
        first * 0.96, first * 1.00, first * 1.05, last,
      ];
    default:
      return history;
  }
}
const MONTH_LABELS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const HM_COLORS = ['#DBEAFE','#BBF7D0','#F3F4F6','#FEF9C3','#FED7AA','#FECACA'];
const HM_TEXT =   ['#1D4ED8','#15803D','#374151','#A16207','#C2410C','#B91C1C'];
const HM_LABELS = ['최저','낮음','보통','높음','급등','최고'];

// ──────────────────────────────────────────────
// 순수 View 기반 컬럼 차트
// ──────────────────────────────────────────────
function MiniColumnChart({ data, upColor, rangeIdx = 0 }: { data: number[]; upColor: boolean; rangeIdx?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barColor = upColor ? COLORS.surgeStrong : COLORS.dropStrong;
  const barColorFade = upColor ? '#F57C00' + '55' : '#1565C0' + '55';

  return (
    <View style={{ marginHorizontal: 14, marginBottom: 8 }}>
      {/* 레이블 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 9, color: COLORS.textDisabled }}>
          {min.toLocaleString('ko-KR')}원
        </Text>
        <Text style={{ fontSize: 9, color: COLORS.textDisabled }}>
          {max.toLocaleString('ko-KR')}원
        </Text>
      </View>
      {/* 막대들 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 8 }}>
        {data.map((v, i) => {
          const heightPct = (v - min) / range;
          const barH = Math.max(4, heightPct * 84);
          const isLast = i === data.length - 1;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 84 }}>
              <View
                style={{
                  width: '70%',
                  height: barH,
                  backgroundColor: isLast ? barColor : barColorFade,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
          );
        })}
      </View>
      {/* X축 레이블 */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {data.map((_, i) => {
          const n = data.length;
          let label = '';
          if (i === n - 1) { label = '오늘'; }
          else if (rangeIdx === 3) { label = `${n - 1 - i}개월전`; }
          else if (rangeIdx === 2) { label = `${(n - 1 - i) * 2}주전`; }
          else { label = `${n - 1 - i}일전`; }
          return (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: COLORS.textDisabled }}>
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────
// 계절 히트맵
// ──────────────────────────────────────────────
function SeasonalHeatmap({ item }: { item: string }) {
  const data = MOCK_SEASONAL[item] ?? Array(12).fill(2);
  // 4열 × 3행 그리드
  const rows = [[0,1,2,3],[4,5,6,7],[8,9,10,11]];
  return (
    <View style={{ paddingHorizontal: 14 }}>
      {rows.map((rowIdx, rowNum) => (
        <View key={rowNum} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
          {rowIdx.map((i) => {
            const lv = data[i] ?? 2;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: HM_COLORS[lv],
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#00000022',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#111111' }}>
                  {MONTH_LABELS[i]}월
                </Text>
                <Text style={{ fontSize: 9, fontWeight: '600', color: '#444444', marginTop: 2 }}>
                  {HM_LABELS[lv]}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      {/* 범례 */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
        marginBottom: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 10,
      }}>
        {HM_LABELS.map((label, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{
              width: 16, height: 16,
              backgroundColor: HM_COLORS[i],
              borderRadius: 4,
              borderWidth: 1,
              borderColor: HM_TEXT[i] + '44',
            }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: HM_TEXT[i] }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 월별 막대 차트
function MonthlyBarChart({ item }: { item: string }) {
  const data = MOCK_SEASONAL[item] ?? Array(12).fill(2);
  const monthColors = [
    '#1444b8','#1444b8','#2e7d32','#f57f17','#f57f17',
    '#1444b8','#1444b8','#2e7d32','#2e7d32','#f57f17','#c62828','#c62828',
  ];
  return (
    <View style={{ paddingHorizontal: 14, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, backgroundColor: '#FAFAFA', borderRadius: 8, padding: 6 }}>
        {data.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 68 }}>
            <View
              style={{
                width: '65%',
                height: Math.max(4, (v / 5) * 60),
                backgroundColor: monthColors[i],
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                opacity: 0.8,
              }}
            />
            <Text style={{ fontSize: 8, fontWeight: '700', color: '#111111', marginTop: 2 }}>
              {i + 1}월
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 시장 비교 바
function MarketBarChart({ item }: { item: string }) {
  const data = MOCK_MARKET_PRICES[item] ?? {};
  const markets = Object.keys(data);
  const values = Object.values(data);
  const maxV = Math.max(...values);
  const gradColors = ['#1B5E20','#2E7D32','#43A047','#66BB6A','#A5D6A7'];

  return (
    <View style={{ paddingHorizontal: 14 }}>
      {markets.map((mkt, i) => {
        const val = data[mkt];
        const pct = maxV > 0 ? val / maxV : 0;
        return (
          <View key={mkt} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' }}>
                {mkt}시장
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>
                {val.toLocaleString('ko-KR')}원
              </Text>
            </View>
            <View style={{ height: 10, backgroundColor: COLORS.divider, borderRadius: 5, overflow: 'hidden' }}>
              <View
                style={{
                  height: 10,
                  width: `${pct * 100}%`,
                  backgroundColor: gradColors[i],
                  borderRadius: 5,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────
// 메인 스크린
// ──────────────────────────────────────────────
export default function AnalysisScreen() {
  const { favoriteItemCodes } = useFilterStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 관심 품목 먼저, 나머지 뒤에
  const ANALYSIS_ITEMS = useMemo(() => {
    const favorites = ALL_ITEMS.filter((i) => favoriteItemCodes.includes(i.code));
    const rest = ALL_ITEMS.filter((i) => !favoriteItemCodes.includes(i.code));
    return [...favorites, ...rest].map((i) => i.name);
  }, [favoriteItemCodes]);

  const [selectedItem, setSelectedItem] = useState(ANALYSIS_ITEMS[0] ?? '배추');
  const [selectedSub, setSelectedSub] = useState(0);
  const [selectedRange, setSelectedRange] = useState(0);
  const [sortMode, setSortMode] = useState<'fav' | 'rate_desc' | 'rate_asc'>('fav');
  const [auctionData, setAuctionData] = useState<AuctionItem[]>([]);
  const [auctionLoading, setAuctionLoading] = useState(false);

  useEffect(() => {
    if (selectedSub !== 3) return;
    setAuctionLoading(true);
    fetchAuctionPrices({ limit: 100 })
      .then(setAuctionData)
      .finally(() => setAuctionLoading(false));
  }, [selectedSub]);

  const mockItem = MOCK_PRICES.find((p) => p.itemName === selectedItem);
  const history = MOCK_PRICE_HISTORY[selectedItem] ?? [];
  const currentPrice = mockItem?.avgPrice ?? 0;
  const prevPrice = mockItem?.prevPrice ?? 0;
  const avgYearPrice = mockItem?.avgYearPrice ?? 0;
  const changeRate = prevPrice ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  const avgRate = avgYearPrice ? ((currentPrice - avgYearPrice) / avgYearPrice) * 100 : 0;
  const isUp = changeRate >= 0;

  const changeColor = isUp ? COLORS.surgeStrong : COLORS.dropStrong;

  return (
    <SafeAreaView style={styles.container}>

      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>시세 분석</Text>
          {selectedItem && mockItem && (
            <TouchableOpacity
              style={styles.detailBtn}
              onPress={() => navigation.navigate('ItemDetail', {
                itemCode: mockItem.itemCode,
                itemName: selectedItem,
              })}
              activeOpacity={0.7}
            >
              <Text style={styles.detailBtnText}>{selectedItem} 상세보기 →</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemPicker}
        >
          {ANALYSIS_ITEMS.map((name) => {
            const isFav = favoriteItemCodes.includes(
              ALL_ITEMS.find((i) => i.name === name)?.code ?? ''
            );
            return (
              <TouchableOpacity
                key={name}
                style={[styles.itemChip, selectedItem === name && styles.itemChipActive, isFav && styles.itemChipFav]}
                onPress={() => setSelectedItem(name)}
              >
                <Text style={[styles.itemChipText, selectedItem === name && styles.itemChipTextActive]}>
                  {isFav ? '⭐ ' : ''}{name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 서브탭 */}
      <View style={styles.subTabs}>
        {['가격 추이', '계절 분석', '시장 비교', '경매가'].map((label, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.subTab, selectedSub === i && styles.subTabActive]}
            onPress={() => setSelectedSub(i)}
          >
            <Text style={[styles.subTabText, selectedSub === i && styles.subTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── 가격 추이 ── */}
        {selectedSub === 0 && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>현재가</Text>
                <Text style={[styles.statValue, { fontSize: 12 }]}>
                  {currentPrice.toLocaleString('ko-KR')}원
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>전일대비</Text>
                <Text style={[styles.statValue, { color: changeColor }]}>
                  {changeRate >= 0 ? '+' : ''}{changeRate.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>평년대비</Text>
                <Text style={[styles.statValue, { color: avgRate >= 0 ? COLORS.surgeStrong : COLORS.dropStrong }]}>
                  {avgRate >= 0 ? '+' : ''}{avgRate.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>변동성</Text>
                <Text style={styles.statValue}>
                  {Math.abs(changeRate) >= 10 ? '높음' : Math.abs(changeRate) >= 5 ? '중간' : '낮음'}
                </Text>
              </View>
            </View>

            <View style={styles.rangeRow}>
              {RANGE_OPTIONS.map((r, i) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeBtn, selectedRange === i && styles.rangeBtnActive]}
                  onPress={() => setSelectedRange(i)}
                >
                  <Text style={[styles.rangeBtnText, selectedRange === i && styles.rangeBtnTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <MiniColumnChart data={getRangeData(history, selectedRange)} upColor={isUp} rangeIdx={selectedRange} />

            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>AI 가격 인사이트</Text>
              <Text style={styles.insightBody}>
                {MOCK_INSIGHTS[selectedItem] ?? '분석 데이터 준비 중입니다.'}
              </Text>
            </View>

            <View style={[styles.sectionRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={styles.sectionTitle}>다품목 변동성 비교</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {([
                  { key: 'fav',       label: '⭐ 관심' },
                  { key: 'rate_desc', label: '▲ 높은순' },
                  { key: 'rate_asc',  label: '▼ 낮은순' },
                ] as const).map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.sortBtn, sortMode === key && styles.sortBtnActive]}
                    onPress={() => setSortMode(key)}
                  >
                    <Text style={[styles.sortBtnText, sortMode === key && styles.sortBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {(() => {
              const items = ANALYSIS_ITEMS.map((name) => {
                const p = MOCK_PRICES.find((x) => x.itemName === name);
                const cr = p?.prevPrice ? ((p.avgPrice - p.prevPrice) / p.prevPrice) * 100 : 0;
                const isFav = favoriteItemCodes.includes(p?.itemCode ?? '');
                return { name, cr, isFav };
              });
              const sorted = [...items].sort((a, b) => {
                if (sortMode === 'fav') {
                  if (a.isFav !== b.isFav) return a.isFav ? -1 : 1;
                  return 0;
                }
                if (sortMode === 'rate_desc') return b.cr - a.cr;
                return a.cr - b.cr;
              });
              return sorted.map(({ name, cr, isFav }) => {
                const pct = Math.min(1, Math.abs(cr) / 20);
                const c = cr >= 0 ? COLORS.surgeStrong : COLORS.dropStrong;
                return (
                  <View key={name} style={{ paddingHorizontal: 14, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: name === selectedItem ? '700' : '400', color: COLORS.textPrimary }}>
                        {isFav ? '⭐ ' : ''}{name}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: c }}>
                        {cr >= 0 ? '+' : ''}{cr.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: COLORS.divider, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${pct * 100}%`, backgroundColor: c, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              });
            })()}
          </>
        )}

        {/* ── 계절 분석 ── */}
        {selectedSub === 1 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>월별 시세 히트맵</Text>
            </View>
            <SeasonalHeatmap item={selectedItem} />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>월별 가격 수준</Text>
            </View>
            <MonthlyBarChart item={selectedItem} />

            <View style={[styles.insightCard, { marginTop: 12 }]}>
              <Text style={styles.insightTitle}>계절 패턴 분석</Text>
              <Text style={styles.insightBody}>
                {MOCK_SEASONAL_INSIGHTS[selectedItem] ?? '분석 데이터 준비 중입니다.'}
              </Text>
            </View>
          </>
        )}

        {/* ── 시장 비교 ── */}
        {selectedSub === 2 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>시장별 오늘 경매가</Text>
            </View>
            <MarketBarChart item={selectedItem} />

            <View style={[styles.insightCard, { marginTop: 4 }]}>
              <Text style={styles.insightTitle}>시장 전략</Text>
              <Text style={styles.insightBody}>
                {(() => {
                  const data = MOCK_MARKET_PRICES[selectedItem] ?? {};
                  const entries = Object.entries(data);
                  if (entries.length === 0) return '데이터 없음';
                  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
                  const lowest = sorted[0];
                  const highest = sorted[sorted.length - 1];
                  const diff = ((highest[1] - lowest[1]) / lowest[1] * 100).toFixed(1);
                  return `${highest[0]}시장이 타 시장 대비 최대 ${diff}% 높습니다.\n${lowest[0]}시장 활용 시 비용 절감 가능합니다.`;
                })()}
              </Text>
            </View>
          </>
        )}

        {/* ── 경매가 ── */}
        {selectedSub === 3 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>오늘 공영도매시장 경락가</Text>
            </View>
            {auctionLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : auctionData.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>오늘 경매 데이터가 없습니다</Text>
              </View>
            ) : (
              <>
                <View style={styles.auctionHeader}>
                  <Text style={[styles.auctionCell, { flex: 2 }]}>품목</Text>
                  <Text style={[styles.auctionCell, { flex: 2 }]}>시장</Text>
                  <Text style={[styles.auctionCell, { flex: 1, textAlign: 'right' }]}>낙찰가</Text>
                  <Text style={[styles.auctionCell, { flex: 1, textAlign: 'right' }]}>수량</Text>
                </View>
                {auctionData.map((row) => (
                  <View key={row.id} style={styles.auctionRow}>
                    <Text style={[styles.auctionRowText, { flex: 2 }]} numberOfLines={1}>
                      {row.itemName}
                    </Text>
                    <Text style={[styles.auctionRowText, { flex: 2, color: COLORS.textSecondary }]} numberOfLines={1}>
                      {row.marketName}
                    </Text>
                    <Text style={[styles.auctionRowText, { flex: 1, textAlign: 'right', color: COLORS.surgeStrong, fontWeight: '700' }]}>
                      {row.avgPrice.toLocaleString('ko-KR')}
                    </Text>
                    <Text style={[styles.auctionRowText, { flex: 1, textAlign: 'right', color: COLORS.textSecondary }]}>
                      {row.totalQty.toLocaleString('ko-KR')}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  detailBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemPicker: { paddingHorizontal: 14, gap: 6 },
  itemChip: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  itemChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemChipFav: { borderColor: '#FFA000', borderWidth: 1.5 },
  itemChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  itemChipTextActive: { color: '#fff' },

  subTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  subTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: COLORS.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  subTabTextActive: { color: COLORS.primary },

  statRow: { flexDirection: 'row', gap: 6, padding: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  statLabel: { fontSize: 10, color: COLORS.textDisabled, marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },

  rangeRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 6, marginBottom: 10 },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  rangeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rangeBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  rangeBtnTextActive: { color: '#fff' },

  insightCard: {
    marginHorizontal: 14,
    marginVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
  },
  insightTitle: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 5 },
  insightBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  sectionRow: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  sortBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortBtnText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  sortBtnTextActive: { color: '#fff' },

  auctionHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  auctionCell: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  auctionRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  auctionRowText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
});
