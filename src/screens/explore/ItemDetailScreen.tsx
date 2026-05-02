import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator,
  Dimensions, Alert,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
import { MOCK_PRICES, MOCK_POSTS } from '@/services/mockData';
import {
  getRetailPrice, getPriceLabel,
  getRecommendationText, getRecommendationColor,
} from '@/utils/userTypeUtils';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '@/navigation/TabNavigator';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useQuery } from '@tanstack/react-query';
import { COLORS, CHART_PERIODS, RECOMMENDATION_CONFIG, PLAN_LIMITS } from '@/constants';
import { getAuctionHistory, getSurveyPrices, compareMarketPrices } from '@/services/priceService';
import { getRecommendation } from '@/services/recommendationService';
import { useAuthStore } from '@/store/authStore';
import { useFilterStore } from '@/store/filterStore';
import FavoriteButton from '@/components/common/FavoriteButton';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

// ──────────────────────────────────────────────
// 소비자 구매처 채널 데이터
// ──────────────────────────────────────────────
const RETAIL_CHANNELS = [
  { key: 'market',    label: '전통시장',       emoji: '🏪', multiplier: 0.86, tip: '가격이 가장 저렴하고 신선도 높음' },
  { key: 'nonghyup', label: '농협하나로마트',  emoji: '🌾', multiplier: 0.93, tip: '산지 직배송, 중간 가격대' },
  { key: 'hyper',    label: '대형마트',        emoji: '🏬', multiplier: 1.04, tip: '접근성 좋음, 할인 행사 수시 진행' },
  { key: 'cvs',      label: '편의점',          emoji: '🏃', multiplier: 1.28, tip: '소용량 구매 시 편리, 가격 높음' },
] as const;

function generateRetailChannels(retailBasePrice: number) {
  return RETAIL_CHANNELS.map((ch) => ({
    ...ch,
    price: Math.round(retailBasePrice * ch.multiplier / 10) * 10,
  })).sort((a, b) => a.price - b.price);
}

// ──────────────────────────────────────────────
// 목 시장별 비교 데이터 생성
// ──────────────────────────────────────────────
const MARKETS = ['가락(서울)', '강서(서울)', '엄궁(부산)', '북부(대구)', '각화(광주)'];

function generateMockMarkets(basePrice: number) {
  return MARKETS.map((name) => {
    const variance = 0.12;
    const avg  = Math.round(basePrice * (1 + (Math.random() - 0.5) * variance));
    const min  = Math.round(avg * (0.85 + Math.random() * 0.05));
    const max  = Math.round(avg * (1.05 + Math.random() * 0.1));
    return { name, avg, min, max };
  }).sort((a, b) => a.avg - b.avg); // 낮은 가격 순
}

// ──────────────────────────────────────────────
// 목 가격 히스토리 생성 (기준가 기반 랜덤 워크)
// ──────────────────────────────────────────────
function generateMockHistory(basePrice: number, days: number): { date: string; price: number }[] {
  const result: { date: string; price: number }[] = [];
  let price = basePrice;
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const seed = (i * 7 + basePrice) % 100;
    const change = (((seed % 11) - 5) / 100) * basePrice * 0.045;
    price = Math.max(100, price + change);
    result.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      price: Math.round(price),
    });
  }
  return result;
}

// ──────────────────────────────────────────────
// 순수 RN 라인 차트
// ──────────────────────────────────────────────
const CHART_W = SCREEN_W - 24;   // 화면 너비 기준 — 날짜 레이블 잘림 방지
const CHART_H = 110;
const PAD_L = 48;
const PAD_B = 24;                 // X축 레이블 여유 공간
const PAD_T = 8;
const PAD_R = 16;

