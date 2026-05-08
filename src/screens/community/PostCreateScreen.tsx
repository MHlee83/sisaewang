import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, CATEGORIES } from '@/constants';
import { createPost } from '@/services/communityService';

// 연관 품목 대표 목록 (5자리 품목 코드 기준)
const QUICK_ITEMS = [
  { code: '10001', name: '배추' }, { code: '10021', name: '무' },
  { code: '10033', name: '양파' }, { code: '10034', name: '마늘' },
  { code: '10031', name: '대파' }, { code: '10023', name: '감자' },
  { code: '20011', name: '사과' }, { code: '20041', name: '딸기' },
  { code: '50011', name: '쌀' },   { code: '40031', name: '계란' },
  { code: '10041', name: '풋고추'},{ code: '10054', name: '토마토'},
];

export default function PostCreateScreen() {
  const navigation  = useNavigation();
  const queryClient = useQueryClient();
  const route       = useRoute<any>();

  const [title,       setTitle]       = useState('');
  const [content,     setContent]     = useState('');
  const [itemCode,    setItemCode]    = useState<string | null>(route.params?.itemCode ?? null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createPost({ title, content, itemCode: itemCode ?? undefined, isAnonymous, imageUrls: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityPosts'] });
      Alert.alert('완료', '게시글이 등록됐습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = status === 401 ? '로그인이 필요합니다.' : `등록 실패 (${status ?? '네트워크 오류'})`;
      Alert.alert('오류', msg);
    },
  });

  const canSubmit = title.trim().length >= 1 && content.trim().length >= 1;

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>글쓰기</Text>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || mutation.isPending}
          >
            <Text style={styles.submitBtnText}>
              {mutation.isPending ? '등록 중...' : '등록'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* 제목 */}
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력하세요"
            placeholderTextColor={COLORS.textDisabled}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* 본문 */}
          <TextInput
            style={styles.contentInput}
            placeholder={`출하 경험, 시세 정보, 재배 팁 등을 자유롭게 공유하세요.\n\n· 가격 정보는 품목을 태그하면 더 유용해요\n· 사진은 추후 업로드 기능이 추가될 예정입니다`}
            placeholderTextColor={COLORS.textDisabled}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={5000}
            textAlignVertical="top"
          />

          {/* 연관 품목 태그 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>연관 품목 (선택)</Text>
            <View style={styles.itemGrid}>
              {QUICK_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.itemChip, itemCode === item.code && styles.itemChipSelected]}
                  onPress={() => setItemCode(itemCode === item.code ? null : item.code)}
                >
                  <Text style={[styles.itemChipText, itemCode === item.code && styles.itemChipTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 익명 토글 */}
          <View style={styles.section}>
            <View style={styles.anonymousRow}>
              <View>
                <Text style={styles.sectionLabel}>익명으로 작성</Text>
                <Text style={styles.anonymousDesc}>이름 대신 '익명'으로 표시됩니다</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: COLORS.divider, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* 글자 수 */}
          <Text style={styles.charCount}>{content.length} / 5000</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  cancelText:    { fontSize: 15, color: COLORS.textSecondary },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  submitBtn:         { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  submitBtnDisabled: { backgroundColor: COLORS.textDisabled },
  submitBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { flex: 1 },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  contentInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
    padding: 16,
    minHeight: 200,
    lineHeight: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  section:      { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10 },
  itemGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  itemChipSelected:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemChipText:         { fontSize: 13, color: COLORS.textSecondary },
  itemChipTextSelected: { color: '#fff', fontWeight: '700' },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anonymousDesc:{ fontSize: 12, color: COLORS.textDisabled, marginTop: 2 },
  charCount:    { textAlign: 'right', fontSize: 11, color: COLORS.textDisabled, padding: 12 },
});
