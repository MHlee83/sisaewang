import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Linking,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { COLORS, CATEGORIES, MAIN_MARKETS, PLAN_LIMITS } from '@/constants';
import { useFilterStore } from '@/store/filterStore';
import { useAuthStore } from '@/store/authStore';
import FavoriteButton from '@/components/common/FavoriteButton';
import {
  getDisplayPrice, getPriceLabel, getPriceSubLabel,
  getRecommendationText, getRecommendationColor, getRetailPrice,
} from '@/utils/userTypeUtils';
import {
  MOCK_PRICES,
  MOCK_SURGE_ITEMS,
  MOCK_NEWS,
  MOCK_POSTS,
} from '@/services/mockData';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { TabParamList } from '@/navigation/TabNavigator';

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
function calcChangeRate(current: number, prev: number) {
  if (!prev || prev === 0) return 0;
  return ((current - prev) / prev) * 100;
}

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

function getChangeColor(rate: number) {
  if (rate >= 5) return COLORS.surgeStrong;
  if (rate >= 1) return COLORS.surgeWeak;
  if (rate > -1) return COLORS.neutral;
  if (rate > -5) return COLORS.dropWeak;
  return COLORS.dropStrong;
}

function getChangeIcon(rate: number) {
  if (rate > 0.5) return '▲';
  if (rate < -0.5) return '▼';
  return '–';
}

