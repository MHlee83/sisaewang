import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  Modal, Pressable, Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { COLORS } from '@/constants';
import {
  getPost, getComments, createComment, deleteComment,
  toggleLike, reportPost, reportComment, deletePost,
} from '@/services/communityService';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { MOCK_POSTS } from '@/services/mockData';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

// ── 품목 코드 → 이름 ──
const ITEM_NAMES: Record<string, string> = {
  '10001': '배추',   '10002': '양배추', '10003': '시금치', '10004': '상추',
  '10005': '깻잎',   '10006': '부추',   '10007': '쑥갓',   '10008': '열무',
  '10009': '미나리', '10010': '아욱',   '10011': '양상추', '10012': '브로콜리',
  '10021': '무',     '10022': '당근',   '10023': '감자',   '10024': '연근',
  '10025': '우엉',   '10031': '대파',   '10032': '쪽파',   '10033': '양파',
  '10034': '마늘',   '10035': '생강',   '10041': '풋고추', '10042': '홍고추',
  '10043': '청양고추','10044': '파프리카','10051': '오이',  '10052': '호박',
  '10053': '가지',   '10054': '토마토', '10055': '방울토마토',
  '20011': '사과',   '20012': '배',     '20013': '복숭아', '20021': '포도',
  '20031': '감귤',   '20041': '딸기',   '20051': '참외',   '20052': '수박',
  '20061': '바나나', '20071': '키위',   '30011': '갈치',   '30021': '고등어',
  '30031': '오징어', '40011': '돼지고기','40012': '소고기','40021': '닭고기',
  '40031': '계란',   '50011': '쌀',     '50012': '현미',   '50031': '콩',
  '111': '배추', '112': '무', '151': '양파', '152': '마늘',
  '211': '사과', '222': '딸기', '511': '쌀', '441': '계란',
};

interface LocalReply {
  id: string;
  parentCommentId: string;
  content: string;
  authorName: string;
  createdAt: string;
}
interface LocalComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  isBlinded: boolean;
  replies: LocalReply[];
}

const REPORT_REASONS = [
  { icon: '📢', label: '스팸/광고',  desc: '불필요한 홍보·광고 게시물' },
  { icon: '🤬', label: '욕설/비방',  desc: '욕설, 혐오 표현, 인신공격' },
  { icon: '❗', label: '허위정보',   desc: '사실과 다른 잘못된 정보' },
  { icon: '💬', label: '기타',       desc: '그 외 신고가 필요한 경우' },
];

