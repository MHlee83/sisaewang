import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { COLORS, PLAN_LIMITS } from '@/constants';
import { useAuthStore } from '@/store/authStore';
import { useFilterStore } from '@/store/filterStore';
import { useAlertStore } from '@/store/alertStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useSavingsStore } from '@/store/savingsStore';
import dayjs from 'dayjs';
import { getUserItems } from '@/services/itemService';
import { getAlerts } from '@/services/alertService';
import { MOCK_PRICES } from '@/services/mockData';

const USER_TYPE_LABEL = {
  CONSUMER: '🛒 소비자',
  FARMER:   '🌾 소농·출하자',
  BUYER:    '🏪 유통 바이어·식당',
};

export default function MyPageScreen() {
  const { user, logout } = useAuthStore();
  const { favoriteItemCodes } = useFilterStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { records, thisMonthSavings, totalSavings, removeRecord } = useSavingsStore();
  const { alerts: localAlerts } = useAlertStore();
  const { notifications, unreadCount, markAllRead } = useNotificationStore();

  const { data: userItems } = useQuery({
    queryKey: ['userItems'],
    queryFn: getUserItems,
    enabled: !!user,
  });

  const { data: apiAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: getAlerts,
    enabled: !!user,
  });

  const plan = user?.plan ?? 'FREE';
  const planLimits = PLAN_LIMITS[plan];

  // API 응답 없으면 filterStore + MOCK_PRICES로 폴백
  const displayItems = userItems && userItems.length > 0
    ? userItems
    : favoriteItemCodes.map((code) => {
        const mock = MOCK_PRICES.find((p) => p.itemCode === code);
        return { id: code, itemName: mock?.itemName ?? code, marketName: '전체 평균' };
      });

  // API 응답 없으면 로컬 alertStore로 폴백
  const displayAlerts = apiAlerts ?? localAlerts;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* 프로필 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.nickname?.[0] ?? '?'}
            </Text>
          </View>
          <View>
            <Text style={styles.nickname}>{user?.nickname ?? '게스트'}</Text>
            {user ? (
              user.email
                ? <Text style={styles.email}>{user.email}</Text>
                : <Text style={styles.emailGray}>이메일 미등록</Text>
            ) : (
              <Text style={styles.emailGray}>로그인이 필요합니다</Text>
            )}
            {user && (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{plan} 플랜</Text>
              </View>
            )}
          </View>
        </View>

        {/* 사용자 타입 */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사용자 유형</Text>
            <Text style={styles.userType}>
              {USER_TYPE_LABEL[user.userType]}
            </Text>
          </View>
        )}

        {/* 관심 품목 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⭐ 관심 품목</Text>
            <Text style={styles.sectionCount}>
              {displayItems.length} / {planLimits.maxItems === Infinity ? '무제한' : planLimits.maxItems}
            </Text>
          </View>
          {displayItems.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={styles.listItem}
              onPress={() => navigation.navigate('ItemDetail', {
                itemCode: String(item.id),
                itemName: item.itemName,
              })}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.listItemText}>{item.itemName}</Text>
                  {item.marketName && (
                    <Text style={styles.listItemSub}>{item.marketName}</Text>
                  )}
                </View>
                <Text style={styles.listItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 활동 알림 */}
        {notifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                🔔 활동 알림{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead}>
                  <Text style={styles.sectionAction}>모두 읽음</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.slice(0, 5).map((n) => (
              <View key={n.id} style={[styles.notifItem, !n.isRead && styles.notifItemUnread]}>
                <Text style={styles.notifMessage}>{n.message}</Text>
                <Text style={styles.notifMeta}>
                  {n.postTitle} · {dayjs(n.createdAt).fromNow()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 알림 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⚙️ 알림 설정</Text>
            <Text style={styles.sectionCount}>
              {displayAlerts?.length ?? 0}개
            </Text>
          </View>
          {displayAlerts?.map((alert) => (
            <View key={String(alert.id)} style={styles.listItem}>
              <Text style={styles.listItemText}>{(alert as any).itemName ?? '알림'}</Text>
              <Text style={styles.listItemSub}>
                {alert.alertType} · {alert.thresholdValue}
                {alert.alertType.includes('RATE') ? '%' : '원'}
              </Text>
            </View>
          ))}
        </View>

        {/* 나의 도구 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧮 나의 도구</Text>
          {/* 소비자 도구 */}
          {(!user || user.userType === 'CONSUMER') && (
            <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('BasketCalculator')} activeOpacity={0.7}>
              <Text style={styles.toolEmoji}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName}>장바구니 계산기</Text>
                <Text style={styles.toolDesc}>현재 시세로 장바구니 총액 & 지난주 비교</Text>
              </View>
              <Text style={styles.toolArrow}>›</Text>
            </TouchableOpacity>
          )}
          {/* 소농 도구 */}
          {user?.userType === 'FARMER' && (
            <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('ShipmentCalculator')} activeOpacity={0.7}>
              <Text style={styles.toolEmoji}>🌾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName}>출하 수익 계산기</Text>
                <Text style={styles.toolDesc}>수량 입력 → 오늘 vs 1주 후 예상 수익 비교</Text>
              </View>
              <Text style={styles.toolArrow}>›</Text>
            </TouchableOpacity>
          )}
          {/* 바이어 도구 */}
          {user?.userType === 'BUYER' && (
            <TouchableOpacity style={styles.toolCard} onPress={() => navigation.navigate('CostCalculator')} activeOpacity={0.7}>
              <Text style={styles.toolEmoji}>🍽️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName}>원가 계산기</Text>
                <Text style={styles.toolDesc}>메뉴별 식재료 원가 & 권장 판매가 계산</Text>
              </View>
              <Text style={styles.toolArrow}>›</Text>
            </TouchableOpacity>
          )}
          {/* 도매상 손익 계산기 — 전 유형 공개 */}
          <TouchableOpacity style={[styles.toolCard, { borderColor: '#1B8A4E', borderWidth: 1 }]} onPress={() => navigation.navigate('ProfitCalculator')} activeOpacity={0.7}>
            <Text style={styles.toolEmoji}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.toolName}>도매 손익 계산기 <Text style={{ fontSize: 10, color: '#1B8A4E', fontWeight: '700' }}>NEW</Text></Text>
              <Text style={styles.toolDesc}>매입가·박스 수 입력 → 마진·ROI·손익분기 자동 계산</Text>
            </View>
            <Text style={styles.toolArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 절약 기록 */}
        <View style={[styles.section, { paddingBottom: 20, marginBottom: 16 }]}>
          <Text style={styles.sectionTitle}>💰 나의 절약 기록</Text>
          {/* 요약 */}
          <View style={styles.savingsSummary}>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsBoxLabel}>이번 달 절약</Text>
              <Text style={styles.savingsBoxValue}>{thisMonthSavings().toLocaleString()}원</Text>
            </View>
            <View style={styles.savingsDivider} />
            <View style={styles.savingsBox}>
              <Text style={styles.savingsBoxLabel}>누적 절약</Text>
              <Text style={styles.savingsBoxValue}>{totalSavings().toLocaleString()}원</Text>
            </View>
          </View>
          {records.length === 0 ? (
            <Text style={styles.savingsEmpty}>
              아직 기록이 없어요.{'\n'}도구를 사용해 절약 기록을 쌓아보세요 💡
            </Text>
          ) : (
            records.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.savingsRecord}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savingsRecordName}>{r.itemName}</Text>
                  <Text style={styles.savingsRecordDate}>{r.date}</Text>
                </View>
                <Text style={styles.savingsRecordAmount}>
                  {r.savedAmount > 0 ? '−' : '+'}{Math.abs(r.savedAmount).toLocaleString()}원
                </Text>
                <TouchableOpacity
                  onPress={() => removeRecord(r.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 10 }}
                >
                  <Text style={{ fontSize: 16, color: '#999' }}>×</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 오픈 베타 안내 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 오픈 베타 이용 중</Text>
          <View style={[styles.upgradeButton, { marginTop: 12 }]}>
            <Text style={styles.upgradeText}>
              베타 기간 중 관심 품목 최대 3개까지 무료 제공
            </Text>
          </View>
        </View>

        {/* 로그아웃 */}
        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  profileCard: {
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, color: '#fff', fontWeight: '700' },
  nickname: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  email:     { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  emailGray: { fontSize: 13, color: COLORS.textDisabled, marginTop: 2 },
  planBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  section: { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sectionCount: { fontSize: 13, color: COLORS.textSecondary },
  userType: { fontSize: 16, color: COLORS.textPrimary },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  listItemText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  listItemSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  listItemArrow: { fontSize: 20, color: COLORS.textDisabled, fontWeight: '300' },

  // 도구
  toolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  toolEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  toolName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  toolDesc:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  toolArrow: { fontSize: 20, color: COLORS.textDisabled },

  // 절약 기록
  savingsSummary: {
    flexDirection: 'row', backgroundColor: '#E8F5E9',
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  savingsBox:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  savingsDivider:{ width: 1, backgroundColor: COLORS.primary + '33' },
  savingsBoxLabel:{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  savingsBoxValue:{ fontSize: 18, fontWeight: '800', color: COLORS.primary },
  savingsEmpty:  { fontSize: 13, color: COLORS.textDisabled, textAlign: 'center', paddingVertical: 16, lineHeight: 20 },
  savingsRecord: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  savingsRecordName:   { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  savingsRecordDate:   { fontSize: 11, color: COLORS.textDisabled, marginTop: 2 },
  savingsRecordAmount: { fontSize: 14, fontWeight: '800', color: COLORS.dropStrong },
  upgradeButton: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  upgradeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  logoutButton: { margin: 16, padding: 14, alignItems: 'center' },
  logoutText: { fontSize: 14, color: COLORS.textSecondary },
  sectionAction: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  notifItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  notifItemUnread: { backgroundColor: '#F1F8E9', marginHorizontal: -16, paddingHorizontal: 16 },
  notifMessage: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18, marginBottom: 3 },
  notifMeta: { fontSize: 11, color: COLORS.textDisabled },
});
