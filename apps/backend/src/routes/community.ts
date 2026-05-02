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
router.post('/',       requireAuth,  createPost);    // 작성
router.patch('/:id',   requireAuth,  updatePost);    // 수정
router.delete('/:id',  requireAuth,  deletePost);    // 삭제

// ===== 댓글 =====
router.get('/:id/comments',    optionalAuth, getComments);
router.post('/:id/comments',   requireAuth,  createComment);
router.delete('/:id/comments/:commentId', requireAuth, deleteComment);

// ===== 좋아요 =====
router.post('/:id/like', requireAuth, toggleLike);

// ===== 신고 =====
router.post('/:id/report',                    requireAuth, reportContent);
router.post('/:id/comments/:commentId/report', requireAuth, reportContent);

export default router;