// ── 신고 모달 ──
function ReportModal({ visible, title, onClose, onSelect }: {
  visible: boolean; title: string; onClose: () => void; onSelect: (reason: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : 300, useNativeDriver: true, bounciness: 4 }).start();
  }, [visible]);
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={rStyles.overlay} onPress={onClose}>
        <Animated.View style={[rStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable>
            <View style={rStyles.handle} />
            <View style={rStyles.header}>
              <View style={rStyles.iconWrap}><Text style={rStyles.icon}>🚨</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={rStyles.title}>신고하기</Text>
                <Text style={rStyles.sub} numberOfLines={1}>{title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
                <Text style={rStyles.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={rStyles.divider} />
            <Text style={rStyles.listLabel}>신고 사유를 선택해 주세요</Text>
            {REPORT_REASONS.map((r, i) => (
              <TouchableOpacity
                key={r.label}
                style={[rStyles.row, i === REPORT_REASONS.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.65}
                onPress={() => onSelect(r.label)}
              >
                <View style={rStyles.reasonIcon}><Text style={{ fontSize: 18 }}>{r.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={rStyles.reasonLabel}>{r.label}</Text>
                  <Text style={rStyles.reasonDesc}>{r.desc}</Text>
                </View>
                <Text style={rStyles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={rStyles.cancelBtn} onPress={onClose}>
              <Text style={rStyles.cancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ReportDoneModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (visible) { const t = setTimeout(onClose, 2000); return () => clearTimeout(t); }
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={dStyles.wrap}>
        <View style={dStyles.card}>
          <Text style={{ fontSize: 34, marginBottom: 6 }}>✅</Text>
          <Text style={dStyles.title}>신고 접수 완료</Text>
          <Text style={dStyles.sub}>검토 후 조치하겠습니다.</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── 답글 아이템 ──
function ReplyItem({ reply, isMyReply, onDelete }: {
  reply: LocalReply; isMyReply: boolean; onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.replyItem}
      onLongPress={() => isMyReply && Alert.alert('답글', '', [
        { text: '삭제', style: 'destructive', onPress: onDelete },
        { text: '취소', style: 'cancel' },
      ])}
      activeOpacity={0.85}
    >
      <View style={styles.replyBar} />
      <View style={{ flex: 1 }}>
        <View style={styles.commentMeta}>
          <Text style={styles.replyArrow}>↩ </Text>
          <Text style={styles.commentAuthor}>{reply.authorName}</Text>
          <Text style={styles.commentTime}> · {dayjs(reply.createdAt).format('MM.DD HH:mm')}</Text>
        </View>
        <Text style={styles.commentBody}>{reply.content}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── 댓글 아이템 ──
function CommentItem({ comment, isMyComment, onDelete, onReport, onReply, replies, currentUser, onDeleteReply }: {
  comment: any; isMyComment: boolean;
  onDelete: () => void; onReport: () => void;
  onReply: (id: string, name: string) => void;
  replies: LocalReply[]; currentUser: string;
  onDeleteReply: (id: string) => void;
}) {
  return (
    <View style={styles.commentBlock}>
      <TouchableOpacity
        style={styles.commentItem}
        onLongPress={() => isMyComment ? Alert.alert('댓글', '', [
          { text: '삭제', style: 'destructive', onPress: onDelete },
          { text: '취소', style: 'cancel' },
        ]) : onReport()}
        activeOpacity={0.85}
      >
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.commentTime}>{dayjs(comment.createdAt).format('MM.DD HH:mm')}</Text>
          {!isMyComment && (
            <TouchableOpacity onPress={onReport} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={styles.reportBtn}>신고</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.commentBody, comment.isBlinded && styles.blindedText]}>
          {comment.content}
        </Text>
        <TouchableOpacity
          style={styles.replyBtn}
          onPress={() => onReply(String(comment.id), comment.authorName)}
          hitSlop={{ top:6,bottom:6,left:6,right:6 }}
        >
          <Text style={styles.replyBtnText}>↩ 답글 달기</Text>
          {replies.length > 0 && <Text style={styles.replyCount}> · 답글 {replies.length}개</Text>}
        </TouchableOpacity>
      </TouchableOpacity>
      {replies.map((r) => (
        <ReplyItem
          key={r.id} reply={r}
          isMyReply={r.authorName === currentUser}
          onDelete={() => onDeleteReply(r.id)}
        />
      ))}
    </View>
  );
}

// ── 메인 화면 ──
export default function PostDetailScreen() {
  const route       = useRoute<Props['route']>();
  const navigation  = useNavigation();
  const { postId }  = route.params;
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [commentText,  setCommentText]  = useState('');
  const [isAnonymous,  setIsAnonymous]  = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [apiReplies, setApiReplies] = useState<Record<string, LocalReply[]>>({});
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);

  const [reportVisible,     setReportVisible]     = useState(false);
  const [reportDoneVisible, setReportDoneVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<
    | { type: 'post' }
    | { type: 'comment'; commentId: string | number }
    | null
  >(null);

  // ── mock 데이터 초기값 ──
  const mockPost = MOCK_POSTS.find((p) => String(p.id) === String(postId));
  const mockPostData: import('@/types').CommunityPost | undefined = mockPost ? {
    id: String(mockPost.id), title: mockPost.title, content: mockPost.content,
    authorName: mockPost.authorName, itemCode: (mockPost as any).itemCode ?? null,
    isAnonymous: false, isMyPost: false,
    likeCount: mockPost.likeCount, viewCount: 42, commentCount: 0,
    thumbnail: mockPost.thumbnail ?? null, images: [], liked: false,
    createdAt: mockPost.createdAt, updatedAt: mockPost.updatedAt ?? mockPost.createdAt,
  } : undefined;

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', postId],
    queryFn:  () => getPost(postId),
    initialData: mockPostData,
    retry: false,
  });

  const { data: apiComments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn:  () => getComments(postId),
    initialData: [],
    retry: false,
  });

  // ── 좋아요 ──
  const [localLiked,     setLocalLiked]     = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState<number | null>(null);
  const displayLiked     = localLikeCount !== null ? localLiked     : (post?.liked     ?? false);
  const displayLikeCount = localLikeCount !== null ? localLikeCount : (post?.likeCount ?? 0);

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['post', postId] }),
  });
  const handleLike = () => {
    setLocalLiked(!displayLiked);
    setLocalLikeCount(displayLikeCount + (!displayLiked ? 1 : -1));
    likeMutation.mutate();
  };

  // ── 답글 ──
  const handleReplyPress = useCallback((commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
    setCommentText('');
    setTimeout(() => commentInputRef.current?.focus(), 100);
  }, []);
  const cancelReply = () => { setReplyingTo(null); setCommentText(''); };

  // ── 댓글/답글 등록 ──
  // 답글은 API에 보내지 않고 로컬에만 저장 (API가 flat 구조라 중복 표시 방지)
  const submitComment = useCallback((text: string) => {
    if (!text.trim()) return;
    const authorName = isAnonymous ? '익명' : (user?.nickname ?? '테스트유저');
    const now = new Date().toISOString();

    if (replyingTo) {
      // 답글: 로컬만 저장
      const newReply: LocalReply = {
        id: Date.now().toString(),
        parentCommentId: replyingTo.commentId,
        content: text.trim(),
        authorName,
        createdAt: now,
      };
      const isApiComment = apiComments.some((c: any) => String(c.id) === replyingTo.commentId);
      if (isApiComment) {
        setApiReplies((prev) => ({
          ...prev,
          [replyingTo.commentId]: [...(prev[replyingTo.commentId] ?? []), newReply],
        }));
      } else {
        setLocalComments((prev) => prev.map((c) =>
          c.id === replyingTo.commentId
            ? { ...c, replies: [...c.replies, newReply] }
            : c,
        ));
      }
      // 알림
      const target = replyingTo.authorName;
      if (target !== authorName && target !== '익명') {
        addNotification({
          type: 'reply',
          message: `${authorName}님이 회원님의 댓글에 답글을 달았습니다: "${text.slice(0, 30)}"`,
          postId, postTitle: post?.title ?? '', fromUser: authorName,
        });
      }
      setReplyingTo(null);
      setCommentText('');
    } else {
      // 일반 댓글: API 전송
      createComment(postId, text.trim(), isAnonymous)
        .then(() => queryClient.invalidateQueries({ queryKey: ['comments', postId] }))
        .catch(() => {
          // API 실패 시 로컬 저장
          setLocalComments((prev) => [...prev, {
            id: Date.now().toString(), content: text.trim(),
            authorName, createdAt: now, isBlinded: false, replies: [],
          }]);
        });
      setCommentText('');
    }
  }, [replyingTo, isAnonymous, user, apiComments, postId, post, addNotification, queryClient]);

  // ── 게시글 삭제 ──
  const deletePostMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['communityPosts'] }); navigation.goBack(); },
  });
  const handleDeletePost = () => Alert.alert('게시글 삭제', '정말 삭제하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: () => deletePostMutation.mutate() },
  ]);

  const handleReportSelect = (reason: string) => {
    setReportVisible(false);
    if (!reportTarget) return;
    const p = reportTarget.type === 'post'
      ? reportPost(postId, reason)
      : reportComment(postId, reportTarget.commentId as string, reason);
    p.then(() => setReportDoneVisible(true)).catch(() => setReportDoneVisible(true));
  };

  const totalCommentCount =
    apiComments.length + localComments.length +
    Object.values(apiReplies).reduce((s, r) => s + r.length, 0) +
    localComments.reduce((s, c) => s + c.replies.length, 0);

  if (isLoading || !post) {
    return <View style={styles.loading}><Text>불러오는 중...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView>
          {/* ── 게시글 카드 ── */}
          <View style={styles.postCard}>
            {/* 품목 배지 */}
            {post.itemCode && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>🌿 {ITEM_NAMES[post.itemCode] ?? post.itemCode}</Text>
              </View>
            )}

            {/* 작성자 · 시간 */}
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(post.authorName ?? '?')[0]}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{post.authorName}</Text>
                <Text style={styles.authorTime}>{dayjs(post.createdAt).format('YYYY.MM.DD HH:mm')} · 조회 {post.viewCount}</Text>
              </View>
            </View>

            {/* 제목 */}
            <Text style={styles.title}>{post.title}</Text>

            {/* 본문 */}
            <Text style={styles.content}>{post.content}</Text>

            {/* 액션 바 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, displayLiked && styles.actionBtnLiked]}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionIcon, displayLiked && { color: '#E53935' }]}>♥</Text>
                <Text style={[styles.actionLabel, displayLiked && { color: '#E53935' }]}>{displayLikeCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => commentInputRef.current?.focus()}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>💬</Text>
                <Text style={styles.actionLabel}>{totalCommentCount}</Text>
              </TouchableOpacity>

              {post.isMyPost ? (
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={handleDeletePost} activeOpacity={0.7}>
                  <Text style={[styles.actionIcon, { color: '#E53935' }]}>🗑</Text>
                  <Text style={[styles.actionLabel, { color: '#E53935' }]}>삭제</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setReportTarget({ type: 'post' }); setReportVisible(true); }} activeOpacity={0.7}>
                  <Text style={styles.actionIcon}>🚨</Text>
                  <Text style={styles.actionLabel}>신고</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── 댓글 섹션 ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>댓글 {totalCommentCount}개</Text>

            {apiComments.map((c: any) => (
              <CommentItem
                key={c.id}
                comment={c}
                isMyComment={user ? c.authorName === user.nickname : false}
                onDelete={() => Alert.alert('댓글 삭제', '삭제하시겠습니까?', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () =>
                    deleteComment(postId, c.id).then(() =>
                      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
                    )},
                ])}
                onReport={() => { setReportTarget({ type: 'comment', commentId: c.id }); setReportVisible(true); }}
                onReply={handleReplyPress}
                replies={apiReplies[String(c.id)] ?? []}
                currentUser={user?.nickname ?? '테스트유저'}
                onDeleteReply={(rid) => setApiReplies((prev) => ({
                  ...prev,
                  [String(c.id)]: (prev[String(c.id)] ?? []).filter((r) => r.id !== rid),
                }))}
              />
            ))}

            {localComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                isMyComment={true}
                onDelete={() => setLocalComments((prev) => prev.filter((x) => x.id !== c.id))}
                onReport={() => {}}
                onReply={handleReplyPress}
                replies={c.replies}
                currentUser={user?.nickname ?? '테스트유저'}
                onDeleteReply={(rid) => setLocalComments((prev) => prev.map((x) =>
                  x.id === c.id ? { ...x, replies: x.replies.filter((r) => r.id !== rid) } : x
                ))}
              />
            ))}

            {totalCommentCount === 0 && (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsText}>첫 번째 댓글을 남겨보세요 💬</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── 댓글 입력 ── */}
        <View>
          {replyingTo && (
            <View style={styles.replyingBar}>
              <Text style={styles.replyingText}>
                ↩ <Text style={{ fontWeight: '700' }}>{replyingTo.authorName}</Text>에게 답글
              </Text>
              <TouchableOpacity onPress={cancelReply} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Text style={styles.replyingCancel}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.anonBtn, isAnonymous && styles.anonBtnOn]}
              onPress={() => setIsAnonymous((v) => !v)}
            >
              <Text style={[styles.anonBtnText, isAnonymous && styles.anonBtnTextOn]}>
                {isAnonymous ? '익명 ✓' : '익명'}
              </Text>
            </TouchableOpacity>
            <TextInput
              ref={commentInputRef}
              style={styles.input}
              placeholder={replyingTo ? `${replyingTo.authorName}에게 답글...` : '댓글을 입력하세요...'}
              placeholderTextColor={COLORS.textDisabled}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !commentText.trim() && styles.sendBtnOff]}
              onPress={() => submitComment(commentText)}
              disabled={!commentText.trim()}
            >
              <Text style={styles.sendBtnText}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ReportModal
        visible={reportVisible}
        title={post.title}
        onClose={() => setReportVisible(false)}
        onSelect={handleReportSelect}
      />
      <ReportDoneModal visible={reportDoneVisible} onClose={() => setReportDoneVisible(false)} />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F6' },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 게시글 카드
  postCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 0,
    marginBottom: 8,
  },
  itemBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  itemBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  authorName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  authorTime:  { fontSize: 11, color: COLORS.textDisabled, marginTop: 1 },

  title:   { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 28, marginBottom: 14 },
  content: { fontSize: 15, color: '#333', lineHeight: 26, marginBottom: 20 },

  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 4,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  actionBtnLiked:  { backgroundColor: '#FFF0F0' },
  actionBtnDelete: { backgroundColor: '#FFF0F0' },
  actionIcon:  { fontSize: 16, color: COLORS.textSecondary },
  actionLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  // 댓글
  commentsSection: { backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 80 },
  commentsHeader:  { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },

  commentBlock: { borderBottomWidth: 1, borderBottomColor: '#F2F4F6' },
  commentItem:  { paddingVertical: 14 },
  commentMeta:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 4 },
  commentAuthor:{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  commentTime:  { fontSize: 11, color: COLORS.textDisabled },
  commentBody:  { fontSize: 14, color: '#333', lineHeight: 22 },
  blindedText:  { color: COLORS.textDisabled, fontStyle: 'italic' },
  reportBtn:    { fontSize: 11, color: COLORS.textDisabled, marginLeft: 4 },

  replyBtn:     { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  replyBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  replyCount:   { fontSize: 12, color: COLORS.textDisabled },

  // 답글
  replyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 8,
    backgroundColor: '#F9FBF9',
    gap: 10,
  },
  replyBar: {
    width: 3, borderRadius: 2,
    backgroundColor: COLORS.primary + '88',
    alignSelf: 'stretch',
    minHeight: 36,
  },
  replyArrow: { fontSize: 12, color: COLORS.primary },

  emptyComments:     { alignItems: 'center', paddingVertical: 32 },
  emptyCommentsText: { fontSize: 14, color: COLORS.textDisabled },

  // 답글 작성 표시 바
  replyingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  replyingText:   { fontSize: 13, color: COLORS.primary },
  replyingCancel: { fontSize: 16, color: COLORS.textDisabled, fontWeight: '700' },

  // 입력창
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  anonBtn: {
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD',
    minWidth: 48, alignItems: 'center',
  },
  anonBtnOn:     { backgroundColor: '#E8F5E9', borderColor: COLORS.primary },
  anonBtnText:   { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  anonBtnTextOn: { color: COLORS.primary },
  input: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: COLORS.textPrimary, maxHeight: 100,
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  sendBtn:    { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  sendBtnOff: { backgroundColor: '#CCC' },
  sendBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
});

// 신고 모달 스타일
const rStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  icon:     { fontSize: 20 },
  title:    { fontSize: 16, fontWeight: '800', color: '#111' },
  sub:      { fontSize: 12, color: '#888', marginTop: 1 },
  close:    { fontSize: 18, color: '#999', fontWeight: '600' },
  divider:  { height: 1, backgroundColor: '#F0F0F0' },
  listLabel:{ fontSize: 12, fontWeight: '600', color: '#999', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 14 },
  reasonIcon:  { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center' },
  reasonLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  reasonDesc:  { fontSize: 12, color: '#999' },
  arrow:       { fontSize: 20, color: '#CCC' },
  cancelBtn:   { marginHorizontal: 20, marginTop: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F5F5F5', alignItems: 'center' },
  cancelText:  { fontSize: 15, fontWeight: '700', color: '#666' },
});

const dStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  card:  { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 36, alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#111' },
  sub:   { fontSize: 13, color: '#888' },
});
