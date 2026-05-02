/**
 * IntroScreen — 첫 실행 시에만 보이는 3슬라이드 온보딩
 * AsyncStorage 'hasSeenIntro' 플래그로 1회 제어
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants';

const { width: W, height: H } = Dimensions.get('window');

// ── 슬라이드 데이터 ────────────────────────────────────────
const SLIDES = [
  {
    key: '1',
    icon: '📊',
    title: '실시간 시세 한눈에',
    desc: '채소·과일·수산·축산 120여 품목\n가격을 매일 업데이트해 드립니다.\n급등·급락 알림도 받아보세요.',
    bg: '#1A6B38',
    accent: '#FFD232',
  },
  {
    key: '2',
    icon: '🛒',
    title: '스마트 장바구니 절약',
    desc: '관심 품목을 담고 지난주 대비\n얼마나 절약했는지 바로 확인.\n절약 기록도 꾸준히 쌓여요.',
    bg: '#1A5C7A',
    accent: '#7EE8A2',
  },
  {
    key: '3',
    icon: '💰',
    title: '도매 손익 자동 계산',
    desc: '매입가·박스 수만 입력하면\nROI·순이익·손익분기가\n즉시 계산됩니다.',
    bg: '#4A3080',
    accent: '#FFD232',
  },
];

interface Props {
  onDone: () => void;
}

export default function IntroScreen({ onDone }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goNext = () => {
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIdx(next);
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(async () => {
      await AsyncStorage.setItem('hasSeenIntro', '1').catch(() => {});
      onDone();
    });
  };

  const slide = SLIDES[activeIdx];

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / W);
          setActiveIdx(idx);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg }]}>
            {/* 배경 원 */}
            <View style={[styles.bgCircle1, { borderColor: item.accent + '22' }]} />
            <View style={[styles.bgCircle2, { borderColor: item.accent + '18' }]} />

            {/* 아이콘 영역 */}
            <View style={[styles.iconWrap, { borderColor: item.accent + '55', backgroundColor: item.accent + '22' }]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>

            {/* 텍스트 */}
            <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* 하단 컨트롤 */}
      <View style={[styles.bottomBar, { backgroundColor: slide.bg }]}>
        {/* 점 인디케이터 */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIdx ? slide.accent : slide.accent + '44',
                  width: i === activeIdx ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* 버튼 */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: slide.accent }]}
          onPress={goNext}
          activeOpacity={0.82}
        >
          <Text style={[styles.btnText, { color: slide.bg }]}>
            {activeIdx < SLIDES.length - 1 ? '다음' : '시작하기 →'}
          </Text>
        </TouchableOpacity>

        {/* 건너뛰기 */}
        {activeIdx < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleDone} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: slide.accent + 'AA' }]}>건너뛰기</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  slide: {
    width: W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 180,
  },

  // 배경 장식 원
  bgCircle1: {
    position: 'absolute',
    width: W * 1.1,
    height: W * 1.1,
    borderRadius: W * 0.55,
    borderWidth: 60,
    top: -W * 0.4,
    left: -W * 0.05,
  },
  bgCircle2: {
    position: 'absolute',
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    borderWidth: 40,
    bottom: 100,
    right: -W * 0.25,
  },

  // 아이콘
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iconText: { fontSize: 60 },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 18, letterSpacing: -0.5 },
  desc:  { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26 },

  // 하단
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },

  btn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  btnText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  skipBtn: { paddingVertical: 6 },
  skipText: { fontSize: 14, fontWeight: '600' },
});
