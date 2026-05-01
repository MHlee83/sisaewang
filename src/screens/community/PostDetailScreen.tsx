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

// ──────────────────────────────────────────────
// 로컬 댓글 타입
// ──────────────────────────────────────────────
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
  likeCount: number;
  replies: LocalReply[];
}

const REPORT_REASONS = [
  { icon: '📢', label: '스팸/광고',  desc: '불필요한 홍보·광고 게시물' },
  { icon: '🤬', label: '욕설/비방',  desc: '욕설, 혐오 표현, 인신공격' },
  { icon: '❗', label: '허위정보',   desc: '사실과 다른 잘못된 정보' },
  { icon: '💬', label: '기타',       desc: '그 외 신고가 필요한 경우' },
];

// ──────────────────────────────────────────────
// 신고 모달
// ──────────────────────────────────────────────
function ReportModal({ visible, title, onClose, onSelect }: {
  visible: boolean; title: string; onClose: () => void; onSelect: (reason: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={reportStyles.overlay} onPress={onClose}>
        <Animated.View style={[reportStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable>
            <View style={reportStyles.handle} />
            <View style={reportStyles.header}>
              <View style={reportStyles.headerIconWrap}>
                <Text style={reportStyles.headerIcon}>🚨</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={reportStyles.headerTitle}>신고하기</Text>
                <Text style={reportStyles.headerSub} numberOfLines={1}>{title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={reportStyles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={reportStyles.divider} />
            <Text style={reportStyles.listLabel}>신고 사유를 선택해 주세요</Text>
            {REPORT_REASONS.map((r, i) => (
              <TouchableOpacity
                key={r.label}
                style={[reportStyles.reasonRow, i === REPORT_REASONS.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.65}
                onPress={() => onSelect(r.label)}
              >
                <View style={reportStyles.reasonIconWrap}>
                  <Text style={reportStyles.reasonIcon}>{r.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={reportStyles.reasonLabel}>{r.label}</Text>
                  <Text style={reportStyles.reasonDesc}>{r.desc}</Text>
                </View>
                <Text style={reportStyles.reasonArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={reportStyles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={reportStyles.cancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ReportDoneModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (visible) { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }
  }, [visible]);
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={doneStyles.wrap}>
        <View style={doneStyles.card}>
          <Text style={doneStyles.icon}>✅</Text>
          <Text style={doneStyles.title}>신고 접수 완료</Text>
          <Text style={doneStyles.sub}>검토 후 조치하겠습니다.</Text>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// 대댓글 아이템
// ──────────────────────────────────────────────
function ReplyItem({ reply, isMyReply, onDelete }: {
  reply: LocalReply;
  isMyReply: boolean;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.replyItem}
      onLongPress={() => {
        if (isMyReply) {
          Alert.alert('답글', '', [
            { text: '삭제', style: 'destructive', onPress: onDelete },
            { text: '취소', style: 'cancel' },
          ]);
        }
      }}
      activeOpacity={0.8}
    >
      <View style={styles.replyIndent} />
      <View style={{ flex: 1 }}>
        <View style={styles.replyMeta}>
          <Text style={styles.replyIcon}>↩ </Text>
          <Text style={styles.commentAuthor}>{reply.authorName}</Text>
          <Text style={styles.commentTime}> · {dayjs(reply.createdAt).format('MM.DD HH:mm')}</Text>
        </View>
        <Text style={[styles.commentContent, styles.replyContent]}>{reply.content}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────
// 댓글 아이템
// ──────────────────────────────────────────────
function CommentItem({ comment, isMyComment, onDelete, onReport, onReply, replies, currentUser, onDeleteReply }: {
  comment: any;
  isMyComment: boolean;
  onDelete: () => void;
  onReport: () => void;
  onReply: (commentId: string, authorName: string) => void;
  replies: LocalReply[];
  currentUser: string;
  onDeleteReply: (replyId: string) => void;
}) {
  const commentId = String(comment.id);

  return (
    <View style={styles.commentBlock}>
      <TouchableOpacity
        style={styles.commentItem}
        onLongPress={() => isMyComment ? Alert.alert('댓글', '', [
          { text: '삭제', style: 'destructive', onPress: onDelete },
          { text: '취소', style: 'cancel' },
        ]) : onReport()}
        activeOpacity={0.8}
      >
        <View style={styles.commentMeta}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <View style={styles.commentMetaRight}>
            <Text style={styles.commentTime}>{dayjs(comment.createdAt).format('MM.DD HH:mm')}</Text>
            {!isMyComment && (
              <TouchableOpacity onPress={onReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.commentReportBtn}>신고</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.commentContent, comment.isBlinded && styles.blindedText]}>
          {comment.content}
        </Text>
        {/* 답글 달기 버튼 */}
        <TouchableOpacity
          style={styles.replyBtn}
          onPress={() => onReply(commentId, comment.authorName)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.replyBtnText}>↩ 답글 달기</Text>
          {replies.length > 0 && (
            <Text style={styles.replyCount}> · 답글 {replies.length}개</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* 대댓글 목록 */}
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          isMyReply={reply.authorName === currentUser}
          onDelete={() => onDeleteReply(reply.id)}
        />
      ))}
    </View>
  );
}

// ──────────────────────────────────────────────
// 메인 화면
// ──────────────────────────────────────────────
export default function PostDetailScreen() {
  const route       = useRoute<Props['route']>();
  const navigation  = useNavigation();
  const { postId }  = route.params;
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [commentText, setCommentText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const commentInputRef = useRef<TextInput>(null);

  // 대댓글 상태
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [localComments, setLocalComments] = useState<LocalComment[]>([]);
  // API 댓글의 대댓글도 로컬로 관리
  const [apiCommentReplies, setApiCommentReplies] = useState<Record<string, LocalReply[]>>({});

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDoneVisible,  setReportDoneVisible]  = useState(false);
  const [reportTarget, setReportTarget] = useState<
    | { type: 'post' }
    | { type: 'comment'; commentId: string | number }
    | null
  >(null);

  const mockPost = MOCK_POSTS.find((p) => String(p.id) === String(postId));
  const mockPostData: import('@/types').CommunityPost | undefined = mockPost ? {
    id:          String(mockPost.id),
    title:       mockPost.title,
    content:     mockPost.content,
    authorName:  mockPost.authorName,
    itemCode:    (mockPost as any).itemCode ?? null,
    isAnonymous: false,
    isMyPost:    false,
    likeCount:   mockPost.likeCount,
    viewCount:   42,
    commentCount: 0,
    thumbnail:   mockPost.thumbnail ?? null,
    images:      [],
    liked:       false,
    createdAt:   mockPost.createdAt,
    updatedAt:   mockPost.updatedAt ?? mockPost.createdAt,
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

  const [localLiked, setLocalLiked]         = useState(false);
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

  // 답글 버튼 클릭
  const handleReplyPress = useCallback((commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
    setCommentText('');
    setTimeout(() => commentInputRef.current?.focus(), 100);
  }, []);

  const cancelReply = () => {
    setReplyingTo(null);
    setCommentText('');
  };

  // 댓글/대댓글 등록
  const commentMutation = useMutation({
    mutationFn: (text: string) =>
      replyingTo
        ? createComment(postId, text, isAnonymous) // 실제로는 parentCommentId 포함해야 함
        : createComment(postId, text, isAnonymous),
    onSuccess: () => {
      setCommentText('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (_err, text) => {
      const authorName = isAnonymous ? '익명' : (user?.nickname ?? '나');
      const now = new Date().toISOString();

      if (replyingTo) {
        // 대댓글 로컬 저장
        const newReply: LocalReply = {
          id: Date.now().toString(),
          parentCommentId: replyingTo.commentId,
          content: text,
          authorName,
          createdAt: now,
        };

        // API 댓글에 달린 대댓글인지, 로컬 댓글에 달린 대댓글인지 구분
        const isApiComment = apiComments.some((c: any) => String(c.id) === replyingTo.commentId);
        if (isApiComment) {
          setApiCommentReplies((prev) => ({
            ...prev,
            [replyingTo.commentId]: [...(prev[replyingTo.commentId] ?? []), newReply],
          }));
        } else {
          setLocalComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.commentId
                ? { ...c, replies: [...c.replies, newReply] }
                : c,
            ),
          );
        }

        // 알림 생성 (대댓글 대상자에게)
        const targetAuthor = replyingTo.authorName;
        if (targetAuthor !== authorName && targetAuthor !== '익명') {
          addNotification({
            type: 'reply',
            message: `${authorName}님이 회원님의 댓글에 답글을 달았습니다: "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"`,
            postId,
            postTitle: post?.title ?? '',
            fromUser: authorName,
          });
        }

        setReplyingTo(null);
      } else {
        // 일반 댓글 로컬 저장
        setLocalComments((prev) => [...prev, {
          id: Date.now().toString(),
          content: text,
          authorName,
          createdAt: now,
          isBlinded: false,
          likeCount: 0,
          replies: [],
        }]);
      }
      setCommentText('');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      navigation.goBack();
    },
  });

  const handleReportSelect = (reason: string) => {
    setReportModalVisible(false);
    if (!reportTarget) return;
    const promise = reportTarget.type === 'post'
      ? reportPost(postId, reason)
      : reportComment(postId, reportTarget.commentId as string, reason);
    promise
      .then(() => setReportDoneVisible(true))
      .catch(() => setReportDoneVisible(true));
  };

  const handleDeletePost = () => {
    Alert.alert('게시글 삭제', '정말 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deletePostMutation.mutate() },
    ]);
  };

  const totalCommentCount =
    apiComments.length +
    localComments.length +
    Object.values(apiCommentReplies).reduce((s, r) => s + r.length, 0) +
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
          {/* 게시글 본문 */}
          <View style={styles.postCard}>
            {post.itemCode && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>#{post.itemCode}</Text>
              </View>
            )}
            <Text style={styles.title}>{post.title}</Text>
            <View style={styles.postMeta}>
              <Text style={styles.metaText}>{post.authorName}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{dayjs(post.createdAt).format('YYYY.MM.DD HH:mm')}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>조회 {post.viewCount}</Text>
            </View>
            <Text style={styles.content}>{post.content}</Text>

            {post.images?.length > 0 && (
              <View style={styles.imageRow}>
                {post.images.map((_: any, i: number) => (
                  <View key={i} style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>📷</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, displayLiked && styles.actionBtnActive]}
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Text style={[styles.likeHeart, displayLiked && styles.likeHeartActive]}>♥</Text>
                <Text style={[styles.actionBtnText, displayLiked && styles.likeCountActive]}>
                  {' '}{displayLikeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => commentInputRef.current?.focus()}>
                <Text style={styles.actionBtnText}>💬 {totalCommentCount}</Text>
              </TouchableOpacity>

              {post.isMyPost ? (
                <TouchableOpacity style={styles.actionBtn} onPress={handleDeletePost}>
                  <Text style={[styles.actionBtnText, { color: COLORS.surgeStrong }]}>🗑 삭제</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  setReportTarget({ type: 'post' });
                  setReportModalVisible(true);
                }}>
                  <Text style={styles.actionBtnText}>🚨 신고</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 댓글 목록 */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeader}>댓글 {totalCommentCount}</Text>

            {/* API 댓글 */}
            {apiComments.map((c: any) => (
              <CommentItem
                key={c.id}
                comment={c}
                isMyComment={user ? c.authorName === user.nickname : false}
                onDelete={() =>
                  Alert.alert('댓글 삭제', '삭제하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제', style: 'destructive',
                      onPress: () => deleteComment(postId, c.id).then(() =>
                        queryClient.invalidateQueries({ queryKey: ['comments', postId] })
                      ),
                    },
                  ])
                }
                onReport={() => { setReportTarget({ type: 'comment', commentId: c.id }); setReportModalVisible(true); }}
                onReply={handleReplyPress}
                replies={apiCommentReplies[String(c.id)] ?? []}
                currentUser={user?.nickname ?? ''}
                onDeleteReply={(replyId) =>
                  setApiCommentReplies((prev) => ({
                    ...prev,
                    [String(c.id)]: (prev[String(c.id)] ?? []).filter((r) => r.id !== replyId),
                  }))
                }
              />
            ))}

            {/* 로컬 댓글 */}
            {localComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                isMyComment={true}
                onDelete={() => setLocalComments((prev) => prev.filter((x) => x.id !== c.id))}
                onReport={() => {}}
                onReply={handleReplyPress}
                replies={c.replies}
                currentUser={user?.nickname ?? ''}
                onDeleteReply={(replyId) =>
                  setLocalComments((prev) =>
                    prev.map((x) =>
                      x.id === c.id
                        ? { ...x, replies: x.replies.filter((r) => r.id !== replyId) }
                        : x,
                    ),
                  )
                }
              />
            ))}
          </View>
        </ScrollView>

        {/* 댓글/대댓글 입력 */}
        {user && (
          <View>
            {/* 대댓글 표시 바 */}
            {replyingTo && (
              <View style={styles.replyingBar}>
                <Text style={styles.replyingText}>↩ <Text style={{ fontWeight: '700' }}>{replyingTo.authorName}</Text>에게 답글 달기</Text>
                <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.replyingCancel}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.commentInput}>
              <TouchableOpacity
                style={[styles.anonBtn, isAnonymous && styles.anonBtnActive]}
                onPress={() => setIsAnonymous((v) => !v)}
              >
                <Text style={styles.anonBtnText}>{isAnonymous ? '익명 ✓' : '익명'}</Text>
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
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                onPress={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                <Text style={styles.sendBtnText}>등록</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <ReportModal
        visible={reportModalVisible}
        title={post.title}
        onClose={() => setReportModalVisible(false)}
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
  container:  { flex: 1, backgroundColor: COLORS.background },
  loading:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postCard: { backgroundColor: COLORS.surface, padding: 16, marginBottom: 8 },
  itemBadge: {
    alignSelf: 'flex-start', backgroundColor: '#E8F5E9',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 8,
  },
  itemBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  title:     { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  postMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  metaText:  { fontSize: 12, color: COLORS.textDisabled },
  metaDot:   { fontSize: 12, color: COLORS.textDisabled },
  content:   { fontSize: 15, color: COLORS.textPrimary, lineHeight: 24, marginBottom: 16 },
  imageRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  imagePlaceholder: {
    width: 80, height: 80, borderRadius: 8,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: 28 },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.background,
  },
  actionBtnActive:  { backgroundColor: '#FFEBEE' },
  actionBtnText:    { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  likeHeart:        { fontSize: 16, color: '#CCC', fontWeight: '700' },
  likeHeartActive:  { color: '#E53935' },
  likeCountActive:  { color: '#E53935' },

  commentsSection: { backgroundColor: COLORS.surface, padding: 16 },
  commentsHeader:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  // 댓글 블록 (댓글 + 그 아래 대댓글들)
  commentBlock: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  commentItem:  { paddingVertical: 12 },
  commentMeta:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  commentMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor:    { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  commentTime:      { fontSize: 11, color: COLORS.textDisabled },
  commentReportBtn: { fontSize: 11, color: COLORS.textDisabled, textDecorationLine: 'underline' },
  commentContent:   { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  blindedText:      { color: COLORS.textDisabled, fontStyle: 'italic' },

  // 답글 달기 버튼
  replyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  replyBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  replyCount:   { fontSize: 12, color: COLORS.textDisabled },

  // 대댓글
  replyItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingLeft: 8,
    backgroundColor: '#FAFAFA',
  },
  replyIndent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary + '44',
    marginRight: 10,
    alignSelf: 'stretch',
  },
  replyIcon: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // 대댓글 메타 (space-between 없이 좌정렬)
  replyMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  replyContent: { fontSize: 13, marginTop: 1 },

  // 대댓글 입력 표시 바
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  replyingText:   { fontSize: 13, color: COLORS.primary },
  replyingCancel: { fontSize: 16, color: COLORS.textDisabled, fontWeight: '700' },

  // 댓글 입력
  commentInput: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.divider,
    padding: 10, gap: 8,
  },
  anonBtn: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.divider,
  },
  anonBtnActive: { borderColor: COLORS.primary, backgroundColor: '#E8F5E9' },
  anonBtnText:   { fontSize: 12, color: COLORS.textSecondary },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
    color: COLORS.textPrimary, maxHeight: 100,
  },
  sendBtn:         { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  sendBtnDisabled: { backgroundColor: COLORS.textDisabled },
  sendBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
});

const reportStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  headerIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' },
  headerIcon:  { fontSize: 20 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  headerSub:   { fontSize: 12, color: '#888', marginTop: 1 },
  closeBtn:    { fontSize: 18, color: '#999', fontWeight: '600', paddingLeft: 8 },
  divider:     { height: 1, backgroundColor: '#F0F0F0' },
  listLabel:   { fontSize: 12, fontWeight: '600', color: '#999', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, letterSpacing: 0.3 },
  reasonRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 14 },
  reasonIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F8F8', alignItems: 'center', justifyContent: 'center' },
  reasonIcon:  { fontSize: 18 },
  reasonLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 2 },
  reasonDesc:  { fontSize: 12, color: '#999' },
  reasonArrow: { fontSize: 20, color: '#CCC', fontWeight: '300' },
  cancelBtn:   { marginHorizontal: 20, marginTop: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F5F5F5', alignItems: 'center' },
  cancelText:  { fontSize: 15, fontWeight: '700', color: '#666' },
});

const doneStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 36, alignItems: 'center', gap: 6, elevation: 8 },
  icon:  { fontSize: 36, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '800', color: '#111' },
  sub:   { fontSize: 13, color: '#888' },
});
