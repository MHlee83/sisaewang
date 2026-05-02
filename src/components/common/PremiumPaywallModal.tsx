import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Pressable,
} from 'react-native';
import { COLORS, PLAN_LIMITS } from '@/constants';

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  currentCount: number;
  maxCount: number;
}

const PERKS = [
  '⭐  관심 품목 무제한 등록',
  '🔔  알림 무제한 설정',
  '📊  5년치 가격 히스토리',
  '🤖  AI 매수/매도 신호',
  '📄  엑셀 데이터 내보내기',
];

export default function PremiumPaywallModal({ visible, onClose, onUpgrade, currentCount, maxCount }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* 딤 배경 */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* 바텀 시트 */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* 핸들 */}
        <View style={styles.handle} />

        {/* 아이콘 + 타이틀 */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>👑</Text>
        </View>
        <Text style={styles.title}>관심 품목 한도 초과</Text>
        <Text style={styles.subtitle}>
          무료 플랜은 관심 품목을 최대 <Text style={styles.bold}>{maxCount}개</Text>까지 등록할 수 있어요.{'\n'}
          프리미엄으로 업그레이드하면 <Text style={styles.bold}>무제한</Text>으로 사용할 수 있습니다.
        </Text>

        {/* 현재 사용량 */}
        <View style={styles.usageBar}>
          <View style={[styles.usageFill, { width: `${Math.min((currentCount / maxCount) * 100, 100)}%` as any }]} />
        </View>
        <Text style={styles.usageText}>{currentCount} / {maxCount}개 사용 중</Text>

        {/* 혜택 리스트 */}
        <View style={styles.perksBox}>
          {PERKS.map((perk) => (
            <Text key={perk} style={styles.perkItem}>{perk}</Text>
          ))}
        </View>

        {/* CTA 버튼 */}
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>👑 프리미엄 시작하기</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>월 3,900원</Text>
          </View>
        </TouchableOpacity>

        {/* 닫기 */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>나중에 할게요</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.divider, marginBottom: 20,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 30 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 16,
  },
  bold: { fontWeight: '800', color: COLORS.textPrimary },

  usageBar: {
    width: '100%', height: 8, borderRadius: 4,
    backgroundColor: COLORS.divider, overflow: 'hidden', marginBottom: 6,
  },
  usageFill: { height: '100%', backgroundColor: '#F57C00', borderRadius: 4 },
  usageText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 20 },

  perksBox: {
    width: '100%', backgroundColor: '#F9FBE7',
    borderRadius: 12, padding: 14, gap: 8, marginBottom: 20,
  },
  perkItem: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },

  upgradeBtn: {
    width: '100%', backgroundColor: '#F57F17',
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 10,
    shadowColor: '#F57F17', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  priceBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  priceText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  cancelBtn: { paddingVertical: 10 },
  cancelText: { fontSize: 14, color: COLORS.textDisabled },
});
