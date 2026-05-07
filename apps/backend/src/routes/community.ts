import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middlewares/auth';
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  toggleLike,
  reportContent,
} from '../controllers/communityController';

const router = Router();

// ===== 게시글 =====
router.get('/',        optionalAuth, getPosts);      // 목록 (비로그인도 열람 가능)
router.get('/:id',     optionalAuth, getPost);       // 상세
router.post('/',       optionalAuth, createPost);    // 작성 (테스트: 비로그인 허용)
router.patch('/:id',   optionalAuth, updatePost);    // 수정
router.delete('/:id',  optionalAuth, deletePost);    // 삭제

// ===== 댓글 =====
router.get('/:id/comments',    optionalAuth, getComments);
router.post('/:id/comments',   optionalAuth, createComment);
router.delete('/:id/comments/:commentId', optionalAuth, deleteComment);

// ===== 좋아요 =====
router.post('/:id/like', optionalAuth, toggleLike);

// ===== 신고 =====
router.post('/:id/report',                    requireAuth, reportContent);
router.post('/:id/comments/:commentId/report', requireAuth, reportContent);

export default router;