function PriceLineChart({ data }: { data: { date: string; price: number }[] }) {
  if (!data.length) return null;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const innerW = CHART_W - PAD_L - PAD_R;
  const innerH = CHART_H - PAD_T - PAD_B;

  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * innerW;
  const toY = (p: number) => PAD_T + innerH - ((p - minP) / range) * innerH;

  // 라인 세그먼트
  const segments: { x1: number; y1: number; x2: number; y2: number; up: boolean }[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    segments.push({
      x1: toX(i), y1: toY(prices[i]),
      x2: toX(i + 1), y2: toY(prices[i + 1]),
      up: prices[i + 1] >= prices[i],
    });
  }

  // X축 레이블: 5개 균등
  const labelIdxs = [0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5),
                     Math.floor(data.length * 0.75), data.length - 1];
  // Y축 레이블: 3개
  const yLabels = [minP, minP + range / 2, maxP];

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const isUp = lastPrice >= firstPrice;
  const changeRate = ((lastPrice - firstPrice) / firstPrice) * 100;

  return (
    <View style={chartStyles.wrap}>
      {/* 변화율 요약 */}
      <View style={chartStyles.summary}>
        <Text style={[chartStyles.summaryRate, { color: isUp ? COLORS.surgeStrong : COLORS.dropStrong }]}>
          {isUp ? '▲' : '▼'} {Math.abs(changeRate).toFixed(1)}%
        </Text>
        <Text style={chartStyles.summaryLabel}>기간 등락</Text>
      </View>

      {/* 차트 영역 */}
      <View style={{ width: CHART_W, height: CHART_H }}>
        {/* Y축 그리드 + 레이블 */}
        {yLabels.map((yv, i) => {
          const cy = toY(yv);
          return (
            <React.Fragment key={i}>
              <View style={[chartStyles.gridLine, { top: cy, left: PAD_L, width: innerW }]} />
              <Text style={[chartStyles.yLabel, { top: cy - 8, left: 0, width: PAD_L - 4 }]}>
                {yv >= 10000 ? (yv / 10000).toFixed(1) + '만' : yv.toLocaleString()}
              </Text>
            </React.Fragment>
          );
        })}

        {/* 라인 세그먼트 — RN은 transformOrigin 미지원, 중심점 기준으로 배치 */}
        {segments.map((s, i) => {
          const dx = s.x2 - s.x1;
          const dy = s.y2 - s.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const cx = (s.x1 + s.x2) / 2;
          const cy = (s.y1 + s.y2) / 2;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: cx - len / 2,
                top: cy - 1,
                width: len,
                height: 2,
                backgroundColor: isUp ? COLORS.surgeStrong : COLORS.dropStrong,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}

        {/* 마지막 포인트 강조 */}
        <View style={[chartStyles.dot, {
          left: toX(data.length - 1) - 5,
          top: toY(lastPrice) - 5,
          backgroundColor: isUp ? COLORS.surgeStrong : COLORS.dropStrong,
        }]} />

        {/* X축 레이블 — 날짜 잘림 방지: width 충분히, 끝 레이블 right-align */}
        {labelIdxs.map((idx, li) => {
          const isLast  = li === labelIdxs.length - 1;
          const isFirst = li === 0;
          return (
            <Text
              key={idx}
              style={[chartStyles.xLabel, {
                left: isLast
                  ? toX(idx) - 32          // 마지막: 왼쪽으로 밀기
                  : isFirst
                    ? toX(idx) - 4         // 첫번째: 약간만 이동
                    : toX(idx) - 18,
                top: CHART_H - PAD_B + 5,
                textAlign: isLast ? 'right' : isFirst ? 'left' : 'center',
              }]}
            >
              {data[idx]?.date}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap:        { paddingVertical: 12, alignItems: 'center' },
  summary:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryRate: { fontSize: 18, fontWeight: '800' },
  summaryLabel:{ fontSize: 12, color: COLORS.textDisabled },
  gridLine:    { position: 'absolute', height: 1, backgroundColor: '#F0F0F0' },
  yLabel:      { position: 'absolute', fontSize: 9, color: COLORS.textDisabled, textAlign: 'right' },
  xLabel:      { position: 'absolute', fontSize: 10, color: COLORS.textDisabled, width: 36 },
  dot:         { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
});

export default function ItemDetailScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { itemCode, itemName } = route.params;
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const { user } = useAuthStore();
  const { favoriteItemCodes, toggleFavorite } = useFilterStore();

  const userType = user?.userType;
  const isFarmer = userType === 'FARMER';
  const isBuyer  = userType === 'BUYER';

  const plan = (user?.plan ?? 'FREE') as keyof typeof PLAN_LIMITS;
  const maxFavorites = PLAN_LIMITS[plan]?.maxItems ?? 3;
  const isFavorite = favoriteItemCodes.includes(itemCode);

  const handleFavoritePress = () => {
    if (!isFavorite && favoriteItemCodes.length >= maxFavorites) {
      Alert.alert('베타 안내', `오픈 베타 중 관심 품목은 최대 ${maxFavorites}개까지 등록 가능합니다.`);
      return;
    }
    toggleFavorite(itemCode);
  };

  // 헤더 우측에 즐겨찾기 + 알림 버튼 배치
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={headerStyles.headerBtns}>
          <FavoriteButton
            isFavorite={isFavorite}
            onPress={handleFavoritePress}
            size="lg"
            style={headerStyles.favBtn}
          />
          <TouchableOpacity
            style={headerStyles.alertBtn}
            onPress={() => navigation.navigate('AlertCreate', { itemCode, itemName })}
            activeOpacity={0.7}
          >
            <Text style={headerStyles.alertBtnText}>🔔 시세 알림</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, itemCode, itemName, isFavorite, favoriteItemCodes.length]);

  // 가격 이력
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['priceHistory', itemCode, selectedPeriod],
    queryFn: () => getAuctionHistory(itemCode, {
      startDate: dayjs().subtract(selectedPeriod, 'day').format('YYYYMMDD'),
      endDate: dayjs().format('YYYYMMDD'),
    }),
  });

  // 조사가격 (산지·도매·소매)
  const { data: surveyData } = useQuery({
    queryKey: ['surveyPrices', itemCode],
    queryFn: () => getSurveyPrices({ itemCode }),
    staleTime: 60 * 60 * 1000,
  });


  // AI 추천 (소농 모드)
  const { data: recommendation } = useQuery({
    queryKey: ['recommendation', itemCode],
    queryFn: () => getRecommendation(itemCode),
    enabled: isFarmer,
    staleTime: 60 * 60 * 1000,
  });

  const marginRate = surveyData?.marginRate;
  const recConfig = recommendation
    ? RECOMMENDATION_CONFIG[recommendation.recommendation]
    : null;

  // 차트·시장비교용 목 데이터 (API 실패 시 폴백)
  const mockItem = MOCK_PRICES.find((p) => p.itemCode === itemCode);
  const basePrice = mockItem?.avgPrice ?? 2000;

  const chartData = useMemo(
    () => generateMockHistory(basePrice, selectedPeriod),
    [itemCode, selectedPeriod, basePrice],
  );

  const marketData = useMemo(
    () => generateMockMarkets(basePrice),
    [itemCode, basePrice],
  );

  // 소비자 구매처 채널 데이터
  const retailBase = surveyData?.retail ?? getRetailPrice(basePrice, mockItem?.category ?? '100');
  const retailChannels = useMemo(
    () => generateRetailChannels(retailBase),
    [itemCode, retailBase],
  );

  // 이 품목 관련 커뮤니티 글 (최대 3개)
  const relatedPosts = useMemo(
    () => MOCK_POSTS.filter((p) => p.itemCode === itemCode).slice(0, 3),
    [itemCode],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 가격 요약 헤더 */}
        <View style={styles.summaryCard}>
          <Text style={styles.itemTitle}>{itemName}</Text>

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>산지가</Text>
              <Text style={styles.priceValue}>
                {surveyData?.origin ? formatPrice(surveyData.origin) : formatPrice(Math.round((mockItem?.avgPrice ?? 0) * 0.6))}
              </Text>
            </View>
            <View style={[styles.priceItem, styles.priceCenter]}>
              <Text style={styles.priceLabel}>도매 경락가</Text>
              <Text style={[styles.priceValue, !isBuyer && !isFarmer ? styles.priceNormal : styles.priceHighlight, (isFarmer || isBuyer) && styles.priceHighlight]}>
                {surveyData?.wholesale ? formatPrice(surveyData.wholesale) : formatPrice(mockItem?.avgPrice)}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>소매가</Text>
              <Text style={[styles.priceValue, userType === 'CONSUMER' && styles.priceHighlight]}>
                {surveyData?.retail ? formatPrice(surveyData.retail) : formatPrice(getRetailPrice(mockItem?.avgPrice ?? 0, mockItem?.category ?? '100'))}
              </Text>
            </View>
          </View>

          {/* userType별 추천 */}
          {(() => {
            const rate = mockItem ? ((mockItem.avgPrice - mockItem.prevPrice) / mockItem.prevPrice) * 100 : 0;
            const rec = getRecommendationText(itemName, mockItem?.avgPrice ?? 0, mockItem?.avgYearPrice ?? 0, rate, userType);
            const recColor = getRecommendationColor(rec.type);
            return (
              <View style={[styles.recCard, { backgroundColor: recColor.bg }]}>
                <Text style={[styles.recText, { color: recColor.text }]}>{rec.text}</Text>
              </View>
            );
          })()}

          {marginRate != null && (
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>유통마진율 {marginRate.toFixed(1)}%</Text>
            </View>
          )}
        </View>

        {/* 기간 선택 */}
        <View style={styles.periodRow}>
          {CHART_PERIODS.map((p) => (
            <TouchableOpacity
              key={p.days}
              style={[styles.periodBtn, selectedPeriod === p.days && styles.periodBtnSelected]}
              onPress={() => setSelectedPeriod(p.days)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === p.days && styles.periodTextSelected,
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 차트 영역 */}
        <View style={styles.chartArea}>
          {historyLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <PriceLineChart data={chartData} />
          )}
        </View>


        {/* 시장별 가격 비교 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 시장별 가격 비교</Text>
          <View style={styles.marketHeader}>
            <Text style={styles.marketHeaderCell}>시장</Text>
            <Text style={[styles.marketHeaderCell, { textAlign: 'right' }]}>평균가</Text>
            <Text style={[styles.marketHeaderCell, { textAlign: 'right' }]}>최저~최고</Text>
          </View>
          {marketData.map((m, i) => {
            const isCheapest = i === 0;
            const isMostExpensive = i === marketData.length - 1;
            return (
              <View key={m.name} style={[styles.marketRow, i % 2 === 0 && styles.marketRowEven]}>
                <View style={styles.marketNameWrap}>
                  <Text style={styles.marketName}>{m.name}</Text>
                  {isCheapest && (
                    <View style={styles.marketBadgeLow}>
                      <Text style={styles.marketBadgeText}>최저</Text>
                    </View>
                  )}
                  {isMostExpensive && (
                    <View style={styles.marketBadgeHigh}>
                      <Text style={styles.marketBadgeText}>최고</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.marketAvg, isCheapest && { color: COLORS.dropStrong }, isMostExpensive && { color: COLORS.surgeStrong }]}>
                  {formatPrice(m.avg)}
                </Text>
                <Text style={styles.marketRange}>
                  {formatPrice(m.min)}~{formatPrice(m.max)}
                </Text>
              </View>
            );
          })}
          <Text style={styles.marketNote}>* 목 데이터 기준 · 실제 시세와 다를 수 있음</Text>
        </View>

        {/* AI 출하 추천 (소농 모드) */}
        {isFarmer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 AI 출하 추천</Text>
            {recommendation && recConfig ? (
              <View style={[styles.recCard, { backgroundColor: recConfig.bgColor }]}>
                <View style={[styles.recBadge, { backgroundColor: recConfig.color }]}>
                  <Text style={styles.recBadgeText}>{recConfig.label}</Text>
                </View>
                <Text style={styles.recReasoning}>{recommendation.reasoning}</Text>
                <Text style={styles.recScore}>
                  신뢰도 {recommendation.score.toFixed(0)}% · 예상가 {formatPrice(recommendation.expectedPrice)}
                </Text>
              </View>
            ) : (
              <Text style={styles.recPlaceholder}>추천 정보를 불러오는 중...</Text>
            )}
          </View>
        )}

        {/* 구매처 비교 — 전체 유저 표시, 타이틀만 userType별 차별화 */}
        {(() => {
          const channelTitle =
            userType === 'FARMER' ? '🏪 유통채널별 출하 후 소매 비교' :
            userType === 'BUYER'  ? '🏪 유통채널별 구매 단가 비교' :
                                   '🛒 어디서 사면 더 쌀까?';
          return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{channelTitle}</Text>

            {/* 채널 카드 목록 */}
            {retailChannels.map((ch, i) => {
              const isCheapest  = i === 0;
              const isMostExp   = i === retailChannels.length - 1;
              const saving      = retailChannels[retailChannels.length - 1].price - ch.price;
              return (
                <View
                  key={ch.key}
                  style={[
                    styles.channelRow,
                    isCheapest && styles.channelRowCheapest,
                  ]}
                >
                  <Text style={styles.channelEmoji}>{ch.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.channelNameRow}>
                      <Text style={styles.channelName}>{ch.label}</Text>
                      {isCheapest && (
                        <View style={styles.channelBadgeLow}>
                          <Text style={styles.channelBadgeText}>최저가</Text>
                        </View>
                      )}
                      {isMostExp && (
                        <View style={styles.channelBadgeHigh}>
                          <Text style={styles.channelBadgeText}>최고가</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.channelTip}>{ch.tip}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[
                      styles.channelPrice,
                      isCheapest && { color: COLORS.dropStrong },
                      isMostExp  && { color: COLORS.surgeStrong },
                    ]}>
                      {formatPrice(ch.price)}
                    </Text>
                    {!isCheapest && saving > 0 && (
                      <Text style={styles.channelSaving}>
                        최저 대비 +{formatPrice(ch.price - retailChannels[0].price)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {/* 절약 팁 배너 */}
            <View style={styles.savingBanner}>
              <Text style={styles.savingBannerIcon}>💡</Text>
              <Text style={styles.savingBannerText}>
                <Text style={{ fontWeight: '700' }}>전통시장</Text>에서 구매하면{' '}
                편의점 대비{' '}
                <Text style={{ fontWeight: '700', color: COLORS.dropStrong }}>
                  {formatPrice(retailChannels[retailChannels.length - 1].price - retailChannels[0].price)}
                </Text>{' '}
                절약할 수 있어요
              </Text>
            </View>
            <Text style={styles.marketNote}>* 유통채널 평균 추정가 · 실제 가격과 다를 수 있음</Text>
          </View>
          );
        })()}

        {/* 관련 커뮤니티 */}
        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.communityHeader}>
            <Text style={styles.sectionTitle}>💬 {itemName} 커뮤니티</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Community' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.communityMore}>전체보기</Text>
            </TouchableOpacity>
          </View>

          {relatedPosts.length > 0 ? (
            relatedPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.communityPost}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
              >
                <Text style={styles.communityPostTitle} numberOfLines={1}>{post.title}</Text>
                <View style={styles.communityPostMeta}>
                  <Text style={styles.communityPostMetaText}>{post.authorName}</Text>
                  <Text style={styles.communityPostMetaDot}>·</Text>
                  <Text style={styles.communityPostMetaText}>❤️ {post.likeCount}</Text>
                  <Text style={styles.communityPostMetaDot}>·</Text>
                  <Text style={styles.communityPostMetaText}>💬 {post.commentCount}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.communityEmpty}>
              <Text style={styles.communityEmptyText}>아직 관련 글이 없어요</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PostCreate' as any, {})}
                activeOpacity={0.7}
              >
                <Text style={styles.communityWriteBtn}>첫 글 작성하기 →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      {/* 글쓰기 플로팅 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PostCreate' as any, { itemCode, itemName })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✏️</Text>
        <Text style={styles.fabText}>글쓰기</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabIcon: { fontSize: 16 },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    marginBottom: 6,
  },
  itemTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  priceItem: { alignItems: 'center' },
  priceCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 20,
  },
  priceLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 3 },
  priceValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  priceNormal: { fontSize: 14, color: COLORS.textPrimary },
  priceHighlight: { fontSize: 17, color: COLORS.primary, fontWeight: '800' },
  recText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  marginBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  marginText: { fontSize: 11, fontWeight: '600', color: '#E65100' },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    marginBottom: 6,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.background,
  },
  periodBtnSelected: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  periodTextSelected: { color: '#fff' },
  chartArea: {
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  section: { backgroundColor: COLORS.surface, padding: 12, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  marketPrices: { alignItems: 'flex-end' },
  marketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: 2,
  },
  marketHeaderCell: { fontSize: 10, fontWeight: '700', color: COLORS.textDisabled, flex: 1 },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  marketRowEven:   { backgroundColor: '#FAFAFA' },
  marketNameWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  marketName:      { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  marketBadgeLow:  { backgroundColor: '#E3F2FD', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  marketBadgeHigh: { backgroundColor: '#FFEBEE', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  marketBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary },
  marketAvg:       { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right' },
  marketRange:     { flex: 1, fontSize: 9, color: COLORS.textDisabled, textAlign: 'right' },
  marketNote:      { fontSize: 9, color: COLORS.textDisabled, marginTop: 6, textAlign: 'right' },
  recCard: {
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  recBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  recBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  recReasoning: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19, marginBottom: 6 },
  recScore: { fontSize: 11, color: COLORS.textSecondary },
  recPlaceholder: { color: COLORS.textSecondary, fontSize: 12 },

  // 소비자 구매처 채널
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
    gap: 10,
  },
  channelRowCheapest: {
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  channelEmoji:   { fontSize: 22, width: 30, textAlign: 'center' },
  channelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  channelName:    { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  channelBadgeLow: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  channelBadgeHigh: {
    backgroundColor: '#EF9A9A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  channelBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  channelTip:       { fontSize: 11, color: COLORS.textDisabled },
  channelPrice:     { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  channelSaving:    { fontSize: 10, color: COLORS.surgeStrong, marginTop: 2 },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 4,
    gap: 7,
  },
  savingBannerIcon: { fontSize: 16 },
  savingBannerText: { flex: 1, fontSize: 12, color: COLORS.textPrimary, lineHeight: 18 },

  // 커뮤니티
  communityHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  communityMore:         { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  communityPost: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  communityPostTitle:    { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  communityPostMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  communityPostMetaText: { fontSize: 11, color: COLORS.textDisabled },
  communityPostMetaDot:  { fontSize: 11, color: COLORS.textDisabled },
  communityEmpty:        { alignItems: 'center', paddingVertical: 16, gap: 8 },
  communityEmptyText:    { fontSize: 13, color: COLORS.textDisabled },
  communityWriteBtn:     { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
});

const headerStyles = StyleSheet.create({
  headerBtns: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 4,
  },
  favBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center',
  },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  alertBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