// ──────────────────────────────────────────────
// 서브 컴포넌트
// ──────────────────────────────────────────────
function SearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="품목명으로 검색..."
          placeholderTextColor={COLORS.textDisabled}
          returnKeyType="search"
          value={value}
          onChangeText={onChangeText}
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CategoryChips({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (code: string) => void;
}) {
  const all = [{ code: '', name: '전체', emoji: '' }, ...CATEGORIES];
  return (
    // 이모지 제거 + 크기 축소 → 7개 전부 한 줄에 표시
    <View style={styles.chipsRow}>
      {all.map((cat) => (
        <TouchableOpacity
          key={cat.code}
          style={[styles.chip, selected === cat.code && styles.chipActive]}
          onPress={() => onSelect(cat.code)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, selected === cat.code && styles.chipTextActive]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ──────────────────────────────────────────────
// 행동 가이드 카드
// ──────────────────────────────────────────────
const GUIDE_CONFIG = {
  CONSUMER: {
    title: '🛒 오늘의 장보기 가이드',
    getBuySignal: (rate: number, vsYear: number) => {
      if (rate < -3 || vsYear < -10) return { label: '지금 사세요', color: '#1565C0', bg: '#E3F2FD', icon: '✅' };
      if (rate > 5  || vsYear > 15)  return { label: '기다리세요',  color: '#B71C1C', bg: '#FFEBEE', icon: '⏳' };
      return { label: '적정 가격', color: '#2E7D32', bg: '#E8F5E9', icon: '📊' };
    },
  },
  FARMER: {
    title: '🌾 오늘의 출하 타이밍',
    getBuySignal: (rate: number, vsYear: number) => {
      if (rate > 3  || vsYear > 10) return { label: '지금 출하 추천', color: '#1565C0', bg: '#E3F2FD', icon: '✅' };
      if (rate < -5 || vsYear < -12) return { label: '출하 대기',      color: '#B71C1C', bg: '#FFEBEE', icon: '⏳' };
      return { label: '시장 관망', color: '#2E7D32', bg: '#E8F5E9', icon: '📊' };
    },
  },
  BUYER: {
    title: '🏪 이번 주 구매 가이드',
    getBuySignal: (rate: number, vsYear: number) => {
      if (rate < -3 || vsYear < -8) return { label: '대량 구매 적기', color: '#1565C0', bg: '#E3F2FD', icon: '✅' };
      if (rate > 5  || vsYear > 12) return { label: '구매 연기',      color: '#B71C1C', bg: '#FFEBEE', icon: '⏳' };
      return { label: '정상 발주', color: '#2E7D32', bg: '#E8F5E9', icon: '📊' };
    },
  },
};

function ActionGuideCard({ userType, favoriteItemCodes, onItemPress }: {
  userType: string | undefined;
  favoriteItemCodes: string[];
  onItemPress: (itemCode: string, itemName: string) => void;
}) {
  const config = GUIDE_CONFIG[(userType as keyof typeof GUIDE_CONFIG) ?? 'CONSUMER'] ?? GUIDE_CONFIG.CONSUMER;

  // 관심 품목 기반 가이드 (최대 3개)
  const guideItems = favoriteItemCodes
    .map((code) => MOCK_PRICES.find((p) => p.itemCode === code))
    .filter(Boolean)
    .slice(0, 3)
    .map((item) => {
      const rate   = calcChangeRate(item!.avgPrice, item!.prevPrice);
      const vsYear = calcChangeRate(item!.avgPrice, item!.avgYearPrice);
      const signal = config.getBuySignal(rate, vsYear);
      return { ...item!, rate, vsYear, signal };
    });

  // 관심 품목 없을 때: 급등락 기준 자동 선택
  const autoItems = guideItems.length === 0
    ? MOCK_PRICES
        .map((p) => ({ ...p, rate: calcChangeRate(p.avgPrice, p.prevPrice), vsYear: calcChangeRate(p.avgPrice, p.avgYearPrice) }))
        .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate))
        .slice(0, 3)
        .map((item) => ({ ...item, signal: config.getBuySignal(item.rate, item.vsYear) }))
    : [];

  const displayItems = guideItems.length > 0 ? guideItems : autoItems;

  // 소비자 장바구니 총액 비교
  const basketNow  = favoriteItemCodes.reduce((sum, code) => {
    const p = MOCK_PRICES.find((x) => x.itemCode === code);
    return sum + (p ? getRetailPrice(p.avgPrice, p.category) : 0);
  }, 0);
  const basketPrev = favoriteItemCodes.reduce((sum, code) => {
    const p = MOCK_PRICES.find((x) => x.itemCode === code);
    return sum + (p ? getRetailPrice(p.prevPrice, p.category) : 0);
  }, 0);
  const basketDiff = basketPrev - basketNow; // 양수 = 이번 주가 더 저렴

  if (displayItems.length === 0) return null;

  return (
    <View style={guideStyles.card}>
      {/* 헤더 */}
      <View style={guideStyles.header}>
        <Text style={guideStyles.title}>{config.title}</Text>
        {favoriteItemCodes.length === 0 && (
          <View style={guideStyles.autoBadge}>
            <Text style={guideStyles.autoBadgeText}>자동 추천</Text>
          </View>
        )}
      </View>

      {/* 품목별 시그널 */}
      {displayItems.map((item) => (
        <TouchableOpacity
          key={item.itemCode}
          style={guideStyles.row}
          onPress={() => onItemPress(item.itemCode, item.itemName)}
          activeOpacity={0.7}
        >
          <Text style={guideStyles.rowIcon}>{item.signal.icon}</Text>
          <Text style={guideStyles.rowName}>{item.itemName}</Text>
          <View style={[guideStyles.signalBadge, { backgroundColor: item.signal.bg }]}>
            <Text style={[guideStyles.signalText, { color: item.signal.color }]}>
              {item.signal.label}
            </Text>
          </View>
          <Text style={[guideStyles.rowRate, { color: item.rate >= 0 ? COLORS.surgeStrong : COLORS.dropStrong }]}>
            {item.rate >= 0 ? '+' : ''}{item.rate.toFixed(1)}%
          </Text>
        </TouchableOpacity>
      ))}

      {/* 소비자 장바구니 총액 */}
      {userType === 'CONSUMER' && favoriteItemCodes.length > 0 && basketNow > 0 && (
        <View style={guideStyles.basketRow}>
          <Text style={guideStyles.basketLabel}>관심 품목 소매 합계</Text>
          <Text style={guideStyles.basketAmount}>{formatPrice(basketNow)}</Text>
          {basketDiff !== 0 && (
            <Text style={[guideStyles.basketDiff, { color: basketDiff > 0 ? COLORS.dropStrong : COLORS.surgeStrong }]}>
              {basketDiff > 0 ? `지난주보다 ${formatPrice(Math.abs(basketDiff))} 저렴` : `지난주보다 ${formatPrice(Math.abs(basketDiff))} 비쌈`}
            </Text>
          )}
        </View>
      )}

      {/* 농부 출하 수익 힌트 */}
      {userType === 'FARMER' && favoriteItemCodes.length > 0 && (
        <View style={guideStyles.basketRow}>
          <Text style={guideStyles.basketLabel}>💡 가격 상승 품목은 지금 출하 타이밍입니다</Text>
        </View>
      )}

      {/* 바이어 절감 힌트 */}
      {userType === 'BUYER' && favoriteItemCodes.length > 0 && (
        <View style={guideStyles.basketRow}>
          <Text style={guideStyles.basketLabel}>💡 파란색 품목은 이번 주 대량 구매 적기입니다</Text>
        </View>
      )}

      {/* 관심 품목 없을 때 CTA */}
      {favoriteItemCodes.length === 0 && (
        <Text style={guideStyles.noFavHint}>⭐ 관심 품목을 등록하면 맞춤 가이드를 드립니다</Text>
      )}
    </View>
  );
}

const guideStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  title:  { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  autoBadge: { backgroundColor: '#FFF3E0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  autoBadgeText: { fontSize: 10, fontWeight: '700', color: '#E65100' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 8,
  },
  rowIcon: { fontSize: 15, width: 20, textAlign: 'center' },
  rowName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  signalBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  signalText:  { fontSize: 11, fontWeight: '700' },
  rowRate:     { fontSize: 11, fontWeight: '700', width: 44, textAlign: 'right' },
  basketRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  basketLabel: { fontSize: 11, color: COLORS.textSecondary },
  basketAmount: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  basketDiff:   { fontSize: 12, fontWeight: '600', marginTop: 2 },
  noFavHint:    { fontSize: 11, color: COLORS.textDisabled, marginTop: 8, textAlign: 'center' },
});

function SurgeCards() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const upItems = MOCK_SURGE_ITEMS.filter((x) => x.direction === 'up');
  const dnItems = MOCK_SURGE_ITEMS.filter((x) => x.direction === 'down');
  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>급등락 순위</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('Analysis')} activeOpacity={0.7}>
          <Text style={styles.sectionMore}>전체보기</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.surgeScroll}
      >
        {MOCK_SURGE_ITEMS.map((item) => {
          const isUp  = item.direction === 'up';
          const color = isUp ? COLORS.surgeStrong : COLORS.dropStrong;
          const rank  = isUp ? upItems.indexOf(item) + 1 : dnItems.indexOf(item) + 1;
          const rankLabel = `${rank}위 ${isUp ? '급등' : '급락'}`;
          // MOCK_PRICES에서 itemCode 조회
          const matched = MOCK_PRICES.find((p) => p.itemName === item.name);
          return (
            <TouchableOpacity
              key={item.name}
              style={styles.surgeCard}
              activeOpacity={0.75}
              onPress={() => {
                if (matched) {
                  navigation.navigate('ItemDetail', {
                    itemCode: matched.itemCode,
                    itemName: matched.itemName,
                  });
                }
              }}
            >
              <Text style={[styles.surgeRank, { color }]}>{rankLabel}</Text>
              <Text style={styles.surgeName}>{item.name}</Text>
              <Text style={styles.surgePrice}>{formatPrice(item.price)}</Text>
              <Text style={[styles.surgeRate, { color }]}>
                {isUp ? '▲' : '▼'} {Math.abs(item.changeRate).toFixed(1)}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );
}

function CommunityTicker() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [tickerIdx, setTickerIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const TICKER_ITEMS = MOCK_POSTS.slice(0, 6);

  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setTickerIdx((i) => (i + 1) % TICKER_ITEMS.length);
    };
    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, []);

  const item = TICKER_ITEMS[tickerIdx];

  return (
    <TouchableOpacity style={styles.tickerWrap} activeOpacity={0.8} onPress={() => navigation.navigate('Community')}>
      <View style={styles.tickerBadge}>
        <Text style={styles.tickerBadgeText}>커뮤니티</Text>
      </View>
      <Animated.Text style={[styles.tickerText, { opacity: fadeAnim }]} numberOfLines={1}>
        {item.title}
      </Animated.Text>
      <Text style={styles.tickerArrow}>›</Text>
    </TouchableOpacity>
  );
}

