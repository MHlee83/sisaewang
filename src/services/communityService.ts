import api from './api';
import type { CommunityPost, CommunityComment, PaginatedResponse } from '@/types';

export async function getPosts(params?: {
  page?: number;
  limit?: number;
  itemCode?: string;
}): Promise<{ posts: CommunityPost[]; total: number; page: number }> {
  const { data } = await api.get('/community', { params });
  return data;
}

export async function getPost(id: string): Promise<CommunityPost> {
  const { data } = await api.get(`/community/${id}`);
  return data;
}

export async function createPost(body: {
  title:       string;
  content:     string;
  itemCode?:   string;
  isAnonymous: boolean;
  imageUrls:   string[];
}): Promise<{ id: string }> {
  const { data } = await api.post('/community', body);
  return data;
}

export async function updatePost(id: string, body: { title?: string; content?: string }): Promise<void> {
  await api.patch(`/community/${id}`, body);
}

export async function deletePost(id: string): Promise<void> {
  await api.delete(`/community/${id}`);
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  const { data } = await api.get(`/community/${postId}/comments`);
  return data;
}

export async function createComment(postId: string, content: string, isAnonymous = false): Promise<{ id: string }> {
  const { data } = await api.post(`/community/${postId}/comments`, { content, isAnonymous });
  return data;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/community/${postId}/comments/${commentId}`);
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  const { data } = await api.post(`/community/${postId}/like`);
  return data;
}

export async function reportPost(postId: string, reason: string): Promise<void> {
  await api.post(`/community/${postId}/report`, { reason });
}

export async function reportComment(postId: string, commentId: string, reason: string): Promise<void> {
  await api.post(`/community/${postId}/comments/${commentId}/report`, { reason });
}
