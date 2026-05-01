import React, { useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { COLORS } from '@/constants';
import { getPosts } from '@/services/communityService';
import { useAuthStore } from '@/store/authStore';
import { MOCK_POSTS } from '@/services/mockData';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import type { CommunityPost } from '@/types';

dayjs.extend(relativeTime);
dayjs.locale('ko');

export default function CommunityScreen() {
  const navigation  = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user }    = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['communityPosts'],
    queryFn:  () => getPosts({ limit: 30 }),
    staleTime: 0, // 항상 최신 데이터
  });

  // 탭 포커스될 때마다 최상단으로 스크롤 + 새로고침
  useFocusEffect(
    useCallback(() => {
      refetch();
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    }, [refetch])
  );

  // API 실패 시 목 데이터로 폴백
  const posts = (data?.posts ?? MOCK_POSTS) as CommunityPost[];

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
      activeOpacity={0.75}
    >
      <View style={styles.cardBody}>
        {item.itemCode && (
          <View style={styles.itemBadge}>
            <Text style={styles.itemBadgeText}>#{item.itemCode}</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.content} numberOfLines={2}>{item.content}</Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>{item.authorName}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{dayjs(item.createdAt).fromNow()}</Text>
        </View>
      </View>

      {item.thumbnail && (
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailPlaceholder}>📷</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.footerItem}>👀 {item.viewCount}</Text>
        <Text style={styles.footerItem}>❤️ {item.likeCount}</Text>
        <Text style={styles.footerItem}>💬 {item.commentCount}</Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>커뮤니티</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🌱</Text>
                <Text style={styles.emptyText}>첫 번째 글을 작성해보세요!</Text>
              </View>
            ) : null
          }
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>

      {/* FAB은 TabNavigator 레벨에서 렌더링 (TabNavigator.tsx 참고) */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  list:      { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: 12 },
  card: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardBody: { flex: 1 },
  itemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  itemBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  title:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  content: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 8 },
  meta:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textDisabled },
  metaDot:  { fontSize: 11, color: COLORS.textDisabled },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholder: { fontSize: 28 },
  cardFooter: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  footerItem: { fontSize: 11, color: COLORS.textDisabled },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