function NewsSection() {
  const handleNewsPress = (url: string) => {
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('링크 오류', '해당 링크를 열 수 없습니다.');
        }
      })
      .catch(() => Alert.alert('링크 오류', '해당 링크를 열 수 없습니다.'));
  };

  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>시장 속보</Text>
      </View>
      {MOCK_NEWS.map((news) => (
        <TouchableOpacity
          key={news.id}
          style={styles.newsCard}
          activeOpacity={0.75}
          onPress={() => news.url && handleNewsPress(news.url)}
        >
          <View style={styles.newsTagRow}>
            <View style={[styles.newsTag, news.tag === '긴급' && styles.newsTagUrgent]}>
              <Text style={[styles.newsTagText, news.tag === '긴급' && styles.newsTagTextUrgent]}>
                {news.tag}
              </Text>
            </View>
          </View>
          <Text style={styles.newsTitle}>{news.title}</Text>
          <View style={styles.newsMetaRow}>
            <Text style={styles.newsMeta}>{news.source} · {news.time}</Text>
            <Text style={styles.newsLink}>자세히 ›</Text>
          </View>
        </TouchableOpacity>
      ))}
    </>
  );
}

function ItemCard({
  item,
  onPress,
  onFavoritePress,
  isFavorite,
  userType,
}: {
  item: (typeof MOCK_PRICES)[0];
  onPress: () => void;
  onFavoritePress: () => void;
  isFavorite?: boolean;
  userType?: string;
}) {
  const rate = calcChangeRate(item.avgPrice, item.prevPrice);
  const color = getChangeColor(rate);
  const icon = getChangeIcon(rate);
  const avgRate = calcChangeRate(item.avgPrice, item.avgYearPrice);
  const displayPrice = getDisplayPrice(item.avgPrice, item.category, userType as any);
  const priceLabel = getPriceLabel(userType as any);

  const rec = getRecommendationText(item.itemName, item.avgPrice, item.avgYearPrice, rate, userType as any);
  const recColor = getRecommendationColor(rec.type);

  return (
    <TouchableOpacity
      style={[styles.itemCard, isFavorite && styles.itemCardFavorite]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* 썸네일 + 즐겨찾기 버튼 묶음 — overflow:hidden 밖에 버튼 배치 */}
      <View style={styles.itemThumbWrap}>
        <View style={styles.itemThumb}>
          <Image source={{ uri: item.thumbnail }} style={styles.itemThumbImg} />
        </View>
        <FavoriteButton
          isFavorite={!!isFavorite}
          onPress={onFavoritePress}
          size="sm"
          style={styles.itemFavBtn}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={styles.itemSub}>{item.gradeCode} · {item.totalQty}kg</Text>
        {rec.type !== 'neutral' && (
          <View style={[styles.recBadge, { backgroundColor: recColor.bg }]}>
            <Text style={[styles.recBadgeText, { color: recColor.text }]} numberOfLines={1}>
              {rec.text}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemPriceLabel}>{priceLabel}</Text>
        <Text style={styles.itemPrice}>{formatPrice(displayPrice)}</Text>
        <View style={styles.itemRateRow}>
          {icon !== '–' && <Text style={[styles.itemRateIcon, { color }]}>{icon} </Text>}
          <Text style={[styles.itemRate, { color }]}>
            {icon === '–' ? '보합' : Math.abs(rate).toFixed(1) + '%'}
          </Text>
        </View>
        {Math.abs(avgRate) >= 3 && (
          <Text style={[styles.itemVsAvg, { color: getChangeColor(avgRate) }]}>
            평년 {avgRate >= 0 ? '+' : ''}{avgRate.toFixed(1)}%
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────
// 메인 스크린
// ──────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedCategoryCode, setCategory, favoriteItemCodes, toggleFavorite } = useFilterStore();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarketCode, setSelectedMarketCode] = useState('110001');
  const [marketModalVisible, setMarketModalVisible] = useState(false);
  const selectedMarketName = MAIN_MARKETS.find((m) => m.code === selectedMarketCode)?.name ?? '가락';
  const userType = user?.userType;

  // 플랜별 관심 품목 한도
  const plan = (user?.plan ?? 'FREE') as keyof typeof PLAN_LIMITS;
  const maxFavorites = PLAN_LIMITS[plan]?.maxItems ?? 3;

  // 즐겨찾기 토글 핸들러 (한도 초과 시 베타 안내)
  const handleFavoritePress = useCallback((itemCode: string) => {
    const isAlreadyFav = favoriteItemCodes.includes(itemCode);
    if (!isAlreadyFav && favoriteItemCodes.length >= maxFavorites) {
      Alert.alert('베타 안내', `오픈 베타 중 관심 품목은 최대 ${maxFavorites}개까지 등록 가능합니다.`);
      return;
    }
    toggleFavorite(itemCode);
  }, [favoriteItemCodes, maxFavorites, toggleFavorite]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsRefreshing(false);
  }, []);

  // 1) 카테고리 필터
  const categoryFiltered = selectedCategoryCode
    ? MOCK_PRICES.filter((p) => p.category === selectedCategoryCode)
    : MOCK_PRICES;

  // 2) 검색 필터
  const searchFiltered = searchQuery.trim()
    ? categoryFiltered.filter((p) =>
        p.itemName.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : categoryFiltered;

  // 3) 관심 품목 우선 정렬 (검색 중이면 정렬 스킵)
  const sortedItems = searchQuery.trim() || favoriteItemCodes.length === 0
    ? searchFiltered
    : [
        ...searchFiltered.filter((p) => favoriteItemCodes.includes(p.itemCode)),
        ...searchFiltered.filter((p) => !favoriteItemCodes.includes(p.itemCode)),
      ];

  const hasFavorites = !searchQuery.trim() && favoriteItemCodes.length > 0;
  const favCount = sortedItems.filter((p) => favoriteItemCodes.includes(p.itemCode)).length;

  // FlatList 헤더: ActionGuide + Surge + Ticker + 섹션 타이틀만
  // SearchBar / CategoryChips 는 FlatList 밖에서 렌더 (Android 터치 충돌 방지)
  const ListHeader = (
    <>
      <ActionGuideCard
        userType={userType}
        favoriteItemCodes={favoriteItemCodes}
        onItemPress={(itemCode, itemName) => navigation.navigate('ItemDetail', { itemCode, itemName })}
      />
      <SurgeCards />
      <CommunityTicker />
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {searchQuery.trim()
            ? `"${searchQuery.trim()}" 검색 결과`
            : selectedCategoryCode
              ? (CATEGORIES.find((c) => c.code === selectedCategoryCode)?.name ?? '') + ' 시세'
              : '전체 품목 시세'}
        </Text>
        <TouchableOpacity
          style={styles.marketBtn}
          onPress={() => setMarketModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.marketBtnText}>{selectedMarketName} · {getPriceSubLabel(userType as any)}</Text>
          <Text style={styles.marketBtnChevron}>▼</Text>
        </TouchableOpacity>
      </View>
      {hasFavorites && favCount > 0 && (
        <View style={styles.favoriteBanner}>
          <Text style={styles.favoriteBannerText}>⭐ 관심 품목 {favCount}개가 상단에 표시됩니다</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* ── 검색 + 카테고리: FlatList 밖에서 고정 렌더 (Android 터치 보장) ── */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />
      <CategoryChips selected={selectedCategoryCode} onSelect={setCategory} />

      {/* 시장 선택 모달 */}
      <Modal
        visible={marketModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMarketModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMarketModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>시장 선택</Text>
            {MAIN_MARKETS.filter((m) => m.code !== '000000').map((m) => {
              const isSelected = m.code === selectedMarketCode;
              return (
                <TouchableOpacity
                  key={m.code}
                  style={[styles.modalItem, isSelected && styles.modalItemActive]}
                  onPress={() => {
                    setSelectedMarketCode(m.code);
                    setMarketModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                    {m.name}시장
                  </Text>
                  {'region' in m && (
                    <Text style={[styles.modalItemSub, isSelected && { color: COLORS.primary }]}>
                      {(m as any).region}
                    </Text>
                  )}
                  {isSelected && <Text style={styles.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            isFavorite={favoriteItemCodes.includes(item.itemCode)}
            userType={userType}
            onPress={() =>
              navigation.navigate('ItemDetail', {
                itemCode: item.itemCode,
                itemName: item.itemName,
              })
            }
            onFavoritePress={() => handleFavoritePress(item.itemCode)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={<NewsSection />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>해당 카테고리 품목이 없습니다</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: 24 },

  // Search
  searchWrap: { padding: 12, backgroundColor: COLORS.surface },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },
  searchClear: { fontSize: 14, color: COLORS.textDisabled, paddingLeft: 4 },

  // Chips — 이모지 없이 7개 한 줄 고정
  chipsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 2,
    gap: 5,
    justifyContent: 'space-between',
  },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, lineHeight: 16, includeFontPadding: false } as any,
  chipTextActive: { color: '#fff' },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sectionSub: { fontSize: 11, color: COLORS.textDisabled },
  marketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  marketBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  marketBtnChevron: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },

  // 시장 선택 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 8,
  },
  modalItemActive: { backgroundColor: '#F1F8E9', marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 0 },
  modalItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  modalItemTextActive: { color: COLORS.primary, fontWeight: '800' },
  modalItemSub: { fontSize: 12, color: COLORS.textSecondary },
  modalItemCheck: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },
  sectionMore: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // Surge cards
  surgeScroll: { paddingHorizontal: 14, paddingBottom: 4, gap: 8 },
  surgeCard: {
    width: 112,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  surgeRank: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  surgeName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  surgePrice: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  surgeRate: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Ticker
  tickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginVertical: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 8,
    overflow: 'hidden',
  },
  tickerBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tickerBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  tickerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  tickerArrow: { fontSize: 16, color: COLORS.textDisabled },

  // Favorite banner
  favoriteBanner: {
    marginHorizontal: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFF176',
  },
  favoriteBannerText: { fontSize: 12, color: '#F57F17', fontWeight: '600' },

  // Item card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginVertical: 3,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  itemCardFavorite: {
    borderColor: '#FDD835',
    borderWidth: 1.5,
  },
  // 썸네일 + 별 버튼을 담는 래퍼 (overflow:hidden 없음 → 별이 잘리지 않음)
  itemThumbWrap: {
    width: 52,
    height: 52,
    position: 'relative',
  },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  itemThumbImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  itemFavBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
    zIndex: 10,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemSub: { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },
  recBadge: {
    marginTop: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  recBadgeText: { fontSize: 10, fontWeight: '600' },
  itemRight: { alignItems: 'flex-end' },
  itemPriceLabel: { fontSize: 9, color: COLORS.textDisabled, marginBottom: 1 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  itemRateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  itemRateIcon: { fontSize: 10, fontWeight: '700' },
  itemRate: { fontSize: 12, fontWeight: '700' },
  itemVsAvg: { fontSize: 10, marginTop: 1 },

  // News
  newsCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginVertical: 3,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  newsTagRow: { marginBottom: 5 },
  newsTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  newsTagUrgent: { backgroundColor: '#FFEBEE' },
  newsTagText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  newsTagTextUrgent: { color: COLORS.surgeStrong },
  newsTitle:   { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 19 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  newsMeta:    { fontSize: 11, color: COLORS.textDisabled },
  newsLink:    { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
});
